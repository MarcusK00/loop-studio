---
name: scene-flow
description: Showcase Scene Pack for pipelines, servers, compilers, routers, and multi-stage workflows. Draws 3 to 5 fixed stage boxes connected to a horizontal rail while an item travels through each stage, transforms upon verification, and hands over seamlessly across the wrap point.
---

# Scene Pack: `flow` (Stage Pipeline & Rail)

Use `scenes/flow` when a project processes an item through 3 to 5 sequential stages (e.g., `request -> sketch -> check -> loop.gif`, or `parse -> typecheck -> bundle -> output.js`).

## Stage Layout & Choreography

- **Top Band (`y = 0.30 * H`)**: `K` fixed rounded stage boxes with crisp labels (`showcase.stage`), connected vertically to the transport rail below.
- **Middle Band (`y = 0.58 * H`)**: Horizontal transport rail spanning the full width (`0 -> W`).
  - As the payload orb approaches stage `i`, stage box `i` illuminates with an accent border and subtle fill glow (`proximity = max(0, 1 - |it.x - cx| / (bw * 0.65))`).
  - After passing the verification stage (`stage[2]`), the orb morphs to the `spark` color and draws a vector checkmark inside.
- **Bottom Band (`y = 0.84 * H`)**: High-contrast step caption pill showing the active step from `showcase.steps`, with smooth `0.3s` fade-in/out ramps.
- **Seamless Handover**:
  - Primary item runs at `age = t + 1.5` (`1.5s -> 11.5s`).
  - At `t >= 8.5s`, the incoming next item spawns at `age = t - 8.5` (`0.0s -> 1.5s`), landing at the exact `t = 0.0` position (`age = 1.5s`) when the loop wraps.

## Template (`skills/scenes/flow/template.js`)

Use [template.js](./template.js) as the base `sketch.js` for any `flow` showcase loop.
