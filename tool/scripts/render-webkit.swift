import Foundation
import AppKit
import WebKit
import CoreGraphics

struct RenderJob: Decodable {
    let projectDir: String
    let kitPath: String
    let harnessHtml: String
    let width: Int
    let height: Int
    let phases: [Double]
    let inspectIndices: [Int]?
    let outRgbaPath: String
    let outTelemetryPath: String
}

func mimeType(for path: String) -> String {
    let ext = (path as NSString).pathExtension.lowercased()
    switch ext {
    case "html", "htm": return "text/html; charset=utf-8"
    case "js", "mjs": return "application/javascript; charset=utf-8"
    case "css": return "text/css; charset=utf-8"
    case "json": return "application/json; charset=utf-8"
    case "svg": return "image/svg+xml"
    case "png": return "image/png"
    case "jpg", "jpeg": return "image/jpeg"
    case "webp": return "image/webp"
    case "woff2": return "font/woff2"
    case "woff": return "font/woff"
    case "ttf": return "font/ttf"
    default: return "application/octet-stream"
    }
}

final class LoopSchemeHandler: NSObject, WKURLSchemeHandler {
    let projectDir: URL
    let kitPath: URL
    let harnessData: Data

    init(projectDir: String, kitPath: String, harnessHtml: String) {
        self.projectDir = URL(fileURLWithPath: projectDir).standardizedFileURL
        self.kitPath = URL(fileURLWithPath: kitPath).standardizedFileURL
        self.harnessData = harnessHtml.data(using: .utf8) ?? Data()
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(NSError(domain: "LoopStudio", code: 400))
            return
        }

        var path = url.path
        if path.isEmpty || path == "/" || path == "/index.html" {
            respond(task: urlSchemeTask, url: url, status: 200, mime: "text/html; charset=utf-8", data: harnessData)
            return
        }

        if path == "/loop-kit.js" {
            if let data = try? Data(contentsOf: kitPath) {
                respond(task: urlSchemeTask, url: url, status: 200, mime: "application/javascript; charset=utf-8", data: data)
            } else {
                respond(task: urlSchemeTask, url: url, status: 404, mime: "text/plain", data: Data("Missing loop-kit.js".utf8))
            }
            return
        }

        while path.hasPrefix("/") { path.removeFirst() }
        let target = projectDir.appendingPathComponent(path).standardizedFileURL
        let basePrefix = projectDir.path.hasSuffix("/") ? projectDir.path : projectDir.path + "/"
        guard target.path.hasPrefix(basePrefix),
              let data = try? Data(contentsOf: target) else {
            respond(task: urlSchemeTask, url: url, status: 404, mime: "text/plain", data: Data("Not found".utf8))
            return
        }

        respond(task: urlSchemeTask, url: url, status: 200, mime: mimeType(for: target.path), data: data)
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    private func respond(task: WKURLSchemeTask, url: URL, status: Int, mime: String, data: Data) {
        let resp = HTTPURLResponse(
            url: url,
            statusCode: status,
            httpVersion: "HTTP/1.1",
            headerFields: [
                "Content-Type": mime,
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-store"
            ]
        )!
        task.didReceive(resp)
        task.didReceive(data)
        task.didFinish()
    }
}

final class WebKitRunner: NSObject, WKNavigationDelegate {
    let job: RenderJob
    let webView: WKWebView
    let schemeHandler: LoopSchemeHandler
    var navFinished = false
    var navError: Error?

    init(job: RenderJob) {
        self.job = job
        self.schemeHandler = LoopSchemeHandler(projectDir: job.projectDir, kitPath: job.kitPath, harnessHtml: job.harnessHtml)
        let cfg = WKWebViewConfiguration()
        cfg.setURLSchemeHandler(self.schemeHandler, forURLScheme: "loop")
        self.webView = WKWebView(frame: NSRect(x: 0, y: 0, width: job.width, height: job.height), configuration: cfg)
        super.init()
        self.webView.navigationDelegate = self
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        navFinished = true
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        navError = error
        navFinished = true
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        navError = error
        navFinished = true
    }

    private func evalJS(_ script: String) -> Any? {
        var done = false
        var out: Any?
        var jsErr: Error?
        webView.evaluateJavaScript(script) { val, err in
            out = val
            jsErr = err
            done = true
        }
        let deadline = Date().addingTimeInterval(10.0)
        while !done && Date() < deadline {
            RunLoop.main.run(mode: .default, before: Date().addingTimeInterval(0.002))
        }
        if let err = jsErr {
            fputs("JS eval error: \(err.localizedDescription) in script: \(script)\n", stderr)
            exit(1)
        }
        return out
    }

