// Loop Studio v2 — Core, Negative Gate & Browser Integration Eval Suite (`npm test`)

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  analyzeSeam,
  evaluateLegibilityFromTextLogs,
  analyzeVideoLegibility,
  analyzeSources
} from "../lib/analyzers.js";
import { BitmapBuffer } from "../lib/bitmap.js";
import { buildHarnessDocument } from "../lib/harness.js";
import { detectCapabilities, encodePNG, decodePNG, encodeGIF } from "../lib/encoders.js";
import { parseUnifiedDiff, highlightCodeLine } from "../lib/generators.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const CLI_PATH = path.join(REPO_ROOT, "tool", "bin", "loop.js");

let passed = 0;
let failed = 0;

function assert(condition, label, detail = "") {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.error(`  FAIL  ${label}${detail ? " — " + detail : ""}`);
  }
}

function makeCircleFrame(w, h, cx, cy, r, fgHex, bgHex) {
  const buf = new BitmapBuffer(w, h);
  buf.fillRect(0, 0, w, h, bgHex);
  const fr = parseInt(fgHex.slice(1, 3), 16);
  const fg = parseInt(fgHex.slice(3, 5), 16);
  const fb = parseInt(fgHex.slice(5, 7), 16);
  const r2 = r * r;
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(h - 1, Math.ceil(cy + r)); y++) {
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(w - 1, Math.ceil(cx + r)); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        const idx = (y * w + x) * 4;
        buf.data[idx] = fr;
        buf.data[idx + 1] = fg;
        buf.data[idx + 2] = fb;
        buf.data[idx + 3] = 255;
      }
    }
  }
  return buf.data;
}

function runCli(args, cwd = REPO_ROOT) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd,
    encoding: "utf8"
  });
}

