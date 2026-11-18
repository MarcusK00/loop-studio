#!/usr/bin/env node
// Loop Studio CLI (`loop`)
// Commands: new, sheet, story, seam, legible, source-check, audit, render, serve, doctor

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { encodePNG, encodeGIF, detectFFmpeg } from "../lib/encoders.js";
import { analyzeSeam, analyzeLegibility, analyzeSources } from "../lib/analyzers.js";
import { renderAllFrames, renderContactSheet, renderStoryboard } from "../lib/compositor.js";
import { generatePreviewHtml, serveLoop } from "../lib/server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { cmd: positional[0] || "help", dir: positional[1] || ".", positional, flags };
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function loadSketchProject(targetDir) {
  const absDir = path.resolve(targetDir);
  const sketchPath = path.join(absDir, "sketch.js");
  if (!fs.existsSync(sketchPath)) {
    throw new Error(`No sketch.js found in ${absDir}`);
  }
  const cacheBust = `?t=${Date.now()}`;
  const sketchModule = await import(pathToFileURL(sketchPath).href + cacheBust);
  const briefJson = readJsonIfExists(path.join(absDir, "brief.json"));
  const showcaseJson = readJsonIfExists(path.join(absDir, "showcase.json")) || sketchModule.showcase || null;
  const meta = {
    ...(sketchModule.meta || {}),
    ...(briefJson || {}),
    ...(showcaseJson ? { seconds: showcaseJson.seconds || sketchModule.meta?.seconds || 10 } : {})
  };
  return { absDir, sketchPath, sketchModule, briefJson, showcaseJson, meta };
}

function cmdNew(targetDir, flags) {
  const absDir = path.resolve(targetDir);
  fs.mkdirSync(absDir, { recursive: true });

  const mode = flags.mode || (flags.scene ? "showcase" : "ambient");
  const palette = flags.palette || (mode === "showcase" ? "studio-dark" : "abyss");

  let templateFile;
  if (mode === "showcase") {
    const scene = flags.scene || "flow";
    templateFile = path.join(REPO_ROOT, "skills", "scenes", scene, "template.js");
    if (!fs.existsSync(templateFile)) {
      throw new Error(`Unknown scene pack: ${scene}`);
    }
  } else {
    const style = flags.style || "particle-orbit";
    templateFile = path.join(REPO_ROOT, "skills", "styles", style, "template.js");
    if (!fs.existsSync(templateFile)) {
      throw new Error(`Unknown style pack: ${style}`);
    }
  }

  let sketchCode = fs.readFileSync(templateFile, "utf8");
  if (flags.palette) {
    sketchCode = sketchCode.replace(/palette:\s*"[^"]+"/, `palette: "${palette}"`);
  }
  fs.writeFileSync(path.join(absDir, "sketch.js"), sketchCode, "utf8");

  if (mode === "showcase") {
    const scene = flags.scene || "flow";
    const showcaseData = {
      title: path.basename(absDir),
      says: "Loop Studio turns a one-line request into a checked, seamless loop.",
      seconds: 10,
      fps: 24,
      width: 800,
      height: 320,
      palette,
      scene,
      stage: ["request", "sketch", "check", "loop.gif"],
      steps: [
        { from: 8.5, to: 1.5, caption: "a request arrives: \"deep sea, slow, square\"", source: "README.md:12" },
        { from: 1.5, to: 5.0, caption: "a sketch is written, driven by the phase", source: "rules/AGENTS.md:8" },
        { from: 5.0, to: 7.0, caption: "the seam and legibility are measured", source: "skills/loop-render/SKILL.md:30" },
        { from: 7.0, to: 8.5, caption: "the verified loop drops out", source: "skills/loop-render/SKILL.md:54" }
      ]
    };
    const scPath = path.join(absDir, "showcase.json");
    if (!fs.existsSync(scPath) || flags.force) {
      fs.writeFileSync(scPath, JSON.stringify(showcaseData, null, 2) + "\n", "utf8");
    }
  } else {
    const style = flags.style || "particle-orbit";
    const briefData = {
      title: path.basename(absDir),
      mode: "ambient",
      style,
      palette,
      seconds: Number(flags.seconds || 4),
      fps: Number(flags.fps || 24),
      width: Number(flags.width || 400),
      height: Number(flags.height || 400),
      seed: Number(flags.seed || 42)
    };
    const brPath = path.join(absDir, "brief.json");
    if (!fs.existsSync(brPath) || flags.force) {
      fs.writeFileSync(brPath, JSON.stringify(briefData, null, 2) + "\n", "utf8");
    }
  }

  fs.writeFileSync(path.join(absDir, "index.html"), generatePreviewHtml(path.basename(absDir)), "utf8");
  console.log(JSON.stringify({ status: "created", dir: absDir, mode, palette }, null, 2));
}

