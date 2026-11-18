# Phase Contract Specification (`docs/contract.md`)

Every Loop Studio animation obeys one mathematical invariant: **every frame is a deterministic pure function of `phase ∈ [0, 1)`** (`phase = frame / (seconds * fps)`), whether authored as HTML/CSS/SVG (`scene.html`), WebGL2 GLSL (`shader.frag` with `uniform float u_phase`), or Canvas2D (`sketch.js`).

```js
window.renderLoop = function(phase, kit, meta) {
  // phase runs in [0, 1): frames 0, 1, ..., N - 1.
  // phase = 1.0 equals phase = 0.0 and is NEVER rendered.
};
```

## Five Guarantees

1. **Frame `N` Is Never Rendered**: Rendering `f = 0..N-1` at `phase = f / N` prevents duplicate-frame pauses at the loop seam.
2. **Frozen Clocks & Disabled CSS Transitions**: The browser harness stubs `Date.now()`, `performance.now()`, seeds `Math.random()`, and disables CSS `transition`/`animation` so headless frame capture never drifts.
3. **Whole Cycles Only**: Periodic motion multiplies `phase * 2π` by an integer `k ∈ ℤ`.
4. **Wrap-Point Handover**: Showcase timelines wrap across `t = T -> 0` (e.g., `from: 8.0, to: 3.0` on a `9s` loop) so the wrap transition stays continuous.
5. **Dual-Theme CSS Tokens**: Using `--loop-ground`, `--loop-surface`, `--loop-body`, `--loop-muted`, `--loop-accent`, `--loop-spark`, `--loop-line`, `--loop-on-accent`, and `--loop-on-spark` enables automated `dark` and `light` README `<picture>` rendering.
