// Loop Studio — Seam, Legibility (WCAG 4.5:1), External Video, and Strict Source-Drift Analyzers

import fs from "node:fs";
import path from "node:path";
import { createKit, color as colorUtil } from "./loop-kit.js";
import { renderProjectPhases } from "./renderer.js";

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(values, p = 0.95) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

export function frameRmsDelta(frameA, frameB, totalPixels) {
  let sumSq = 0;
  const len = totalPixels * 4;
  for (let i = 0; i < len; i += 4) {
    const dr = (frameA[i] - frameB[i]) / 255;
    const dg = (frameA[i + 1] - frameB[i + 1]) / 255;
    const db = (frameA[i + 2] - frameB[i + 2]) / 255;
    sumSq += dr * dr + dg * dg + db * db;
  }
  return Math.sqrt(sumSq / (totalPixels * 3));
}

export function analyzeSeam(frames, width, height, thresholds = {}) {
  const lossy = Boolean(thresholds.lossy);
  const maxSeamScore = thresholds.maxSeamScore ?? 1.5;
  const maxFlickerScore = thresholds.maxFlickerScore ?? 2.5;
  const duplicateThreshold = thresholds.duplicateThreshold ?? (lossy ? 0.002 : 0.0001);
  const totalPixels = width * height;
  const N = frames.length;
  const stepDeltas = [];
  const duplicateIndices = [];

  for (let f = 0; f < N; f++) {
    const next = (f + 1) % N;
    const d = frameRmsDelta(frames[f], frames[next], totalPixels);
    stepDeltas.push(d);
    if (d < duplicateThreshold) {
      duplicateIndices.push({ fromFrame: f, toFrame: next, delta: Number(d.toFixed(6)) });
    }
  }

  const interiorDeltas = stepDeltas.slice(0, Math.max(1, N - 1));
  const seamDelta = stepDeltas[N - 1] ?? 0;
  const med = Math.max(0.00001, median(interiorDeltas));
  const seamScore = Number((seamDelta / med).toFixed(3));

  const swings = [];
  for (let f = 0; f < N - 1; f++) {
    swings.push(Math.abs(stepDeltas[f + 1] - stepDeltas[f]) / med);
  }
  const flickerScore = Number(percentile(swings, 0.95).toFixed(3));
  const normalizedBars = stepDeltas.map((d) => Number((d / med).toFixed(3)));

  const reasons = [];
  if (seamScore > maxSeamScore) {
    reasons.push(`Seam jump score ${seamScore} exceeds limit ${maxSeamScore} (last->first delta is ${seamScore}x the median step).`);
  }
  if (duplicateIndices.length > 0) {
    reasons.push(`Detected ${duplicateIndices.length} duplicate adjacent frame pair(s): ${duplicateIndices.map((x) => `${x.fromFrame}->${x.toFrame}`).join(", ")}.`);
  }
  if (flickerScore > maxFlickerScore) {
    reasons.push(`Flicker score ${flickerScore} exceeds limit ${maxFlickerScore}.`);
  }

  return {
    pass: reasons.length === 0,
    lossy,
    duplicateThreshold,
    totalFrames: N,
    seamScore,
    maxSeamScore,
    duplicateFrames: duplicateIndices.length,
    duplicatePairs: duplicateIndices,
    flickerScore,
    maxFlickerScore,
    medianStepDelta: Number(med.toFixed(6)),
    seamStepDelta: Number(seamDelta.toFixed(6)),
    normalizedSteps: normalizedBars,
    reasons
  };
}

