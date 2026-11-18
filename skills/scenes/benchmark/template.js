// Scene Pack: benchmark — Side-by-side quantitative seam comparison
export const meta = {
  mode: "showcase",
  scene: "benchmark",
  seconds: 10,
  fps: 24,
  width: 800,
  height: 320,
  seed: 47,
  palette: "studio-dark"
};

export const showcase = {
  says: "The seam check measures last-to-first frame delta against median step delta to catch visible loop jumps.",
  seconds: 10,
  scene: "benchmark",
  stage: ["Unchecked Loop (4.2x FAIL)", "Phase Contract (1.05x PASS)"],
  steps: [
    { from: 8.75, to: 1.25, caption: "measure frame-to-frame pixel deltas", source: "skills/loop-render/SKILL.md:30" },
    { from: 1.25, to: 3.75, caption: "interior frames track 1.0x median", source: "skills/loop-audit/SKILL.md:14" },
    { from: 3.75, to: 6.25, caption: "unclosed loop spikes to 4.2x FAIL", source: "rules/AGENTS.md:15" },
    { from: 6.25, to: 8.75, caption: "phase loop scores 1.05x PASS", source: "rules/AGENTS.md:45" }
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

  const cardW = Math.round(W * 0.41);
  const cardH = Math.round(H * 0.58);
  const topY = Math.round(H * 0.08);
  const leftX = Math.round(W * 0.068);
  const rightX = W - leftX - cardW;

  const baseSteps = [1.02, 0.96, 1.05, 0.98, 1.01, 1.04, 0.95, 1.02, 0.99, 1.03, 0.97, 1.01];
  const cards = [
    { x: leftX, title: labels[0] || "Unchecked Loop (4.2x FAIL)", seam: 4.2, color: C.accent },
    { x: rightX, title: labels[1] || "Phase Contract (1.05x PASS)", seam: 1.05, color: C.spark }
  ];

  cards.forEach((card, cIdx) => {
    kit.roundRect(ctx, card.x, topY, cardW, cardH, 10);
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.strokeStyle = card.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "600 12.5px monospace";
    ctx.fillStyle = card.color;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(card.title, card.x + 14, topY + 20);

    const vals = baseSteps.concat([card.seam]);
    const baseY = topY + cardH - 22;
    const unit = cardH * 0.13;
    const barStep = (cardW - 32) / vals.length;
    const bw = Math.max(4, Math.round(barStep * 0.72));

    vals.forEach((v, i) => {
      const bx = card.x + 16 + i * barStep;
      const wave = 1 + 0.12 * Math.sin(TAU * (phase - i / vals.length));
      const bh = Math.min(cardH - 52, v * unit * wave);
      const isSeam = i === vals.length - 1;
      ctx.globalAlpha = isSeam ? 1 : 0.65;
      ctx.fillStyle = isSeam ? card.color : C.muted;
      ctx.fillRect(bx, baseY - bh, bw, bh);
    });

    // Constant-speed orbital probe circle inside each card
    const probeCx = card.x + cardW * 0.5 + Math.cos(TAU * phase + cIdx) * (cardW * 0.30);
    const probeCy = topY + cardH * 0.55 + Math.sin(TAU * phase + cIdx) * (cardH * 0.18);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = card.color;
    ctx.beginPath();
    ctx.arc(probeCx, probeCy, 5, 0, TAU);
    ctx.fill();
  });

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
