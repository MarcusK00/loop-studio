// Scene Pack: flow — Fixed stage boxes with continuous rail handover
export const meta = {
  mode: "showcase",
  scene: "flow",
  seconds: 10,
  fps: 24,
  width: 800,
  height: 320,
  seed: 11,
  palette: "studio-dark"
};

export const showcase = {
  says: "Loop Studio turns a one-line request into a checked, seamless loop.",
  seconds: 10,
  scene: "flow",
  stage: ["request", "sketch", "check", "loop.gif"],
  steps: [
    { from: 8.75, to: 1.25, caption: "a request arrives: \"deep sea, square\"", source: "docs/contract.md:3" },
    { from: 1.25, to: 3.75, caption: "sketch is drawn from the phase", source: "docs/contract.md:14" },
    { from: 3.75, to: 6.25, caption: "seam and legibility are measured", source: "docs/tool.md:14" },
    { from: 6.25, to: 8.75, caption: "the verified loop drops out", source: "docs/tool.md:24" }
  ]
};

function ease(x) {
  return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
}

// Smooth continuous item travel + slow drift through each node so motion never freezes
function placeItem(age, xs, W) {
  const left = -0.06 * W;
  const right = 1.06 * W;
  const pad = 12;
  let x = left;
  let alpha = 1;
  if (age < 2.5) {
    x = left + (xs[0] - left) * ease(age / 2.5);
  } else if (age < 5.0) {
    const u = (age - 2.5) / 2.5;
    x = xs[0] + (xs[1] - xs[0]) * (0.15 * u + 0.85 * ease(u));
  } else if (age < 7.5) {
    const u = (age - 5.0) / 2.5;
    x = xs[1] + (xs[2] - xs[1]) * (0.15 * u + 0.85 * ease(u));
  } else if (age < 10.0) {
    const u = (age - 7.5) / 2.5;
    x = xs[2] + (xs[3] - xs[2]) * (0.15 * u + 0.85 * ease(u));
  } else {
    const e = ease((age - 10.0) / 1.25);
    x = xs[3] + (right - xs[3] + pad) * e;
    alpha = 1 - e;
  }
  return {
    x,
    alpha,
    checked: ease((age - 6.8) / 0.8)
  };
}

export function render(ctx, phase, kit) {
  const W = ctx.width || meta.width;
  const H = ctx.height || meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["studio-dark"];
  const S = kit.showcase || showcase;
  const labels = S.stage || ["request", "sketch", "check", "loop.gif"];
  const steps = S.steps || showcase.steps;
  const SECONDS = S.seconds || meta.seconds;
  const t = phase * SECONDS;
  const TAU = Math.PI * 2;

  ctx.globalAlpha = 1;
  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  const count = labels.length;
  const margin = W * 0.055;
  const gap = W * 0.032;
  const bw = Math.min(W * 0.195, (W - 2 * margin - (count - 1) * gap) / count);
  const bh = Math.round(H * 0.17);
  const totalW = count * bw + (count - 1) * gap;
  const x0 = (W - totalW) / 2;
  const by = Math.round(H * 0.29);
  const railY = Math.round(H * 0.58);
  const capY = Math.round(H * 0.84);

  const xs = labels.map((_, i) => x0 + i * (bw + gap) + bw / 2);
  const items = [placeItem(t + 1.25, xs, W)];
  if (t >= 8.75) items.push(placeItem(t - 8.75, xs, W));

  // Transport rail + subtle travelling carrier ticks (keeps frame-to-frame delta steady)
  ctx.globalAlpha = 1;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, railY);
  ctx.lineTo(W, railY);
  ctx.stroke();

  const tickCount = 16;
  const tickSpacing = W / tickCount;
  const tickShift = (phase * 4 * tickSpacing) % tickSpacing;
  ctx.fillStyle = C.muted;
  ctx.globalAlpha = 0.35;
  for (let i = 0; i <= tickCount; i++) {
    const tx = i * tickSpacing + tickShift;
    ctx.fillRect(tx - 2, railY - 2, 4, 4);
  }

  // Stage boxes & vertical stems
  ctx.font = "600 13px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  xs.forEach((cx, i) => {
    let near = 0;
    items.forEach((it) => {
      near = Math.max(near, it.alpha * Math.max(0, 1 - Math.abs(it.x - cx) / (bw * 0.75)));
    });

    ctx.globalAlpha = 1;
    ctx.strokeStyle = near > 0.3 ? C.accent : C.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, by + bh / 2);
    ctx.lineTo(cx, railY);
    ctx.stroke();

    kit.roundRect(ctx, cx - bw / 2, by - bh / 2, bw, bh, 8);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.surface;
    ctx.fill();

    if (near > 0.01) {
      ctx.globalAlpha = 0.22 * near;
      ctx.fillStyle = i >= 2 ? C.spark : C.accent;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (near > 0.01) {
      ctx.globalAlpha = near;
      ctx.strokeStyle = i >= 2 ? C.spark : C.accent;
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = C.body;
    ctx.fillText(labels[i], cx, by);
  });

  // Moving payload orbs along rail
  items.forEach((it) => {
    const r = Math.max(7, Math.round(H * 0.036));
    const pulse = 1 + 0.15 * Math.sin(TAU * phase * 2);
    ctx.globalAlpha = it.alpha * 0.26;
    ctx.fillStyle = it.checked > 0.5 ? C.spark : C.accent;
    ctx.beginPath();
    ctx.arc(it.x, railY, r * 1.45 * pulse, 0, TAU);
    ctx.fill();

    ctx.globalAlpha = it.alpha;
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(it.x, railY, r, 0, TAU);
    ctx.fill();

    if (it.checked > 0) {
      ctx.globalAlpha = it.alpha * it.checked;
      ctx.fillStyle = C.spark;
      ctx.beginPath();
      ctx.arc(it.x, railY, r, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = C.ground;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(it.x - r * 0.42, railY);
      ctx.lineTo(it.x - r * 0.1, railY + r * 0.35);
      ctx.lineTo(it.x + r * 0.48, railY - r * 0.35);
      ctx.stroke();
    }
  });

  // Caption bar at bottom (fixed pill + smooth text fade)
  const pillW = Math.round(W * 0.62);
  kit.roundRect(ctx, W / 2 - pillW / 2, capY - 16, pillW, 32, 6);
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = "500 13px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  steps.forEach((c) => {
    const len = ((c.to - c.from) % SECONDS + SECONDS) % SECONDS || SECONDS;
    const u = ((t - c.from) % SECONDS + SECONDS) % SECONDS;
    if (u >= len) return;
    const fade = Math.max(0.2, Math.min(1, u / 0.35, (len - u) / 0.35));
    ctx.globalAlpha = fade;
    ctx.fillStyle = C.body;
    ctx.fillText(c.caption, W / 2, capY);
  });

  ctx.globalAlpha = 1;
}
