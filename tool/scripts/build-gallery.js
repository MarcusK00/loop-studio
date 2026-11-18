// Loop Studio — Gallery Builder
// Builds and renders all 6 official gallery fixtures (2 showcase loops + 4 ambient loops)
// along with their contact sheets, storyboards, audit reports, posters, and animated GIFs.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { encodePNG, encodeGIF } from "../lib/encoders.js";
import { analyzeSeam, analyzeLegibility, analyzeSources } from "../lib/analyzers.js";
import { renderAllFrames, renderContactSheet, renderStoryboard } from "../lib/compositor.js";
import { generatePreviewHtml } from "../lib/server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");

const GALLERY_ITEMS = [
  {
    id: "loop-studio",
    title: "Loop Studio Showcase (Flow Pipeline)",
    mode: "showcase",
    scene: "flow",
    palette: "studio-dark",
    prompt: "Make me a 10 second video that loops smoothly about this repo and what it does.",
    showcase: {
      title: "Loop Studio Showcase",
      says: "Loop Studio turns a one-line request into a checked, seamless loop.",
      seconds: 10,
      fps: 16,
      width: 800,
      height: 360,
      palette: "studio-dark",
      scene: "flow",
      stage: ["request", "sketch", "check", "loop.gif"],
      steps: [
        { from: 8.75, to: 1.25, caption: "a request arrives: \"deep sea, square\"", source: "docs/contract.md:3" },
        { from: 1.25, to: 3.75, caption: "sketch is drawn from the phase", source: "docs/contract.md:14" },
        { from: 3.75, to: 6.25, caption: "seam and legibility are measured", source: "docs/tool.md:14" },
        { from: 6.25, to: 8.75, caption: "the verified loop drops out", source: "docs/tool.md:24" }
      ]
    }
  },
  {
    id: "cli-audit-session",
    title: "Loop CLI Audit Showcase (Terminal)",
    mode: "showcase",
    scene: "terminal",
    palette: "phosphor",
    prompt: "Animate how the loop CLI audits a sketch for seam continuity and WCAG legibility.",
    showcase: {
      title: "Loop CLI Audit Session",
      says: "The loop CLI audits any sketch for seam jumps, caption legibility, and source citations before rendering.",
      seconds: 10,
      fps: 16,
      width: 800,
      height: 320,
      palette: "phosphor",
      scene: "terminal",
      stage: ["$ loop audit ./demo", "seam: 1.04 PASS", "legible: 4.5:1 PASS", "render: loop.gif"],
      steps: [
        { from: 8.75, to: 1.25, caption: "run `loop audit` on sketch folder", source: "docs/tool.md:22" },
        { from: 1.25, to: 3.75, caption: "measures frame deltas & seam score", source: "docs/tool.md:14" },
        { from: 3.75, to: 6.25, caption: "verifies WCAG contrast & sources", source: "docs/tool.md:17" },
        { from: 6.25, to: 8.75, caption: "encodes verified loop.gif & poster", source: "docs/tool.md:24" }
      ]
    }
  },
  {
    id: "deep-sea-orbits",
    title: "Abyssal Bioluminescence (Particle Orbit)",
    mode: "ambient",
    style: "particle-orbit",
    palette: "abyss",
    prompt: "Make a 4-second square loop. Deep sea, slow, bioluminescent.",
    brief: {
      title: "Abyssal Bioluminescence",
      prompt: "Make a 4-second square loop. Deep sea, slow, bioluminescent.",
      mode: "ambient",
      style: "particle-orbit",
      palette: "abyss",
      seconds: 4,
      fps: 20,
      width: 320,
      height: 320,
      seed: 42
    }
  },
  {
    id: "aurora-flow-field",
    title: "Arctic Currents (Flow Field)",
    mode: "ambient",
    style: "flow-field",
    palette: "aurora",
    prompt: "Drifting aurora currents, organic silk streamlines, 4-second loop.",
    brief: {
      title: "Arctic Currents",
      prompt: "Drifting aurora currents, organic silk streamlines, 4-second loop.",
      mode: "ambient",
      style: "flow-field",
      palette: "aurora",
      seconds: 4,
      fps: 20,
      width: 320,
      height: 320,
      seed: 17
    }
  },
  {
    id: "nordic-isometric",
    title: "Harmonic Architecture (Isometric Grid)",
    mode: "ambient",
    style: "isometric-grid",
    palette: "nordic",
    prompt: "Clean architectural blocks on an isometric grid rising and falling in waves.",
    brief: {
      title: "Harmonic Architecture",
      prompt: "Clean architectural blocks on an isometric grid rising and falling in waves.",
      mode: "ambient",
      style: "isometric-grid",
      palette: "nordic",
      seconds: 4,
      fps: 20,
      width: 320,
      height: 320,
      seed: 73
    }
  },
  {
    id: "cad-planetary",
    title: "Epicyclic Telemetry (Blueprint CAD)",
    mode: "ambient",
    style: "blueprint-cad",
    palette: "blueprint",
    prompt: "Precision engineering blueprint with planetary gear linkages rotating at 1x and -2x harmonic speeds.",
    brief: {
      title: "Epicyclic Telemetry",
      prompt: "Precision engineering blueprint with planetary gear linkages rotating at 1x and -2x harmonic speeds.",
      mode: "ambient",
      style: "blueprint-cad",
      palette: "blueprint",
      seconds: 4,
      fps: 20,
      width: 320,
      height: 320,
      seed: 79
    }
  }
];

