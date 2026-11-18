---
name: loop-critique
description: Visual critique workflow for Loop Studio contact sheets (sheet.png). Teaches the agent how to inspect tiled preview frames for focal point, speed contrast, empty/dead frames, palette balance, and how to obey the strict 3-round revision limit.
---

# Loop Critique — Contact Sheet Inspection Protocol

After generating a preview contact sheet (`npx loop sheet <dir>`), open and inspect `<dir>/sheet.png` using your multimodal file-reading tool before proceeding to final render.

## Reading `sheet.png`

`sheet.png` displays 12 to 16 evenly spaced frames across the `[0, 1)` phase cycle (typically every 8th frame of a 120-frame loop), stamped with `f:000 p:0.00` through `f:112 p:0.93`.

## The 6-Point Visual Checklist

Check every sheet against these six criteria:

1. **Focal Point**:
   - *Question*: Does every frame have a clear visual center of gravity?
   - *Fail symptom*: Uniform wallpaper where no area commands attention, or elements clipped awkward at canvas borders.
   - *Fix*: Add a central anchor or scale gradient (`1.4x` scale near focal center, `0.6x` toward edges).
2. **Speed & Depth Contrast**:
   - *Question*: Can you distinguish a slow background layer (`1x` cycle) from a faster foreground accent (`2x` or `3x` cycle)?
   - *Fail symptom*: Every element moves at the exact same speed and amplitude.
   - *Fix*: Split elements into `ground` (`1x`), `body` (`1x-2x`), and `spark` (`2x-3x`) layers.
3. **Spatial Coverage & Negative Space**:
   - *Question*: Are all four quadrants intentional, with `25%–70%` quiet ground space?
   - *Fail symptom*: An entire third of the canvas is accidentally blank, or `>90%` of the frame is cluttered with overlapping strokes.
   - *Fix*: Adjust layout bounds or add a subtle secondary layer in the empty region.
4. **Frame-to-Frame Progression**:
   - *Question*: Do adjacent tiles in `sheet.png` show smooth, perceptible progression?
   - *Fail symptom*: Two or more tiles look identical (dead window), or tiles look completely uncorrelated (excessive frequency / chaos).
   - *Fix*: Ensure cycle multipliers are small integers (`1, 2, 3`) and active windows cover the full `[0, 1)` interval.
5. **Wrap Continuity (Last Tile -> First Tile)**:
   - *Question*: Does the bottom-right tile (`p:0.93`) naturally lead back into the top-left tile (`p:0.00`)?
   - *Fail symptom*: Color, scale, or position in the final tile is far from Frame `0`.
   - *Fix*: Check for non-integer frequency multipliers or unclosed trajectories; run `npx loop seam <dir>`.
6. **Palette & Contrast Discipline**:
   - *Question*: Does the `spark` color pop clearly against `ground` and `surface`?
   - *Fail symptom*: Muddy midtones caused by mixing incompatible colors at `0.5` alpha.
   - *Fix*: Use exact palette tokens from `kit.palettes`.

## The 3-Round Revision Cap

- **Round 1**: Initial sketch -> `loop sheet` + `loop seam` -> critique & identify top 1–2 defects.
- **Round 2**: Revise `sketch.js` -> re-run `loop sheet` + `loop seam` -> verify fix.
- **Round 3 (Final allowed revision)**: Polish remaining seam or legibility issue.
- **Hard Stop**: If any check still fails after Round 3, **do not loop further**. Present the best render along with a transparent diagnostic of what metric remains out of spec and why.
