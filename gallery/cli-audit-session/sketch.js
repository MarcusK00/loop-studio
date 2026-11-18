// Scene Pack: terminal — Deterministic vector CLI session
export const meta = {
  mode: "showcase",
  scene: "terminal",
  seconds: 10,
  fps: 16,
  width: 800,
  height: 320,
  seed: 23,
  palette: "phosphor"
};

export const showcase = {
  says: "The loop CLI audits any sketch for seam jumps, caption legibility, and source citations before rendering.",
  seconds: 10,
  scene: "terminal",
  stage: ["$ loop audit ./demo", "seam: 1.04 PASS", "legible: 4.5:1 PASS", "render: loop.gif"],
  steps: [
    { from: 8.75, to: 1.25, caption: "run `loop audit` on sketch folder", source: "docs/tool.md:22" },
    { from: 1.25, to: 3.75, caption: "measures frame deltas & seam score", source: "docs/tool.md:14" },
    { from: 3.75, to: 6.25, caption: "verifies WCAG contrast & sources", source: "docs/tool.md:17" },
    { from: 6.25, to: 8.75, caption: "encodes verified loop.gif & poster", source: "docs/tool.md:24" }
  ]
};

export function render(ctx, phase, kit) {
  const W = ctx.width || meta.width;
  const H = ctx.height || meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["phosphor"];
  const S = kit.showcase || showcase;
  const lines = S.stage || showcase.stage;
  const steps = S.steps || showcase.steps;
  const SECONDS = S.seconds || meta.seconds;
  const t = phase * SECONDS;
  const TAU = Math.PI * 2;

  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  const termW = Math.round(W * 0.82);
  const termH = Math.round(H * 0.61);
  const tx = Math.round((W - termW) / 2);
  const ty = Math.round(H * 0.075);

  kit.roundRect(ctx, tx, ty, termW, termH, 10);
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.stroke();

  const headH = Math.round(termH * 0.16);
  ctx.fillStyle = C.line;
  ctx.fillRect(tx + 1, ty + headH, termW - 2, 1);

  const dotColors = [C.accent, C.spark, C.muted];
  dotColors.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(tx + 18 + i * 14, ty + headH / 2, 4, 0, TAU);
    ctx.fill();
  });

  // Constant-speed orbital phase spinner on right side of terminal viewport
  const spinCx = tx + termW - Math.round(termW * 0.14);
  const spinCy = ty + headH + (termH - headH) * 0.5;
  const spinR = Math.min(termW, termH) * 0.22;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(spinCx, spinCy, spinR, 0, TAU);
  ctx.stroke();

  for (let k = 0; k < 3; k++) {
    const a = TAU * (phase + k / 3);
    const ox = spinCx + Math.cos(a) * spinR;
    const oy = spinCy + Math.sin(a) * spinR;
    ctx.fillStyle = k === 0 ? C.spark : C.accent;
    ctx.beginPath();
    ctx.arc(ox, oy, 5, 0, TAU);
    ctx.fill();
  }

  let activeRow = 0;
  if (t >= 1.25 && t < 3.75) activeRow = 1;
  else if (t >= 3.75 && t < 6.25) activeRow = 2;
  else if (t >= 6.25 && t < 8.75) activeRow = 3;

  const rowStep = (termH - headH - 20) / Math.max(1, lines.length);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "500 13px monospace";
  lines.forEach((line, idx) => {
    const ly = ty + headH + 12 + (idx + 0.45) * rowStep;
    const isActive = idx === activeRow;
    ctx.globalAlpha = 1;
    ctx.fillStyle = idx === 0 ? C.body : isActive ? C.spark : C.accent;
    ctx.fillText(line, tx + 22, ly);
  });

  // Bottom caption with smooth cross-fade
  const capY = Math.round(H * 0.86);
  const pillW = Math.round(W * 0.62);
  kit.roundRect(ctx, W / 2 - pillW / 2, capY - 16, pillW, 32, 6);
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = "500 13px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  steps.forEach((c) => {
    const len = ((c.to - c.from) % SECONDS + SECONDS) % SECONDS || SECONDS;
    const u = ((t - c.from) % SECONDS + SECONDS) % SECONDS;
    if (u >= len) return;
    const fade = Math.max(0.2, Math.min(1, u / 0.35, (len - u) / 0.35));
    ctx.globalAlpha = fade;
    ctx.fillStyle = C.body;
    ctx.fillText(c.caption, W / 2, capY);
  });
  ctx.globalAlpha = 1;
}
