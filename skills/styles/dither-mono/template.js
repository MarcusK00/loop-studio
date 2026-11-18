// Style Pack: dither-mono — Ordered Bayer 4x4 dithering on a rotating torus & sphere
export const meta = {
  mode: "ambient",
  style: "dither-mono",
  seconds: 4,
  fps: 24,
  width: 360,
  height: 360,
  seed: 67,
  palette: "phosphor"
};

export function render(ctx, phase, kit) {
  const W = meta.width;
  const H = meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["phosphor"];
  const TAU = Math.PI * 2;

  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  const pixel = 4;
  const cols = Math.floor(W / pixel);
  const rows = Math.floor(H / pixel);
  const lx = Math.cos(TAU * phase);
  const ly = Math.sin(TAU * phase);
  const lz = 0.65;
  const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);

  for (let gy = 0; gy < rows; gy++) {
    const ny = (gy / rows - 0.5) * 2.2;
    for (let gx = 0; gx < cols; gx++) {
      const nx = (gx / cols - 0.5) * 2.2;
      const r2 = nx * nx + ny * ny;

      let lum = 0;
      if (r2 < 0.72) {
        // Central lit sphere + latitude wave bands
        const nz = Math.sqrt(Math.max(0, 0.72 - r2));
        const dot = Math.max(0, (nx * lx + ny * ly + nz * lz) / (0.85 * lLen));
        const ring = 0.5 + 0.5 * Math.sin(TAU * (phase * 2 - Math.sqrt(r2) * 2.2));
        lum = dot * 0.78 + ring * 0.25;
      } else {
        // Outer orbital radar rings
        const dist = Math.sqrt(r2);
        const angle = Math.atan2(ny, nx);
        const sweep = 0.5 + 0.5 * Math.sin(angle * 3 - TAU * phase * 2);
        const band = Math.max(0, 1 - Math.abs(dist - 0.96) * 7.5);
        lum = band * sweep * 0.85;
      }

      const threshold = kit.dither.bayer4(gx, gy);
      if (lum > threshold + 0.35) {
        ctx.fillStyle = C.spark;
        ctx.fillRect(gx * pixel, gy * pixel, pixel - 1, pixel - 1);
      } else if (lum > threshold) {
        ctx.fillStyle = C.accent;
        ctx.fillRect(gx * pixel, gy * pixel, pixel - 1, pixel - 1);
      }
    }
  }
}
