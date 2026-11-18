// Loop Studio — Comprehensive Automated Eval Suite (`npm test`)
// Verifies:
// 1. All 8 Scene Pack templates and 8 Style Pack templates pass seam & duplicate checks.
// 2. All 6 Gallery fixtures pass seam, legibility (WCAG 4.5:1 + reading time), and source citation checks.
// 3. Stage 4 Negative Gate: 3 deliberately broken loops (seam jump, unreadable caption, invented file:line source)
//    each fail the exact check designed to catch them.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { analyzeSeam, analyzeLegibility, analyzeSources } from "../lib/analyzers.js";
import { renderAllFrames } from "../lib/compositor.js";
import { detectCapabilities, encodeAnimatedWebP } from "../lib/encoders.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");

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

async function testTemplates() {
  console.log("\n=== 1. Scene & Style Pack Templates (16 Packs) ===");
  const scenes = ["flow", "transform", "terminal", "code", "interface", "structure", "architecture", "benchmark"];
  for (const s of scenes) {
    const p = path.join(REPO_ROOT, "skills", "scenes", s, "template.js");
    const mod = await import(pathToFileURL(p).href);
    const { frames, width, height } = renderAllFrames(mod, { width: 400, height: 160, fps: 12, seconds: 10 });
    const seam = analyzeSeam(frames, width, height);
    const legible = analyzeLegibility(mod, mod.showcase);
    const sources = analyzeSources(mod.showcase, REPO_ROOT);
    assert(
      seam.pass && legible.pass && sources.pass,
      `scene/${s} template passes seam (${seam.seamScore}), legible, and source checks`,
      JSON.stringify([...seam.reasons, ...legible.reasons, ...sources.reasons])
    );
  }

  const styles = [
    "flow-field",
    "particle-orbit",
    "sdf-raymarch",
    "kinetic-type",
    "dither-mono",
    "isometric-grid",
    "blueprint-cad",
    "topographic-contour"
  ];
  for (const st of styles) {
    const p = path.join(REPO_ROOT, "skills", "styles", st, "template.js");
    const mod = await import(pathToFileURL(p).href);
    const { frames, width, height } = renderAllFrames(mod, { width: 200, height: 200, fps: 12, seconds: 4 });
    const seam = analyzeSeam(frames, width, height);
    assert(
      seam.pass,
      `style/${st} template passes seam check (seamScore=${seam.seamScore}, dup=${seam.duplicateFrames})`,
      seam.reasons.join("; ")
    );
  }
}