async function cmdSheet(targetDir, flags) {
  const { absDir, sketchModule, showcaseJson, meta } = await loadSketchProject(targetDir);
  const every = flags.every ? Number(flags.every) : undefined;
  const cols = flags.cols ? Number(flags.cols) : 4;
  const sheetCanvas = renderContactSheet(sketchModule, { ...meta, showcase: showcaseJson, every, cols });
  const pngBuf = encodePNG(sheetCanvas.data, sheetCanvas.width, sheetCanvas.height);
  const outPath = path.join(absDir, "sheet.png");
  fs.writeFileSync(outPath, pngBuf);
  console.log(JSON.stringify({ status: "ok", file: outPath, width: sheetCanvas.width, height: sheetCanvas.height, bytes: pngBuf.length }, null, 2));
}

async function cmdStory(targetDir) {
  const { absDir, sketchModule, showcaseJson, meta } = await loadSketchProject(targetDir);
  const boardCanvas = renderStoryboard(sketchModule, showcaseJson, meta);
  const pngBuf = encodePNG(boardCanvas.data, boardCanvas.width, boardCanvas.height);
  const outPath = path.join(absDir, "storyboard.png");
  fs.writeFileSync(outPath, pngBuf);
  console.log(JSON.stringify({ status: "ok", file: outPath, width: boardCanvas.width, height: boardCanvas.height, bytes: pngBuf.length }, null, 2));
}

