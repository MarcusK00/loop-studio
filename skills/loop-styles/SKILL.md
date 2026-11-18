---
name: loop-styles
description: Catalog and selector guide for Loop Studio Ambient Style Packs (flow-field, particle-orbit, sdf-raymarch, kinetic-type, dither-mono, isometric-grid, blueprint-cad, topographic-contour). Load this skill when creating an ambient loop or choosing a quiet generative background.
---

# Loop Styles — Ambient Style Pack Catalog

Each Style Pack ships a `SKILL.md` with its visual rules, parameter ranges, and pitfalls, plus a `template.js` that already satisfies the phase contract (`seamScore <= 1.2`).

## Style Pack Selection Matrix

| Style Pack | Skill Path | Mood & Visual Signature | Core Phase Technique |
| :--- | :--- | :--- | :--- |
| **`flow-field`** | [`skills/styles/flow-field/SKILL.md`](../styles/flow-field/SKILL.md) | Drifting, organic, silk ribbons, ocean currents, wind | Streamlines advected along a 2D circular-phase curl-noise field (`kit.loopNoise`) with 3 overlapping generations (`kit.generations`). |
| **`particle-orbit`** | [`skills/styles/particle-orbit/SKILL.md`](../styles/particle-orbit/SKILL.md) | Deep sea bioluminescence, cosmos, orbital data rings | Nested elliptical & Lissajous orbits at integer harmonic speeds (`1x, 2x, 3x`) with depth-sorted glow and phase-offset wave pulses. |
| **`sdf-raymarch`** | [`skills/styles/sdf-raymarch/SKILL.md`](../styles/sdf-raymarch/SKILL.md) | Sculptural 3D smooth-union shapes morphing under studio light | Analytic 3D Signed Distance Field raymarcher (sphere/torus/octahedron smooth boolean blend) with software-safe step limits (`32` steps). |
| **`kinetic-type`** | [`skills/styles/kinetic-type/SKILL.md`](../styles/kinetic-type/SKILL.md) | Bold typographic posters, rhythmic titles, wave banners | Repeating typographic rows/rings modulated by travelling sinusoidal phase waves (`phase + row/rows`) and scale envelopes. |
| **`dither-mono`** | [`skills/styles/dither-mono/SKILL.md`](../styles/dither-mono/SKILL.md) | 1-bit / 2-bit retro CRT, ordered Bayer matrix, ultra-small GIFs | Analytic 3D/2D lighting quantized through an `8×8` ordered Bayer threshold matrix (`kit.dither.bayer8`) for zero-shimmer retro stippling. |
| **`isometric-grid`** | [`skills/styles/isometric-grid/SKILL.md`](../styles/isometric-grid/SKILL.md) | Clean architectural blocks rising and falling in harmonic waves | Painter's-algorithm orthographic isometric grid (`(i - j), (i + j) * 0.5`) driven by radial and diagonal whole-cycle phase waves. |
| **`blueprint-cad`** | [`skills/styles/blueprint-cad/SKILL.md`](../styles/blueprint-cad/SKILL.md) | Precision engineering schematic, epicyclic gears, telemetry | Technical drafting grid with orbiting planetary linkages, dynamic dimension callouts, and cyclic angle readouts. |
| **`topographic-contour`** | [`skills/styles/topographic-contour/SKILL.md`](../styles/topographic-contour/SKILL.md) | Elevation isolines, sonar bathymetry, weather pressure maps | Marching-squares contour extraction over a cyclic 3D phase-noise scalar field (`kit.loopNoise`) with highlighted index contours. |

## How to Use a Style Pack

1. Read the chosen style pack's `SKILL.md` in `skills/styles/<style>/SKILL.md`.
2. Scaffold a project from its template:
   ```bash
   node tool/bin/loop.js new <dir> --mode ambient --style <style> --palette <palette>
   ```
3. Customize `brief.json` and tune parameters in `sketch.js`, then verify with `loop sheet` and `loop seam`.
