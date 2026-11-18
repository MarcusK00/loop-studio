# Loop CLI Tool Reference (`docs/tool.md`)

The `loop` command (`tool/bin/loop.js`) drives project scaffolding, preview contact sheets, storyboards, seam and legibility measurement, source citation verification, and final encoding.

## Commands

1. `loop new <dir> [--mode showcase|ambient] [--scene <id>] [--style <id>] [--palette <id>]`
   Creates `<dir>/sketch.js`, `<dir>/showcase.json` or `<dir>/brief.json`, and `<dir>/index.html`.
2. `loop sheet <dir> [--every 8] [--cols 4]`
   Renders every Nth frame with frame numbers and phase readouts into `<dir>/sheet.png`.
3. `loop story <dir>`
   Renders Frame `0` (static thumbnail) plus the midpoint frame of each step in `showcase.json` into `<dir>/storyboard.png`.
4. `loop seam <dir>`
   Measures frame-to-frame RMS pixel changes and computes `seamScore` (last-to-first change divided by median frame-to-frame change), `duplicateFrames`, and `flickerScore` into `<dir>/seam.json`.
5. `loop legible <dir>`
   Verifies caption reading time (`>= 0.5 + 0.3 * words` seconds), WCAG AA contrast (`>= 4.5:1`), safe edge margins, and 400px phone readability into `<dir>/legible.json`.
6. `loop source-check <dir> [--repo <root>]`
   Verifies every `"source": "file:line"` in `showcase.json` exists in the repository and writes `<dir>/sources.json`.
7. `loop audit <dir> [--repo <root>]`
   Runs `seam`, `legible`, and `source-check` together and writes `<dir>/audit.json`.
8. `loop render <dir>`
   Renders all frames `0..N-1` at full resolution and outputs `showcase.gif` / `loop.gif` and `poster.png` (plus `loop.mp4` / `loop.webm` when FFmpeg is present).
9. `loop serve <dir> [--port 4173]`
   Opens the interactive browser workbench with phase scrubber and mobile width toggle.
10. `loop doctor`
    Reports available rendering and encoding backends.
