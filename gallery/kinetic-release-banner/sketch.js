// Style Pack: kinetic-type — Silky 60fps harmonic wave typography poster
export const meta = {
  mode: "ambient",
  style: "kinetic-type",
  seconds: 4,
  fps: 60,
  width: 280,
  height: 280,
  seed: 61,
  palette: "editorial",
  word: "PHASE 0→1"
};

export function render(ctx, phase, kit) {
  const W = ctx.width || meta.width;
  const H = ctx.height || meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["editorial"];
  const TAU = Math.PI * 2;
  const word = meta.word || "LOOP STUDIO";

  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  const rows = 9;
  const rowH = (H - 44) / rows;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let r = 0; r < rows; r++) {
    const isCenter = r === Math.floor(rows / 2);
    const dist = Math.abs(r - Math.floor(rows / 2));
    const wave = Math.sin(TAU * (phase - r / rows));
    const x = W / 2 + wave * (isCenter ? 10 : 38);
    const y = 22 + (r + 0.5) * rowH;

    const pillW = W * (0.68 + 0.14 * (0.5 + 0.5 * Math.cos(TAU * (phase + r / rows))));
    kit.roundRect(ctx, x - pillW / 2, y - rowH * 0.37, pillW, rowH * 0.74, 6);
    ctx.globalAlpha = isCenter ? 0.98 : 0.3 + 0.45 * (1 - dist / rows);
    ctx.fillStyle = isCenter ? C.spark : C.surface;
    ctx.fill();
    ctx.strokeStyle = isCenter ? C.accent : C.line;
    ctx.lineWidth = isCenter ? 2 : 1;
    ctx.stroke();

    const fontPx = Math.max(10, Math.round(W * (isCenter ? 0.044 : 0.036)));
    ctx.font = (isCenter ? "700 " : "600 ") + fontPx + "px monospace";
    ctx.globalAlpha = isCenter ? 1 : 0.5 + 0.5 * (0.5 + 0.5 * wave);
    ctx.fillStyle = isCenter ? C.ground : r % 2 === 0 ? C.accent : C.body;
    ctx.fillText(word, x, y);
  }

  ctx.globalAlpha = 1;
}
