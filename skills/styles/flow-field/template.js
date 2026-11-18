// Style Pack: flow-field — Drifting streamlines on a circular phase-noise field
export const meta = {
  mode: "ambient",
  style: "flow-field",
  seconds: 4,
  fps: 24,
  width: 400,
  height: 400,
  seed: 17,
  palette: "aurora"
};

export function render(ctx, phase, kit) {
  const W = meta.width;
  const H = meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["aurora"];
  const TAU = Math.PI * 2;

  ctx.globalAlpha = 1;
  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  // Layer 1: Ground slow radial atmospheric pulse (1 cycle)
  const pulse = 0.5 + 0.5 * Math.sin(TAU * phase);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = C.surface;
  ctx.beginPath();
  ctx.arc(W * 0.5, H * 0.5, W * (0.34 + 0.04 * pulse), 0, TAU);
  ctx.fill();

  const cx = Math.cos(TAU * phase) * 0.75;
  const cy = Math.sin(TAU * phase) * 0.75;
  const strands = 85;
  const steps = 14;
  const stepLen = W / 54;

  // Layer 2 & 3: Streamlines across 3 overlapping generations
  kit.generations(phase, 3, (age, alpha, gen) => {
    const rand = kit.rng(meta.seed + gen * 101);
    for (let i = 0; i < strands; i++) {
      let x = rand() * W;
      let y = rand() * H;
      const isSpark = i % 7 === 0;

      // Advect starting point slightly by generation age
      const baseAngle = kit.noise2D(x / (W * 0.45) + cx, y / (H * 0.45) + cy, meta.seed) * Math.PI * 1.8;
      x += Math.cos(baseAngle) * age * (W * 0.09);
      y += Math.sin(baseAngle) * age * (H * 0.09);

      ctx.strokeStyle = isSpark ? C.spark : i % 2 === 0 ? C.accent : C.body;
      ctx.lineWidth = isSpark ? 2.2 : 1.4;
      ctx.globalAlpha = alpha * (isSpark ? 0.92 : 0.55);

      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < steps; s++) {
        const n = kit.noise2D(x / (W * 0.42) + cx, y / (H * 0.42) + cy, meta.seed + 7);
        const angle = n * Math.PI * 2.1 + 0.35 * Math.sin(TAU * phase + i * 0.1);
        x += Math.cos(angle) * stepLen;
        y += Math.sin(angle) * stepLen;
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (isSpark) {
        ctx.fillStyle = C.spark;
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, TAU);
        ctx.fill();
      }
    }
  });

  ctx.globalAlpha = 1;
}
