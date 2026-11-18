// Custom 60fps Showcase: git-pr-guardrails — Shows branch fork -> direct push shield -> CI evals -> PR merge
export const meta = {
  mode: "showcase",
  scene: "flow",
  seconds: 8,
  fps: 60,
  width: 640,
  height: 270,
  seed: 91,
  palette: "studio-dark"
};

export const showcase = {
  title: "Protected Git Workflow (60fps)",
  says: "Branch guardrails block direct pushes and require passing CI evals before merging into dev and main.",
  seconds: 8,
  fps: 60,
  width: 640,
  height: 270,
  palette: "studio-dark",
  scene: "flow",
  stage: ["feat/*", "PR + CI", "dev", "main"],
  steps: [
    { from: 7.0, to: 1.0, caption: "branch feat/* forks from dev", source: ".github/workflows/ci.yml:5" },
    { from: 1.0, to: 3.0, caption: "CI runs 34 eval checks", source: ".github/workflows/ci.yml:19" },
    { from: 3.0, to: 5.0, caption: "CODEOWNERS approves the PR", source: ".github/CODEOWNERS:2" },
    { from: 5.0, to: 7.0, caption: "merged into dev & main", source: ".github/workflows/ci.yml:4" }
  ]
};

function ease(x) {
  return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
}

function placeCommit(age, xs, W) {
  const left = -0.06 * W;
  const right = 1.06 * W;
  let x = left;
  let alpha = 1;
  if (age < 2.0) {
    x = left + (xs[0] - left) * ease(age / 2.0);
  } else if (age < 4.0) {
    const u = (age - 2.0) / 2.0;
    x = xs[0] + (xs[1] - xs[0]) * (0.15 * u + 0.85 * ease(u));
  } else if (age < 6.0) {
    const u = (age - 4.0) / 2.0;
    x = xs[1] + (xs[2] - xs[1]) * (0.15 * u + 0.85 * ease(u));
  } else if (age < 8.0) {
    const u = (age - 6.0) / 2.0;
    x = xs[2] + (xs[3] - xs[2]) * (0.15 * u + 0.85 * ease(u));
  } else {
    const e = ease((age - 8.0) / 1.0);
    x = xs[3] + (right - xs[3]) * e;
    alpha = 1 - e;
  }
  return {
    x,
    alpha,
    verified: ease((age - 3.6) / 0.6)
  };
}

