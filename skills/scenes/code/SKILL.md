---
name: scene-code
description: Showcase Scene Pack for SDKs, libraries, and programmatic APIs. Renders a concise 4-to-6 line code snippet whose active execution highlight steps through lines in sync with a live state/result inspector beside it.
---

# Scene Pack: `code` (Stepping Code + Live Inspector)

Use `scenes/code` when the best explanation of a library or contract is a short code snippet (`export function render(ctx, phase)`) stepping alongside a live visual output preview.

## Stage Layout & Choreography

- **Left Pane (`420 × 192`)**: Code editor panel with line numbers `1..4` and an execution highlight bar that steps smoothly from line 1 to line 4 and wraps back to line 1.
- **Right Pane (`230 × 192`)**: Live state & visual preview card showing `phase`, `seamScore`, and an orbiting phase indicator synchronized with the active line of code.
- **Bottom Band (`y = 0.86 * H`)**: Step caption pill with WCAG `>= 4.5:1` contrast.

## Template (`skills/scenes/code/template.js`)

Use [template.js](./template.js) as the base `sketch.js` for any `code` showcase loop.