async function cmdSeam(targetDir) {
  const { absDir, sketchModule, showcaseJson, meta } = await loadSketchProject(targetDir);
  // Render at evaluation resolution for fast & exact seam measurement
  const scale = meta.width > 400 ? 0.5 : 1;
  const evalW = Math.max(120, Math.round((meta.width || 400) * scale));
  const evalH = Math.max(80, Math.round((meta.height || 400) * scale));
  const { frames } = renderAllFrames(sketchModule, {
    ...meta,
    width: evalW,
    height: evalH,
    showcase: showcaseJson
  });
  const report = analyzeSeam(frames, evalW, evalH);
  const outPath = path.join(absDir, "seam.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ file: outPath, ...report }, null, 2));
  if (!report.pass) process.exitCode = 1;
}

async function cmdLegible(targetDir) {
  const { absDir, sketchModule, showcaseJson, meta } = await loadSketchProject(targetDir);
  const report = analyzeLegibility(sketchModule, showcaseJson, meta);
  const outPath = path.join(absDir, "legible.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ file: outPath, ...report }, null, 2));
  if (!report.pass) process.exitCode = 1;
}

async function cmdSourceCheck(targetDir, flags) {
  const { absDir, showcaseJson } = await loadSketchProject(targetDir);
  const repoRoot = flags.repo ? path.resolve(flags.repo) : REPO_ROOT;
  const report = analyzeSources(showcaseJson, repoRoot);
  const outPath = path.join(absDir, "sources.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ file: outPath, ...report }, null, 2));
  if (!report.pass) process.exitCode = 1;
}

async function cmdAudit(targetDir, flags) {
  const { absDir, sketchModule, showcaseJson, meta } = await loadSketchProject(targetDir);
  const repoRoot = flags.repo ? path.resolve(flags.repo) : REPO_ROOT;

  const scale = meta.width > 400 ? 0.5 : 1;
  const evalW = Math.max(120, Math.round((meta.width || 400) * scale));
  const evalH = Math.max(80, Math.round((meta.height || 400) * scale));
  const { frames } = renderAllFrames(sketchModule, {
    ...meta,
    width: evalW,
    height: evalH,
    showcase: showcaseJson
  });

  const seam = analyzeSeam(frames, evalW, evalH);
  fs.writeFileSync(path.join(absDir, "seam.json"), JSON.stringify(seam, null, 2) + "\n", "utf8");

  const legible = analyzeLegibility(sketchModule, showcaseJson, meta);
  fs.writeFileSync(path.join(absDir, "legible.json"), JSON.stringify(legible, null, 2) + "\n", "utf8");

  const sources = analyzeSources(showcaseJson, repoRoot);
  fs.writeFileSync(path.join(absDir, "sources.json"), JSON.stringify(sources, null, 2) + "\n", "utf8");

  const pass = seam.pass && legible.pass && sources.pass;
  const failures = [...seam.reasons, ...legible.reasons, ...sources.reasons];

  const auditReport = {
    pass,
    dir: absDir,
    mode: meta.mode || (showcaseJson ? "showcase" : "ambient"),
    seamScore: seam.seamScore,
    duplicateFrames: seam.duplicateFrames,
    flickerScore: seam.flickerScore,
    legiblePass: legible.pass,
    sourcesPass: sources.pass,
    failures
  };

  const outPath = path.join(absDir, "audit.json");
  fs.writeFileSync(outPath, JSON.stringify(auditReport, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(auditReport, null, 2));
  if (!pass) process.exitCode = 1;
}

async function cmdRender(targetDir) {
  const { absDir, sketchModule, showcaseJson, meta } = await loadSketchProject(targetDir);
  const { frames, width, height, fps, totalFrames } = renderAllFrames(sketchModule, {
    ...meta,
    showcase: showcaseJson
  });

  // 1. Poster PNG (Frame 0)
  const posterBuf = encodePNG(frames[0], width, height);
  const posterPath = path.join(absDir, "poster.png");
  fs.writeFileSync(posterPath, posterBuf);

  // 2. Animated GIF89a
  const gifBuf = encodeGIF(frames, width, height, fps);
  const isShowcase = meta.mode === "showcase" || Boolean(showcaseJson);
  const primaryGifName = isShowcase ? "showcase.gif" : "loop.gif";
  const gifPath = path.join(absDir, primaryGifName);
  fs.writeFileSync(gifPath, gifBuf);
  if (isShowcase) {
    // Also write loop.gif alias for uniform tooling
    fs.writeFileSync(path.join(absDir, "loop.gif"), gifBuf);
  }

  // 3. Measure seam on full render
  const seam = analyzeSeam(frames, width, height);
  fs.writeFileSync(path.join(absDir, "seam.json"), JSON.stringify(seam, null, 2) + "\n", "utf8");

  console.log(
    JSON.stringify(
      {
        status: "rendered",
        dir: absDir,
        width,
        height,
        fps,
        totalFrames,
        seamScore: seam.seamScore,
        duplicateFrames: seam.duplicateFrames,
        files: {
          gif: { path: gifPath, bytes: gifBuf.length, kb: Number((gifBuf.length / 1024).toFixed(1)) },
          poster: { path: posterPath, bytes: posterBuf.length, kb: Number((posterBuf.length / 1024).toFixed(1)) }
        }
      },
      null,
      2
    )
  );
}

function cmdDoctor() {
  const hasFFmpeg = detectFFmpeg();
  const chromePaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ];
  const chromeFound = chromePaths.find((p) => fs.existsSync(p)) || null;
  console.log(
    JSON.stringify(
      {
        status: "healthy",
        nodeVersion: process.version,
        engines: {
          softCanvas2D: true,
          pureJsGif89a: true,
          pureJsPng: true,
          ffmpeg: hasFFmpeg,
          headlessChrome: Boolean(chromeFound),
          chromePath: chromeFound
        }
      },
      null,
      2
    )
  );
}

function printHelp() {
  console.log(`Loop Studio CLI (loop) — Deterministic Seamless Animation & Showcase Engine

Usage:
  loop new <dir> [--mode showcase|ambient] [--scene <id>] [--style <id>] [--palette <id>]
  loop sheet <dir> [--every <n>] [--cols <n>]
  loop story <dir>
  loop seam <dir>
  loop legible <dir>
  loop source-check <dir> [--repo <root>]
  loop audit <dir> [--repo <root>]
  loop render <dir>
  loop serve <dir> [--port 4173]
  loop doctor
`);
}

async function main() {
  const { cmd, dir, flags } = parseArgs(process.argv.slice(2));
  try {
    switch (cmd) {
      case "new":
        cmdNew(dir, flags);
        break;
      case "sheet":
        await cmdSheet(dir, flags);
        break;
      case "story":
        await cmdStory(dir);
        break;
      case "seam":
        await cmdSeam(dir);
        break;
      case "legible":
        await cmdLegible(dir);
        break;
      case "source-check":
        await cmdSourceCheck(dir, flags);
        break;
      case "audit":
        await cmdAudit(dir, flags);
        break;
      case "render":
        await cmdRender(dir);
        break;
      case "serve":
        serveLoop(dir, Number(flags.port || 4173), path.join(REPO_ROOT, "tool/lib/loop-kit.js"));
        break;
      case "doctor":
        cmdDoctor();
        break;
      default:
        printHelp();
        break;
    }
  } catch (err) {
    console.error(JSON.stringify({ status: "error", message: err.message }, null, 2));
    process.exitCode = 1;
  }
}

main();
