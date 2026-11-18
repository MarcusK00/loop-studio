// Scene Pack: flow — Visual 4-Stage Studio Pipeline with Live Mini-Canvas, Seam Chart & Rail Handover
export const meta = {
  mode: "showcase",
  scene: "flow",
  seconds: 10,
  fps: 20,
  width: 800,
  height: 360,
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

function placeItem(age, xs, W) {
  const left = -0.05 * W;
  const right = 1.05 * W;
  let x = left;
  let alpha = 1;
  if (age < 2.5) {
    x = left + (xs[0] - left) * ease(age / 2.5);
  } else if (age < 5.0) {
    const u = (age - 2.5) / 2.5;
    x = xs[0] + (xs[1] - xs[0]) * (0.18 * u + 0.82 * ease(u));
  } else if (age < 7.5) {
    const u = (age - 5.0) / 2.5;
    x = xs[1] + (xs[2] - xs[1]) * (0.18 * u + 0.82 * ease(u));
  } else if (age < 10.0) {
    const u = (age - 7.5) / 2.5;
    x = xs[2] + (xs[3] - xs[2]) * (0.18 * u + 0.82 * ease(u));
  } else {
    const e = ease((age - 10.0) / 1.25);
    x = xs[3] + (right - xs[3]) * e;
    alpha = 1 - e;
  }
  return {
    x,
    alpha,
    checked: ease((age - 6.6) / 0.8)
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
  const cyan = "#00E5B0";

  // 1. Depth Layer 1: Radial gradient ground + harmonic wave dot lattice
  ctx.globalAlpha = 1;
  if (ctx.createRadialGradient) {
    const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.42, 20, W * 0.5, H * 0.5, W * 0.65);
    bgGrad.addColorStop(0, "#131930");
    bgGrad.addColorStop(1, C.ground);
    ctx.fillStyle = bgGrad;
  } else {
    ctx.fillStyle = C.ground;
  }
  ctx.fillRect(0, 0, W, H);

  const gCols = 20;
  const gRows = 9;
  const cellW = W / gCols;
  const cellH = H / gRows;
  for (let r = 0; r < gRows; r++) {
    for (let c = 0; c < gCols; c++) {
      const gx = (c + 0.5) * cellW;
      const gy = (r + 0.5) * cellH;
      const dx = (gx - W * 0.5) / (W * 0.5);
      const dy = (gy - H * 0.42) / (H * 0.5);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const wave = 0.5 + 0.5 * Math.sin(TAU * (phase - dist * 1.2));
      ctx.globalAlpha = 0.08 + 0.16 * wave;
      ctx.fillStyle = wave > 0.72 ? C.spark : C.line;
      ctx.beginPath();
      ctx.arc(gx, gy, 1.2 + 1.4 * wave, 0, TAU);
      ctx.fill();
    }
  }

  // 2. Depth Layer 2: 4 Visual Studio Stage Cards
  const count = 4;
  const margin = W * 0.042;
  const gap = W * 0.024;
  const bw = (W - 2 * margin - (count - 1) * gap) / count;
  const bh = Math.round(H * 0.48);
  const by = Math.round(H * 0.30);
  const railY = Math.round(H * 0.68);
  const capY = Math.round(H * 0.87);

  const xs = [0, 1, 2, 3].map((i) => margin + i * (bw + gap) + bw / 2);
  const items = [placeItem(t + 1.25, xs, W)];
  if (t >= 8.75) items.push(placeItem(t - 8.75, xs, W));

  // Transport rail + glowing carrier stream
  ctx.globalAlpha = 1;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, railY);
  ctx.lineTo(W, railY);
  ctx.stroke();

  const streamCount = 18;
  const streamSpace = W / streamCount;
  const streamShift = (phase * 3 * streamSpace) % streamSpace;
  for (let i = 0; i <= streamCount; i++) {
    const sx = i * streamSpace + streamShift;
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = i % 2 === 0 ? C.spark : C.accent;
    ctx.beginPath();
    ctx.arc(sx, railY, 2.2, 0, TAU);
    ctx.fill();
  }

  const stepHeaders = ["01 BRIEF", "02 SKETCH", "03 SEAM", "04 EXPORT"];

  xs.forEach((cx, i) => {
    let near = 0;
    items.forEach((it) => {
      near = Math.max(near, it.alpha * Math.max(0, 1 - Math.abs(it.x - cx) / (bw * 0.78)));
    });

    const cardLeft = cx - bw / 2;
    const cardTop = by - bh / 2;
    const activeColor = i === 2 ? cyan : i === 3 ? C.spark : C.accent;

    // Vertical connector stem from card to rail
    ctx.globalAlpha = 1;
    ctx.strokeStyle = near > 0.25 ? activeColor : C.line;
    ctx.lineWidth = near > 0.25 ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cardTop + bh);
    ctx.lineTo(cx, railY);
    ctx.stroke();

    // Node socket on rail
    ctx.fillStyle = near > 0.25 ? activeColor : C.surface;
    ctx.beginPath();
    ctx.arc(cx, railY, 4.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Card surface
    kit.roundRect(ctx, cardLeft, cardTop, bw, bh, 10);
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = C.surface;
    ctx.fill();

    // Subtle active header tint
    if (near > 0.02) {
      ctx.globalAlpha = 0.16 * near;
      ctx.fillStyle = activeColor;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = near > 0.15 ? activeColor : C.line;
    ctx.lineWidth = near > 0.15 ? 2.2 : 1.4;
    ctx.stroke();

    // Card header bar divider
    const headH = Math.round(bh * 0.24);
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardLeft + 1, cardTop + headH);
    ctx.lineTo(cardLeft + bw - 1, cardTop + headH);
    ctx.stroke();

    // Card header step tag + primary stage label (kept for Frame-0 legibility check)
    ctx.font = "600 10px monospace";
    ctx.fillStyle = activeColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(stepHeaders[i], cardLeft + 10, cardTop + headH * 0.5);

    ctx.font = "700 12px monospace";
    ctx.fillStyle = C.body;
    ctx.textAlign = "right";
    ctx.fillText(labels[i], cardLeft + bw - 10, cardTop + headH * 0.5);

    // Rich visual interior per stage card!
    const innerY = cardTop + headH + (bh - headH) * 0.5;

    if (i === 0) {
      // Card 1: Prompt lines + live rotating Phase Ring (0 -> 1)
      const ringX = cardLeft + bw * 0.28;
      const ringR = Math.min(bw, bh) * 0.19;
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ringX, innerY, ringR, 0, TAU);
      ctx.stroke();

      const pAng = phase * TAU - Math.PI / 2;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ringX, innerY, ringR, pAng - 1.8, pAng);
      ctx.stroke();

      ctx.fillStyle = C.spark;
      ctx.beginPath();
      ctx.arc(ringX + Math.cos(pAng) * ringR, innerY + Math.sin(pAng) * ringR, 3.8, 0, TAU);
      ctx.fill();

      // Prompt spec bars on right half of Card 1
      const tx0 = cardLeft + bw * 0.52;
      ctx.font = "500 10px monospace";
      ctx.fillStyle = C.muted;
      ctx.textAlign = "left";
      ctx.fillText("4s · 30fps", tx0, innerY - 14);
      ctx.fillStyle = C.body;
      ctx.fillText("phase 0→1", tx0, innerY + 3);
      ctx.fillStyle = cyan;
      ctx.fillText("seed: 7", tx0, innerY + 19);
    } else if (i === 1) {
      // Card 2: Live Miniature Bioluminescent Particle-Orbit Sketch Viewport!
      const vpW = bw - 20;
      const vpH = bh - headH - 16;
      const vpX = cardLeft + 10;
      const vpY = cardTop + headH + 8;
      kit.roundRect(ctx, vpX, vpY, vpW, vpH, 6);
      ctx.fillStyle = "#060913";
      ctx.fill();

      // 2 nested glowing orbits inside mini canvas
      for (let ring = 1; ring <= 2; ring++) {
        const rx = vpW * (0.18 * ring);
        const ry = vpH * (0.21 * ring);
        const dots = 6 + ring * 4;
        const dir = ring === 1 ? 1 : -2;
        for (let d = 0; d < dots; d++) {
          const a = TAU * ((phase * dir + d / dots) % 1);
          const px = cx + Math.cos(a) * rx;
          const py = innerY + Math.sin(a) * ry;
          ctx.globalAlpha = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(a));
          ctx.fillStyle = d % 3 === 0 ? cyan : d % 2 === 0 ? C.spark : C.accent;
          ctx.beginPath();
          ctx.arc(px, py, d % 3 === 0 ? 3.2 : 2.2, 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = cyan;
      ctx.beginPath();
      ctx.arc(cx, innerY, 4.5 + 1.5 * Math.sin(TAU * phase * 2), 0, TAU);
      ctx.fill();
    } else if (i === 2) {
      // Card 3: Live Seam Check Bar Chart (1.02x PASS)
      const bars = [1.0, 0.94, 1.05, 0.98, 1.02, 0.96, 1.04, 0.99, 1.03];
      const chartLeft = cardLeft + 14;
      const chartBase = cardTop + bh - 14;
      const barStep = (bw - 28) / bars.length;
      const unitH = (bh - headH - 36) * 0.55;

      bars.forEach((v, bIdx) => {
        const isLast = bIdx === bars.length - 1;
        const wave = 1 + 0.08 * Math.sin(TAU * (phase * 2 - bIdx / bars.length));
        const hBar = v * unitH * wave;
        ctx.globalAlpha = isLast ? 1 : 0.65;
        ctx.fillStyle = isLast ? cyan : C.spark;
        ctx.fillRect(chartLeft + bIdx * barStep, chartBase - hBar, Math.max(4, barStep - 4), hBar);
      });

      // Median 1.0x reference line
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(chartLeft, chartBase - unitH);
      ctx.lineTo(cardLeft + bw - 14, chartBase - unitH);
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.font = "600 10px monospace";
      ctx.fillStyle = cyan;
      ctx.textAlign = "left";
      ctx.fillText("1.02x PASS", chartLeft, cardTop + headH + 14);
    } else if (i === 3) {
      // Card 4: Verified Infinite Loop Lissajous Figure + Format Badges
      const lissY = innerY - 8;
      const rx = bw * 0.30;
      const ry = (bh - headH) * 0.24;
      ctx.strokeStyle = C.spark;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let s = 0; s <= 40; s++) {
        const u = (s / 40) * TAU;
        const lx = cx + Math.sin(u) * rx;
        const ly = lissY + Math.sin(u * 2) * ry;
        if (s === 0) ctx.moveTo(lx, ly);
        else ctx.lineTo(lx, ly);
      }
      ctx.stroke();

      // Travelling spark along the infinity loop
      const sparkU = phase * TAU;
      const sx = cx + Math.sin(sparkU) * rx;
      const sy = lissY + Math.sin(sparkU * 2) * ry;
      ctx.fillStyle = cyan;
      ctx.beginPath();
      ctx.arc(sx, sy, 4.5, 0, TAU);
      ctx.fill();

      ctx.font = "600 10px monospace";
      ctx.fillStyle = C.body;
      ctx.textAlign = "center";
      ctx.fillText("GIF · MP4 · PNG", cx, cardTop + bh - 14);
    }
  });

  // 3. Depth Layer 3: Moving payload orbs along the transport rail
  items.forEach((it) => {
    const r = Math.max(8, Math.round(H * 0.036));
    const pulse = 1 + 0.16 * Math.sin(TAU * phase * 2);
    const col = it.checked > 0.5 ? cyan : C.accent;

    // Outer glow halo
    ctx.globalAlpha = it.alpha * 0.28;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(it.x, railY, r * 1.65 * pulse, 0, TAU);
    ctx.fill();

    // Inner orb
    ctx.globalAlpha = it.alpha;
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(it.x, railY, r, 0, TAU);
    ctx.fill();

    if (it.checked > 0) {
      ctx.globalAlpha = it.alpha * it.checked;
      ctx.fillStyle = cyan;
      ctx.beginPath();
      ctx.arc(it.x, railY, r, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = C.ground;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(it.x - r * 0.42, railY);
      ctx.lineTo(it.x - r * 0.08, railY + r * 0.36);
      ctx.lineTo(it.x + r * 0.48, railY - r * 0.36);
      ctx.stroke();
    }
  });

  // 4. Bottom Caption Pill + Step Progress Dots
  const pillW = Math.round(W * 0.64);
  const pillH = 34;
  kit.roundRect(ctx, W / 2 - pillW / 2, capY - pillH / 2, pillW, pillH, 8);
  ctx.globalAlpha = 0.96;
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  let activeStepIdx = 0;
  steps.forEach((c, idx) => {
    const len = ((c.to - c.from) % SECONDS + SECONDS) % SECONDS || SECONDS;
    const u = ((t - c.from) % SECONDS + SECONDS) % SECONDS;
    if (u < len) activeStepIdx = idx;
  });

  // Step indicator dots on left of pill
  for (let d = 0; d < steps.length; d++) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = d === activeStepIdx ? cyan : C.line;
    ctx.beginPath();
    ctx.arc(W / 2 - pillW / 2 + 18 + d * 11, capY, d === activeStepIdx ? 3.8 : 2.6, 0, TAU);
    ctx.fill();
  }

  ctx.font = "500 13px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  steps.forEach((c) => {
    const len = ((c.to - c.from) % SECONDS + SECONDS) % SECONDS || SECONDS;
    const u = ((t - c.from) % SECONDS + SECONDS) % SECONDS;
    if (u >= len) return;
    const fade = Math.max(0.25, Math.min(1, u / 0.35, (len - u) / 0.35));
    ctx.globalAlpha = fade;
    ctx.fillStyle = C.body;
    ctx.fillText(c.caption, W / 2 + 16, capY);
  });

  ctx.globalAlpha = 1;
}
