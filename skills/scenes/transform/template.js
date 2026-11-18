// Scene Pack: transform — Split Before -> Core -> After transformation
export const meta = {
  mode: "showcase",
  scene: "transform",
  seconds: 10,
  fps: 24,
  width: 800,
  height: 320,
  seed: 19,
  palette: "studio-dark"
};

export const showcase = {
  says: "The transformer converts loose prompt specs into verified deterministic loop bundles.",
  seconds: 10,
  scene: "transform",
  stage: ["brief.json", "loop engine", "loop.gif + audit"],
  steps: [
    { from: 8.75, to: 1.25, caption: "raw brief.json enters with specs", source: "skills/loop-brief/SKILL.md:31" },
    { from: 1.25, to: 3.75, caption: "phase engine renders 120 frames", source: "rules/AGENTS.md:8" },
    { from: 3.75, to: 6.25, caption: "seam and contrast gates verify", source: "skills/loop-audit/SKILL.md:14" },
    { from: 6.25, to: 8.75, caption: "quantized loop.gif is emitted", source: "skills/loop-render/SKILL.md:54" }
  ]
};

export function render(ctx, phase, kit) {
  const W = ctx.width || meta.width;
  const H = ctx.height || meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["studio-dark"];
  const S = kit.showcase || showcase;
  const labels = S.stage || showcase.stage;
  const steps = S.steps || showcase.steps;
  const SECONDS = S.seconds || meta.seconds;
  const t = phase * SECONDS;
  const TAU = Math.PI * 2;

  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  const cardW = Math.round(W * 0.26);
  const cardH = Math.round(H * 0.46);
  const cy = Math.round(H * 0.41);
  const leftX = Math.round(W * 0.21);
  const midX = Math.round(W * 0.5);
  const rightX = Math.round(W * 0.79);

  // Connector beams
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(leftX + cardW / 2, cy);
  ctx.lineTo(rightX - cardW / 2, cy);
  ctx.stroke();

  // Flowing energy pulses along beams (whole cycles)
  for (let i = 0; i < 4; i++) {
    const u = (phase * 2 + i / 4) % 1;
    const px = (leftX + cardW / 2) + ((rightX - cardW / 2) - (leftX + cardW / 2)) * u;
    ctx.fillStyle = u < 0.5 ? C.accent : C.spark;
    ctx.beginPath();
    ctx.arc(px, cy, 4.5, 0, TAU);
    ctx.fill();
  }

  // Left card: INPUT
  kit.roundRect(ctx, leftX - cardW / 2, cy - cardH / 2, cardW, cardH, 10);
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "600 13px monospace";
  ctx.fillStyle = C.accent;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(labels[0] || "input", leftX - cardW / 2 + 14, cy - cardH / 2 + 22);

  const inWidths = [0.66, 0.52, 0.78, 0.45];
  inWidths.forEach((wf, idx) => {
    const pulse = 0.5 + 0.5 * Math.sin(TAU * (phase - idx * 0.18));
    ctx.globalAlpha = 0.45 + 0.55 * pulse;
    ctx.fillStyle = C.muted;
    ctx.fillRect(leftX - cardW / 2 + 14, cy - 16 + idx * 16, Math.round(cardW * wf * (0.85 + 0.15 * pulse)), 7);
  });

  // Center core: TRANSFORMER
  ctx.globalAlpha = 1;
  const coreR = Math.round(H * 0.14);
  ctx.fillStyle = C.surface;
  ctx.beginPath();
  ctx.arc(midX, cy, coreR, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  const ang = phase * TAU * 2;
  ctx.strokeStyle = C.spark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(midX, cy, coreR - 7, ang, ang + Math.PI * 1.1);
  ctx.stroke();

  ctx.font = "600 12px monospace";
  ctx.fillStyle = C.body;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(labels[1] || "transform", midX, cy);

  // Right card: OUTPUT
  kit.roundRect(ctx, rightX - cardW / 2, cy - cardH / 2, cardW, cardH, 10);
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.strokeStyle = C.spark;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "600 13px monospace";
  ctx.fillStyle = C.spark;
  ctx.textAlign = "left";
  ctx.fillText(labels[2] || "output", rightX - cardW / 2 + 14, cy - cardH / 2 + 22);

  for (let idx = 0; idx < 4; idx++) {
    const ry = cy - 16 + idx * 16;
    const rx = rightX - cardW / 2 + 14;
    const active = 0.5 + 0.5 * Math.sin(TAU * (phase - idx * 0.18));
    ctx.fillStyle = C.spark;
    ctx.globalAlpha = 0.45 + 0.55 * active;
    ctx.beginPath();
    ctx.arc(rx + 5, ry + 3.5, 3.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.body;
    ctx.fillRect(rx + 14, ry, Math.round(cardW * 0.65), 7);
  }

  // Bottom caption pill (fixed pill + smooth text fade)
  const capY = Math.round(H * 0.85);
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
