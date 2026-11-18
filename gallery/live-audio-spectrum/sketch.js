// Custom 60fps Ambient Loop: live-audio-spectrum — 6s (3 bars @ 120 BPM) 60fps harmonic equalizer & waveform
export const meta = {
  mode: "ambient",
  style: "kinetic-audio",
  seconds: 6,
  fps: 60,
  width: 340,
  height: 240,
  seed: 120,
  palette: "ember"
};

export function render(ctx, phase, kit) {
  const W = ctx.width || meta.width;
  const H = ctx.height || meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["ember"];
  const TAU = Math.PI * 2;

  if (ctx.createLinearGradient) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, C.ground);
    bg.addColorStop(1, C.surface);
    ctx.fillStyle = bg;
  } else {
    ctx.fillStyle = C.ground;
  }
  ctx.fillRect(0, 0, W, H);

  // 120 BPM over 6 seconds = 12 beats (3 bars of 4/4); macro phrase swells over 1 cycle while beats pulse 12x
  const beatPulse = Math.pow(0.5 + 0.5 * Math.sin(TAU * phase * 12), 2.5);
  const macroEnergy = 0.65 + 0.35 * Math.sin(TAU * phase);

  // Top telemetry header
  ctx.font = "600 10.5px monospace";
  ctx.fillStyle = C.muted;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("120 BPM · 60 FPS", 18, 20);
  ctx.textAlign = "right";
  ctx.fillStyle = beatPulse > 0.65 ? C.spark : C.accent;
  ctx.fillText("6.0s LOOP", W - 18, 20);

  // 24 harmonic spectrum bars
  const bars = 24;
  const margin = 20;
  const step = (W - margin * 2) / bars;
  const bw = Math.max(5, step - 3);
  const baseY = H * 0.72;
  const maxH = H * 0.44;

  for (let i = 0; i < bars; i++) {
    const norm = i / (bars - 1);
    const w1 = 0.5 + 0.5 * Math.sin(TAU * (phase * 3 - norm * 1.5));
    const w2 = 0.5 + 0.5 * Math.cos(TAU * (phase * 6 + norm * 2.5));
    const amp = (0.18 + 0.52 * w1 + 0.30 * w2) * macroEnergy * (0.82 + 0.18 * beatPulse);
    const bh = Math.max(6, amp * maxH);
    const bx = margin + i * step;

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = C.accent;
    ctx.fillRect(bx, baseY + 4, bw, bh * 0.22); // subtle floor reflection

    ctx.globalAlpha = 0.92;
    ctx.fillStyle = amp > 0.72 ? C.spark : C.accent;
    kit.roundRect(ctx, bx, baseY - bh, bw, bh, 2);
    ctx.fill();
  }

  // Smooth continuous phase oscilloscope wave across bottom
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = C.spark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const samples = 60;
  for (let s = 0; s <= samples; s++) {
    const u = s / samples;
    const wx = margin + u * (W - margin * 2);
    const env = Math.sin(Math.PI * u);
    const wy = H * 0.87 + Math.sin(TAU * (u * 3 - phase * 6)) * 10 * env * macroEnergy;
    if (s === 0) ctx.moveTo(wx, wy);
    else ctx.lineTo(wx, wy);
  }
  ctx.stroke();

  ctx.globalAlpha = 1;
}
