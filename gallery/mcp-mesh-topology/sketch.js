// Scene Pack: architecture — Multi-tier topology with request/response packets
export const meta = {
  mode: "showcase",
  scene: "architecture",
  seconds: 10,
  fps: 20,
  width: 800,
  height: 320,
  seed: 41,
  palette: "aurora"
};

export const showcase = {
  says: "The Loop Studio orchestrator coordinates the CLI renderer, seam analyzer, and cold-read subagent.",
  seconds: 10,
  scene: "architecture",
  stage: ["Agent", "loop CLI", "Seam Audit", "Cold Reader"],
  steps: [
    { from: 8.75, to: 1.25, caption: "agent scaffolds sketch via loop CLI", source: "AGENTS.md:9" },
    { from: 1.25, to: 3.75, caption: "CLI renders storyboard & frame deltas", source: "skills/loop-render/SKILL.md:24" },
    { from: 3.75, to: 6.25, caption: "cold-reader inspects storyboard.png", source: "agents/loop-cold-reader.md:10" },
    { from: 6.25, to: 8.75, caption: "verified loop.gif & audit return", source: "skills/loop-audit/SKILL.md:9" }
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

  const nodes = [
    { x: Math.round(W * 0.18), y: Math.round(H * 0.38), w: Math.round(W * 0.17), h: Math.round(H * 0.17), label: labels[0] || "Agent", color: C.accent },
    { x: Math.round(W * 0.48), y: Math.round(H * 0.38), w: Math.round(W * 0.18), h: Math.round(H * 0.17), label: labels[1] || "loop CLI", color: C.body },
    { x: Math.round(W * 0.80), y: Math.round(H * 0.24), w: Math.round(W * 0.21), h: Math.round(H * 0.15), label: labels[2] || "Seam Audit", color: C.spark },
    { x: Math.round(W * 0.80), y: Math.round(H * 0.52), w: Math.round(W * 0.21), h: Math.round(H * 0.15), label: labels[3] || "Cold Reader", color: C.spark }
  ];

  const links = [
    [0, 1],
    [1, 2],
    [1, 3]
  ];

  links.forEach(([aIdx, bIdx], i) => {
    const a = nodes[aIdx];
    const b = nodes[bIdx];
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x + a.w / 2, a.y);
    ctx.lineTo(b.x - b.w / 2, b.y);
    ctx.stroke();

    const u = (phase * 2 + i * 0.3) % 1;
    const ping = u < 0.5 ? u * 2 : (1 - u) * 2;
    const px = (a.x + a.w / 2) + ((b.x - b.w / 2) - (a.x + a.w / 2)) * ping;
    const py = a.y + (b.y - a.y) * ping;
    ctx.fillStyle = u < 0.5 ? C.accent : C.spark;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, TAU);
    ctx.fill();
  });

  ctx.font = "600 13px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  nodes.forEach((n) => {
    kit.roundRect(ctx, n.x - n.w / 2, n.y - n.h / 2, n.w, n.h, 8);
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.strokeStyle = n.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = C.body;
    ctx.fillText(n.label, n.x, n.y);
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