export function render(ctx, phase, kit) {
  const W = ctx.width || meta.width;
  const H = ctx.height || meta.height;
  const C = kit.palettes[meta.palette] || kit.palettes["studio-dark"];
  const S = kit.showcase || showcase;
  const labels = S.stage || showcase.stage;
  const steps = S.steps || showcase.steps;
  const SECONDS = S.seconds || meta.seconds;
  const t = phase * SECONDS;
  const TAU = Math.PI * 2;
  const cyan = "#00E5B0";

  // Layer 1: Radial gradient ground + harmonic wave lattice
  if (ctx.createRadialGradient) {
    const bg = ctx.createRadialGradient(W * 0.5, H * 0.4, 15, W * 0.5, H * 0.5, W * 0.65);
    bg.addColorStop(0, "#141A33");
    bg.addColorStop(1, C.ground);
    ctx.fillStyle = bg;
  } else {
    ctx.fillStyle = C.ground;
  }
  ctx.fillRect(0, 0, W, H);

  const count = 4;
  const margin = W * 0.05;
  const gap = W * 0.03;
  const bw = (W - 2 * margin - (count - 1) * gap) / count;
  const bh = Math.round(H * 0.42);
  const by = Math.round(H * 0.30);
  const railY = Math.round(H * 0.66);
  const capY = Math.round(H * 0.86);

  const xs = [0, 1, 2, 3].map((i) => margin + i * (bw + gap) + bw / 2);
  const items = [placeCommit(t + 1.0, xs, W)];
  if (t >= 7.0) items.push(placeCommit(t - 7.0, xs, W));

  // Git rail + continuous commit ticks
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, railY);
  ctx.lineTo(W, railY);
  ctx.stroke();

  const tickSpace = W / 16;
  const tickShift = (phase * 4 * tickSpace) % tickSpace;
  for (let i = 0; i <= 16; i++) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = i % 2 === 0 ? C.spark : C.accent;
    ctx.beginPath();
    ctx.arc(i * tickSpace + tickShift, railY, 1.8, 0, TAU);
    ctx.fill();
  }

  xs.forEach((cx, i) => {
    let near = 0;
    items.forEach((it) => {
      near = Math.max(near, it.alpha * Math.max(0, 1 - Math.abs(it.x - cx) / (bw * 0.78)));
    });

    const left = cx - bw / 2;
    const top = by - bh / 2;
    const activeCol = i === 1 ? cyan : i >= 2 ? C.spark : C.accent;

    ctx.globalAlpha = 1;
    ctx.strokeStyle = near > 0.25 ? activeCol : C.line;
    ctx.lineWidth = near > 0.25 ? 2.2 : 1.4;
    ctx.beginPath();
    ctx.moveTo(cx, top + bh);
    ctx.lineTo(cx, railY);
    ctx.stroke();

    kit.roundRect(ctx, left, top, bw, bh, 9);
    ctx.fillStyle = C.surface;
    ctx.fill();
    if (near > 0.02) {
      ctx.globalAlpha = 0.16 * near;
      ctx.fillStyle = activeCol;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = near > 0.15 ? activeCol : C.line;
    ctx.lineWidth = near > 0.15 ? 2.2 : 1.3;
    ctx.stroke();

    // Stage label
    ctx.font = "700 12px monospace";
    ctx.fillStyle = C.body;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labels[i], cx, top + 20);

    // Rich card graphic per git stage
    const cy = top + bh * 0.63;
    if (i === 0) {
      // Forking branch curve
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(left + 16, cy + 12);
      ctx.bezierCurveTo(cx - 10, cy + 12, cx - 10, cy - 12, left + bw - 16, cy - 12);
      ctx.stroke();
      const u = (phase * 2) % 1;
      const dotX = left + 16 + (bw - 32) * u;
      const dotY = cy + 12 - 24 * ease(u);
      ctx.globalAlpha = Math.sin(Math.PI * u);
      ctx.fillStyle = C.spark;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (i === 1) {
      // CI Eval progress bars
      for (let b = 0; b < 3; b++) {
        const bwBar = (bw - 32) * (0.5 + 0.5 * Math.sin(TAU * (phase * 2 - b * 0.2)));
        ctx.fillStyle = b === 2 ? cyan : C.spark;
        ctx.fillRect(left + 16, cy - 14 + b * 12, bwBar, 6);
      }
    } else {
      // Protected Shield Lock Ring on dev & main
      const r = 18;
      ctx.strokeStyle = i === 3 ? C.accent : cyan;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();

      const ang = phase * TAU * 2 * (i === 3 ? -1 : 1);
      ctx.fillStyle = C.spark;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 3.5, 0, TAU);
      ctx.fill();

      ctx.font = "600 9px monospace";
      ctx.fillStyle = C.muted;
      ctx.fillText("PROTECTED", cx, cy);
    }
  });

  // Moving commit orb
  items.forEach((it) => {
    const r = 10;
    const col = it.verified > 0.5 ? cyan : C.accent;
    ctx.globalAlpha = it.alpha * 0.28;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(it.x, railY, r * 1.6, 0, TAU);
    ctx.fill();

    ctx.globalAlpha = it.alpha;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(it.x, railY, r, 0, TAU);
    ctx.fill();

    if (it.verified > 0.5) {
      ctx.strokeStyle = C.ground;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(it.x - 4, railY);
      ctx.lineTo(it.x - 1, railY + 3.5);
      ctx.lineTo(it.x + 4.5, railY - 3.5);
      ctx.stroke();
    }
  });

  // Caption pill
  const pillW = Math.round(W * 0.66);
  kit.roundRect(ctx, W / 2 - pillW / 2, capY - 16, pillW, 32, 7);
  ctx.globalAlpha = 0.96;
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.font = "500 12.5px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  steps.forEach((c) => {
    const len = ((c.to - c.from) % SECONDS + SECONDS) % SECONDS || SECONDS;
    const u = ((t - c.from) % SECONDS + SECONDS) % SECONDS;
    if (u >= len) return;
    const fade = Math.max(0.25, Math.min(1, u / 0.3, (len - u) / 0.3));
    ctx.globalAlpha = fade;
    ctx.fillStyle = C.body;
    ctx.fillText(c.caption, W / 2, capY);
  });
  ctx.globalAlpha = 1;
}
