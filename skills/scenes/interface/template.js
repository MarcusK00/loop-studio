// Scene Pack: interface — Simplified wireframe screen with pointer interaction
export const meta = {
  mode: "showcase",
  scene: "interface",
  seconds: 10,
  fps: 24,
  width: 800,
  height: 320,
  seed: 31,
  palette: "studio-dark"
};

export const showcase = {
  says: "The loop serve workbench lets you scrub every frame, inspect seam deltas, and export contact sheets.",
  seconds: 10,
  scene: "interface",
  stage: ["Phase Scrubber", "Live Stage", "Seam Chart", "Export GIF"],
  steps: [
    { from: 8.75, to: 1.25, caption: "open `loop serve` in the browser", source: "AGENTS.md:16" },
    { from: 1.25, to: 3.75, caption: "drag phase scrubber across frames", source: "skills/loop-render/SKILL.md:62" },
    { from: 3.75, to: 6.25, caption: "inspect live seam bar chart", source: "skills/loop-render/SKILL.md:30" },
    { from: 6.25, to: 8.75, caption: "export verified loop.gif bundle", source: "skills/loop-render/SKILL.md:54" }
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

  const uiX = Math.round(W * 0.08);
  const uiY = Math.round(H * 0.07);
  const uiW = Math.round(W * 0.84);
  const uiH = Math.round(H * 0.61);

  kit.roundRect(ctx, uiX, uiY, uiW, uiH, 10);
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.stroke();

  const stageX = uiX + 18;
  const stageY = uiY + 16;
  const stageW = Math.round(uiW * 0.55);
  const stageH = Math.round(uiH * 0.60);
  kit.roundRect(ctx, stageX, stageY, stageW, stageH, 6);
  ctx.fillStyle = C.ground;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "600 12px monospace";
  ctx.fillStyle = C.muted;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(labels[1] || "Live Stage", stageX + 10, stageY + 14);

  for (let i = 0; i < 8; i++) {
    const wx = stageX + 28 + i * ((stageW - 56) / 7);
    const wy = stageY + stageH * 0.56 + Math.sin(TAU * (phase - i * 0.12)) * (stageH * 0.22);
    ctx.fillStyle = i % 2 === 0 ? C.accent : C.spark;
    ctx.beginPath();
    ctx.arc(wx, wy, 5.5, 0, TAU);
    ctx.fill();
  }

  const rightX = stageX + stageW + 16;
  const rightW = uiW - stageW - 52;
  kit.roundRect(ctx, rightX, stageY, rightW, Math.round(stageH * 0.65), 6);
  ctx.fillStyle = C.ground;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.stroke();

  ctx.fillStyle = C.muted;
  ctx.fillText(labels[2] || "Seam Chart", rightX + 10, stageY + 14);

  const btnY = stageY + Math.round(stageH * 0.73);
  const isExportActive = t >= 6.25 && t < 8.75;
  kit.roundRect(ctx, rightX, btnY, rightW, Math.round(stageH * 0.27), 6);
  ctx.fillStyle = isExportActive ? C.spark : C.accent;
  ctx.fill();
  ctx.font = "600 12px monospace";
  ctx.fillStyle = C.ground;
  ctx.textAlign = "center";
  ctx.fillText(labels[3] || "Export GIF", rightX + rightW / 2, btnY + Math.round(stageH * 0.135));

  const scrubY = stageY + stageH + Math.round(uiH * 0.16);
  ctx.font = "600 12px monospace";
  ctx.fillStyle = C.muted;
  ctx.textAlign = "left";
  ctx.fillText(labels[0] || "Phase Scrubber", stageX, scrubY - 12);

  ctx.strokeStyle = C.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(stageX, scrubY + 4);
  ctx.lineTo(stageX + stageW, scrubY + 4);
  ctx.stroke();

  const knobX = stageX + stageW * (0.5 + 0.42 * Math.sin(TAU * phase));
  ctx.fillStyle = C.accent;
  ctx.beginPath();
  ctx.arc(knobX, scrubY + 4, 6.5, 0, TAU);
  ctx.fill();

  // Closed-loop pointer cursor
  const ptrX = W / 2 + Math.cos(TAU * phase) * (W * 0.20);
  const ptrY = uiY + uiH * 0.55 + Math.sin(TAU * phase) * (uiH * 0.22);
  ctx.fillStyle = C.body;
  ctx.beginPath();
  ctx.arc(ptrX, ptrY, 5, 0, TAU);
  ctx.fill();

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
