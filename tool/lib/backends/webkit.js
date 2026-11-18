// Loop Studio — Native macOS WebKit (WKWebView) Rendering Backend
// Zero Chrome install & zero external npm packages required on macOS.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { detectCapabilities } from "../encoders.js";
import { normalizeInspectionResult } from "./telemetry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");
const SWIFT_WEBKIT_SCRIPT = path.join(REPO_ROOT, "tool", "scripts", "render-webkit.swift");
const KIT_PATH = path.join(REPO_ROOT, "tool", "lib", "loop-kit.js");

function getCompiledWebKitBinary(caps) {
  if (!caps.swiftcPath) return null;
  const stat = fs.statSync(SWIFT_WEBKIT_SCRIPT);
  const binPath = path.join(os.tmpdir(), `loop-studio-webkit-${Math.floor(stat.mtimeMs)}.bin`);
  if (fs.existsSync(binPath)) return binPath;

  const res = spawnSync(caps.swiftcPath, ["-O", SWIFT_WEBKIT_SCRIPT, "-o", binPath], { encoding: "utf8" });
  if (res.status === 0 && fs.existsSync(binPath)) {
    return binPath;
  }
  return null;
}

export function renderWithWebKit({ absDir, harnessHtml, width, height, phases, inspectIndices = [] }) {
  const caps = detectCapabilities();
  if (!caps.macosWebKit) {
    throw new Error("macOS WebKit backend unavailable on this platform.");
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "loop-studio-wk-"));
  const jobPath = path.join(tmpDir, "job.json");
  const outRgbaPath = path.join(tmpDir, "frames.rgba");
  const outTelemetryPath = path.join(tmpDir, "telemetry.json");

  try {
    fs.writeFileSync(
      jobPath,
      JSON.stringify({
        projectDir: absDir,
        kitPath: KIT_PATH,
        harnessHtml,
        width,
        height,
        phases,
        inspectIndices,
        outRgbaPath,
        outTelemetryPath
      }),
      "utf8"
    );

    const compiledBin = getCompiledWebKitBinary(caps);
    const res = compiledBin
      ? spawnSync(compiledBin, [jobPath], { encoding: "utf8" })
      : spawnSync(caps.swiftPath, [SWIFT_WEBKIT_SCRIPT, jobPath], { encoding: "utf8" });

    if (res.status !== 0) {
      throw new Error(`WebKit render failed: ${res.stderr || res.stdout}`);
    }

    const rawAll = fs.readFileSync(outRgbaPath);
    const frameBytes = width * height * 4;
    const frames = [];
    for (let i = 0; i < phases.length; i++) {
      const start = i * frameBytes;
      const slice = rawAll.subarray(start, start + frameBytes);
      if (slice.length < frameBytes) {
        throw new Error(`WebKit output truncated at frame ${i}`);
      }
      frames.push(new Uint8Array(slice));
    }

    let rawTelemetry = {};
    if (fs.existsSync(outTelemetryPath)) {
      rawTelemetry = JSON.parse(fs.readFileSync(outTelemetryPath, "utf8"));
    }

    const telemetryByIndex = {};
    for (const idx of inspectIndices) {
      telemetryByIndex[idx] = normalizeInspectionResult(rawTelemetry[String(idx)], frames[idx], width, height);
    }

    return {
      backend: "webkit",
      frames,
      width,
      height,
      telemetryByIndex
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
