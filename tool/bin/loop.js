#!/usr/bin/env node
// Loop Studio CLI (`loop`)
// Commands: new, diff, term, sheet, story, seam, legible, source-check, audit, render, serve, doctor

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  encodePNG,
  encodeGIF,
  encodeMP4,
  encodeWebM,
  encodeAnimatedWebP,
  decodeVideoFrames,
  isVideoFilePath,
  detectCapabilities
} from "../lib/encoders.js";
import {
  analyzeSeam,
  analyzeProjectLegibility,
  analyzeVideoLegibility,
  analyzeSources
} from "../lib/analyzers.js";
import {
  renderProjectFrames,
  renderProjectContactSheet,
  renderProjectStoryboard
} from "../lib/compositor.js";
import { generatePreviewHtml, serveLoop } from "../lib/server.js";
import { generateDiffProject, generateTerminalProject } from "../lib/generators.js";

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
  return { cmd: positional[0] || "help", target: positional[1] || ".", positional, flags };
}

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function resolveRepoRoot(flags, targetAbs) {
  if (flags.repo) return path.resolve(flags.repo);
  let cur = fs.existsSync(targetAbs) && fs.statSync(targetAbs).isFile() ? path.dirname(targetAbs) : targetAbs;
  while (true) {
    if (fs.existsSync(path.join(cur, ".git")) || fs.existsSync(path.join(cur, "package.json"))) {
      return cur;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return process.cwd();
}

function resolveThemesList(flags) {
  if (flags.themes) {
    return String(flags.themes).split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (flags.theme) {
    return [String(flags.theme).trim()];
  }
  return [null];
}

async function loadProject(targetDir, flags = {}) {
  const absDir = path.resolve(targetDir);
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
    const err = new Error(`Project directory not found: ${absDir}`);
    err.exitCode = 2;
    throw err;
  }

  const sketchPath = path.join(absDir, "sketch.js");
  const sceneHtmlPath = path.join(absDir, "scene.html");
  const shaderFragPath = path.join(absDir, "shader.frag");

  if (!fs.existsSync(sketchPath) && !fs.existsSync(sceneHtmlPath) && !fs.existsSync(shaderFragPath)) {
    const err = new Error(`No scene.html, shader.frag, or sketch.js found in ${absDir}`);
    err.exitCode = 2;
    throw err;
  }

  let sketchModule = null;
  if (fs.existsSync(sketchPath)) {
    const cacheBust = `?t=${Date.now()}`;
    sketchModule = await import(pathToFileURL(sketchPath).href + cacheBust);
  }

  const briefJson = readJsonIfExists(path.join(absDir, "brief.json"));
  const showcaseJson = readJsonIfExists(path.join(absDir, "showcase.json")) || sketchModule?.showcase || null;

  const specOverrides = showcaseJson
    ? {
        ...(showcaseJson.seconds ? { seconds: showcaseJson.seconds } : {}),
        ...(showcaseJson.fps ? { fps: showcaseJson.fps } : {}),
        ...(showcaseJson.width ? { width: showcaseJson.width } : {}),
        ...(showcaseJson.height ? { height: showcaseJson.height } : {}),
        ...(showcaseJson.palette ? { palette: showcaseJson.palette } : {})
      }
    : {};

  const flagOverrides = {
    ...(flags.fps ? { fps: Number(flags.fps) } : {}),
    ...(flags.seconds ? { seconds: Number(flags.seconds) } : {}),
    ...(flags.width ? { width: Number(flags.width) } : {}),
    ...(flags.height ? { height: Number(flags.height) } : {}),
    ...(flags.palette ? { palette: flags.palette } : {}),
    ...(flags.seed ? { seed: Number(flags.seed) } : {})
  };

  const meta = {
    ...(sketchModule?.meta || {}),
    ...(briefJson || {}),
    ...specOverrides,
    ...flagOverrides
  };

  const kind = fs.existsSync(sceneHtmlPath)
    ? "html"
    : fs.existsSync(shaderFragPath)
      ? "shader"
      : sketchModule && typeof sketchModule.renderHTML === "function"
        ? "html-module"
        : sketchModule && typeof sketchModule.shader === "string"
          ? "shader-module"
          : "canvas2d";

  return { absDir, sketchPath, sketchModule, briefJson, showcaseJson, meta, kind };
}

function resolveTemplateName(flags) {
  const raw = String(flags.template || flags.scene || flags.style || "html").toLowerCase();
  if (raw === "code-diff") return "code-diff";
  if (raw === "shader" || raw === "glsl" || raw === "glsl-shader") return "shader";
  return "html";
}

function cmdNew(targetDir, flags) {
  const absDir = path.resolve(targetDir);
  fs.mkdirSync(absDir, { recursive: true });

  const tplName = resolveTemplateName(flags);
  const tplDir = path.join(REPO_ROOT, "tool", "templates", tplName);
  if (!fs.existsSync(tplDir)) {
    const err = new Error(`Unknown template "${tplName}". Choose: html, code-diff, shader.`);
    err.exitCode = 2;
    throw err;
  }

  const copied = [];
  for (const name of fs.readdirSync(tplDir)) {
    const src = path.join(tplDir, name);
    const dst = path.join(absDir, name);
    if ((name === "showcase.json" || name === "brief.json") && fs.existsSync(dst) && !flags.force) {
      continue;
    }
    if (name === "showcase.json" || name === "brief.json") {
      const data = JSON.parse(fs.readFileSync(src, "utf8"));
      data.title = path.basename(absDir);
      if (flags.palette) data.palette = flags.palette;
      if (flags.seconds) data.seconds = Number(flags.seconds);
      if (flags.fps) data.fps = Number(flags.fps);
      if (flags.width) data.width = Number(flags.width);
      if (flags.height) data.height = Number(flags.height);
      fs.writeFileSync(dst, JSON.stringify(data, null, 2) + "\n", "utf8");
    } else {
      fs.copyFileSync(src, dst);
    }
    copied.push(name);
  }

  fs.writeFileSync(path.join(absDir, "index.html"), generatePreviewHtml(path.basename(absDir)), "utf8");
  copied.push("index.html");

  console.log(JSON.stringify({ status: "created", dir: absDir, template: tplName, files: copied }, null, 2));
}

async function cmdSheet(targetDir, flags) {
  const project = await loadProject(targetDir, flags);
  const every = flags.every ? Number(flags.every) : undefined;
  const cols = flags.cols ? Number(flags.cols) : 4;
  const sheetCanvas = await renderProjectContactSheet(project, {
    ...project.meta,
    showcase: project.showcaseJson,
    every,
    cols,
    engine: flags.engine || "auto",
    theme: flags.theme || null
  });
  const pngBuf = encodePNG(sheetCanvas.data, sheetCanvas.width, sheetCanvas.height);
  const outPath = path.join(project.absDir, "sheet.png");
  fs.writeFileSync(outPath, pngBuf);
  console.log(JSON.stringify({ status: "ok", file: outPath, width: sheetCanvas.width, height: sheetCanvas.height, bytes: pngBuf.length }, null, 2));
}

async function cmdStory(targetDir, flags) {
  const project = await loadProject(targetDir, flags);
  const boardCanvas = await renderProjectStoryboard(project, {
    ...project.meta,
    engine: flags.engine || "auto",
    theme: flags.theme || null
  });
  const pngBuf = encodePNG(boardCanvas.data, boardCanvas.width, boardCanvas.height);
  const outPath = path.join(project.absDir, "storyboard.png");
  fs.writeFileSync(outPath, pngBuf);
  console.log(JSON.stringify({ status: "ok", file: outPath, width: boardCanvas.width, height: boardCanvas.height, bytes: pngBuf.length }, null, 2));
}

function getSeamEvalDimensions(project) {
  const w = project.meta.width || 800;
  const h = project.meta.height || 400;
  if (project.kind === "html" || project.kind === "html-module") {
    return { evalW: w, evalH: h };
  }
  const scale = w > 400 ? 0.5 : 1;
  return {
    evalW: Math.max(120, Math.round(w * scale)),
    evalH: Math.max(80, Math.round(h * scale))
  };
}

async function cmdSeam(target, flags) {
  const absTarget = path.resolve(target);
  if (isVideoFilePath(absTarget)) {
    const decoded = decodeVideoFrames(absTarget);
    const lossy = flags.lossy !== undefined ? Boolean(flags.lossy) : decoded.lossy;
    const report = analyzeSeam(decoded.frames, decoded.width, decoded.height, { lossy });
    const { normalizedSteps: _omit, ...summary } = report;
    console.log(JSON.stringify({
      file: decoded.path,
      width: decoded.width,
      height: decoded.height,
      fps: decoded.fps,
      ...summary
    }, null, 2));
    if (!report.pass) process.exitCode = 1;
    return;
  }

  const project = await loadProject(target, flags);
  const { evalW, evalH } = getSeamEvalDimensions(project);
  const { frames, backend } = await renderProjectFrames(project, {
    ...project.meta,
    width: evalW,
    height: evalH,
    showcase: project.showcaseJson,
    engine: flags.engine || "auto",
    theme: flags.theme || null
  });
  const report = { backend, ...analyzeSeam(frames, evalW, evalH) };
  const outPath = path.join(project.absDir, "seam.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  const { normalizedSteps: _omit, ...summary } = report;
  console.log(JSON.stringify({ file: outPath, ...summary }, null, 2));
  if (!report.pass) process.exitCode = 1;
}

async function runProjectLegibilityThemes(project, flags) {
  const themes = resolveThemesList(flags);
  const engine = flags.engine || "auto";
  const reports = [];

  for (const theme of themes) {
    const rep = await analyzeProjectLegibility(project, {
      ...project.meta,
      engine,
      theme
    });
    reports.push(rep);
  }

  if (reports.length === 1) return reports[0];

  const reasons = reports.flatMap((r) => r.reasons.map((msg) => `[${r.theme}] ${msg}`));
  return {
    pass: reports.every((r) => r.pass),
    backend: reports[0].backend,
    themes: reports.map((r) => r.theme),
    reports,
    reasons
  };
}

async function cmdLegible(targetDir, flags) {
  const project = await loadProject(targetDir, flags);
  const report = await runProjectLegibilityThemes(project, flags);
  const outPath = path.join(project.absDir, "legible.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ file: outPath, ...report }, null, 2));
  if (!report.pass) process.exitCode = 1;
}

async function cmdSourceCheck(target, flags) {
  const absTarget = path.resolve(target);
  let showcaseJson = null;
  let outPath = null;

  if (fs.existsSync(absTarget) && fs.statSync(absTarget).isFile() && absTarget.endsWith(".json")) {
    showcaseJson = readJsonIfExists(absTarget);
  } else {
    const project = await loadProject(target, flags);
    showcaseJson = project.showcaseJson;
    outPath = path.join(project.absDir, "sources.json");
  }

  if (!showcaseJson) {
    const err = new Error(`No showcase.json found for ${absTarget}`);
    err.exitCode = 2;
    throw err;
  }

  const repoRoot = resolveRepoRoot(flags, absTarget);
  const report = analyzeSources(showcaseJson, repoRoot);
  if (outPath) {
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  }
  console.log(JSON.stringify({ ...(outPath ? { file: outPath } : {}), ...report }, null, 2));
  if (!report.pass) process.exitCode = 1;
}

async function cmdAudit(target, flags) {
  const absTarget = path.resolve(target);
  const maxKb = flags["max-kb"] ? Number(flags["max-kb"]) : null;

  if (isVideoFilePath(absTarget)) {
    const decoded = decodeVideoFrames(absTarget);
    const lossy = flags.lossy !== undefined ? Boolean(flags.lossy) : decoded.lossy;
    const seam = analyzeSeam(decoded.frames, decoded.width, decoded.height, { lossy });

    const showcasePath = flags.showcase
      ? path.resolve(flags.showcase)
      : path.join(path.dirname(absTarget), "showcase.json");
    const showcaseJson = readJsonIfExists(showcasePath);
    const repoRoot = resolveRepoRoot(flags, absTarget);

    const legible = showcaseJson
      ? analyzeVideoLegibility(decoded.frames, decoded.width, decoded.height, showcaseJson, decoded.fps)
      : { pass: true, skipped: true, reason: "No showcase.json provided" };
    const sources = showcaseJson
      ? analyzeSources(showcaseJson, repoRoot)
      : { pass: true, skipped: true, checked: 0, citations: [], reasons: [] };

    const kb = Number((decoded.bytes / 1024).toFixed(1));
    const sizeFailures = maxKb !== null && kb > maxKb
      ? [`File size ${kb} KB exceeds --max-kb budget of ${maxKb} KB.`]
      : [];

    const pass = seam.pass && legible.pass && sources.pass && sizeFailures.length === 0;
    const failures = [...seam.reasons, ...(legible.reasons || []), ...(sources.reasons || []), ...sizeFailures];

    const report = {
      pass,
      mode: "video",
      file: decoded.path,
      width: decoded.width,
      height: decoded.height,
      fps: decoded.fps,
      totalFrames: decoded.totalFrames,
      kb,
      seamScore: seam.seamScore,
      duplicateFrames: seam.duplicateFrames,
      flickerScore: seam.flickerScore,
      legiblePass: legible.pass,
      sourcesPass: sources.pass,
      failures
    };
    console.log(JSON.stringify(report, null, 2));
    if (!pass) process.exitCode = 1;
    return;
  }

  const project = await loadProject(target, flags);
  const repoRoot = resolveRepoRoot(flags, project.absDir);
  const engine = flags.engine || "auto";
  const themes = resolveThemesList(flags);

  const { evalW, evalH } = getSeamEvalDimensions(project);
  const { frames, backend } = await renderProjectFrames(project, {
    ...project.meta,
    width: evalW,
    height: evalH,
    showcase: project.showcaseJson,
    engine,
    theme: themes[0]
  });

  const seam = analyzeSeam(frames, evalW, evalH);
  fs.writeFileSync(path.join(project.absDir, "seam.json"), JSON.stringify(seam, null, 2) + "\n", "utf8");

  const legible = await runProjectLegibilityThemes(project, flags);
  fs.writeFileSync(path.join(project.absDir, "legible.json"), JSON.stringify(legible, null, 2) + "\n", "utf8");

  const sources = analyzeSources(project.showcaseJson, repoRoot);
  fs.writeFileSync(path.join(project.absDir, "sources.json"), JSON.stringify(sources, null, 2) + "\n", "utf8");

  const pass = seam.pass && legible.pass && sources.pass;
  const failures = [...seam.reasons, ...legible.reasons, ...sources.reasons];

  const auditReport = {
    pass,
    dir: project.absDir,
    kind: project.kind,
    backend,
    mode: project.meta.mode || (project.showcaseJson ? "showcase" : "ambient"),
    themes: themes.filter(Boolean),
    seamScore: seam.seamScore,
    duplicateFrames: seam.duplicateFrames,
    flickerScore: seam.flickerScore,
    legiblePass: legible.pass,
    sourcesPass: sources.pass,
    failures
  };

  fs.writeFileSync(path.join(project.absDir, "audit.json"), JSON.stringify(auditReport, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(auditReport, null, 2));
  if (!pass) process.exitCode = 1;
}

function resolveFormats(flags, caps, briefJson) {
  if (flags.formats) {
    const raw = String(flags.formats)
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (raw.includes("all")) {
      const list = ["png", "gif"];
      if (caps.macosAVFoundation || caps.ffmpeg) list.push("mp4");
      if (caps.animatedWebP) list.push("webp");
      if (caps.ffmpeg) list.push("webm");
      return list;
    }
    return raw;
  }
  if (Array.isArray(briefJson?.formats) && briefJson.formats.length > 0) {
    return briefJson.formats.map((s) => String(s).toLowerCase());
  }
  const defaults = ["png", "gif"];
  if (caps.animatedWebP) defaults.push("webp");
  if (caps.macosAVFoundation || caps.ffmpeg) defaults.push("mp4");
  return defaults;
}

async function renderSingleVariant(project, formats, caps, { stem, suffix = "", theme = null, engine = "auto", strictFormats = false, maxKb = null }) {
  const { frames, width, height, fps, totalFrames, backend } = await renderProjectFrames(project, {
    ...project.meta,
    showcase: project.showcaseJson,
    engine,
    theme
  });

  const outStem = suffix ? `${stem}-${suffix}` : stem;
  const files = {};
  const notes = [];
  const budgetFailures = [];

  if (formats.includes("png") || formats.includes("poster")) {
    const posterBuf = encodePNG(frames[0], width, height);
    const posterName = suffix ? `poster-${suffix}.png` : "poster.png";
    const posterPath = path.join(project.absDir, posterName);
    fs.writeFileSync(posterPath, posterBuf);
    files.poster = { path: posterPath, bytes: posterBuf.length, kb: Number((posterBuf.length / 1024).toFixed(1)) };
  }

  if (formats.includes("gif")) {
    const gifBuf = encodeGIF(frames, width, height, fps);
    const gifPath = path.join(project.absDir, `${outStem}.gif`);
    fs.writeFileSync(gifPath, gifBuf);
    const kb = Number((gifBuf.length / 1024).toFixed(1));
    const delayCs = Math.max(2, Math.round(100 / fps));
    const effectiveGifFps = Number((100 / delayCs).toFixed(1));
    if (fps > 50) {
      notes.push(`GIF89a frame delay caps at 2cs (${effectiveGifFps}fps); use WebP or MP4 for true ${fps}fps playback.`);
    }
    if (maxKb !== null && kb > maxKb) {
      budgetFailures.push(`${path.basename(gifPath)} (${kb} KB) exceeds --max-kb ${maxKb} KB.`);
    } else if (kb > 2048) {
      notes.push(`${path.basename(gifPath)} is ${kb} KB (>2 MB). Prefer WebP/MP4 or reduce fps/dimensions for READMEs.`);
    }
    files.gif = { path: gifPath, bytes: gifBuf.length, kb, effectiveFps: effectiveGifFps };
  }

  if (formats.includes("mp4")) {
    if (caps.macosAVFoundation || caps.ffmpeg) {
      const mp4Path = path.join(project.absDir, `${outStem}.mp4`);
      try {
        const res = encodeMP4(frames, width, height, fps, mp4Path);
        const kb = Number((res.bytes / 1024).toFixed(1));
        if (maxKb !== null && kb > maxKb) {
          budgetFailures.push(`${path.basename(mp4Path)} (${kb} KB) exceeds --max-kb ${maxKb} KB.`);
        }
        files.mp4 = { path: res.path, backend: res.backend, fps, bytes: res.bytes, kb };
      } catch (err) {
        if (strictFormats) throw err;
        notes.push(`Skipped MP4: ${err.message.split("\n")[0]}`);
      }
    } else {
      notes.push("Skipped MP4: install ffmpeg or run on macOS with Swift AVFoundation.");
    }
  }

  if (formats.includes("webp")) {
    if (caps.animatedWebP) {
      const webpPath = path.join(project.absDir, `${outStem}.webp`);
      const res = encodeAnimatedWebP(frames, width, height, fps, webpPath);
      const kb = Number((res.bytes / 1024).toFixed(1));
      if (maxKb !== null && kb > maxKb) {
        budgetFailures.push(`${path.basename(webpPath)} (${kb} KB) exceeds --max-kb ${maxKb} KB.`);
      }
      files.webp = { path: res.path, backend: res.backend, fps, bytes: res.bytes, kb };
    } else {
      notes.push("Skipped WebP: requires img2webp, cwebp+webpmux, or ffmpeg.");
    }
  }

  if (formats.includes("webm")) {
    if (caps.ffmpeg) {
      const webmPath = path.join(project.absDir, `${outStem}.webm`);
      const res = encodeWebM(frames, width, height, fps, webmPath);
      const kb = Number((res.bytes / 1024).toFixed(1));
      if (maxKb !== null && kb > maxKb) {
        budgetFailures.push(`${path.basename(webmPath)} (${kb} KB) exceeds --max-kb ${maxKb} KB.`);
      }
      files.webm = { path: res.path, backend: res.backend, fps, bytes: res.bytes, kb };
    } else {
      notes.push("Skipped WebM: install ffmpeg for VP9 WebM encoding.");
    }
  }

  const seam = analyzeSeam(frames, width, height);
  if (!suffix) {
    fs.writeFileSync(path.join(project.absDir, "seam.json"), JSON.stringify(seam, null, 2) + "\n", "utf8");
  }

  return { width, height, fps, totalFrames, backend, seam, files, notes, budgetFailures };
}

async function cmdRender(targetDir, flags) {
  const project = await loadProject(targetDir, flags);
  const caps = detectCapabilities();
  const formats = resolveFormats(flags, caps, project.briefJson);
  const isShowcase = project.meta.mode === "showcase" || Boolean(project.showcaseJson);
  const stem = isShowcase ? "showcase" : "loop";
  const engine = flags.engine || "auto";
  const maxKb = flags["max-kb"] ? Number(flags["max-kb"]) : null;
  const themes = resolveThemesList(flags);

  if (themes.length === 1) {
    const res = await renderSingleVariant(project, formats, caps, {
      stem,
      theme: themes[0],
      engine,
      strictFormats: Boolean(flags.formats),
      maxKb
    });
    const ok = res.budgetFailures.length === 0;
    console.log(
      JSON.stringify(
        {
          status: ok ? "rendered" : "budget_exceeded",
          dir: project.absDir,
          kind: project.kind,
          backend: res.backend,
          width: res.width,
          height: res.height,
          fps: res.fps,
          totalFrames: res.totalFrames,
          seamScore: res.seam.seamScore,
          duplicateFrames: res.seam.duplicateFrames,
          files: res.files,
          ...(res.notes.length ? { notes: res.notes } : {}),
          ...(res.budgetFailures.length ? { budgetFailures: res.budgetFailures } : {})
        },
        null,
        2
      )
    );
    if (!ok) process.exitCode = 1;
    return;
  }

  const variants = {};
  let summary = null;
  const allBudgetFailures = [];
  for (const th of themes) {
    const res = await renderSingleVariant(project, formats, caps, {
      stem,
      suffix: th,
      theme: th,
      engine,
      strictFormats: Boolean(flags.formats),
      maxKb
    });
    summary = res;
    allBudgetFailures.push(...res.budgetFailures);
    variants[th] = { seamScore: res.seam.seamScore, files: res.files, notes: res.notes };
  }

  const darkImg = `${stem}-dark.${formats.includes("webp") && caps.animatedWebP ? "webp" : "gif"}`;
  const lightImg = `${stem}-light.${formats.includes("webp") && caps.animatedWebP ? "webp" : "gif"}`;
  const embedHtml = themes.includes("dark") && themes.includes("light")
    ? `<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="./${darkImg}">\n  <source media="(prefers-color-scheme: light)" srcset="./${lightImg}">\n  <img alt="${project.meta.title || stem}" src="./${darkImg}" width="${summary.width}">\n</picture>`
    : null;

  const ok = allBudgetFailures.length === 0;
  console.log(
    JSON.stringify(
      {
        status: ok ? "rendered" : "budget_exceeded",
        dir: project.absDir,
        kind: project.kind,
        backend: summary.backend,
        width: summary.width,
        height: summary.height,
        fps: summary.fps,
        totalFrames: summary.totalFrames,
        variants,
        ...(embedHtml ? { embedHtml } : {}),
        ...(allBudgetFailures.length ? { budgetFailures: allBudgetFailures } : {})
      },
      null,
      2
    )
  );
  if (!ok) process.exitCode = 1;
}

function cmdDoctor() {
  const caps = detectCapabilities();
  console.log(
    JSON.stringify(
      {
        status: "healthy",
        nodeVersion: process.version,
        engines: {
          macosWebKit: caps.macosWebKit,
          headlessChrome: caps.headlessChrome,
          chromePath: caps.chromePath,
          defaultBrowserEngine: caps.browserEngine,
          pureJsGif89a: true,
          pureJsPng: true,
          macosAVFoundation: caps.macosAVFoundation,
          animatedWebP: caps.animatedWebP,
          ffmpeg: caps.ffmpeg,
          ffprobe: caps.ffprobe
        }
      },
      null,
      2
    )
  );
}

function cmdDiff(targetDir, flags) {
  const repoRoot = flags.repo ? path.resolve(flags.repo) : process.cwd();
  const res = generateDiffProject({
    outDir: targetDir,
    repoRoot,
    diffFile: flags.file ? path.resolve(flags.file) : null,
    staged: Boolean(flags.staged),
    range: typeof flags.range === "string" ? flags.range : null,
    title: typeof flags.title === "string" ? flags.title : null,
    palette: typeof flags.palette === "string" ? flags.palette : "studio-dark",
    seconds: flags.seconds ? Number(flags.seconds) : 9,
    fps: flags.fps ? Number(flags.fps) : 24,
    maxLines: flags["max-lines"] ? Number(flags["max-lines"]) : 7
  });
  console.log(JSON.stringify({ status: "created", generator: "diff", ...res }, null, 2));
}

function cmdTerm(targetDir, flags) {
  const repoRoot = flags.repo ? path.resolve(flags.repo) : process.cwd();
  let outputText = null;
  if (typeof flags.input === "string") {
    outputText = fs.readFileSync(path.resolve(flags.input), "utf8");
  } else if (typeof flags.output === "string") {
    outputText = flags.output.replace(/\\n/g, "\n");
  }
  const res = generateTerminalProject({
    outDir: targetDir,
    repoRoot,
    cmd: typeof flags.cmd === "string" ? flags.cmd : null,
    label: typeof flags.label === "string" ? flags.label : null,
    outputText,
    title: typeof flags.title === "string" ? flags.title : "CLI Session",
    palette: typeof flags.palette === "string" ? flags.palette : "studio-dark",
    seconds: flags.seconds ? Number(flags.seconds) : 9,
    fps: flags.fps ? Number(flags.fps) : 24,
    maxLines: flags["max-lines"] ? Number(flags["max-lines"]) : 7,
    source: typeof flags.source === "string" ? flags.source : null
  });
  console.log(JSON.stringify({ status: "created", generator: "term", ...res }, null, 2));
}

function printHelp() {
  console.log(`Loop Studio CLI (loop) — Grounded Dual-Theme README Motion & Loop Audit

Usage:
  loop new <dir> [--template html|code-diff|shader] [--palette <id>] [--force]
  loop diff <dir> [--range <a..b> | --staged | --file <patch.diff>] [--repo <root>] [--title <text>] [--max-lines <n>]
  loop term <dir> --cmd "<command>" [--label "<text>"] [--output "<lines>"] [--input <file>] [--repo <root>] [--title <text>]
  loop sheet <dir> [--every <n>] [--cols <n>] [--engine auto|webkit|chromium] [--theme <t>]
  loop story <dir> [--engine auto|webkit|chromium] [--theme <t>]
  loop seam <dir|video> [--engine auto|webkit|chromium] [--lossy]
  loop legible <dir> [--engine auto|webkit|chromium] [--themes dark,light]
  loop source-check <dir|showcase.json> [--repo <root>]
  loop audit <dir|video> [--repo <root>] [--showcase <file>] [--themes dark,light] [--max-kb <n>] [--engine auto|webkit|chromium]
  loop render <dir> [--fps <n>] [--formats gif,mp4,webp,webm,png|all] [--themes dark,light] [--max-kb <n>] [--engine auto|webkit|chromium]
  loop serve <dir> [--port 4173]
  loop doctor
`);
}

async function main() {
  const { cmd, target, flags } = parseArgs(process.argv.slice(2));
  try {
    switch (cmd) {
      case "new":
        cmdNew(target, flags);
        break;
      case "diff":
        cmdDiff(target, flags);
        break;
      case "term":
        cmdTerm(target, flags);
        break;
      case "sheet":
        await cmdSheet(target, flags);
        break;
      case "story":
        await cmdStory(target, flags);
        break;
      case "seam":
        await cmdSeam(target, flags);
        break;
      case "legible":
        await cmdLegible(target, flags);
        break;
      case "source-check":
        await cmdSourceCheck(target, flags);
        break;
      case "audit":
        await cmdAudit(target, flags);
        break;
      case "render":
        await cmdRender(target, flags);
        break;
      case "serve":
        serveLoop(target, Number(flags.port || 4173), path.join(REPO_ROOT, "tool/lib/loop-kit.js"));
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
    process.exitCode = err.exitCode || 1;
  }
}

main();
