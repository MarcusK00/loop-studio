// Style Pack: sdf-raymarch — Software-safe 3D Signed Distance Field smooth union with specular & rim glow
export const meta = {
  mode: "ambient",
  style: "sdf-raymarch",
  seconds: 3,
  fps: 30,
  width: 280,
  height: 280,
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
  // Rotate torus across two axes
  const rx = px * c - pz * s;
  const rz = px * s + pz * c;
  const ry = py * Math.cos(a1) - rz * Math.sin(a1);
  const rz2 = py * Math.sin(a1) + rz * Math.cos(a1);

  const qx = Math.sqrt(rx * rx + rz2 * rz2) - 0.68;
  const torus = Math.sqrt(qx * qx + ry * ry) - 0.22;

  // 3 orbiting satellite spheres smoothly blending into the torus
  let d = torus;
  for (let i = 0; i < 3; i++) {
    const ang = a1 * 2 + (i * TAU) / 3;
    const sx = Math.cos(ang) * 0.86;
    const sy = Math.sin(ang) * 0.86;
    const sz = Math.sin(a1 + i * 2.094) * 0.36;
    const dx = px - sx;
    const dy = py - sy;
    const dz = pz - sz;
    const sph = Math.sqrt(dx * dx + dy * dy + dz * dz) - 0.24;
    d = smin(d, sph, 0.38);
  }
  return d;
}

export function render(ctx, phase, kit) {
  const W = ctx.width || meta.width;
  const H = ctx.height || meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["nebula"];

  if (ctx.createRadialGradient) {
    const bg = ctx.createRadialGradient(W * 0.5, H * 0.5, 10, W * 0.5, H * 0.5, W * 0.65);
    bg.addColorStop(0, C.surface);
    bg.addColorStop(1, C.ground);
    ctx.fillStyle = bg;
  } else {
    ctx.fillStyle = C.ground;
  }
  ctx.fillRect(0, 0, W, H);

  const cell = W >= 300 ? 3 : 2;
  const eps = 0.02;

  for (let y = 0; y < H; y += cell) {
    const uvY = -((y + cell * 0.5) / H - 0.5) * 2.25;
    for (let x = 0; x < W; x += cell) {
      const uvX = ((x + cell * 0.5) / W - 0.5) * 2.25;
      const roZ = 2.75;
      const len = Math.sqrt(uvX * uvX + uvY * uvY + 1.85 * 1.85);
      const rdX = uvX / len;
      const rdY = uvY / len;
      const rdZ = -1.85 / len;

      let t = 0;
      let hit = false;
      for (let step = 0; step < 24; step++) {
        const px = rdX * t;
        const py = rdY * t;
        const pz = roZ + rdZ * t;
        const d = sceneSDF(px, py, pz, phase);
        if (d < 0.018) {
          hit = true;
          break;
        }
        t += d;
        if (t > 4.6) break;
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
        const lDot = Math.max(0, (nx * 0.55 + ny * 0.62 + nz * 0.56) / nLen);
        const rim = Math.pow(1 - Math.max(0, nz / nLen), 2.2);
        const spec = Math.pow(lDot, 8);

        ctx.fillStyle = spec > 0.45 ? C.body : rim > 0.48 ? C.spark : lDot > 0.36 ? C.accent : C.surface;
        ctx.globalAlpha = Math.min(1, 0.42 + lDot * 0.58 + rim * 0.32);
        ctx.fillRect(x, y, cell, cell);
      }
    }
  }
  ctx.globalAlpha = 1;
}
