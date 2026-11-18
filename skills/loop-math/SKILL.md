---
name: loop-math
description: Mathematical recipes for guaranteed seamless loops driven by phase in [0, 1). Covers whole-cycle trigonometry, phase offsets, circular 2D/3D noise trajectories, overlapping particle generations, wrap-around time windows, and avoiding the Frame-N duplicate stutter.
---

# Loop Math — Deterministic Phase Recipes

A loop is seamless if and only if the function $F(\text{phase})$ is periodic with period $1$:

$$F(0) = F(1), \quad F'(0) = F'(1)$$

And during rendering of $N = \text{seconds} \times \text{fps}$ frames, we evaluate:

$$\text{phase}_f = \frac{f}{N} \quad \text{for } f \in \{0, 1, \dots, N-1\}$$

> [!IMPORTANT]
> **Never render Frame $N$ ($\text{phase} = 1.0$).** Frame $N$ is identical to Frame $0$. Rendering both produces two identical adjacent frames when the video wraps (`N-1 -> N -> 0`), creating a visible pause/stutter every loop.

---

## Recipe 1: Whole Cycles Only

Every cyclic oscillator must multiply `phase * TAU` ($\tau = 2\pi$) by an **integer** $k \in \mathbb{Z}$:

```js
const TAU = Math.PI * 2;

// GOOD: integer frequencies (1, 2, 3 cycles per loop)
const slowWave = Math.sin(TAU * (phase * 1));
const fastWave = Math.cos(TAU * (phase * 3));

// Lissajous figure (closed curve because 2 and 3 are integers!)
const x = cx + rx * Math.sin(TAU * (phase * 2));
const y = cy + ry * Math.cos(TAU * (phase * 3));

// BAD: 1.5 cycles -> jumps abruptly from sin(3π) to sin(0) at the seam!
const broken = Math.sin(TAU * (phase * 1.5));
```

---

## Recipe 2: Phase Offsets Across Ensembles

To make $M$ elements move as a travelling wave rather than marching in rigid lockstep, offset element $i$'s phase by $i / M$ (or by a seeded constant $\phi_i \in [0, 1)$):

```js
for (let i = 0; i < count; i++) {
  const localPhase = (phase + i / count) % 1;
  const pulse = 0.5 + 0.5 * Math.sin(TAU * localPhase);
}
```

Use `kit.cycle(phase, cycles, offset)` which computes `((phase * cycles + offset) % 1 + 1) % 1`.

---

## Recipe 3: Circular Noise (Seamless Organic Drift)

Standard linear noise `noise(x + phase * speed, y)` jumps at `phase = 1 -> 0`. Instead, sample 2D/3D noise along a **closed circle** in noise space of radius $R$:

$$n_x(\text{phase}) = x_0 + R \cos(\tau \cdot k \cdot \text{phase}), \quad n_y(\text{phase}) = y_0 + R \sin(\tau \cdot k \cdot \text{phase})$$

Because $(\cos \theta, \sin \theta)$ returns to its exact starting coordinate at $\theta = 2\pi k$, the noise value and all its derivatives match at the seam!

```js
// Built into Loop Studio's kit:
const driftX = kit.loopNoise(phase, 0.85, seed + i * 17, 1);
const driftY = kit.loopNoise(phase, 0.85, seed + i * 31, 1);
```

- Larger `radius` ($0.5 \to 2.5$) produces more directional travel and turbulence inside the loop while remaining 100% periodic.

---

## Recipe 4: Overlapping Generations (Birth & Death Without a Seam)

How do you animate particles rising, expanding ripples, or falling snow that moves in one direction and disappears?
Run $G$ staggered generations ($G \ge 2$), each shifted by $g / G$ in phase, with an envelope $\alpha(u) = \sin(\pi u)$ that fades smoothly to `0` at both birth ($u = 0$) and death ($u = 1$):

```js
// Built into Loop Studio's kit:
kit.generations(phase, 3, (age, alpha, genIndex) => {
  // age runs 0 -> 1 over the lifetime of this generation
  // alpha = Math.sin(Math.PI * age), so alpha(0) = 0 and alpha(1) = 0!
  const radius = minR + age * (maxR - minR);
  ctx.globalAlpha = alpha;
  drawRing(cx, cy, radius);
});
```

At the wrap point `phase: 0.99 -> 0.00`, Generation 0 finishes fading to `0` while Generation 1 and 2 are mid-flight at identical positions!

---

## Recipe 5:Modulo Conveyors (Infinite Translation)

When an array of identical tiles, grid lines, or conveyor items translates by exactly one grid spacing $S$ (or $k \cdot S$) per loop, frame $N$ looks identical to frame $0$ even though every tile moved forward:

```js
const shift = (phase * k * spacing) % spacing;
for (let i = -1; i <= cols; i++) {
  const x = i * spacing + shift;
  drawTile(x, y);
}
```

---

## Recipe 6: Wrap-Around Time Windows (For Showcase Timelines)

In a showcase loop of length $T$ seconds, an event that starts at $t_{\text{from}} = 8.5\text{s}$ and finishes at $t_{\text{to}} = 1.5\text{s}$ crosses the loop wrap boundary ($T = 10\text{s}$). Compute normalized progress $u \in [0, 1]$ inside any window (whether normal or wrap-around) using modular arithmetic:

```js
export function windowProgress(t, from, to, duration) {
  const span = ((to - from) % duration + duration) % duration || duration;
  const elapsed = ((t - from) % duration + duration) % duration;
  if (elapsed > span) return null; // outside active window
  return elapsed / span; // 0.0 -> 1.0 seamlessly across the wrap point!
}
```

This is available directly as `kit.window(phase, fromSec / meta.seconds, toSec / meta.seconds)`.
