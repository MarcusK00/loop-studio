# Loop CLI Reference (`docs/tool.md`)

The `loop` CLI (`tool/bin/loop.js`) scaffolds HTML/GLSL loop scenes, drives deterministic browser capture (macOS WebKit or Chrome/Chromium CDP), audits internal projects or external videos, and exports WebP/GIF/MP4/PNG bundles.

## Commands

1. `loop new <dir> [--template html|code-diff|shader] [--palette <id>] [--force]`
   Scaffolds a starter `scene.html` or `shader.frag`, `showcase.json` or `brief.json`, and `index.html` preview.
2. `loop sheet <dir> [--every <n>] [--cols 4] [--engine auto|webkit|chromium] [--theme <t>]`
   Renders a numbered contact sheet into `<dir>/sheet.png`.
3. `loop story <dir> [--engine auto|webkit|chromium] [--theme <t>]`
   Renders Frame `0` plus the midpoint of each step in `showcase.json` into `<dir>/storyboard.png` for cold reading.
4. `loop seam <dir|video> [--engine auto|webkit|chromium] [--lossy]`
   Measures frame-to-frame RMS pixel deltas, `seamScore`, `duplicateFrames`, and `flickerScore`. Accepts either a project folder or any external `.gif`/`.mp4`/`.webp`/`.webm` file (via `ffmpeg`).
5. `loop legible <dir> [--engine auto|webkit|chromium] [--themes dark,light]`
   Verifies Frame `0` stage labels, caption reading duration (`>= 0.5 + 0.3 * words`), DOM overflow (`scrollWidth > clientWidth`), `400px` mobile sizing, and 8-point rendered RGBA WCAG `4.5:1` contrast across one or more themes.
6. `loop source-check <dir|showcase.json> [--repo <root>]`
   Enforces repo-relative `file:line` (or `file:start-end`) citations, rejects path traversal, and validates optional `"match"` tokens against code within ±3 lines.
7. `loop audit <dir|video> [--repo <root>] [--showcase <file>] [--themes dark,light] [--max-kb <n>]`
   Unified verification gate combining `seam`, `legible`, `source-check`, and optional file-size budget (`0` pass, `1` audit fail, `2` missing runtime dependency or invalid input).
8. `loop render <dir> [--fps <n>] [--formats gif,mp4,webp,webm,png|all] [--themes dark,light] [--max-kb <n>]`
   Renders full-resolution PNG poster, delta-compressed GIF89a, Animated `.webp` (`img2webp` / `cwebp+webpmux` / `ffmpeg`), `.mp4` (`AVFoundation` / `ffmpeg`), and `.webm` (`ffmpeg`), emitting copy-paste `<picture>` Markdown when `--themes dark,light` is used.
9. `loop serve <dir> [--port 4173]`
   Opens the interactive browser workbench with phase scrubber, theme toggle, and `400px` mobile toggle.
10. `loop doctor`
    Reports available browser and media encoders/decoders.