    private func waitUntilReady() {
        let deadline = Date().addingTimeInterval(10.0)
        while !navFinished && Date() < deadline {
            RunLoop.main.run(mode: .default, before: Date().addingTimeInterval(0.01))
        }
        if let err = navError {
            fputs("Navigation error: \(err.localizedDescription)\n", stderr)
            exit(1)
        }
        guard navFinished else {
            fputs("Navigation timeout\n", stderr)
            exit(1)
        }

        // Wait for ES modules + document.fonts.ready
        let readyDeadline = Date().addingTimeInterval(10.0)
        while Date() < readyDeadline {
            if let ready = evalJS("typeof window.__LOOP_STEP__ === 'function'") as? Bool, ready {
                break
            }
            RunLoop.main.run(mode: .default, before: Date().addingTimeInterval(0.01))
        }
        var fontsDone = false
        webView.callAsyncJavaScript("await document.fonts.ready; return true;", arguments: [:], in: nil, in: .page) { _ in
            fontsDone = true
        }
        let fDeadline = Date().addingTimeInterval(5.0)
        while !fontsDone && Date() < fDeadline {
            RunLoop.main.run(mode: .default, before: Date().addingTimeInterval(0.01))
        }
    }

    private func captureRGBA() -> [UInt8] {
        let w = job.width
        let h = job.height
        let snapCfg = WKSnapshotConfiguration()
        snapCfg.rect = NSRect(x: 0, y: 0, width: w, height: h)
        var done = false
        var outBytes = [UInt8](repeating: 0, count: w * h * 4)
        var snapErr: Error?

        webView.takeSnapshot(with: snapCfg) { img, err in
            if let err = err {
                snapErr = err
            } else if let img = img, let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) {
                let cs = CGColorSpaceCreateDeviceRGB()
                if let ctx = CGContext(
                    data: &outBytes,
                    width: w,
                    height: h,
                    bitsPerComponent: 8,
                    bytesPerRow: w * 4,
                    space: cs,
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
                ) {
                    ctx.interpolationQuality = .high
                    ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
                }
                // Unpremultiply if any pixel is semi-transparent
                for i in stride(from: 0, to: outBytes.count, by: 4) {
                    let a = outBytes[i + 3]
                    if a > 0 && a < 255 {
                        outBytes[i]     = UInt8(min(255, Int(outBytes[i]) * 255 / Int(a)))
                        outBytes[i + 1] = UInt8(min(255, Int(outBytes[i + 1]) * 255 / Int(a)))
                        outBytes[i + 2] = UInt8(min(255, Int(outBytes[i + 2]) * 255 / Int(a)))
                    }
                }
            }
            done = true
        }

        let deadline = Date().addingTimeInterval(10.0)
        while !done && Date() < deadline {
            RunLoop.main.run(mode: .default, before: Date().addingTimeInterval(0.002))
        }
        if let err = snapErr {
            fputs("Snapshot error: \(err.localizedDescription)\n", stderr)
            exit(1)
        }
        return outBytes
    }

    func run() {
        webView.load(URLRequest(url: URL(string: "loop://app/index.html")!))
        waitUntilReady()

        let inspectSet = Set(job.inspectIndices ?? [])
        let outUrl = URL(fileURLWithPath: job.outRgbaPath)
        FileManager.default.createFile(atPath: outUrl.path, contents: nil)
        guard let fh = try? FileHandle(forWritingTo: outUrl) else {
            fputs("Cannot open output RGBA path: \(job.outRgbaPath)\n", stderr)
            exit(1)
        }
        defer { try? fh.close() }

        var telemetryMap: [String: Any] = [:]

        for (idx, phase) in job.phases.enumerated() {
            _ = evalJS("window.__LOOP_STEP__(\(phase)); true;")
            let rgba = captureRGBA()
            fh.write(Data(rgba))

            if inspectSet.contains(idx) {
                if let jsonStr = evalJS("JSON.stringify(window.__LOOP_INSPECT__())") as? String,
                   let data = jsonStr.data(using: .utf8),
                   let parsed = try? JSONSerialization.jsonObject(with: data) {
                    telemetryMap[String(idx)] = parsed
                }
            }
        }

        if let telData = try? JSONSerialization.data(withJSONObject: telemetryMap, options: [.prettyPrinted]) {
            try? telData.write(to: URL(fileURLWithPath: job.outTelemetryPath))
        }
    }
}

guard CommandLine.arguments.count >= 2 else {
    fputs("Usage: render-webkit.swift <jobJsonPath>\n", stderr)
    exit(1)
}

let jobPath = CommandLine.arguments[1]
let jobData = try Data(contentsOf: URL(fileURLWithPath: jobPath))
let job = try JSONDecoder().decode(RenderJob.self, from: jobData)

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
WebKitRunner(job: job).run()
