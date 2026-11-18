// Style Pack: kinetic-type — Harmonic wave typography poster
export const meta = {
  mode: "ambient",
  style: "kinetic-type",
  seconds: 4,
  fps: 24,
  width: 400,
  height: 400,
  seed: 61,
  palette: "editorial",
  word: "PHASE 0→1"
};

export function render(ctx, phase, kit) {
  const W = meta.width;
  const H = meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["editorial"];
  const TAU = Math.PI * 2;
  const word = meta.word || "LOOP STUDIO";

  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  const rows = 9;
  const rowH = (H - 56) / rows;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let r = 0; r < rows; r++) {
    const isCenter = r === Math.floor(rows / 2);
    const dist = Math.abs(r - Math.floor(rows / 2));
    const wave = Math.sin(TAU * (phase - r / rows));
    const x = W / 2 + wave * (isCenter ? 14 : 46);
    const y = 28 + (r + 0.5) * rowH;

    // Background band pill
    const pillW = W * (0.68 + 0.16 * (0.5 + 0.5 * Math.cos(TAU * (phase + r / rows))));
    kit.roundRect(ctx, x - pillW / 2, y - rowH * 0.38, pillW, rowH * 0.76, 6);
    ctx.globalAlpha = isCenter ? 0.95 : 0.25 + 0.45 * (1 - dist / rows);
    ctx.fillStyle = isCenter ? C.accent : C.surface;
    ctx.fill();
    ctx.strokeStyle = isCenter ? C.spark : C.line;
    ctx.lineWidth = isCenter ? 2 : 1;
    ctx.stroke();

    ctx.font = (isCenter ? "700 18px" : "600 15px") + " monospace";
    ctx.globalAlpha = isCenter ? 1 : 0.45 + 0.5 * (0.5 + 0.5 * wave);
    ctx.fillStyle = isCenter ? C.body : r % 2 === 0 ? C.spark : C.body;
    ctx.fillText(word, x, y);
  }

  ctx.globalAlpha = 1;
}
