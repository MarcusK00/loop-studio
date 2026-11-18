// Loop Studio — Seam, Legibility (WCAG 4.5:1), and Source Citation Analyzers

import fs from "node:fs";
import path from "node:path";
import { SoftCanvas2D } from "./soft-canvas.js";
import { createKit } from "./loop-kit.js";

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
  const maxSeamScore = thresholds.maxSeamScore ?? 1.5;
  const maxFlickerScore = thresholds.maxFlickerScore ?? 2.5;
  const totalPixels = width * height;
  const N = frames.length;
  const stepDeltas = [];
  const duplicateIndices = [];

  for (let f = 0; f < N; f++) {
    const next = (f + 1) % N;
    const d = frameRmsDelta(frames[f], frames[next], totalPixels);
    stepDeltas.push(d);
    if (d < 0.0001) {
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

export function analyzeLegibility(sketchModule, showcaseJson, overrides = {}) {
  const meta = { ...sketchModule.meta, ...overrides };
  const S = showcaseJson || sketchModule.showcase;
  const W = meta.width || 800;
  const H = meta.height || 320;
  const SECONDS = (S && S.seconds) || meta.seconds || 10;

  if (!S || !Array.isArray(S.steps)) {
    // Check if an ambient sketch renders text (e.g. kinetic-type)
    const cv = new SoftCanvas2D(W, H);
    const kit = createKit({ showcase: S });
    sketchModule.render(cv, 0, kit);
    const items = cv.textLog.map((entry) => {
      const contrast = Number(kit.color.contrastRatio(entry.fg, entry.bg).toFixed(2));
      const minMargin = Math.min(entry.x, W - (entry.x + entry.width), entry.y, H - (entry.y + entry.height));
      return {
        text: entry.text,
        contrastRatio: contrast,
        minMarginPx: Math.round(minMargin),
        passContrast: contrast >= 4.5
      };
    });
    const pass = items.every((i) => i.passContrast);
    return {
      pass,
      mode: meta.mode || "ambient",
      textElementsChecked: items.length,
      captions: items,
      reasons: pass ? [] : ["One or more text elements failed WCAG 4.5:1 contrast check."]
    };
  }

  const kit = createKit({ showcase: S });
  const results = [];
  const reasons = [];

  // 1. Check Frame 0 shows all stage labels
  const cv0 = new SoftCanvas2D(W, H);
  sketchModule.render(cv0, 0, kit);
  const frame0Texts = cv0.textLog.map((t) => t.text);
  const stageLabels = Array.isArray(S.stage) ? S.stage : [];
  const missingFrame0Stage = stageLabels.filter(
    (lbl) => !frame0Texts.some((rendered) => rendered.includes(lbl) || lbl.includes(rendered))
  );
  if (missingFrame0Stage.length > 0) {
    reasons.push(`Frame 0 is missing stage label(s): ${missingFrame0Stage.join(", ")}.`);
  }

  // 2. Check each step caption at its midpoint
  S.steps.forEach((step, idx) => {
    const caption = String(step.caption || "").trim();
    const words = caption.split(/\s+/).filter(Boolean).length;
    const spanSec = (((step.to - step.from) % SECONDS) + SECONDS) % SECONDS || SECONDS;
    const requiredSec = Number((0.5 + 0.3 * words).toFixed(2));
    const midSec = (step.from + spanSec * 0.5) % SECONDS;
    const midPhase = midSec / SECONDS;

    const cv = new SoftCanvas2D(W, H);
    sketchModule.render(cv, midPhase, kit);

    const entry =
      cv.textLog.find((t) => t.text === caption) ||
      cv.textLog[cv.textLog.length - 1] || {
        text: caption,
        x: 40,
        y: H - 40,
        width: caption.length * 8,
        height: 14,
        fontSize: 13,
        fg: [231, 233, 244],
        bg: [23, 27, 46]
      };

    const contrastRatio = Number(kit.color.contrastRatio(entry.fg, entry.bg).toFixed(2));
    const marginLeft = Math.round(entry.x);
    const marginRight = Math.round(W - (entry.x + entry.width));
    const marginBottom = Math.round(H - (entry.y + entry.height));
    const minEdgeMargin = Math.min(marginLeft, marginRight, marginBottom);
    const phoneScale = 400 / W;
    const phoneFontPx = Number((entry.fontSize * phoneScale).toFixed(2));
    const phoneFits = entry.width * phoneScale <= 400 - 24;

    const passTime = spanSec >= requiredSec;
    const passContrast = contrastRatio >= 4.5;
    const passMargin = minEdgeMargin >= 18;
    const passPhone = phoneFits && phoneFontPx >= 6.0;

    if (!passTime) {
      reasons.push(`Step ${idx + 1} ("${caption}") visible for ${spanSec.toFixed(2)}s, needs >= ${requiredSec}s (${words} words).`);
    }
    if (!passContrast) {
      reasons.push(`Step ${idx + 1} ("${caption}") contrast ratio ${contrastRatio}:1 is below WCAG AA 4.5:1.`);
    }
    if (!passMargin || !passPhone) {
      reasons.push(`Step ${idx + 1} ("${caption}") overflows safe margins at README/mobile width (minEdgeMargin=${minEdgeMargin}px).`);
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

export function analyzeSources(showcaseJson, repoRoot = process.cwd()) {
  if (!showcaseJson || !Array.isArray(showcaseJson.steps)) {
    return {
      pass: true,
      checked: 0,
      citations: [],
      reasons: []
    };
  }

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
    const linePart = raw.slice(lastColon + 1);
    const lineNum = parseInt(linePart.split("-")[0], 10);
    const absPath = path.resolve(repoRoot, relFile);

    if (!fs.existsSync(absPath)) {
      reasons.push(`Step ${idx + 1} source file does not exist: ${relFile}`);
      citations.push({ step: idx + 1, source: raw, file: relFile, line: lineNum, valid: false, reason: "File not found" });
      return;
    }

    const lines = fs.readFileSync(absPath, "utf8").split(/\r?\n/);
    if (!Number.isInteger(lineNum) || lineNum < 1 || lineNum > lines.length) {
      reasons.push(`Step ${idx + 1} source line ${lineNum} is out of range for ${relFile} (1..${lines.length}).`);
      citations.push({
        step: idx + 1,
        source: raw,
        file: relFile,
        line: lineNum,
        totalLines: lines.length,
        valid: false,
        reason: `Line ${lineNum} out of range (1..${lines.length})`
      });
      return;
    }

    citations.push({
      step: idx + 1,
      source: raw,
      file: relFile,
      line: lineNum,
      excerpt: lines[lineNum - 1].trim().slice(0, 120),
      valid: true
    });
  });

  return {
    pass: reasons.length === 0,
    repoRoot,
    checked: citations.length,
    citations,
    reasons
  };
}
