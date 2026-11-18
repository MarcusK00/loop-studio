# Loop Studio — Agent Instructions

@[rules/AGENTS.md](rules/AGENTS.md)

## Quick Command Reference

Use the `loop` CLI (`npx loop` or `node tool/bin/loop.js`) for every stage of the workflow:

| Command | Purpose | Output |
| :--- | :--- | :--- |
| `loop new <dir> [--mode showcase\|ambient] [--style <id>] [--scene <id>]` | Scaffold a loop project with `brief.json` / `showcase.json`, `sketch.js`, and preview HTML | `<dir>/sketch.js`, `<dir>/index.html` |
| `loop sheet <dir> [--cols 4] [--every 8]` | Render every Nth frame into a numbered contact sheet for visual critique | `<dir>/sheet.png` |
| `loop story <dir>` | Render Frame `0` plus the midpoint frame of each step in `showcase.json` | `<dir>/storyboard.png` |
| `loop seam <dir>` | Measure frame-to-frame pixel deltas, last-to-first seam ratio, duplicate frames, and flicker | `<dir>/seam.json` |
| `loop legible <dir>` | Audit caption reading time, WCAG contrast (`>= 4.5:1`), safe margins, and phone-width readability | `<dir>/legible.json` |
| `loop source-check <dir> [--repo <path>]` | Verify every `file:line` citation in `showcase.json` exists in the target repository | `<dir>/sources.json` |
| `loop audit <dir>` | Run `seam`, `legible`, and `source-check` together as a unified quality gate | `<dir>/audit.json` |
| `loop render <dir> [--formats gif,mp4,webm,png]` | Render full-resolution `loop.gif` / `showcase.gif`, `poster.png`, and (when FFmpeg is available) `loop.mp4` & `loop.webm` | `<dir>/loop.gif`, `<dir>/poster.png` |
| `loop serve <dir> [--port 4173]` | Launch interactive browser workbench with phase scrubber, seam oscilloscope, and mobile preview | `http://localhost:4173` |
| `loop doctor` | Check runtime capabilities (Pure-JS engine, Headless Chrome/Chromium, FFmpeg) | JSON / terminal diagnostic |

## Skill Routing

1. Start every session by reading [`skills/loop-studio/SKILL.md`](skills/loop-studio/SKILL.md).
2. For **Showcase loops** ("animate what this repo does"), load:
   - [`skills/loop-showcase/SKILL.md`](skills/loop-showcase/SKILL.md)
   - [`skills/loop-timeline/SKILL.md`](skills/loop-timeline/SKILL.md)
   - [`skills/loop-type/SKILL.md`](skills/loop-type/SKILL.md)
   - One scene pack from `skills/scenes/<scene>/SKILL.md` (`flow`, `transform`, `terminal`, `code`, `interface`, `structure`, `architecture`, or `benchmark`)
   - [`skills/loop-cold-read/SKILL.md`](skills/loop-cold-read/SKILL.md)
3. For **Ambient loops** ("make a looping background / shader / generative animation"), load:
   - [`skills/loop-brief/SKILL.md`](skills/loop-brief/SKILL.md)
   - [`skills/loop-math/SKILL.md`](skills/loop-math/SKILL.md)
   - [`skills/loop-compose/SKILL.md`](skills/loop-compose/SKILL.md)
   - [`skills/loop-palette/SKILL.md`](skills/loop-palette/SKILL.md)
   - One style pack from `skills/styles/<style>/SKILL.md` (`flow-field`, `particle-orbit`, `sdf-raymarch`, `kinetic-type`, `dither-mono`, `isometric-grid`, `blueprint-cad`, or `topographic-contour`)
   - [`skills/loop-critique/SKILL.md`](skills/loop-critique/SKILL.md)
4. Always use [`skills/loop-render/SKILL.md`](skills/loop-render/SKILL.md) and [`skills/loop-audit/SKILL.md`](skills/loop-audit/SKILL.md) before completing the session.
