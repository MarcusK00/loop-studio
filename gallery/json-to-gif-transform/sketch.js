// Custom 60fps Showcase: json-to-gif-transform — Multi-stage transformer converting brief.json -> 480 frames -> MP4/WebP
export const meta = {
  mode: "showcase",
  scene: "transform",
  seconds: 8,
  fps: 60,
  width: 640,
  height: 270,
  seed: 97,
  palette: "abyss"
};

export const showcase = {
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
};

export function render(ctx, phase, kit) {
  const W = ctx.width || meta.width;
  const H = ctx.height || meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["abyss"];
  const S = kit.showcase || showcase;
  const labels = S.stage || showcase.stage;
  const steps = S.steps || showcase.steps;
  const SECONDS = S.seconds || meta.seconds;
  const t = phase * SECONDS;
  const TAU = Math.PI * 2;

  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  const cardW = Math.round(W * 0.27);
  const cardH = Math.round(H * 0.50);
  const cy = Math.round(H * 0.40);
  const leftX = Math.round(W * 0.20);
  const midX = Math.round(W * 0.50);
  const rightX = Math.round(W * 0.80);

  // Beam + 60fps streaming tokens
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(leftX + cardW / 2, cy);
  ctx.lineTo(rightX - cardW / 2, cy);
  ctx.stroke();

  for (let i = 0; i < 6; i++) {
    const u = (phase * 3 + i / 6) % 1;
    const px = (leftX + cardW / 2) + ((rightX - cardW / 2) - (leftX + cardW / 2)) * u;
    const py = cy + Math.sin(TAU * (u * 2 + phase)) * 6;
    ctx.fillStyle = u < 0.5 ? C.accent : C.spark;
    ctx.beginPath();
    ctx.arc(px, py, 3.8, 0, TAU);
    ctx.fill();
  }

  // Left Card: brief.json
  kit.roundRect(ctx, leftX - cardW / 2, cy - cardH / 2, cardW, cardH, 10);
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "700 12px monospace";
  ctx.fillStyle = C.accent;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(labels[0], leftX - cardW / 2 + 12, cy - cardH / 2 + 20);

  const specLines = ["fps: 60", "sec: 8", "480 frames", "seam <= 1.5"];
  ctx.font = "500 11px monospace";
  specLines.forEach((line, idx) => {
    const pulse = 0.5 + 0.5 * Math.sin(TAU * (phase * 2 - idx * 0.2));
    ctx.globalAlpha = 0.55 + 0.45 * pulse;
    ctx.fillStyle = idx === 0 ? C.spark : C.body;
    ctx.fillText(line, leftX - cardW / 2 + 12, cy - 16 + idx * 18);
  });

  // Center Dual-Counter-Rotating 60fps Turbine
  ctx.globalAlpha = 1;
  const coreR = Math.round(H * 0.19);
  ctx.fillStyle = C.surface;
  ctx.beginPath();
  ctx.arc(midX, cy, coreR, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.stroke();

  const a1 = phase * TAU * 3;
  const a2 = -phase * TAU * 4;
  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(midX, cy, coreR - 7, a1, a1 + Math.PI * 1.15);
  ctx.stroke();

  ctx.strokeStyle = C.spark;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(midX, cy, coreR - 15, a2, a2 + Math.PI * 1.15);
  ctx.stroke();

  ctx.font = "700 11px monospace";
  ctx.fillStyle = C.body;
  ctx.textAlign = "center";
  ctx.fillText("60 FPS", midX, cy);

  // Right Card: Live 60fps Output Preview
  kit.roundRect(ctx, rightX - cardW / 2, cy - cardH / 2, cardW, cardH, 10);
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.strokeStyle = C.spark;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "700 12px monospace";
  ctx.fillStyle = C.spark;
  ctx.textAlign = "left";
  ctx.fillText(labels[2], rightX - cardW / 2 + 12, cy - cardH / 2 + 20);

  // Miniature orbiting wave inside output card
  const outCx = rightX;
  const outCy = cy + 10;
  for (let k = 0; k < 8; k++) {
    const a = TAU * (phase * 2 + k / 8);
    const ox = outCx + Math.cos(a) * (cardW * 0.28);
    const oy = outCy + Math.sin(a * 2) * (cardH * 0.16);
    ctx.fillStyle = k % 2 === 0 ? C.accent : C.spark;
    ctx.beginPath();
    ctx.arc(ox, oy, 3.6, 0, TAU);
    ctx.fill();
  }

  // Bottom caption pill
  const capY = Math.round(H * 0.86);
  const pillW = Math.round(W * 0.64);
  kit.roundRect(ctx, W / 2 - pillW / 2, capY - 16, pillW, 32, 7);
  ctx.globalAlpha = 0.96;
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.font = "500 12.5px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  steps.forEach((c) => {
    const len = ((c.to - c.from) % SECONDS + SECONDS) % SECONDS || SECONDS;
    const u = ((t - c.from) % SECONDS + SECONDS) % SECONDS;
    if (u >= len) return;
    const fade = Math.max(0.25, Math.min(1, u / 0.3, (len - u) / 0.3));
    ctx.globalAlpha = fade;
    ctx.fillStyle = C.body;
    ctx.fillText(c.caption, W / 2, capY);
  });
  ctx.globalAlpha = 1;
}
