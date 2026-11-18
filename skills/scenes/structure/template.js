// Scene Pack: structure — Tree / DAG node propagation
export const meta = {
  mode: "showcase",
  scene: "structure",
  seconds: 10,
  fps: 24,
  width: 800,
  height: 320,
  seed: 37,
  palette: "studio-dark"
};

export const showcase = {
  says: "Loop Studio bundles skills, rules, subagents, and the loop CLI into one universal plugin.",
  seconds: 10,
  scene: "structure",
  stage: ["plugin.json", "skills/ (30)", "rules/AGENTS.md", "tool/bin/loop.js"],
  steps: [
    { from: 8.75, to: 1.25, caption: "plugin.json registers the bundle", source: "plugin.json:2" },
    { from: 1.25, to: 3.75, caption: "skills load on demand per session", source: "AGENTS.md:20" },
    { from: 3.75, to: 6.25, caption: "rules enforce the phase contract", source: "rules/AGENTS.md:8" },
    { from: 6.25, to: 8.75, caption: "loop CLI measures seam & contrast", source: "AGENTS.md:9" }
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

  const root = { x: Math.round(W * 0.22), y: Math.round(H * 0.39), label: labels[0] || "root" };
  const children = [
    { x: Math.round(W * 0.70), y: Math.round(H * 0.17), label: labels[1] || "branch 1" },
    { x: Math.round(W * 0.70), y: Math.round(H * 0.39), label: labels[2] || "branch 2" },
    { x: Math.round(W * 0.70), y: Math.round(H * 0.61), label: labels[3] || "branch 3" }
  ];
  const rootW = Math.round(W * 0.19);
  const childW = Math.round(W * 0.24);
  const boxH = Math.round(H * 0.14);

  children.forEach((ch, idx) => {
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(root.x + rootW / 2, root.y);
    ctx.lineTo(ch.x - childW / 2, ch.y);
    ctx.stroke();

    // Ping-pong packet along branch (no sudden reset jump at u=1)
    const u = (phase * 2 + idx * 0.33) % 1;
    const ping = u < 0.5 ? u * 2 : (1 - u) * 2;
    const px = (root.x + rootW / 2) + ((ch.x - childW / 2) - (root.x + rootW / 2)) * ping;
    const py = root.y + (ch.y - root.y) * ping;
    ctx.fillStyle = idx === 2 ? C.spark : C.accent;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, TAU);
    ctx.fill();
  });

  kit.roundRect(ctx, root.x - rootW / 2, root.y - boxH / 2, rootW, boxH, 8);
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "600 13px monospace";
  ctx.fillStyle = C.body;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(root.label, root.x, root.y);

  children.forEach((ch, idx) => {
    const active = 0.5 + 0.5 * Math.sin(TAU * (phase - idx * 0.25));
    kit.roundRect(ctx, ch.x - childW / 2, ch.y - boxH / 2, childW, boxH, 8);
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.strokeStyle = active > 0.65 ? C.spark : C.line;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = C.body;
    ctx.fillText(ch.label, ch.x, ch.y);
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
