// Custom 60fps Ambient Loop: orbital-telemetry-watch — 8s (480 frames) 60fps multi-stage orbital radar HUD
export const meta = {
  mode: "ambient",
  style: "blueprint-hud",
  seconds: 8,
  fps: 60,
  width: 300,
  height: 300,
  seed: 204,
  palette: "blueprint"
};

export function render(ctx, phase, kit) {
  const W = ctx.width || meta.width;
  const H = ctx.height || meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["blueprint"];
  const TAU = Math.PI * 2;
  const cx = W / 2;
  const cy = H / 2;

  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  // Drafting coordinate grid
  const step = 25;
  for (let x = step; x < W; x += step) {
    ctx.strokeStyle = C.line;
    ctx.lineWidth = x % 100 === 0 ? 1.2 : 0.6;
    ctx.globalAlpha = x % 100 === 0 ? 0.5 : 0.25;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = step; y < H; y += step) {
    ctx.strokeStyle = C.line;
    ctx.lineWidth = y % 100 === 0 ? 1.2 : 0.6;
    ctx.globalAlpha = y % 100 === 0 ? 0.5 : 0.25;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Outer compass ring & rotating 60fps sweep arm (4 full rotations in 8s)
  const outerR = W * 0.38;
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = C.muted;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, TAU);
  ctx.stroke();

  const sweepAng = phase * TAU * 4;
  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(sweepAng) * outerR, cy + Math.sin(sweepAng) * outerR);
  ctx.stroke();

  // 3 nested elliptical satellite tracks with glowing phase trails
  const sats = [];
  for (let i = 0; i < 3; i++) {
    const rx = W * (0.16 + i * 0.085);
    const ry = rx * 0.54;
    const tilt = i * 0.95 + Math.sin(TAU * phase) * 0.15;
    const speed = i === 1 ? -2 : i + 1;
    const a = TAU * (phase * speed + i / 3);
    const ox = Math.cos(a) * rx;
    const oy = Math.sin(a) * ry;
    const sx = cx + ox * Math.cos(tilt) - oy * Math.sin(tilt);
    const sy = cy + ox * Math.sin(tilt) + oy * Math.cos(tilt);
    sats.push({ x: sx, y: sy });

    ctx.globalAlpha = 0.26;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let s = 0; s <= 40; s++) {
      const u = (s / 40) * TAU;
      const lx = cx + Math.cos(u) * rx * Math.cos(tilt) - Math.sin(u) * ry * Math.sin(tilt);
      const ly = cy + Math.cos(u) * rx * Math.sin(tilt) + Math.sin(u) * ry * Math.cos(tilt);
      if (s === 0) ctx.moveTo(lx, ly);
      else ctx.lineTo(lx, ly);
    }
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = i === 0 ? C.spark : C.body;
    ctx.beginPath();
    ctx.arc(sx, sy, 4.5, 0, TAU);
    ctx.fill();
  }

  // Telemetry constellation triangle connecting all 3 satellites
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = C.spark;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(sats[0].x, sats[0].y);
  ctx.lineTo(sats[1].x, sats[1].y);
  ctx.lineTo(sats[2].x, sats[2].y);
  ctx.closePath();
  ctx.stroke();

  // HUD readouts
  ctx.globalAlpha = 1;
  ctx.font = "600 10.5px monospace";
  ctx.fillStyle = C.body;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("ORBIT-HUD // 60FPS", 14, 18);
  ctx.fillStyle = C.spark;
  ctx.fillText("T+" + (phase * 8).toFixed(1) + "S", 14, H - 16);
}
