// Loop Studio — Gallery Builder
// Builds and renders all 12 official gallery fixtures (4 showcase loops + 8 ambient loops)
// along with their contact sheets, storyboards, audit reports, posters, GIFs, and high-FPS WebPs.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { encodePNG, encodeGIF, encodeAnimatedWebP, detectCapabilities } from "../lib/encoders.js";
import { analyzeSeam, analyzeLegibility, analyzeSources } from "../lib/analyzers.js";
import { renderAllFrames, renderContactSheet, renderStoryboard } from "../lib/compositor.js";
import { generatePreviewHtml } from "../lib/server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");

const GALLERY_ITEMS = [
  // === Showcase Loops ===
  {
    id: "loop-studio",
    title: "Loop Studio Showcase (Flow Pipeline)",
    mode: "showcase",
    scene: "flow",
    palette: "studio-dark",
    useCase: "README hero diagram explaining what a repo or workflow does end-to-end",
    prompt: "Make me an 8 second 60fps video that loops smoothly about this repo and what it does.",
    showcase: {
      title: "Loop Studio Showcase",
      says: "Loop Studio turns a one-line request into a checked, seamless loop.",
      seconds: 8,
      fps: 60,
      width: 640,
      height: 288,
      palette: "studio-dark",
      scene: "flow",
      stage: ["request", "sketch", "check", "loop.gif"],
      steps: [
        { from: 7.0, to: 1.0, caption: "request arrives: \"deep sea, square\"", source: "docs/contract.md:3" },
        { from: 1.0, to: 3.0, caption: "sketch draws from phase", source: "docs/contract.md:14" },
        { from: 3.0, to: 5.0, caption: "seam and contrast measured", source: "docs/tool.md:14" },
        { from: 5.0, to: 7.0, caption: "verified 60fps loop drops out", source: "docs/tool.md:24" }
      ]
    }
  },
  {
    id: "cli-audit-session",
    title: "Loop CLI Audit Showcase (Terminal)",
    mode: "showcase",
    scene: "terminal",
    palette: "phosphor",
    useCase: "CLI documentation showing commands, flags, and pass/fail audit output",
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
    id: "api-pipeline-code",
    title: "Phase Contract SDK Showcase (Code)",
    mode: "showcase",
    scene: "code",
    palette: "studio-dark",
    useCase: "SDK / library docs pairing live-stepping code with a synchronized state monitor",
    prompt: "Show how the render(ctx, phase) SDK contract executes line-by-line.",
    showcase: {
      title: "Phase Contract SDK Showcase",
      says: "Every Loop Studio sketch exports meta and a pure render(ctx, phase) function.",
      seconds: 10,
      fps: 20,
      width: 800,
      height: 320,
      palette: "studio-dark",
      scene: "code",
      stage: [
        "export const meta = { seconds: 4 };",
        "export function render(ctx, phase) {",
        "  const a = phase * Math.PI * 2;",
        "  drawOrbit(ctx, a); // seam 1.00"
      ],
      steps: [
        { from: 8.75, to: 1.25, caption: "declare duration and fps in meta", source: "rules/AGENTS.md:8" },
        { from: 1.25, to: 3.75, caption: "pass normalized phase to render()", source: "rules/AGENTS.md:17" },
        { from: 3.75, to: 6.25, caption: "convert phase to integer cycles", source: "skills/loop-math/SKILL.md:22" },
        { from: 6.25, to: 8.75, caption: "last frame meets frame 0 cleanly", source: "skills/loop-render/SKILL.md:30" }
      ]
    }
  },
  {
    id: "mcp-mesh-topology",
    title: "Agent Orchestrator Mesh (Architecture)",
    mode: "showcase",
    scene: "architecture",
    palette: "aurora",
    useCase: "System architecture & multi-agent/MCP topology diagrams for engineering RFCs",
    prompt: "Animate how the Loop Studio agent coordinates the CLI, seam auditor, and cold-reader subagent.",
    showcase: {
      title: "Agent Orchestrator Mesh",
      says: "The Loop Studio orchestrator coordinates the CLI renderer, seam analyzer, and cold-read subagent.",
      seconds: 10,
      fps: 20,
      width: 800,
      height: 320,
      palette: "aurora",
      scene: "architecture",
      stage: ["Agent", "loop CLI", "Seam Audit", "Cold Reader"],
      steps: [
        { from: 8.75, to: 1.25, caption: "agent scaffolds sketch via loop CLI", source: "AGENTS.md:9" },
        { from: 1.25, to: 3.75, caption: "CLI renders storyboard & frame deltas", source: "skills/loop-render/SKILL.md:24" },
        { from: 3.75, to: 6.25, caption: "cold-reader inspects storyboard.png", source: "agents/loop-cold-reader.md:10" },
        { from: 6.25, to: 8.75, caption: "verified loop.gif & audit return", source: "skills/loop-audit/SKILL.md:9" }
      ]
    }
  },

  // === Ambient Loops ===
  {
    id: "deep-sea-orbits",
    title: "Abyssal Bioluminescence (Particle Orbit)",
    mode: "ambient",
    style: "particle-orbit",
    palette: "abyss",
    useCase: "Calm ambient background for dark-mode apps, streams, and loading states",
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
    useCase: "Organic generative header for landing pages, music visualizers, and project banners",
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
    useCase: "Infrastructure, cloud platform, and modular architecture hero tiles",
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
    useCase: "Robotics, hardware, CAD, and precision engineering repo badges",
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
  },
  {
    id: "readme-hero-3d",
    title: "Nebula SDF Sculpture (3D Raymarch)",
    mode: "ambient",
    style: "sdf-raymarch",
    palette: "nebula",
    useCase: "Zero-dependency 3D product showcase & smooth shader sculpture for SaaS hero cards",
    prompt: "30 fps 3D raymarched smooth-union torus and orbiting spheres in neon nebula lighting.",
    brief: {
      title: "Nebula SDF Sculpture",
      prompt: "30 fps 3D raymarched smooth-union torus and orbiting spheres in neon nebula lighting.",
      mode: "ambient",
      style: "sdf-raymarch",
      palette: "nebula",
      seconds: 3,
      fps: 30,
      width: 280,
      height: 280,
      seed: 53
    }
  },
  {
    id: "retro-crt-loader",
    title: "Amber CRT Radar (Bayer Dither)",
    mode: "ambient",
    style: "dither-mono",
    palette: "amber-crt",
    useCase: "Low-bandwidth terminal/game splash screen & zero-shimmer retro loading indicator",
    prompt: "30 fps retro amber CRT sphere and radar sweep using ordered 4x4 Bayer dithering.",
    brief: {
      title: "Amber CRT Radar",
      prompt: "30 fps retro amber CRT sphere and radar sweep using ordered 4x4 Bayer dithering.",
      mode: "ambient",
      style: "dither-mono",
      palette: "amber-crt",
      seconds: 3,
      fps: 30,
      width: 280,
      height: 280,
      seed: 67
    }
  },
  {
    id: "kinetic-release-banner",
    title: "Editorial Kinetic Wave (60 fps Type)",
    mode: "ambient",
    style: "kinetic-type",
    palette: "editorial",
    useCase: "60 fps social release announcement card, talk title slide, and launch banner",
    prompt: "Silky 60 fps 4-second editorial kinetic typography wave repeating PHASE 0→1.",
    brief: {
      title: "Editorial Kinetic Wave",
      prompt: "Silky 60 fps 4-second editorial kinetic typography wave repeating PHASE 0→1.",
      mode: "ambient",
      style: "kinetic-type",
      palette: "editorial",
      seconds: 4,
      fps: 60,
      width: 280,
      height: 280,
      seed: 61
    }
  },
  {
    id: "sonar-bathymetry",
    title: "Abyssal Bathymetry (Topographic Isolines)",
    mode: "ambient",
    style: "topographic-contour",
    palette: "abyss",
    useCase: "Geospatial, weather, sonar, and telemetry elevation background loops",
    prompt: "30 fps animated bathymetric contour isolines over a cyclic scalar noise field.",
    brief: {
      title: "Abyssal Bathymetry",
      prompt: "30 fps animated bathymetric contour isolines over a cyclic scalar noise field.",
      mode: "ambient",
      style: "topographic-contour",
      palette: "abyss",
      seconds: 3,
      fps: 30,
      width: 280,
      height: 280,
      seed: 83
    }
  },

  // === Longer 60 fps Multi-Act Storytelling & Audio/Telemetry Loops ===
  {
    id: "git-pr-guardrails",
    title: "Protected Git Workflow (8s @ 60fps)",
    mode: "showcase",
    scene: "flow",
    palette: "studio-dark",
    customSketch: true,
    useCase: "GitHub workflow & CI/CD guardrails explainer showing branch protection, evals, and PR merges",
    prompt: "8-second 60fps showcase animating feat/* -> PR + CI evals -> protected dev & main.",
    showcase: {
      title: "Protected Git Workflow (60fps)",
      says: "Branch guardrails block direct pushes and require passing CI evals before merging into dev and main.",
      seconds: 8,
      fps: 60,
      width: 640,
      height: 270,
      palette: "studio-dark",
      scene: "flow",
      stage: ["feat/*", "PR + CI", "dev", "main"],
      steps: [
        { from: 7.0, to: 1.0, caption: "branch feat/* forks from dev", source: ".github/workflows/ci.yml:5" },
        { from: 1.0, to: 3.0, caption: "CI runs 34 eval checks", source: ".github/workflows/ci.yml:19" },
        { from: 3.0, to: 5.0, caption: "CODEOWNERS approves the PR", source: ".github/CODEOWNERS:2" },
        { from: 5.0, to: 7.0, caption: "merged into dev & main", source: ".github/workflows/ci.yml:4" }
      ]
    }
  },
  {
    id: "json-to-gif-transform",
    title: "60fps Video Transformer (8s @ 60fps)",
    mode: "showcase",
    scene: "transform",
    palette: "abyss",
    customSketch: true,
    useCase: "Compiler, build pipeline, or media-processing explainer showing specs transforming into 60fps video",
    prompt: "8-second 60fps transform showcase turning brief.json into 480 audited frames and MP4/WebP.",
    showcase: {
      title: "60fps Video Transformer",
      says: "The Loop Studio transformer converts brief.json into 480 audited 60fps video frames.",
      seconds: 8,
      fps: 60,
      width: 640,
      height: 270,
      palette: "abyss",
      scene: "transform",
      stage: ["brief.json", "60 FPS", "MP4 + WebP"],
      steps: [
        { from: 7.0, to: 1.0, caption: "brief.json sets 60fps target", source: "skills/loop-brief/SKILL.md:31" },
        { from: 1.0, to: 3.0, caption: "renders 480 phase-exact frames", source: "rules/AGENTS.md:8" },
        { from: 3.0, to: 5.0, caption: "verifies seam score & contrast", source: "skills/loop-audit/SKILL.md:14" },
        { from: 5.0, to: 7.0, caption: "encodes 60fps MP4 & WebP", source: "skills/loop-render/SKILL.md:62" }
      ]
    }
  },
  {
    id: "live-audio-spectrum",
    title: "120 BPM Harmonic Spectrum (6s @ 60fps)",
    mode: "ambient",
    style: "kinetic-audio",
    palette: "ember",
    customSketch: true,
    useCase: "Music release loop, podcast player, and WebAudio/VST visualizer synced to 120 BPM (3 bars)",
    prompt: "6-second 60fps 120 BPM harmonic spectrum visualizer with macro phrase swell and oscilloscope wave.",
    brief: {
      title: "120 BPM Harmonic Spectrum",
      prompt: "6-second 60fps 120 BPM harmonic spectrum visualizer with macro phrase swell and oscilloscope wave.",
      mode: "ambient",
      style: "kinetic-audio",
      palette: "ember",
      seconds: 6,
      fps: 60,
      width: 340,
      height: 240,
      bpm: 120,
      seed: 120
    }
  },
  {
    id: "orbital-telemetry-watch",
    title: "Orbital Radar Telemetry (8s @ 60fps)",
    mode: "ambient",
    style: "blueprint-hud",
    palette: "blueprint",
    customSketch: true,
    useCase: "Satellite tracker, aerospace HUD, and DevOps live observability dashboard splash",
    prompt: "8-second 60fps blueprint radar HUD tracking 3 satellites on tilted elliptical orbits.",
    brief: {
      title: "Orbital Radar Telemetry",
      prompt: "8-second 60fps blueprint radar HUD tracking 3 satellites on tilted elliptical orbits.",
      mode: "ambient",
      style: "blueprint-hud",
      palette: "blueprint",
      seconds: 8,
      fps: 60,
      width: 300,
      height: 300,
      seed: 204
    }
  }
];

