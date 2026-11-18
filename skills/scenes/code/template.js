// Scene Pack: code — Stepping code editor + live inspector pane
export const meta = {
  mode: "showcase",
  scene: "code",
  seconds: 10,
  fps: 24,
  width: 800,
  height: 320,
  seed: 29,
  palette: "studio-dark"
};

export const showcase = {
  says: "Every Loop Studio sketch exports meta and a pure render(ctx, phase) function.",
  seconds: 10,
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
};

export function render(ctx, phase, kit) {
  const W = ctx.width || meta.width;
  const H = ctx.height || meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["studio-dark"];
  const S = kit.showcase || showcase;
  const codeLines = S.stage || showcase.stage;
  const steps = S.steps || showcase.steps;
  const SECONDS = S.seconds || meta.seconds;
  const t = phase * SECONDS;
  const TAU = Math.PI * 2;

  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  const codeW = Math.round(W * 0.56);
  const paneH = Math.round(H * 0.60);
  const codeX = Math.round(W * 0.06);
  const paneY = Math.round(H * 0.08);
  const inspW = Math.round(W * 0.29);
  const inspX = codeX + codeW + Math.round(W * 0.03);

  kit.roundRect(ctx, codeX, paneY, codeW, paneH, 10);
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const rowStep = (paneH - 36) / Math.max(1, codeLines.length);
  let activeLine = 0;
  if (t >= 1.25 && t < 3.75) activeLine = 1;
  else if (t >= 3.75 && t < 6.25) activeLine = 2;
  else if (t >= 6.25 && t < 8.75) activeLine = 3;

  ctx.font = "500 12.5px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  codeLines.forEach((line, idx) => {
    const ly = paneY + 24 + (idx + 0.4) * rowStep;
    ctx.globalAlpha = 1;
    ctx.fillStyle = idx === activeLine ? C.body : C.muted;
    ctx.fillText(line, codeX + 18, ly);
  });

  // Inspector pane with constant-speed orbital particles
  ctx.globalAlpha = 1;
  kit.roundRect(ctx, inspX, paneY, inspW, paneH, 10);
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.strokeStyle = C.spark;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const cx = inspX + inspW / 2;
  const cy = paneY + paneH * 0.5;
  const r = Math.min(inspW, paneH) * 0.30;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();

  for (let k = 0; k < 3; k++) {
    const ang = phase * TAU + (k * TAU) / 3;
    const px = cx + Math.cos(ang) * r;
    const py = cy + Math.sin(ang) * r;
    ctx.fillStyle = k === 0 ? C.accent : C.spark;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(5, r * 0.2), 0, TAU);
    ctx.fill();
  }

  // Fixed caption pill + cross-faded text
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