function testNegativeGates() {
  console.log("\n=== 2. Stage 4 Negative Verification Gates (3 Broken Fixtures) ===");

  // Negative 1: Broken Seam (1.5 fractional cycles -> sudden jump at phase 1 -> 0)
  const brokenSeamSketch = {
    meta: { seconds: 4, fps: 16, width: 160, height: 160 },
    render(ctx, phase) {
      ctx.fillStyle = "#0A0C18";
      ctx.fillRect(0, 0, 160, 160);
      // Deliberate mistake: non-integer 1.5 cycle frequency moves block from left to right without returning!
      const x = 20 + ((phase * 1.5) % 1) * 120;
      ctx.fillStyle = "#FF6B9D";
      ctx.fillRect(x - 18, 60, 36, 36);
    }
  };
  const { frames, width, height } = renderAllFrames(brokenSeamSketch);
  const badSeamReport = analyzeSeam(frames, width, height);
  assert(
    badSeamReport.pass === false && badSeamReport.seamScore > 1.5,
    `Negative Gate 1 (Seam Jump): catches 1.5-cycle jump (seamScore=${badSeamReport.seamScore} > 1.5)`
  );

  // Negative 2: Unreadable Caption (low contrast + insufficient reading time)
  const unreadableShowcase = {
    says: "Broken showcase with unreadable text.",
    seconds: 10,
    stage: ["one", "two"],
    steps: [
      {
        from: 0,
        to: 1.0, // Only 1.0s for an 11-word caption (requires 0.5 + 0.3*11 = 3.8s!)
        caption: "this caption is far too long and low contrast to read quickly",
        source: "README.md:1"
      }
    ]
  };
  const unreadableSketch = {
    meta: { mode: "showcase", seconds: 10, fps: 12, width: 800, height: 320 },
    render(ctx) {
      ctx.fillStyle = "#171B2E";
      ctx.fillRect(0, 0, 800, 320);
      ctx.font = "500 13px monospace";
      // Deliberately low contrast (#222740 on #171B2E -> ~1.18:1 contrast!)
      ctx.fillStyle = "#222740";
      ctx.fillText(unreadableShowcase.steps[0].caption, 400, 270);
    }
  };
  const badLegibleReport = analyzeLegibility(unreadableSketch, unreadableShowcase);
  assert(
    badLegibleReport.pass === false &&
      badLegibleReport.captions[0].passReadingTime === false &&
      badLegibleReport.captions[0].passContrast === false,
    `Negative Gate 2 (Unreadable Caption): catches both reading-time violation and low contrast (${badLegibleReport.captions[0].contrastRatio}:1 < 4.5:1)`
  );

  // Negative 3: Invented Feature / Fake Source Citation
  const fakeSourceShowcase = {
    says: "Showcase citing a nonexistent file and out-of-range line.",
    seconds: 10,
    steps: [
      {
        from: 0,
        to: 5,
        caption: "quantum blockchain teleportation module activates",
        source: "src/nonexistent-quantum-teleport.js:999"
      }
    ]
  };
  const badSourceReport = analyzeSources(fakeSourceShowcase, REPO_ROOT);
  assert(
    badSourceReport.pass === false && badSourceReport.citations[0].valid === false,
    `Negative Gate 3 (Invented Feature / Fake Source): catches nonexistent file:line citation`
  );

  // Save negative eval summary in evals/
  const evalDir = path.join(REPO_ROOT, "evals");
  fs.mkdirSync(evalDir, { recursive: true });
  fs.writeFileSync(
    path.join(evalDir, "latest-results.json"),
    JSON.stringify(
      {
        negativeGates: {
          brokenSeam: { pass: badSeamReport.pass, seamScore: badSeamReport.seamScore },
          unreadableCaption: { pass: badLegibleReport.pass, contrast: badLegibleReport.captions[0].contrastRatio },
          inventedSource: { pass: badSourceReport.pass, citation: badSourceReport.citations[0] }
        }
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
}

function testGalleryArtifacts() {
  console.log("\n=== 3. Rendered Gallery Artifacts (6 Loops) ===");
  const manifestPath = path.join(REPO_ROOT, "gallery", "manifest.json");
  assert(fs.existsSync(manifestPath), "gallery/manifest.json exists");
  if (!fs.existsSync(manifestPath)) return;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const item of manifest.items) {
    const dir = path.join(REPO_ROOT, "gallery", item.id);
    const gifFile = path.join(dir, item.mode === "showcase" ? "showcase.gif" : "loop.gif");
    const posterFile = path.join(dir, "poster.png");
    assert(
      item.pass && fs.existsSync(gifFile) && fs.existsSync(posterFile),
      `gallery/${item.id} rendered & audited (seamScore=${item.seamScore}, gif=${item.gifKB}KB)`
    );
  }
}

async function testHighFpsRendering() {
  console.log("\n=== 4. High-FPS (60 fps) Video Pipeline ===");
  const p = path.join(REPO_ROOT, "skills", "styles", "particle-orbit", "template.js");
  const mod = await import(pathToFileURL(p).href);
  const { frames, width, height, fps, totalFrames } = renderAllFrames(mod, {
    width: 160,
    height: 160,
    seconds: 1,
    fps: 60
  });
  const seam = analyzeSeam(frames, width, height);
  assert(
    fps === 60 && totalFrames === 60 && frames.length === 60 && seam.pass,
    `60fps render produces 60 exact frames with passing seam (seamScore=${seam.seamScore}, dup=${seam.duplicateFrames})`
  );

  const caps = detectCapabilities();
  if (caps.cwebpPath && caps.webpmuxPath) {
    const tmpWebp = path.join(os.tmpdir(), `loop-eval-60fps-${process.pid}.webp`);
    try {
      const res = encodeAnimatedWebP(frames.slice(0, 12), width, height, 60, tmpWebp);
      const header = fs.readFileSync(tmpWebp).subarray(0, 12).toString("ascii");
      assert(
        res.bytes > 0 && header.startsWith("RIFF") && header.endsWith("WEBP"),
        `60fps Animated WebP encodes cleanly (${res.bytes} bytes via ${res.backend})`
      );
    } finally {
      if (fs.existsSync(tmpWebp)) fs.unlinkSync(tmpWebp);
    }
  }
}

async function main() {
  await testTemplates();
  testNegativeGates();
  testGalleryArtifacts();
  await testHighFpsRendering();

  console.log(`\n========================================`);
  console.log(`Loop Studio Evals: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);
  if (failed > 0) process.exit(1);
}

main();