async function buildItem(item, caps) {
  const dir = path.join(REPO_ROOT, "gallery", item.id);
  fs.mkdirSync(dir, { recursive: true });

  const sketchPath = path.join(dir, "sketch.js");
  const spec = item.mode === "showcase" ? item.showcase : item.brief;
  if (!item.customSketch) {
    const templatePath =
      item.mode === "showcase"
        ? path.join(REPO_ROOT, "skills", "scenes", item.scene, "template.js")
        : path.join(REPO_ROOT, "skills", "styles", item.style, "template.js");

    let sketchCode = fs.readFileSync(templatePath, "utf8");
    sketchCode = sketchCode
      .replace(/seconds:\s*\d+/, `seconds: ${spec.seconds}`)
      .replace(/fps:\s*\d+/, `fps: ${spec.fps}`)
      .replace(/width:\s*\d+/, `width: ${spec.width}`)
      .replace(/height:\s*\d+/, `height: ${spec.height}`)
      .replace(/palette:\s*"[^"]+"/, `palette: "${item.palette}"`);
    fs.writeFileSync(sketchPath, sketchCode, "utf8");
  }

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
  const stem = item.mode === "showcase" ? "showcase" : "loop";
  fs.writeFileSync(path.join(dir, `${stem}.gif`), gifBuf);
  if (item.mode === "showcase") {
    fs.writeFileSync(path.join(dir, "loop.gif"), gifBuf);
  }

  // 3. High-FPS Animated WebP when cwebp+webpmux are available (skipped gracefully on minimal CI)
  let webpKB = null;
  const webpPath = path.join(dir, `${stem}.webp`);
  if (caps.cwebpPath && caps.webpmuxPath && fps >= 25) {
    const wRes = encodeAnimatedWebP(frames, width, height, fps, webpPath);
    webpKB = Number((wRes.bytes / 1024).toFixed(1));
  } else if (fs.existsSync(webpPath)) {
    webpKB = Number((fs.statSync(webpPath).size / 1024).toFixed(1));
  }

  // 4. Contact sheet or storyboard
  const sheetCanvas = renderContactSheet(sketchModule, { ...meta, showcase: item.showcase, cols: 4 });
  fs.writeFileSync(path.join(dir, "sheet.png"), encodePNG(sheetCanvas.data, sheetCanvas.width, sheetCanvas.height));

  if (item.mode === "showcase") {
    const boardCanvas = renderStoryboard(sketchModule, item.showcase, meta);
    fs.writeFileSync(path.join(dir, "storyboard.png"), encodePNG(boardCanvas.data, boardCanvas.width, boardCanvas.height));
  }

  // 5. Seam, Legibility, Sources, Audit
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
    useCase: item.useCase,
    fps,
    pass: seam.pass && legible.pass && sources.pass,
    seamScore: seam.seamScore,
    duplicateFrames: seam.duplicateFrames,
    flickerScore: seam.flickerScore,
    legiblePass: legible.pass,
    sourcesPass: sources.pass,
    gifKB: Number((gifBuf.length / 1024).toFixed(1)),
    ...(webpKB !== null ? { webpKB } : {}),
    totalFrames
  };
  fs.writeFileSync(path.join(dir, "audit.json"), JSON.stringify(audit, null, 2) + "\n", "utf8");
  return audit;
}

async function main() {
  const caps = detectCapabilities();
  const results = [];
  for (const item of GALLERY_ITEMS) {
    const res = await buildItem(item, caps);
    results.push(res);
    console.log(
      `[Gallery] ${res.id} (${res.fps}fps): pass=${res.pass} seam=${res.seamScore} dup=${res.duplicateFrames} gif=${res.gifKB}KB${res.webpKB ? ` webp=${res.webpKB}KB` : ""}`
    );
  }
  fs.writeFileSync(
    path.join(REPO_ROOT, "gallery", "manifest.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), items: results }, null, 2) + "\n",
    "utf8"
  );
}

main();