export function evaluateLegibilityFromTextLogs({ S, W, H, SECONDS, mode, frame0Logs, stepLogsByIdx }) {
  const kit = createKit({ showcase: S });

  if (!S || !Array.isArray(S.steps)) {
    const items = (frame0Logs || []).map((entry) => {
      const contrast = Number(kit.color.contrastRatio(entry.fg, entry.bg).toFixed(2));
      const minMargin = Math.min(entry.x, W - (entry.x + entry.width), entry.y, H - (entry.y + entry.height));
      const overflows = Boolean(entry.overflows);
      return {
        text: entry.text,
        contrastRatio: contrast,
        minMarginPx: Math.round(minMargin),
        overflows,
        passContrast: contrast >= 4.5 && !overflows
      };
    });
    const pass = items.every((i) => i.passContrast);
    return {
      pass,
      mode: mode || "ambient",
      textElementsChecked: items.length,
      captions: items,
      reasons: pass ? [] : ["One or more text elements failed WCAG 4.5:1 contrast or overflow check."]
    };
  }

  const results = [];
  const reasons = [];

  const frame0Texts = (frame0Logs || []).map((t) => t.text);
  const stageLabels = Array.isArray(S.stage) ? S.stage : [];
  const missingFrame0Stage = stageLabels.filter(
    (lbl) => !frame0Texts.some((rendered) => rendered.includes(lbl) || lbl.includes(rendered))
  );
  if (missingFrame0Stage.length > 0) {
    reasons.push(`Frame 0 is missing stage label(s): ${missingFrame0Stage.join(", ")}.`);
  }

  S.steps.forEach((step, idx) => {
    const caption = String(step.caption || "").trim();
    const words = caption.split(/\s+/).filter(Boolean).length;
    const spanSec = (((step.to - step.from) % SECONDS) + SECONDS) % SECONDS || SECONDS;
    const requiredSec = Number((0.5 + 0.3 * words).toFixed(2));

    const logs = stepLogsByIdx[idx] || [];
    const entry =
      logs.find((t) => t.role === "caption" && (t.text === caption || t.text.includes(caption))) ||
      logs.find((t) => t.text === caption) ||
      logs[logs.length - 1];

    const passTime = spanSec >= requiredSec;
    if (!passTime) {
      reasons.push(`Step ${idx + 1} ("${caption}") visible for ${spanSec.toFixed(2)}s, needs >= ${requiredSec}s (${words} words).`);
    }

    if (!entry) {
      reasons.push(`Step ${idx + 1} ("${caption}") was not found in rendered DOM/canvas text telemetry.`);
      results.push({
        step: idx + 1,
        caption,
        words,
        chars: caption.length,
        windowSeconds: Number(spanSec.toFixed(2)),
        requiredSeconds: requiredSec,
        passReadingTime: passTime,
        contrastRatio: null,
        passContrast: false,
        minEdgeMarginPx: null,
        phoneFontPx: null,
        overflows: false,
        passMobileWidth: false,
        pass: false
      });
      return;
    }

    const contrastRatio = Number(kit.color.contrastRatio(entry.fg, entry.bg).toFixed(2));
    const marginLeft = Math.round(entry.x);
    const marginRight = Math.round(W - (entry.x + entry.width));
    const marginBottom = Math.round(H - (entry.y + entry.height));
    const minEdgeMargin = Math.min(marginLeft, marginRight, marginBottom);
    const phoneScale = 400 / W;
    const phoneFontPx = Number((entry.fontSize * phoneScale).toFixed(2));
    const phoneFits = entry.width * phoneScale <= 400 - 24;
    const overflows = Boolean(entry.overflows);

    const passContrast = contrastRatio >= 4.5;
    const passMargin = minEdgeMargin >= 18 && !overflows;
    const passPhone = phoneFits && phoneFontPx >= 6.0;

    if (!passContrast) {
      reasons.push(`Step ${idx + 1} ("${caption}") contrast ratio ${contrastRatio}:1 is below WCAG AA 4.5:1.`);
    }
    if (!passMargin || !passPhone) {
      reasons.push(`Step ${idx + 1} ("${caption}") overflows safe margins at README/mobile width (minEdgeMargin=${minEdgeMargin}px, overflows=${overflows}).`);
    }

    results.push({
      step: idx + 1,
      caption,
      words,
      chars: caption.length,
      windowSeconds: Number(spanSec.toFixed(2)),
      requiredSeconds: requiredSec,
      passReadingTime: passTime,
      contrastRatio,
      passContrast,
      minEdgeMarginPx: minEdgeMargin,
      phoneFontPx,
      overflows,
      passMobileWidth: passPhone && passMargin,
      pass: passTime && passContrast && passMargin && passPhone
    });
  });

  return {
    pass: reasons.length === 0,
    width: W,
    height: H,
    phoneWidth: 400,
    frame0ShowsAllStageLabels: missingFrame0Stage.length === 0,
    stageLabelsChecked: stageLabels.length,
    captions: results,
    reasons
  };
}

export async function analyzeProjectLegibility(project, opts = {}) {
  const meta = { ...project.meta, ...opts };
  const S = opts.showcase || project.showcaseJson || project.sketchModule?.showcase;
  const W = meta.width || 800;
  const H = meta.height || 400;
  const SECONDS = (S && S.seconds) || meta.seconds || 9;

  const phases = [0];
  if (S && Array.isArray(S.steps)) {
    S.steps.forEach((step) => {
      const spanSec = (((step.to - step.from) % SECONDS) + SECONDS) % SECONDS || SECONDS;
      const midSec = (step.from + spanSec * 0.5) % SECONDS;
      phases.push(midSec / SECONDS);
    });
  }

  const inspectIndices = phases.map((_, i) => i);
  const res = await renderProjectPhases({
    absDir: project.absDir,
    sketchModule: project.sketchModule,
    meta,
    showcase: S,
    width: W,
    height: H,
    phases,
    inspectIndices,
    engine: opts.engine || "auto",
    theme: opts.theme || null
  });

  const stepLogsByIdx = [];
  for (let i = 1; i < phases.length; i++) {
    stepLogsByIdx.push(res.telemetryByIndex[i] || []);
  }

  return {
    backend: res.backend,
    theme: opts.theme || meta.palette || "default",
    ...evaluateLegibilityFromTextLogs({
      S,
      W,
      H,
      SECONDS,
      mode: meta.mode || (S ? "showcase" : "ambient"),
      frame0Logs: res.telemetryByIndex[0] || [],
      stepLogsByIdx
    })
  };
}

