---
name: loop-new-style
description: Contributor workflow for adding new Style Packs or Scene Packs to Loop Studio. Defines the required folder structure, SKILL.md specification, phase-compliant template sketch, gallery fixtures, and automated eval checks.
---

# Loop New Style — Contributor & Extension Guide

Style Packs (`skills/styles/<name>/`) and Scene Packs (`skills/scenes/<name>/`) are the modular building blocks of Loop Studio. Activate this skill when the user wants to create a new reusable visual style or showcase scene archetype.

## Required Files for a New Style Pack

Every style pack lives in `skills/styles/<style-id>/` (and is registered in [`skills/loop-styles/SKILL.md`](../loop-styles/SKILL.md)):

```text
skills/styles/<style-id>/
├── SKILL.md            # Visual signature, when to use, parameters, math recipe, pitfalls
└── template.js         # Ready-to-render sketch.js meeting the phase contract (seamScore <= 1.2)
```

### 1. `SKILL.md` Frontmatter & Sections
Must include:
- YAML frontmatter (`name: style-<style-id>`, `description: ...`)
- **Visual Signature**: What makes this style distinct (geometry, shading, density, speed).
- **When to Use**: Keywords, moods, and destinations it fits best.
- **Tunable Parameters**: Table of 4–6 parameters (`count`, `cycles`, `radius`, `palette`, etc.) and their safe ranges.
- **Phase Math Recipe**: How this specific technique guarantees `render(ctx, 0) === render(ctx, 1)`.
- **Common Pitfalls**: Style-specific traps (e.g., raymarching step limits in software renderers, GIF dithering shimmer, or over-dense line overlaps).

### 2. `template.js` Requirements
- Exports `meta = { mode: "ambient", style: "<style-id>", seconds: 4, fps: 30, width: 640, height: 640, seed: 7, palette: "..." }`
- Exports `render(ctx, phase, kit)` using only deterministic calls.
- Must pass `node tool/bin/loop.js audit` out of the box with:
  - `seamScore <= 1.25`
  - `duplicateFrames === 0`
  - `flickerScore <= 2.0`

## Verification Checklist Before Committing a New Style

1. Scaffold a test directory in `gallery/<style-id>-demo/` using `template.js`.
2. Run `node tool/bin/loop.js sheet gallery/<style-id>-demo` and inspect `sheet.png` via [`loop-critique`](../loop-critique/SKILL.md).
3. Run `node tool/bin/loop.js seam gallery/<style-id>-demo` and verify `pass: true`.
4. Run `node tool/bin/loop.js render gallery/<style-id>-demo` to generate `loop.gif` and `poster.png`.
5. Run `npm test` (`node tool/test/run-evals.js`) to ensure all repo evals pass.