function testCoreAnalyzersAndGates() {
  console.log("\n=== 1. Core Seam, Legibility, Source-Drift & Encoder Tests ===");

  // 1a. Smooth closed orbit passes seam check
  const N = 24;
  const smoothFrames = Array.from({ length: N }, (_, f) => {
    const ang = (f / N) * Math.PI * 2;
    return makeCircleFrame(96, 96, 48 + Math.cos(ang) * 24, 48 + Math.sin(ang) * 24, 10, "#FF6B9D", "#0A0C18");
  });
  const goodSeam = analyzeSeam(smoothFrames, 96, 96);
  assert(
    goodSeam.pass === true && goodSeam.seamScore <= 1.5 && goodSeam.duplicateFrames === 0,
    `Smooth orbit passes seam check (seamScore=${goodSeam.seamScore})`
  );

  // 1b. Negative Gate 1: Broken wrap jump (1.5 cycles)
  const brokenFrames = Array.from({ length: N }, (_, f) => {
    const x = 14 + (((f / N) * 1.5) % 1) * 68;
    return makeCircleFrame(96, 96, x, 48, 12, "#FF6B9D", "#0A0C18");
  });
  const badSeam = analyzeSeam(brokenFrames, 96, 96);
  assert(
    badSeam.pass === false && badSeam.seamScore > 1.5,
    `Negative Gate 1 (Seam Jump): catches 1.5-cycle jump (seamScore=${badSeam.seamScore} > 1.5)`
  );

  // 1c. Negative Gate 2: Lossy wrap duplicate with subtle compression grain
  const lossyDupFrames = smoothFrames.map((f) => new Uint8Array(f));
  lossyDupFrames[N - 1] = new Uint8Array(lossyDupFrames[0]);
  // Add tiny ±1 bit compression-like perturbation on 20% of pixels so lossless threshold misses, lossy catches
  for (let i = 0; i < lossyDupFrames[N - 1].length; i += 20) {
    lossyDupFrames[N - 1][i] = Math.min(255, lossyDupFrames[N - 1][i] + 1);
  }
  const lossyReport = analyzeSeam(lossyDupFrames, 96, 96, { lossy: true });
  assert(
    lossyReport.pass === false && lossyReport.duplicateFrames >= 1,
    `Negative Gate 2 (Lossy Duplicate): catches duplicated wrap frame despite compression delta (dup=${lossyReport.duplicateFrames})`
  );

  // 1d. Negative Gate 3: Legibility (reading time, WCAG contrast, overflow, missing stage)
  const badShowcase = {
    says: "Broken caption showcase",
    seconds: 10,
    stage: ["Input", "MissingLabel"],
    steps: [
      {
        from: 0,
        to: 1.0,
        caption: "this caption is far too long and low contrast to read quickly",
        source: "README.md:1"
      }
    ]
  };
  const badLegible = evaluateLegibilityFromTextLogs({
    S: badShowcase,
    W: 800,
    H: 400,
    SECONDS: 10,
    mode: "showcase",
    frame0Logs: [{ text: "Input", role: "stage", x: 24, y: 20, width: 60, height: 20, fontSize: 12, fg: [231, 233, 244], bg: [10, 12, 24], overflows: false }],
    stepLogsByIdx: [[{
      text: badShowcase.steps[0].caption,
      role: "caption",
      x: 40,
      y: 350,
      width: 500,
      height: 20,
      fontSize: 13,
      fg: [34, 39, 64],
      bg: [23, 27, 46],
      overflows: true
    }]]
  });
  assert(
    badLegible.pass === false &&
      badLegible.frame0ShowsAllStageLabels === false &&
      badLegible.captions[0].passReadingTime === false &&
      badLegible.captions[0].passContrast === false &&
      badLegible.captions[0].overflows === true,
    `Negative Gate 3 (Legibility): catches missing stage, short reading time, low contrast (${badLegible.captions[0].contrastRatio}:1), and overflow`
  );

  // 1e. Video box legibility positive & negative
  const boxCanvas = new BitmapBuffer(320, 120);
  boxCanvas.fillRect(0, 0, 320, 120, "#0A0C18");
  boxCanvas.fillRect(40, 70, 240, 30, "#171B2E");
  boxCanvas.drawText("READABLE", 60, 78, "#FFFFFF", 2);
  const goodVidLeg = analyzeVideoLegibility([boxCanvas.data, boxCanvas.data], 320, 120, {
    seconds: 4,
    steps: [{ from: 0, to: 4, caption: "readable text", box: { x: 40, y: 70, width: 240, height: 30 } }]
  });
  assert(
    goodVidLeg.pass === true && goodVidLeg.captions[0].contrastRatio >= 4.5,
    `Video pixel-box legibility passes on high-contrast box (${goodVidLeg.captions[0].contrastRatio}:1)`
  );

  const lowBoxCanvas = new BitmapBuffer(320, 120);
  lowBoxCanvas.fillRect(0, 0, 320, 120, "#171B2E");
  lowBoxCanvas.drawText("LOW", 60, 78, "#222740", 2);
  const badVidLeg = analyzeVideoLegibility([lowBoxCanvas.data, lowBoxCanvas.data], 320, 120, {
    seconds: 4,
    steps: [{ from: 0, to: 4, caption: "low contrast", box: { x: 40, y: 70, width: 240, height: 30 } }]
  });
  assert(
    badVidLeg.pass === false && badVidLeg.captions[0].passContrast === false,
    `Negative Gate 4 (Video Box Contrast): catches low-contrast video box (${badVidLeg.captions[0].contrastRatio}:1)`
  );

  // 1f. Strict Source-Drift Checks
  const badFileSources = analyzeSources({ steps: [{ from: 0, to: 3, caption: "a", source: "src/does-not-exist.js:12" }] }, REPO_ROOT);
  const traversalSources = analyzeSources({ steps: [{ from: 0, to: 3, caption: "a", source: "../outside.js:1" }] }, REPO_ROOT);
  const badRangeSources = analyzeSources({ steps: [{ from: 0, to: 3, caption: "a", source: "package.json:9999" }] }, REPO_ROOT);
  const driftSources = analyzeSources({
    steps: [{ from: 0, to: 3, caption: "a", source: "package.json:1-5", match: "NONEXISTENT_SYMBOL_999" }]
  }, REPO_ROOT);
  const validSources = analyzeSources({
    steps: [{ from: 0, to: 3, caption: "a", source: "package.json:1-6", match: ["loop-studio", "2.0.0"] }]
  }, REPO_ROOT);

  assert(badFileSources.pass === false, "Negative Gate 5a (Missing Source): rejects nonexistent file");
  assert(traversalSources.pass === false, "Negative Gate 5b (Path Traversal): rejects ../ path outside repo");
  assert(badRangeSources.pass === false, "Negative Gate 5c (Out-of-Range Line): rejects line beyond EOF");
  assert(driftSources.pass === false, "Negative Gate 5d (Doc Drift): rejects missing match token near cited line");
  assert(validSources.pass === true, "Valid source range + match token passes strict source-check");

  // 1g. PNG + GIF89a + Harness Theme Contrast Tokens
  const pngBuf = encodePNG(smoothFrames[0], 96, 96);
  const decoded = decodePNG(pngBuf);
  const gifBuf = encodeGIF(smoothFrames.slice(0, 6), 96, 96, 12);
  const darkHarness = buildHarnessDocument({
    absDir: path.join(REPO_ROOT, "examples", "ui-showcase"),
    meta: { width: 800, height: 420, palette: "studio-dark" },
    theme: "dark"
  });
  const lightHarness = buildHarnessDocument({
    absDir: path.join(REPO_ROOT, "examples", "ui-showcase"),
    meta: { width: 800, height: 420, palette: "studio-dark" },
    theme: "light"
  });

  assert(decoded.width === 96 && decoded.height === 96 && decoded.data.length === 96 * 96 * 4, "PNG encode/decode roundtrip matches dimensions");
  assert(gifBuf.subarray(0, 6).toString("ascii") === "GIF89a" && gifBuf.length > 100, "Delta GIF89a encoder outputs valid GIF header");
  assert(
    darkHarness.html.includes("--loop-on-accent: #090C16") && lightHarness.html.includes("--loop-on-accent: #FFFFFF"),
    "Harness auto-computes WCAG-safe --loop-on-accent for dark (#090C16) and light (#FFFFFF) themes"
  );

  // 1h. Unified diff parser & code highlighter
  const samplePatch = [
    "diff --git a/tool/lib/renderer.js b/tool/lib/renderer.js",
    "--- a/tool/lib/renderer.js",
    "+++ b/tool/lib/renderer.js",
    "@@ -8,2 +8,3 @@ export function chooseEngine({ engine = \"auto\" } = {}) {",
    "-  const caps = {};",
    "+  const caps = detectCapabilities();",
    "+  return caps.browserEngine;"
  ].join("\n");
  const parsedDiff = parseUnifiedDiff(samplePatch, 6);
  const hl = highlightCodeLine("const x = detectCapabilities(); // check");
  assert(
    parsedDiff && parsedDiff.file === "tool/lib/renderer.js" && parsedDiff.delCount === 1 && parsedDiff.addCount === 2 && parsedDiff.startLine === 8,
    "parseUnifiedDiff extracts file path, line range, and +/- hunk counts"
  );
  assert(
    hl.includes('<span class="kw">const</span>') && hl.includes('<span class="fn">detectCapabilities</span>') && hl.includes('<span class="cm">// check</span>'),
    "highlightCodeLine tokenizes keywords, function calls, and comments"
  );
}