function estimateBoxContrast(rgba, width, height, box) {
  const x0 = Math.max(0, Math.floor(box.x));
  const y0 = Math.max(0, Math.floor(box.y));
  const x1 = Math.min(width, Math.ceil(box.x + box.width));
  const y1 = Math.min(height, Math.ceil(box.y + box.height));
  if (x1 <= x0 || y1 <= y0) return null;

  const pixels = [];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (y * width + x) * 4;
      const rgb = [rgba[idx], rgba[idx + 1], rgba[idx + 2]];
      pixels.push({ rgb, lum: colorUtil.luminance(rgb) });
    }
  }
  if (pixels.length < 4) return null;

  pixels.sort((a, b) => a.lum - b.lum);
  const lowSample = pixels[Math.floor(pixels.length * 0.05)].rgb;
  const highSample = pixels[Math.min(pixels.length - 1, Math.floor(pixels.length * 0.95))].rgb;
  return Number(colorUtil.contrastRatio(highSample, lowSample).toFixed(2));
}

export function analyzeVideoLegibility(frames, width, height, showcaseJson, fps = 24) {
  if (!showcaseJson || !Array.isArray(showcaseJson.steps)) {
    return {
      pass: true,
      width,
      height,
      mode: "video",
      captions: [],
      reasons: []
    };
  }

  const N = frames.length;
  const SECONDS = showcaseJson.seconds || N / Math.max(1, fps);
  const results = [];
  const reasons = [];

  showcaseJson.steps.forEach((step, idx) => {
    const caption = String(step.caption || "").trim();
    const words = caption.split(/\s+/).filter(Boolean).length;
    const spanSec = (((step.to - step.from) % SECONDS) + SECONDS) % SECONDS || SECONDS;
    const requiredSec = Number((0.5 + 0.3 * words).toFixed(2));
    const passTime = spanSec >= requiredSec;

    if (!passTime) {
      reasons.push(`Step ${idx + 1} ("${caption}") visible for ${spanSec.toFixed(2)}s, needs >= ${requiredSec}s (${words} words).`);
    }

    let contrastRatio = null;
    let passContrast = true;
    let minEdgeMarginPx = null;
    let passMobileWidth = true;
    let contrastChecked = false;

    if (step.box && Number.isFinite(step.box.x) && Number.isFinite(step.box.y) && step.box.width > 0 && step.box.height > 0) {
      contrastChecked = true;
      const midSec = (step.from + spanSec * 0.5) % SECONDS;
      const frameIdx = Math.min(N - 1, Math.max(0, Math.floor((midSec / SECONDS) * N)));
      contrastRatio = estimateBoxContrast(frames[frameIdx], width, height, step.box);
      passContrast = contrastRatio !== null && contrastRatio >= 4.5;
      minEdgeMarginPx = Math.round(
        Math.min(step.box.x, width - (step.box.x + step.box.width), step.box.y, height - (step.box.y + step.box.height))
      );
      passMobileWidth = minEdgeMarginPx >= 18 && (step.box.width * (400 / width)) <= 376;

      if (!passContrast) {
        reasons.push(`Step ${idx + 1} ("${caption}") pixel box contrast ${contrastRatio}:1 is below WCAG AA 4.5:1.`);
      }
      if (!passMobileWidth) {
        reasons.push(`Step ${idx + 1} ("${caption}") box exceeds safe margins (minEdgeMargin=${minEdgeMarginPx}px).`);
      }
    }

    results.push({
      step: idx + 1,
      caption,
      words,
      windowSeconds: Number(spanSec.toFixed(2)),
      requiredSeconds: requiredSec,
      passReadingTime: passTime,
      contrastChecked,
      contrastRatio,
      passContrast,
      minEdgeMarginPx,
      passMobileWidth,
      pass: passTime && passContrast && passMobileWidth
    });
  });

  return {
    pass: reasons.length === 0,
    width,
    height,
    mode: "video",
    captions: results,
    reasons
  };
}

