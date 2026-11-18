# Loop Studio — Agent Rules & Invariants

When creating, editing, critiquing, or rendering animations and repository showcase loops with **Loop Studio**, enforce these five non-negotiable invariants.

## 1. The Phase Contract (`phase ∈ [0, 1)`)

Every sketch module (`sketch.js`) must export `meta` and a pure `render(ctx, phase, kit)` function:

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
  // phase runs in [0, 1) where phase = frame / (meta.seconds * meta.fps)
  // phase = 1.0 must mathematically equal phase = 0.0
}
```

- **Never render frame `N` (`phase = 1.0`)**: A loop of `seconds * fps = N` frames renders frames `0, 1, ..., N - 1` at `phase = f / N`. Rendering frame `N` duplicates frame `0` and causes a visible wrap-point stutter.
- **Pure function of `phase`**: Seeking directly to frame `47` must produce the exact same pixels as rendering frames `0..47` sequentially.

## 2. Strict Determinism

- **Forbidden APIs inside sketches**: `Math.random()`, `Date.now()`, `performance.now()`, `requestAnimationFrame` state accumulation (`x += vx` across frames), or network requests at render time.
- **Approved deterministic primitives**:
  - Seeded PRNG: `kit.rng(meta.seed + index)`
  - Seamless circular noise: `kit.loopNoise(phase, radius, seedOffset, cycles)` (samples 2D/3D noise along a closed circle of radius `radius` so `phase = 1` returns smoothly to `phase = 0`)
  - Whole-cycle harmonics: `Math.sin(phase * Math.PI * 2 * k)` where `k` is a non-zero integer (`1, 2, 3...`), never a fraction like `1.5`.
  - Overlapping generations: `kit.generations(phase, count, callback)` with sinusoidal cross-fading (`sin(π * localAge)`) for particles or items that are born and fade out.

## 3. Showcase Honesty & Stage Architecture

When building a **showcase loop** ("make a looping animation of what this repo does"):

1. **One Pass of One Thing**: Pick the single most telling input-to-output transformation the project performs. No marketing slogans, no calls to action, no invented features.
2. **Sourced Steps (`file:line`)**: Every step in `showcase.json` must include `"source": "relative/path:line"` pointing to a real file and line number in the repository (README, tests, examples, or entry point).
3. **A Stage That Stays Put**: All primary stage containers and labels remain visible across all frames (including Frame `0`, which serves as the static thumbnail). Only the payload/item, active indicators, and step captions change.
4. **Wrap-Point Handover**: The final step must hand over continuously across the `1.0 -> 0.0` seam (e.g., `"from": 8.5, "to": 1.5` in a 10-second loop) so the next item entering at the end of the loop is at the exact position of the item at Frame `0`.

## 4. Typography & Readability Thresholds

 whenever a loop renders text (`showcase.json` or `kinetic-type`):

- **Reading time**: Each caption must remain fully opaque for at least `0.5 + 0.3 * wordCount` seconds.
- **Word budget**: Stage labels `<= 3` words (`<= 18` chars); step captions `<= 10` words (`<= 64` chars).
- **Contrast**: Text must maintain a WCAG AA contrast ratio of at least `4.5:1` against the background region behind it.
- **Dual-scale legibility**: Labels and captions must remain readable at both standard README width (`800px`) and mobile half-width (`400px`), with a minimum `24px` safe margin from canvas edges.

## 5. Mandatory Verification Gate & 3-Round Cap

Never run a final `loop render` or hand deliverables to the user before running the verification CLI checks:

- **All loops**:
  - `loop sheet <dir>` -> inspect `sheet.png` for focal hierarchy, speed contrast, and palette discipline (`loop-critique` skill).
  - `loop seam <dir>` -> verify `seamScore <= 1.5`, `duplicateFrames === 0`, and `flickerScore <= 2.5`.
- **Showcase loops (additional)**:
  - `loop story <dir>` -> generate `storyboard.png` (Frame `0` + midpoint of every step).
  - `loop legible <dir>` -> verify reading duration, `>= 4.5:1` contrast, edge margins, and mobile legibility in `legible.json`.
  - `loop source-check <dir>` -> verify every `"source"` in `showcase.json` resolves to an existing file and valid line range.
  - **Cold Read**: Invoke the `loop-cold-reader` subagent (or `loop-cold-read` skill) with *only* `storyboard.png` to confirm an unprimed reader can state what the project does in one sentence matching `showcase.json#says`.
- **3-Round Revision Cap**: Repeat the inspect -> revise -> re-check cycle at most **3 rounds**. If any check still fails after Round 3, stop and report the exact failing metric and trade-off to the user.

## 6. Concise Output

- Keep user-facing updates and final replies brief (2–5 short lines): state the generated files, `seamScore`, and any key change or blocker. Never print long recaps, repeated status walls, or raw frame-delta arrays.
