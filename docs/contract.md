# Phase Contract Specification (`docs/contract.md`)

Every sketch in Loop Studio meets a single mathematical contract: **every pixel of every frame is a pure function of `phase` (`0 <= phase < 1`), `meta`, and seeded deterministic helpers (`kit`)**.

```js
export const meta = {
  mode: "ambient", // or "showcase"
  seconds: 4,
  fps: 30,
  width: 1080,
  height: 1080,
  seed: 7,
  palette: "abyss"
};

export function render(ctx, phase, kit) {
  // phase = frame / (meta.seconds * meta.fps), where frame in [0, totalFrames - 1]
  // phase = 1.0 is identical to phase = 0.0 and is never rendered.
}
```

## Five Mathematical Guarantees

1. **Frame `N` Is Never Rendered**: For $N = \text{seconds} \times \text{fps}$ total frames, only frames $f \in \{0, 1, \dots, N-1\}$ are rendered at $\text{phase} = f / N$.
2. **Whole Cycles Only**: All harmonic oscillators multiply $\tau \cdot \text{phase}$ by an integer $k \in \mathbb{Z}$.
3. **Closed Noise Paths**: Organic noise is sampled along a circle $(\cos(\tau\text{phase})R, \sin(\tau\text{phase})R)$ via `kit.loopNoise`.
4. **Overlapping Generations**: Unidirectional particle streams cross-fade across $G \ge 2$ staggered phase generations with envelope $\sin(\pi \cdot \text{age})$ via `kit.generations`.
5. **Wrap-Point Handover**: Showcase timelines wrap across `t = T -> 0` by spawning the incoming next item at `t >= T - leadIn` so its state at `t = T` matches the primary item at `t = 0`.