export function analyzeSources(showcaseJson, repoRoot = process.cwd()) {
  if (!showcaseJson || !Array.isArray(showcaseJson.steps)) {
    return {
      pass: true,
      repoRoot: path.resolve(repoRoot),
      checked: 0,
      citations: [],
      reasons: []
    };
  }

  const rootAbs = path.resolve(repoRoot);
  const citations = [];
  const reasons = [];

  showcaseJson.steps.forEach((step, idx) => {
    const raw = String(step.source || "").trim();
    if (!raw || !raw.includes(":")) {
      reasons.push(`Step ${idx + 1} is missing a "file:line" source citation.`);
      citations.push({ step: idx + 1, source: raw, valid: false, reason: "Missing file:line format" });
      return;
    }

    const lastColon = raw.lastIndexOf(":");
    const relFile = raw.slice(0, lastColon);
    const linePart = raw.slice(lastColon + 1).trim();

    if (!relFile || path.isAbsolute(relFile)) {
      reasons.push(`Step ${idx + 1} source path must be relative to repository root: ${relFile}`);
      citations.push({ step: idx + 1, source: raw, file: relFile, valid: false, reason: "Path must be repo-relative" });
      return;
    }

    const absPath = path.resolve(rootAbs, relFile);
    const relFromRoot = path.relative(rootAbs, absPath);
    if (relFromRoot.startsWith("..") || path.isAbsolute(relFromRoot)) {
      reasons.push(`Step ${idx + 1} source path escapes repository root: ${relFile}`);
      citations.push({ step: idx + 1, source: raw, file: relFile, valid: false, reason: "Path traversal outside repository root" });
      return;
    }

    const rangeMatch = linePart.match(/^(\d+)(?:-(\d+))?$/);
    if (!rangeMatch) {
      reasons.push(`Step ${idx + 1} has invalid line specification "${linePart}" in ${raw}.`);
      citations.push({ step: idx + 1, source: raw, file: relFile, valid: false, reason: "Invalid line or start-end range" });
      return;
    }

    const startLine = Number(rangeMatch[1]);
    const endLine = rangeMatch[2] ? Number(rangeMatch[2]) : startLine;
    if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine < 1 || endLine < startLine) {
      reasons.push(`Step ${idx + 1} has invalid line range ${startLine}-${endLine} in ${raw}.`);
      citations.push({ step: idx + 1, source: raw, file: relFile, line: startLine, endLine, valid: false, reason: "Invalid line range" });
      return;
    }

    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
      reasons.push(`Step ${idx + 1} source file does not exist: ${relFile}`);
      citations.push({ step: idx + 1, source: raw, file: relFile, line: startLine, valid: false, reason: "File not found" });
      return;
    }

    const lines = fs.readFileSync(absPath, "utf8").split(/\r?\n/);
    if (endLine > lines.length) {
      reasons.push(`Step ${idx + 1} source line ${endLine} is out of range for ${relFile} (1..${lines.length}).`);
      citations.push({
        step: idx + 1,
        source: raw,
        file: relFile,
        line: startLine,
        endLine,
        totalLines: lines.length,
        valid: false,
        reason: `Line ${endLine} out of range (1..${lines.length})`
      });
      return;
    }

    // Optional doc-drift check: verify expected token/symbol still exists within ±3 lines of the cited range
    const expectedMatches = step.match === undefined
      ? []
      : (Array.isArray(step.match) ? step.match : [step.match]).map((m) => String(m)).filter(Boolean);

    if (expectedMatches.length > 0) {
      const winStart = Math.max(0, startLine - 1 - 3);
      const winEnd = Math.min(lines.length, endLine + 3);
      const snippet = lines.slice(winStart, winEnd).join("\n");
      const missing = expectedMatches.filter((tok) => !snippet.includes(tok));
      if (missing.length > 0) {
        reasons.push(
          `Step ${idx + 1} doc drift at ${raw}: expected token(s) [${missing.join(", ")}] not found within ±3 lines.`
        );
        citations.push({
          step: idx + 1,
          source: raw,
          file: relFile,
          line: startLine,
          endLine,
          missingMatches: missing,
          excerpt: lines[startLine - 1].trim().slice(0, 120),
          valid: false,
          reason: `Doc drift: missing ${missing.join(", ")}`
        });
        return;
      }
    }

    citations.push({
      step: idx + 1,
      source: raw,
      file: relFile,
      line: startLine,
      ...(endLine !== startLine ? { endLine } : {}),
      ...(expectedMatches.length ? { matched: expectedMatches } : {}),
      excerpt: lines[startLine - 1].trim().slice(0, 120),
      valid: true
    });
  });

  return {
    pass: reasons.length === 0,
    repoRoot: rootAbs,
    checked: citations.length,
    citations,
    reasons
  };
}