async function buildItem(item) {
  const dir = path.join(REPO_ROOT, "gallery", item.id);
  fs.mkdirSync(dir, { recursive: true });

  const templatePath =
    item.mode === "showcase"
      ? path.join(REPO_ROOT, "skills", "scenes", item.scene, "template.js")
      : path.join(REPO_ROOT, "skills", "styles", item.style, "template.js");

  let sketchCode = fs.readFileSync(templatePath, "utf8");
  const spec = item.mode === "showcase" ? item.showcase : item.brief;
  sketchCode = sketchCode
    .replace(/fps:\s*\d+/, `fps: ${spec.fps}`)
    .replace(/width:\s*\d+/, `width: ${spec.width}`)
    .replace(/height:\s*\d+/, `height: ${spec.height}`)
    .replace(/palette:\s*"[^"]+"/, `palette: "${item.palette}"`);

  const sketchPath = path.join(dir, "sketch.js");
  fs.writeFileSync(sketchPath, sketchCode, "utf8");

  if (item.mode === "showcase") {
    fs.writeFileSync(path.join(dir, "showcase.json"), JSON.stringify(item.showcase, null, 2) + "\n", "utf8");
  } else {
    fs.writeFileSync(path.join(dir, "brief.json"), JSON.stringify(item.brief, null, 2) + "\n", "utf8");
  }
  fs.writeFileSync(path.join(dir, "index.html"), generatePreviewHtml(item.title), "utf8");

  const sketchModule = await import(pathToFileURL(sketchPath).href + `?t=${Date.now()}`);
  const meta = { ...sketchModule.meta, ...spec };

  // 1. Render all frames
  const { frames, width, height, fps, totalFrames } = renderAllFrames(sketchModule, {
    ...meta,
    showcase: item.showcase
  });

  // 2. Poster & GIF
  const posterBuf = encodePNG(frames[0], width, height);
  fs.writeFileSync(path.join(dir, "poster.png"), posterBuf);

  const gifBuf = encodeGIF(frames, width, height, fps);
  const gifName = item.mode === "showcase" ? "showcase.gif" : "loop.gif";
  fs.writeFileSync(path.join(dir, gifName), gifBuf);
  if (item.mode === "showcase") {
    fs.writeFileSync(path.join(dir, "loop.gif"), gifBuf);
  }

  // 3. Contact sheet or storyboard
  const sheetCanvas = renderContactSheet(sketchModule, { ...meta, showcase: item.showcase, cols: 4 });
  fs.writeFileSync(path.join(dir, "sheet.png"), encodePNG(sheetCanvas.data, sheetCanvas.width, sheetCanvas.height));

  if (item.mode === "showcase") {
    const boardCanvas = renderStoryboard(sketchModule, item.showcase, meta);
    fs.writeFileSync(path.join(dir, "storyboard.png"), encodePNG(boardCanvas.data, boardCanvas.width, boardCanvas.height));
  }

  // 4. Seam, Legibility, Sources, Audit
  const seam = analyzeSeam(frames, width, height);
  fs.writeFileSync(path.join(dir, "seam.json"), JSON.stringify(seam, null, 2) + "\n", "utf8");

  const legible = analyzeLegibility(sketchModule, item.showcase, meta);
  fs.writeFileSync(path.join(dir, "legible.json"), JSON.stringify(legible, null, 2) + "\n", "utf8");

  const sources = analyzeSources(item.showcase, REPO_ROOT);
  fs.writeFileSync(path.join(dir, "sources.json"), JSON.stringify(sources, null, 2) + "\n", "utf8");

  const audit = {
    id: item.id,
    title: item.title,
    mode: item.mode,
    pass: seam.pass && legible.pass && sources.pass,
    seamScore: seam.seamScore,
    duplicateFrames: seam.duplicateFrames,
    flickerScore: seam.flickerScore,
    legiblePass: legible.pass,
    sourcesPass: sources.pass,
    gifKB: Number((gifBuf.length / 1024).toFixed(1)),
    totalFrames
  };
  fs.writeFileSync(path.join(dir, "audit.json"), JSON.stringify(audit, null, 2) + "\n", "utf8");
  return audit;
}

async function main() {
  const results = [];
  for (const item of GALLERY_ITEMS) {
    const res = await buildItem(item);
    results.push(res);
    console.log(`[Gallery] ${res.id}: pass=${res.pass} seam=${res.seamScore} dup=${res.duplicateFrames} gif=${res.gifKB}KB`);
  }
  fs.writeFileSync(
    path.join(REPO_ROOT, "gallery", "manifest.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), items: results }, null, 2) + "\n",
    "utf8"
  );
}

main();
