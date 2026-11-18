// Style Pack: dither-mono — Ordered Bayer 4x4 dithering on a rotating sphere & CRT radar sweep
export const meta = {
  mode: "ambient",
  style: "dither-mono",
  seconds: 4,
  fps: 30,
  width: 320,
  height: 320,
  seed: 67,
  palette: "amber-crt"
};

export function render(ctx, phase, kit) {
  const W = ctx.width || meta.width;
  const H = ctx.height || meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["amber-crt"];
  const TAU = Math.PI * 2;

  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  const pixel = W >= 300 ? 4 : 3;
  const cols = Math.floor(W / pixel);
  const rows = Math.floor(H / pixel);
  const lx = Math.cos(TAU * phase);
  const ly = Math.sin(TAU * phase);
  const lz = 0.65;
  const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);

  for (let gy = 0; gy < rows; gy++) {
    const ny = (gy / rows - 0.5) * 2.25;
    for (let gx = 0; gx < cols; gx++) {
      const nx = (gx / cols - 0.5) * 2.25;
      const r2 = nx * nx + ny * ny;

      let lum = 0;
      if (r2 < 0.64) {
        const nz = Math.sqrt(Math.max(0, 0.64 - r2));
        const dot = Math.max(0, (nx * lx + ny * ly + nz * lz) / (0.8 * lLen));
        const ring = 0.5 + 0.5 * Math.sin(TAU * (phase * 2 - Math.sqrt(r2) * 2.4));
        lum = dot * 0.78 + ring * 0.28;
      } else {
        const dist = Math.sqrt(r2);
        const angle = Math.atan2(ny, nx);
        const sweep = 0.5 + 0.5 * Math.sin(angle * 3 - TAU * phase * 2);
        const band = Math.max(0, 1 - Math.abs(dist - 0.94) * 6.5);
        lum = band * sweep * 0.9;
      }

      const threshold = kit.dither.bayer4(gx, gy);
      if (lum > threshold + 0.34) {
        ctx.fillStyle = C.spark;
        ctx.fillRect(gx * pixel, gy * pixel, pixel - 1, pixel - 1);
      } else if (lum > threshold) {
        ctx.fillStyle = C.accent;
        ctx.fillRect(gx * pixel, gy * pixel, pixel - 1, pixel - 1);
      }
    }
  }

  // Subtle CRT corner telemetry stamp
  ctx.font = "600 10px monospace";
  ctx.fillStyle = C.spark;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("BAYER-4X4 // SYNC", 14, 18);
  ctx.textAlign = "right";
  ctx.fillStyle = C.muted;
  ctx.fillText("p:" + phase.toFixed(2), W - 14, H - 16);
}
