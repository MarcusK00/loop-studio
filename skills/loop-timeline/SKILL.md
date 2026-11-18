---
name: loop-timeline
description: Choreography and timing architecture for Loop Studio showcase animations. Covers fixed stage layout, Frame-0 thumbnail readiness, wrap-point handover windows (from 8.5s to 1.5s), and overlapping item lifecycles.
---

# Loop Timeline — Showcase Choreography & Handover

Most things software does are already a cycle: an input arrives, stages transform it, an output leaves, and the next input arrives. `loop-timeline` ensures that cycle wraps across `t = T -> 0` with zero jump.

## 1. A Stage That Stays Put

- **Never fade the entire diagram in from blank at `t = 0` or out to blank at `t = T`**.
- The labelled boxes, terminal frame, code pane, or topology nodes remain on screen at full opacity for the entire loop (`0 <= phase < 1`).
- **Why**:
  1. GitHub, Slack, and documentation sites display **Frame `0`** as the static preview thumbnail before playback. Frame `0` must be a complete, readable diagram on its own.
  2. Keeping the stage stationary eliminates visual clutter and compresses cleanly in GIF and MP4.

## 2. The End Hands Over to the Start (Wrap-Point Handover)

Notice how Step 0 in a 10-second loop spans the wrap point (`"from": 8.5, "to": 1.5`):

```text
Seconds:  0.0       1.5                 5.0          7.0       8.5       10.0 (= 0.0)
          ├─────────┼───────────────────┼────────────┼─────────┼─────────┤
Steps:    │ Arrives │ Sketch is written │ Seam check │Loop out │Next one │
          └─────────┴───────────────────┴────────────┴─────────┴─────────┘
          ▲                                                              │
          └──────────────────── Seamless Handover ───────────────────────┘
```

How to implement this in `sketch.js` using **Item Age**:

Suppose an item's complete journey across the stage takes `11.5` seconds inside a `10.0` second loop (`t ∈ [0, 10)`):
- At any loop time `t = phase * 10`, the primary item has `age = t + 1.5` (`age ∈ [1.5, 11.5)`).
- When `t >= 8.5`, the **next** item begins entering with `age = t - 8.5` (`age ∈ [0.0, 1.5)`).
- At `t = 10.0` (which wraps to `t = 0.0`), the outgoing item at `age = 11.5` has finished fading out (`alpha = 0`), and the incoming item at `age = 1.5` is at the exact position of the primary item at `t = 0.0` (`age = 1.5`)!

```js
const t = phase * meta.seconds; // 0 -> 10
const items = [placeItem(t + 1.5)];
if (t >= 8.5) {
  items.push(placeItem(t - 8.5));
}
```

This two-line pattern guarantees that `render(ctx, 0.0)` and `render(ctx, 1.0)` are mathematically identical (`seamScore ≈ 1.00`).

## 3. Dwell Time Inside Stages

When moving an item between `K` stage nodes (`xs[0], xs[1], ..., xs[K-1]`):
- Spend `35%–45%` of each step's duration **travelling** between nodes using `kit.ease.inOutCubic(u)`.
- Spend `55%–65%` of each step's duration **dwelling** at the node while the node's highlight border pulses and the step caption is read.
