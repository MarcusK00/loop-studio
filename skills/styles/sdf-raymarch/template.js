// Style Pack: sdf-raymarch — Software-safe 3D Signed Distance Field smooth union
export const meta = {
  mode: "ambient",
  style: "sdf-raymarch",
  seconds: 4,
  fps: 24,
  width: 360,
  height: 360,
  seed: 53,
  palette: "nebula"
};

function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

function sceneSDF(px, py, pz, phase) {
  const TAU = Math.PI * 2;
  const a1 = phase * TAU;
  const c = Math.cos(a1);
  const s = Math.sin(a1);
  // Rotate point for torus
  const rx = px * c - pz * s;
  const rz = px * s + pz * c;
  const ry = py * Math.cos(a1) - rz * Math.sin(a1);
  const rz2 = py * Math.sin(a1) + rz * Math.cos(a1);

  const qx = Math.sqrt(rx * rx + rz2 * rz2) - 0.72;
  const torus = Math.sqrt(qx * qx + ry * ry) - 0.24;

  // 3 orbiting spheres
  let d = torus;
  for (let i = 0; i < 3; i++) {
    const ang = a1 * 2 + (i * TAU) / 3;
    const sx = Math.cos(ang) * 0.88;
    const sy = Math.sin(ang) * 0.88;
    const sz = Math.sin(a1 + i * 2.1) * 0.35;
    const dx = px - sx;
    const dy = py - sy;
    const dz = pz - sz;
    const sph = Math.sqrt(dx * dx + dy * dy + dz * dz) - 0.26;
    d = smin(d, sph, 0.35);
  }
  return d;
}

export function render(ctx, phase, kit) {
  const W = meta.width;
  const H = meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["nebula"];

  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  const cell = 5;
  const eps = 0.02;

  for (let y = 0; y < H; y += cell) {
    const uvY = -((y + cell * 0.5) / H - 0.5) * 2.2;
    for (let x = 0; x < W; x += cell) {
      const uvX = ((x + cell * 0.5) / W - 0.5) * 2.2;
      const roZ = 2.8;
      const len = Math.sqrt(uvX * uvX + uvY * uvY + 1.8 * 1.8);
      const rdX = uvX / len;
      const rdY = uvY / len;
      const rdZ = -1.8 / len;

      let t = 0;
      let hit = false;
      for (let step = 0; step < 22; step++) {
        const px = rdX * t;
        const py = rdY * t;
        const pz = roZ + rdZ * t;
        const d = sceneSDF(px, py, pz, phase);
        if (d < 0.02) {
          hit = true;
          break;
        }
        t += d;
        if (t > 4.8) break;
      }

      if (hit) {
        const px = rdX * t;
        const py = rdY * t;
        const pz = roZ + rdZ * t;
        const d0 = sceneSDF(px, py, pz, phase);
        const nx = sceneSDF(px + eps, py, pz, phase) - d0;
        const ny = sceneSDF(px, py + eps, pz, phase) - d0;
        const nz = sceneSDF(px, py, pz + eps, phase) - d0;
        const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        const lDot = Math.max(0, (nx * 0.57 + ny * 0.57 + nz * 0.57) / nLen);
        const rim = Math.pow(1 - Math.max(0, nz / nLen), 2);

        ctx.fillStyle = rim > 0.55 ? C.spark : lDot > 0.48 ? C.accent : C.surface;
        ctx.globalAlpha = Math.min(1, 0.35 + lDot * 0.65 + rim * 0.35);
        ctx.fillRect(x, y, cell, cell);
      }
    }
  }
  ctx.globalAlpha = 1;
}
