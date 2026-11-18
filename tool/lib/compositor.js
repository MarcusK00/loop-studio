// Loop Studio — Frame Renderer, Contact Sheet Tiler (`loop sheet`), and Storyboard Compositor (`loop story`)

import { BitmapBuffer } from "./bitmap.js";
import { renderProjectPhases } from "./renderer.js";

export async function renderProjectFrames(project, opts = {}) {
  const meta = { ...project.meta, ...opts };
  const W = meta.width || 800;
  const H = meta.height || 400;
  const seconds = meta.seconds || 6;
  const fps = meta.fps || 24;
  const totalFrames = Math.max(2, Math.round(seconds * fps));
  const phases = [];
  for (let f = 0; f < totalFrames; f++) {
    phases.push(f / totalFrames);
  }

  const res = await renderProjectPhases({
    absDir: project.absDir,
    sketchModule: project.sketchModule,
    meta,
    showcase: opts.showcase || project.showcaseJson,
    width: W,
    height: H,
    phases,
    engine: opts.engine || "auto",
    theme: opts.theme || null
  });

  return {
    backend: res.backend,
    frames: res.frames,
    width: W,
    height: H,
    seconds,
    fps,
    totalFrames
  };
}

function blitScaled(dstCanvas, srcRgba, srcW, srcH, dx, dy, dw, dh) {
  for (let ty = 0; ty < dh; ty++) {
    const sy0 = Math.floor((ty * srcH) / dh);
    const sy1 = Math.min(srcH - 1, Math.floor(((ty + 0.5) * srcH) / dh));
    for (let tx = 0; tx < dw; tx++) {
      const sx0 = Math.floor((tx * srcW) / dw);
      const sx1 = Math.min(srcW - 1, Math.floor(((tx + 0.5) * srcW) / dw));
      const i00 = (sy0 * srcW + sx0) * 4;
      const i10 = (sy0 * srcW + sx1) * 4;
      const i01 = (sy1 * srcW + sx0) * 4;
      const i11 = (sy1 * srcW + sx1) * 4;
      const px = dx + tx;
      const py = dy + ty;
      if (px >= 0 && py >= 0 && px < dstCanvas.width && py < dstCanvas.height) {
        const dIdx = (py * dstCanvas.width + px) * 4;
        dstCanvas.data[dIdx] = (srcRgba[i00] + srcRgba[i10] + srcRgba[i01] + srcRgba[i11]) >> 2;
        dstCanvas.data[dIdx + 1] = (srcRgba[i00 + 1] + srcRgba[i10 + 1] + srcRgba[i01 + 1] + srcRgba[i11 + 1]) >> 2;
        dstCanvas.data[dIdx + 2] = (srcRgba[i00 + 2] + srcRgba[i10 + 2] + srcRgba[i01 + 2] + srcRgba[i11 + 2]) >> 2;
        dstCanvas.data[dIdx + 3] = 255;
      }
    }
  }
}

export function composeContactSheetFromFrames(sampledPairs, srcW, srcH, seconds, fps, totalFrames, cols = 4) {
  const rows = Math.ceil(sampledPairs.length / cols);
  const tileW = Math.min(260, srcW);
  const tileH = Math.round((tileW * srcH) / srcW);
  const pad = 12;
  const headerH = 42;

  const sheetW = cols * tileW + (cols + 1) * pad;
  const sheetH = headerH + rows * tileH + (rows + 1) * pad;
  const sheet = new BitmapBuffer(sheetW, sheetH);

  sheet.fillRect(0, 0, sheetW, sheetH, "#0E1120");
  sheet.drawText(
    `LOOP CONTACT SHEET // ${totalFrames}F (${seconds}S @ ${fps}FPS) // ${srcW}X${srcH}`,
    pad,
    14,
    "#E7E9F4",
    2
  );

  sampledPairs.forEach(({ f, phase, rgba }, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const dx = pad + col * (tileW + pad);
    const dy = headerH + pad + row * (tileH + pad);

    blitScaled(sheet, rgba, srcW, srcH, dx, dy, tileW, tileH);
    sheet.strokeRect(dx, dy, tileW, tileH, "#2A3050", 1);

    const badgeText = `F:${String(f).padStart(3, "0")} P:${phase.toFixed(2)}`;
    sheet.fillRect(dx + 6, dy + 6, badgeText.length * 6 + 10, 15, "#0A0C18", 0.85);
    sheet.drawText(badgeText, dx + 10, dy + 10, "#FF6B9D", 1);
  });

  return sheet;
}

