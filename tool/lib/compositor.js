// Loop Studio — Frame Renderer, Contact Sheet Tiler (`loop sheet`), and Storyboard Compositor (`loop story`)

import { SoftCanvas2D } from "./soft-canvas.js";
import { createKit } from "./loop-kit.js";

export function renderAllFrames(sketchModule, overrides = {}) {
  const meta = { ...sketchModule.meta, ...overrides };
  const W = meta.width || 640;
  const H = meta.height || 640;
  const seconds = meta.seconds || 4;
  const fps = meta.fps || 24;
  const totalFrames = Math.max(2, Math.round(seconds * fps));
  const kit = createKit({
    showcase: overrides.showcase || sketchModule.showcase
  });

  const frames = [];
  // Crucial Phase Contract rule: render frames 0 .. totalFrames - 1 (NEVER frame N!)
  for (let f = 0; f < totalFrames; f++) {
    const phase = f / totalFrames;
    const cv = new SoftCanvas2D(W, H);
    sketchModule.render(cv, phase, kit);
    frames.push(cv.data);
  }

  return {
    frames,
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

export function renderContactSheet(sketchModule, opts = {}) {
  const meta = { ...sketchModule.meta, ...opts };
  const srcW = meta.width || 400;
  const srcH = meta.height || 400;
  const seconds = meta.seconds || 4;
  const fps = meta.fps || 24;
  const totalFrames = Math.max(4, Math.round(seconds * fps));
  const every = opts.every || Math.max(1, Math.floor(totalFrames / 12));
  const cols = opts.cols || 4;

  const sampleFrames = [];
  for (let f = 0; f < totalFrames; f += every) {
    sampleFrames.push(f);
  }
  const rows = Math.ceil(sampleFrames.length / cols);
  const tileW = Math.min(240, srcW);
  const tileH = Math.round((tileW * srcH) / srcW);
  const pad = 12;
  const headerH = 42;

  const sheetW = cols * tileW + (cols + 1) * pad;
  const sheetH = headerH + rows * tileH + (rows + 1) * pad;
  const sheet = new SoftCanvas2D(sheetW, sheetH);

  sheet.fillStyle = "#0E1120";
  sheet.fillRect(0, 0, sheetW, sheetH);

  // Header title
  sheet.font = "600 13px monospace";
  sheet.fillStyle = "#E7E9F4";
  sheet.textAlign = "left";
  sheet.textBaseline = "middle";
  sheet.fillText(
    `LOOP STUDIO CONTACT SHEET // ${totalFrames}f (${seconds}s @ ${fps}fps) // ${srcW}x${srcH}`,
    pad,
    headerH / 2
  );

  const kit = createKit({ showcase: opts.showcase || sketchModule.showcase });

  sampleFrames.forEach((f, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const dx = pad + col * (tileW + pad);
    const dy = headerH + pad + row * (tileH + pad);
    const phase = f / totalFrames;

    const cv = new SoftCanvas2D(srcW, srcH);
    sketchModule.render(cv, phase, kit);
    blitScaled(sheet, cv.data, srcW, srcH, dx, dy, tileW, tileH);

    // Tile border
    sheet.strokeStyle = "#2A3050";
    sheet.lineWidth = 1;
    sheet.strokeRect(dx, dy, tileW, tileH);

    // Frame & phase badge
    const badgeText = `f:${String(f).padStart(3, "0")} p:${phase.toFixed(2)}`;
    sheet.fillStyle = "#0A0C18";
    sheet.globalAlpha = 0.84;
    sheet.fillRect(dx + 6, dy + 6, 108, 18);
    sheet.globalAlpha = 1;
    sheet.font = "600 11px monospace";
    sheet.fillStyle = "#FF6B9D";
    sheet.textAlign = "left";
    sheet.textBaseline = "middle";
    sheet.fillText(badgeText, dx + 10, dy + 15);
  });

  return sheet;
}

export function renderStoryboard(sketchModule, showcaseJson, opts = {}) {
  const meta = { ...sketchModule.meta, ...opts };
  const S = showcaseJson || sketchModule.showcase || {
    says: "Loop Studio showcase",
    seconds: meta.seconds || 10,
    steps: [
      { from: 0, to: 2.5, caption: "Step 1" },
      { from: 2.5, to: 5.0, caption: "Step 2" },
      { from: 5.0, to: 7.5, caption: "Step 3" },
      { from: 7.5, to: 10.0, caption: "Step 4" }
    ]
  };

  const srcW = meta.width || 800;
  const srcH = meta.height || 320;
  const SECONDS = S.seconds || meta.seconds || 10;
  const kit = createKit({ showcase: S });

  // Panel 0 = Frame 0 (thumbnail), Panels 1..K = midpoint of each step
  const panels = [
    { label: "PANEL 0 · FRAME 0 (t=0.0s THUMBNAIL)", phase: 0 }
  ];
  (S.steps || []).forEach((step, idx) => {
    const span = (((step.to - step.from) % SECONDS) + SECONDS) % SECONDS || SECONDS;
    const midSec = (step.from + span * 0.5) % SECONDS;
    panels.push({
      label: `PANEL ${idx + 1} · STEP ${idx + 1} (t=${midSec.toFixed(1)}s)`,
      phase: midSec / SECONDS
    });
  });

  const tileW = Math.min(800, srcW);
  const tileH = Math.round((tileW * srcH) / srcW);
  const pad = 16;
  const headerH = 44;
  const labelH = 24;

  const boardW = tileW + pad * 2;
  const boardH = headerH + panels.length * (tileH + labelH + pad) + pad;
  const board = new SoftCanvas2D(boardW, boardH);

  board.fillStyle = "#0E1120";
  board.fillRect(0, 0, boardW, boardH);

  board.font = "600 13px monospace";
  board.fillStyle = "#7FA2FF";
  board.textAlign = "left";
  board.textBaseline = "middle";
  board.fillText(`SHOWCASE STORYBOARD // ${panels.length} PANELS`, pad, headerH / 2);

  panels.forEach((p, idx) => {
    const dy = headerH + idx * (tileH + labelH + pad);
    board.font = "600 12px monospace";
    board.fillStyle = "#FF6B9D";
    board.textAlign = "left";
    board.textBaseline = "middle";
    board.fillText(p.label, pad, dy + 11);

    const cv = new SoftCanvas2D(srcW, srcH);
    sketchModule.render(cv, p.phase, kit);
    blitScaled(board, cv.data, srcW, srcH, pad, dy + labelH, tileW, tileH);

    board.strokeStyle = "#2A3050";
    board.lineWidth = 1.5;
    board.strokeRect(pad, dy + labelH, tileW, tileH);
  });

  return board;
}
