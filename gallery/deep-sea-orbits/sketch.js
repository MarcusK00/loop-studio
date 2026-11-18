// Style Pack: particle-orbit — Deep sea bioluminescent nested orbits
export const meta = {
  mode: "ambient",
  style: "particle-orbit",
  seconds: 4,
  fps: 20,
  width: 320,
  height: 320,
  seed: 42,
  palette: "abyss"
};

export function render(ctx, phase, kit) {
  const W = meta.width;
  const H = meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["abyss"];
  const TAU = Math.PI * 2;
  const cx = W / 2;
  const cy = H / 2;

  ctx.globalAlpha = 1;
  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  // Layer 1 (Ground): Slower background depth lattice (added per Round 1 critique rule)
  const cols = 14;
  const cell = W / cols;
  for (let j = 0; j < cols; j++) {
    for (let i = 0; i < cols; i++) {
      const gx = (i + 0.5) * cell;
      const gy = (j + 0.5) * cell;
      const dx = (gx - cx) / cx;
      const dy = (gy - cy) / cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const wave = 0.5 + 0.5 * Math.sin(TAU * (phase - d * 1.4));
      ctx.globalAlpha = 0.14 + 0.22 * wave;
      ctx.fillStyle = C.surface;
      ctx.beginPath();
      ctx.arc(gx, gy, cell * 0.26 * (0.3 + 0.7 * wave), 0, TAU);
      ctx.fill();
    }
  }

  // Layer 2 (Body): Nested elliptical orbits at 1x and 2x integer speeds
  const rings = 5;
  for (let r = 1; r <= rings; r++) {
    const rx = W * (0.11 + r * 0.068);
    const ry = rx * (0.64 + 0.06 * Math.sin(TAU * phase + r));
    const tilt = r * 0.32 + Math.sin(TAU * phase) * 0.08;
    const count = 14 + r * 4;
    const speed = r % 2 === 0 ? -1 : 1;

    // Subtle orbit track
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let s = 0; s <= 48; s++) {
      const a = (s / 48) * TAU;
      const ox = Math.cos(a) * rx;
      const oy = Math.sin(a) * ry;
      const px = cx + ox * Math.cos(tilt) - oy * Math.sin(tilt);
      const py = cy + ox * Math.sin(tilt) + oy * Math.cos(tilt);
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    for (let i = 0; i < count; i++) {
      const a = TAU * ((phase * speed + i / count) % 1);
      const ox = Math.cos(a) * rx;
      const oy = Math.sin(a) * ry;
      const px = cx + ox * Math.cos(tilt) - oy * Math.sin(tilt);
      const py = cy + ox * Math.sin(tilt) + oy * Math.cos(tilt);
      const depth = 0.5 + 0.5 * Math.sin(a);
      const rad = (2.0 + depth * 3.8) * (W / 400);
      const isSpark = i % 6 === 0;

      if (isSpark) {
        ctx.globalAlpha = 0.25 * (0.5 + 0.5 * depth);
        ctx.fillStyle = C.spark;
        ctx.beginPath();
        ctx.arc(px, py, rad * 2.4, 0, TAU);
        ctx.fill();
      }

      ctx.globalAlpha = 0.35 + 0.65 * depth;
      ctx.fillStyle = isSpark ? C.spark : C.accent;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, TAU);
      ctx.fill();
    }
  }

  // Layer 3 (Spark): Focal core beacon pulsing at 2x speed
  const corePulse = 0.5 + 0.5 * Math.sin(TAU * phase * 2);
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = C.accent;
  ctx.beginPath();
  ctx.arc(cx, cy, W * (0.065 + 0.02 * corePulse), 0, TAU);
  ctx.fill();

  ctx.globalAlpha = 0.95;
  ctx.fillStyle = C.spark;
  ctx.beginPath();
  ctx.arc(cx, cy, W * (0.026 + 0.008 * corePulse), 0, TAU);
  ctx.fill();

  ctx.globalAlpha = 1;
}