function testBrowserEndToEnd() {
  const caps = detectCapabilities();
  console.log(`\n=== 2. Browser Integration Tests (engine=${caps.browserEngine || "none"}) ===`);

  if (!caps.browserEngine) {
    if (process.env.CI) {
      assert(false, "CI browser engine check: expected macOS WebKit or Chromium in CI");
    } else {
      console.log("  SKIP  No browser engine (macOS WebKit or Chrome/Chromium) found locally.");
    }
    return;
  }

  // Test `loop new --template html` in a temp workspace inside REPO_ROOT
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loop-e2e-"));
  try {
    const newDir = path.join(tmpRoot, "demo");
    const newRes = runCli(["new", newDir, "--template", "html"]);
    assert(newRes.status === 0 && fs.existsSync(path.join(newDir, "scene.html")), "`loop new --template html` scaffolds scene.html + showcase.json");

    // Point tmp demo's source citations to REPO_ROOT via --repo
    const tmpAudit = runCli(["audit", newDir, "--repo", REPO_ROOT, "--themes", "dark,light"]);
    assert(tmpAudit.status === 0, "Scaffolded html template passes dual-theme `loop audit --themes dark,light`", tmpAudit.stderr || tmpAudit.stdout);

    // Copy examples to tmpRoot so repo working tree stays spotless during tests
    for (const exName of ["code-diff", "ui-showcase", "cli-terminal", "architecture-flow", "benchmark-compare", "shader-hero"]) {
      const dst = path.join(tmpRoot, exName);
      fs.cpSync(path.join(REPO_ROOT, "examples", exName), dst, { recursive: true });
    }

    const diffAudit = runCli(["audit", path.join(tmpRoot, "code-diff"), "--repo", REPO_ROOT, "--themes", "dark,light"]);
    assert(diffAudit.status === 0, "examples/code-diff passes dual-theme (dark+light) seam, contrast & doc-drift audit", diffAudit.stderr || diffAudit.stdout);

    const uiAudit = runCli(["audit", path.join(tmpRoot, "ui-showcase"), "--repo", REPO_ROOT, "--themes", "dark,light"]);
    assert(uiAudit.status === 0, "examples/ui-showcase passes dual-theme (dark+light) seam, contrast & doc-drift audit", uiAudit.stderr || uiAudit.stdout);

    for (const exName of ["cli-terminal", "architecture-flow", "benchmark-compare"]) {
      const res = runCli(["audit", path.join(tmpRoot, exName), "--repo", REPO_ROOT, "--themes", "dark,light"]);
      assert(res.status === 0, `examples/${exName} passes dual-theme (dark+light) seam, contrast & doc-drift audit`, res.stderr || res.stdout);
    }

    // Test `loop diff` generator end-to-end from a real patch file
    const patchPath = path.join(tmpRoot, "sample.diff");
    fs.writeFileSync(
      patchPath,
      [
        "diff --git a/tool/lib/renderer.js b/tool/lib/renderer.js",
        "--- a/tool/lib/renderer.js",
        "+++ b/tool/lib/renderer.js",
        "@@ -8,2 +8,3 @@",
        "-export function chooseEngine() {",
        "+export function chooseEngine({ engine = \"auto\" } = {}) {",
        "+  const caps = detectCapabilities();"
      ].join("\n"),
      "utf8"
    );
    const genDiffDir = path.join(tmpRoot, "gen-diff");
    const genDiffRes = runCli(["diff", genDiffDir, "--file", patchPath, "--repo", REPO_ROOT, "--fps", "20"]);
    assert(genDiffRes.status === 0 && fs.existsSync(path.join(genDiffDir, "scene.html")), "`loop diff --file` generates dual-theme diff scene");
    const genDiffAudit = runCli(["audit", genDiffDir, "--repo", REPO_ROOT, "--themes", "dark,light"]);
    assert(genDiffAudit.status === 0, "`loop diff` generated scene passes dual-theme `loop audit`", genDiffAudit.stderr || genDiffAudit.stdout);

    // Test `loop term` generator end-to-end from a real CLI command
    const genTermDir = path.join(tmpRoot, "gen-term");
    const genTermRes = runCli(["term", genTermDir, "--cmd", "node ./tool/bin/loop.js doctor", "--label", "loop doctor", "--repo", REPO_ROOT, "--fps", "20"]);
    assert(genTermRes.status === 0 && fs.existsSync(path.join(genTermDir, "scene.html")), "`loop term --cmd` captures CLI output into scene.html");
    const genTermAudit = runCli(["audit", genTermDir, "--repo", REPO_ROOT, "--themes", "dark,light"]);
    assert(genTermAudit.status === 0, "`loop term` generated scene passes dual-theme `loop audit`", genTermAudit.stderr || genTermAudit.stdout);

    const storyRes = runCli(["story", path.join(tmpRoot, "code-diff")]);
    assert(
      storyRes.status === 0 && fs.existsSync(path.join(tmpRoot, "code-diff", "storyboard.png")),
      "`loop story` builds storyboard.png via real browser backend",
      storyRes.stderr || storyRes.stdout
    );

    const renderRes = runCli([
      "render",
      path.join(tmpRoot, "code-diff"),
      "--themes", "dark,light",
      "--formats", "gif,png",
      "--fps", "12",
      "--max-kb", "2048"
    ]);
    const renderOut = renderRes.stdout || "";
    assert(
      renderRes.status === 0 &&
        fs.existsSync(path.join(tmpRoot, "code-diff", "showcase-dark.gif")) &&
        fs.existsSync(path.join(tmpRoot, "code-diff", "showcase-light.gif")) &&
        renderOut.includes("<picture>"),
      "`loop render --themes dark,light` produces dark/light GIFs + <picture> README snippet under budget",
      renderRes.stderr || renderOut
    );

    const shaderSeam = runCli(["seam", path.join(tmpRoot, "shader-hero"), "--fps", "12", "--seconds", "2"]);
    assert(shaderSeam.status === 0, "examples/shader-hero (WebGL2 GLSL) passes `loop seam`", shaderSeam.stderr || shaderSeam.stdout);

    // Negative CLI exit-code test on missing video
    const missingVid = runCli(["audit", path.join(tmpRoot, "missing.mp4")]);
    assert(missingVid.status === 2, "`loop audit missing.mp4` exits with code 2 on missing input");
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

function testExternalVideoAudit() {
  const caps = detectCapabilities();
  console.log(`\n=== 3. External Video Audit Tests (ffmpeg=${caps.ffmpeg ? "present" : "absent"}) ===`);
  if (!caps.ffmpeg) {
    console.log("  SKIP  ffmpeg not installed locally (install `ffmpeg` to enable external MP4/WebP/WebM video decoding tests).");
    return;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "loop-vid-"));
  try {
    const N = 16;
    const rawPath = path.join(tmpDir, "frames.rgba");
    const fd = fs.openSync(rawPath, "w");
    for (let f = 0; f < N; f++) {
      const ang = (f / N) * Math.PI * 2;
      fs.writeSync(fd, makeCircleFrame(160, 96, 80 + Math.cos(ang) * 30, 48 + Math.sin(ang) * 16, 10, "#FF6B9D", "#0A0C18"));
    }
    fs.closeSync(fd);

    const mp4Path = path.join(tmpDir, "loop.mp4");
    const enc = spawnSync(caps.ffmpegPath, [
      "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", "160x96", "-r", "16", "-i", rawPath,
      "-c:v", "libx264", "-pix_fmt", "yuv420p", mp4Path
    ]);
    assert(enc.status === 0 && fs.existsSync(mp4Path), "Encoded synthetic MP4 via ffmpeg");

    const vidAudit = runCli(["audit", mp4Path]);
    assert(vidAudit.status === 0, "`loop audit loop.mp4` passes on smooth external MP4", vidAudit.stderr || vidAudit.stdout);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function main() {
  testCoreAnalyzersAndGates();
  testBrowserEndToEnd();
  testExternalVideoAudit();

  console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main();
