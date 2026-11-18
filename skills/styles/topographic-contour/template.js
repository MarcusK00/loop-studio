// Style Pack: topographic-contour — Cyclic elevation isolines
export const meta = {
  mode: "ambient",
  style: "topographic-contour",
  seconds: 4,
  fps: 24,
  width: 360,
  height: 360,
  seed: 83,
  palette: "abyss"
};

function field(nx, ny, cx, cy, kit, seed) {
  const n1 = kit.noise2D(nx * 2.2 + cx, ny * 2.2 + cy, seed);
  const n2 = 0.5 * kit.noise2D(nx * 4.4 - cy, ny * 4.4 + cx, seed + 13);
  const r = Math.sqrt((nx - 0.5) * (nx - 0.5) + (ny - 0.5) * (ny - 0.5));
  return (n1 + n2) * 0.5 + (0.5 - r);
}

export function render(ctx, phase, kit) {
  const W = meta.width;
  const H = meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["abyss"];
  const TAU = Math.PI * 2;

  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  const cx = Math.cos(TAU * phase) * 0.72;
  const cy = Math.sin(TAU * phase) * 0.72;
  const step = 4;
  const cols = Math.floor(W / step);
  const rows = Math.floor(H / step);
  const bands = 9;

  const grid = new Int16Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const val = field(i / cols, j / rows, cx, cy, kit, meta.seed);
      grid[j * cols + i] = Math.floor((val + 1) * bands);
    }
  }

  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const b = grid[j * cols + i];
      const bR = grid[j * cols + i + 1];
      const bD = grid[(j + 1) * cols + i];
      if (b !== bR || b !== bD) {
        const isMajor = ((b % 3) + 3) % 3 === 0;
        ctx.fillStyle = isMajor ? C.spark : C.accent;
        ctx.globalAlpha = isMajor ? 0.95 : 0.48;
        ctx.fillRect(i * step, j * step, isMajor ? step : step - 1, isMajor ? step : step - 1);
      }
    }
  }
  ctx.globalAlpha = 1;
}
