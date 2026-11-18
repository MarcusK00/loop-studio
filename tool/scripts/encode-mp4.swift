import Foundation
import AVFoundation
import CoreVideo
import CoreMedia

let args = CommandLine.arguments
guard args.count >= 7,
      let width = Int(args[2]),
      let height = Int(args[3]),
      let fps = Int(args[4]),
      let totalFrames = Int(args[5]) else {
    fputs("Usage: encode-mp4.swift <rawRgbaPath> <width> <height> <fps> <totalFrames> <outputMp4Path>\n", stderr)
    exit(1)
}

let rawPath = args[1]
let outPath = args[6]
let encW = width % 2 == 0 ? width : width + 1
let encH = height % 2 == 0 ? height : height + 1
let safeFps = max(1, fps)

let outURL = URL(fileURLWithPath: outPath)
try? FileManager.default.removeItem(at: outURL)

guard let fileHandle = FileHandle(forReadingAtPath: rawPath) else {
    fputs("Cannot open raw RGBA file: \(rawPath)\n", stderr)
    exit(1)
}
defer { try? fileHandle.close() }

do {
    let writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
    let bitRate = max(1_800_000, min(16_000_000, encW * encH * safeFps / 3))
    let videoSettings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: encW,
        AVVideoHeightKey: encH,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: bitRate,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
            AVVideoMaxKeyFrameIntervalKey: safeFps
        ]
    ]

    let input = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
    input.expectsMediaDataInRealTime = false

    let sourceAttrs: [String: Any] = [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: encW,
        kCVPixelBufferHeightKey as String: encH
    ]
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
        assetWriterInput: input,
        sourcePixelBufferAttributes: sourceAttrs
    )

    guard writer.canAdd(input) else {
        fputs("Cannot add AVAssetWriterInput\n", stderr)
        exit(1)
    }
    writer.add(input)

    guard writer.startWriting() else {
        fputs("startWriting failed: \(writer.error?.localizedDescription ?? "unknown")\n", stderr)
        exit(1)
    }
    writer.startSession(atSourceTime: .zero)

    let frameByteCount = width * height * 4
    let srcRowBytes = width * 4

    for f in 0..<totalFrames {
        let frameData = fileHandle.readData(ofLength: frameByteCount)
        if frameData.count < frameByteCount {
            fputs("Unexpected EOF at frame \(f)\n", stderr)
            exit(1)
        }

        while !input.isReadyForMoreMediaData {
            Thread.sleep(forTimeInterval: 0.002)
        }

        var pbOut: CVPixelBuffer?
        let pbAttrs: [String: Any] = [
            kCVPixelBufferCGImageCompatibilityKey as String: true,
            kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
        ]
        let status = CVPixelBufferCreate(
            kCFAllocatorDefault,
            encW,
            encH,
            kCVPixelFormatType_32BGRA,
            pbAttrs as CFDictionary,
            &pbOut
        )
        guard status == kCVReturnSuccess, let pixelBuffer = pbOut else {
            fputs("CVPixelBufferCreate failed: \(status)\n", stderr)
            exit(1)
        }

        CVPixelBufferLockBaseAddress(pixelBuffer, [])
        if let base = CVPixelBufferGetBaseAddress(pixelBuffer) {
            let dstRowBytes = CVPixelBufferGetBytesPerRow(pixelBuffer)
            let dst = base.assumingMemoryBound(to: UInt8.self)
            frameData.withUnsafeBytes { rawPtr in
                guard let src = rawPtr.bindMemory(to: UInt8.self).baseAddress else { return }
                for y in 0..<height {
                    let sRow = y * srcRowBytes
                    let dRow = y * dstRowBytes
                    for x in 0..<width {
                        let si = sRow + x * 4
                        let di = dRow + x * 4
                        // RGBA -> BGRA
                        dst[di]     = src[si + 2]
                        dst[di + 1] = src[si + 1]
                        dst[di + 2] = src[si]
                        dst[di + 3] = src[si + 3]
                    }
                }
            }
        }
        CVPixelBufferUnlockBaseAddress(pixelBuffer, [])

        let pts = CMTime(value: Int64(f), timescale: Int32(safeFps))
        if !adaptor.append(pixelBuffer, withPresentationTime: pts) {
            fputs("Failed to append frame \(f): \(writer.error?.localizedDescription ?? "unknown")\n", stderr)
            exit(1)
        }
    }

    input.markAsFinished()
    let sem = DispatchSemaphore(value: 0)
    writer.finishWriting {
        sem.signal()
    }
    sem.wait()

    if writer.status != .completed {
        fputs("AVAssetWriter finished with status \(writer.status.rawValue): \(writer.error?.localizedDescription ?? "unknown")\n", stderr)
        exit(1)
    }
} catch {
    fputs("MP4 encoding error: \(error)\n", stderr)
    exit(1)
}
