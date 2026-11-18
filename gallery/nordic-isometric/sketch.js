// Style Pack: isometric-grid — Orthographic 3D blocks rising in harmonic waves
export const meta = {
  mode: "ambient",
  style: "isometric-grid",
  seconds: 4,
  fps: 20,
  width: 320,
  height: 320,
  seed: 73,
  palette: "nordic"
};

function drawIsoPrism(ctx, x, y, tw, th, bh, topCol, leftCol, rightCol, strokeCol) {
  const hw = tw / 2;
  const hh = th / 2;

  // Top face
  ctx.fillStyle = topCol;
  ctx.beginPath();
  ctx.moveTo(x, y - hh);
  ctx.lineTo(x + hw, y);
  ctx.lineTo(x, y + hh);
  ctx.lineTo(x - hw, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = strokeCol;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Left face
  ctx.fillStyle = leftCol;
  ctx.beginPath();
  ctx.moveTo(x - hw, y);
  ctx.lineTo(x, y + hh);
  ctx.lineTo(x, y + hh + bh);
  ctx.lineTo(x - hw, y + bh);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right face
  ctx.fillStyle = rightCol;
  ctx.beginPath();
  ctx.moveTo(x + hw, y);
  ctx.lineTo(x, y + hh);
  ctx.lineTo(x, y + hh + bh);
  ctx.lineTo(x + hw, y + bh);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function render(ctx, phase, kit) {
  const W = meta.width;
  const H = meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["nordic"];
  const TAU = Math.PI * 2;

  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  const N = 8;
  const tw = W * 0.095;
  const th = tw * 0.56;
  const baseH = W * 0.09;
  const cx = W / 2;
  const cy = H * 0.28;

  for (let sum = 0; sum <= (N - 1) * 2; sum++) {
    for (let i = 0; i < N; i++) {
      const j = sum - i;
      if (j < 0 || j >= N) continue;

      const dx = i - (N - 1) / 2;
      const dy = j - (N - 1) / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const wave = 0.5 + 0.5 * Math.sin(TAU * (phase - dist * 0.22));
      const elev = wave * (W * 0.085);

      const sx = cx + (i - j) * (tw / 2);
      const sy = cy + (i + j) * (th / 2) - elev;
      const topCol = wave > 0.78 ? C.spark : wave > 0.42 ? C.accent : C.body;

      drawIsoPrism(ctx, sx, sy, tw * 0.92, th * 0.92, baseH + elev * 0.5, topCol, C.surface, C.line, C.ground);
    }
  }
}