export async function renderProjectContactSheet(project, opts = {}) {
  const meta = { ...project.meta, ...opts };
  const srcW = meta.width || 800;
  const srcH = meta.height || 400;
  const seconds = meta.seconds || 6;
  const fps = meta.fps || 24;
  const totalFrames = Math.max(4, Math.round(seconds * fps));
  const every = opts.every || Math.max(1, Math.floor(totalFrames / 12));
  const cols = opts.cols || 4;

  const sampleFrames = [];
  const phases = [];
  for (let f = 0; f < totalFrames; f += every) {
    sampleFrames.push(f);
    phases.push(f / totalFrames);
  }

  const res = await renderProjectPhases({
    absDir: project.absDir,
    sketchModule: project.sketchModule,
    meta,
    showcase: opts.showcase || project.showcaseJson,
    width: srcW,
    height: srcH,
    phases,
    engine: opts.engine || "auto",
    theme: opts.theme || null
  });

  const sampledPairs = sampleFrames.map((f, idx) => ({
    f,
    phase: phases[idx],
    rgba: res.frames[idx]
  }));

  return composeContactSheetFromFrames(sampledPairs, srcW, srcH, seconds, fps, totalFrames, cols);
}

function buildStoryboardPanels(showcaseJson, meta) {
  const S = showcaseJson || {
    says: "Loop showcase",
    seconds: meta.seconds || 9,
    steps: [
      { from: 0, to: 3, caption: "Step 1" },
      { from: 3, to: 6, caption: "Step 2" },
      { from: 6, to: 9, caption: "Step 3" }
    ]
  };
  const SECONDS = S.seconds || meta.seconds || 9;
  const panels = [{ label: "PANEL 0 · FRAME 0 (T=0.0S THUMBNAIL)", phase: 0 }];
  (S.steps || []).forEach((step, idx) => {
    const span = (((step.to - step.from) % SECONDS) + SECONDS) % SECONDS || SECONDS;
    const midSec = (step.from + span * 0.5) % SECONDS;
    panels.push({
      label: `PANEL ${idx + 1} · STEP ${idx + 1} (T=${midSec.toFixed(1)}S)`,
      phase: midSec / SECONDS
    });
  });
  return { S, panels };
}

export function composeStoryboardFromPanels(panels, renderedRgba, srcW, srcH) {
  const tileW = Math.min(800, srcW);
  const tileH = Math.round((tileW * srcH) / srcW);
  const pad = 16;
  const headerH = 44;
  const labelH = 24;

  const boardW = tileW + pad * 2;
  const boardH = headerH + panels.length * (tileH + labelH + pad) + pad;
  const board = new BitmapBuffer(boardW, boardH);

  board.fillRect(0, 0, boardW, boardH, "#0E1120");
  board.drawText(`SHOWCASE STORYBOARD // ${panels.length} PANELS`, pad, 15, "#7FA2FF", 2);

  panels.forEach((p, idx) => {
    const dy = headerH + idx * (tileH + labelH + pad);
    board.drawText(p.label, pad, dy + 6, "#FF6B9D", 1.5);
    blitScaled(board, renderedRgba[idx], srcW, srcH, pad, dy + labelH, tileW, tileH);
    board.strokeRect(pad, dy + labelH, tileW, tileH, "#2A3050", 1);
  });

  return board;
}

export async function renderProjectStoryboard(project, opts = {}) {
  const meta = { ...project.meta, ...opts };
  const srcW = meta.width || 800;
  const srcH = meta.height || 400;
  const { S, panels } = buildStoryboardPanels(project.showcaseJson || project.sketchModule?.showcase, meta);

  const res = await renderProjectPhases({
    absDir: project.absDir,
    sketchModule: project.sketchModule,
    meta,
    showcase: S,
    width: srcW,
    height: H_SAFE(srcH),
    phases: panels.map((p) => p.phase),
    engine: opts.engine || "auto",
    theme: opts.theme || null
  });

  return composeStoryboardFromPanels(panels, res.frames, srcW, srcH);
}

function H_SAFE(h) {
  return Math.max(1, Math.round(h));
}
