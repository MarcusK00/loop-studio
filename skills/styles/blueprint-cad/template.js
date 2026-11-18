// Style Pack: blueprint-cad — Precision technical schematic & epicyclic linkage
export const meta = {
  mode: "ambient",
  style: "blueprint-cad",
  seconds: 4,
  fps: 24,
  width: 400,
  height: 400,
  seed: 79,
  palette: "blueprint"
};

export function render(ctx, phase, kit) {
  const W = meta.width;
  const H = meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["blueprint"];
  const TAU = Math.PI * 2;
  const cx = W / 2;
  const cy = H / 2;

  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  // CAD minor & major grid
  const step = 25;
  for (let x = step; x < W; x += step) {
    ctx.strokeStyle = C.line;
    ctx.lineWidth = x % 100 === 0 ? 1.4 : 0.7;
    ctx.globalAlpha = x % 100 === 0 ? 0.55 : 0.25;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = step; y < H; y += step) {
    ctx.strokeStyle = C.line;
    ctx.lineWidth = y % 100 === 0 ? 1.4 : 0.7;
    ctx.globalAlpha = y % 100 === 0 ? 0.55 : 0.25;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Outer graduated compass ring
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = C.muted;
  ctx.lineWidth = 1.5;
  const outerR = W * 0.37;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, TAU);
  ctx.stroke();

  for (let t = 0; t < 36; t++) {
    const a = (t / 36) * TAU;
    const r0 = outerR - (t % 3 === 0 ? 10 : 5);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
    ctx.stroke();
  }

  // Planetary carrier arm (1x speed) and 3 satellite gears (-2x speed)
  const a1 = phase * TAU;
  const orbitR = W * 0.21;
  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, orbitR, 0, TAU);
  ctx.stroke();

  const joints = [];
  for (let i = 0; i < 3; i++) {
    const armA = a1 + (i * TAU) / 3;
    const gx = cx + Math.cos(armA) * orbitR;
    const gy = cy + Math.sin(armA) * orbitR;
    const subA = -a1 * 2 + i;
    const px = gx + Math.cos(subA) * (W * 0.085);
    const py = gy + Math.sin(subA) * (W * 0.085);
    joints.push({ gx, gy, px, py });

    // Carrier strut
    ctx.strokeStyle = C.body;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(gx, gy);
    ctx.lineTo(px, py);
    ctx.stroke();

    // Satellite pitch circle
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(gx, gy, W * 0.085, 0, TAU);
    ctx.stroke();

    // Joint pin
    ctx.fillStyle = C.spark;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, TAU);
    ctx.fill();
  }

  // Connecting triangle between satellite pins
  ctx.strokeStyle = C.spark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(joints[0].px, joints[0].py);
  ctx.lineTo(joints[1].px, joints[1].py);
  ctx.lineTo(joints[2].px, joints[2].py);
  ctx.closePath();
  ctx.stroke();

  // Technical readout stamp
  ctx.font = "600 11.5px monospace";
  ctx.fillStyle = C.body;
  ctx.textAlign = "left";
  ctx.fillText("CAD // HARMONIC-3X", 18, 24);
  ctx.fillStyle = C.spark;
  ctx.fillText("THETA: " + Math.round(phase * 360) + " DEG", 18, H - 16);
  ctx.globalAlpha = 1;
}
