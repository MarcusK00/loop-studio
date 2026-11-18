---
name: scene-transform
description: Showcase Scene Pack for converters, formatters, linters, compilers, and data transformers. Shows a split before-and-after stage where raw input enters on the left, passes through a central transformer core, and emerges as clean structured output on the right.
---

# Scene Pack: `transform` (Before & After Split Stage)

Use `scenes/transform` when the core value of a project is converting an input artifact into a visibly cleaner, smaller, or structured output artifact (`raw -> engine -> transformed`).

## Stage Layout & Choreography

- **Left Zone (`x = 0.21 * W`)**: Fixed `INPUT` card showing raw/unformatted lines or messy tokens.
- **Center Zone (`x = 0.50 * W`)**: `ENGINE` transformation core with a cyclic phase ring and directional streams pulling tokens from left and emitting transformed rows to the right.
- **Right Zone (`x = 0.79 * W`)**: Fixed `OUTPUT` card showing structured, verified rows lighting up with `spark` accents.
- **Wrap Handover**: Step 0 (`from: 8.5, to: 1.5`) slides the next input payload into the left frame while resetting the output glow smoothly to its Frame `0` state.

## Template (`skills/scenes/transform/template.js`)

Use [template.js](./template.js) as the base `sketch.js` for any `transform` showcase loop.
