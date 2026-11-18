---
name: loop-audit
description: Audit any Loop Studio project OR any external video/GIF/WebP (from Remotion, Playwright, After Effects, or AI video models) for wrap-seam continuity, duplicate wrap frames, caption reading time, WCAG contrast, and source-citation drift.
---

# Loop Audit — Universal Seam, Legibility & Source-Drift Gate

Use `loop audit` to verify either:
1. A Loop project directory (`scene.html`, `shader.frag`, `sketch.js`), **or**
2. Any pre-rendered external animation file (`.gif`, `.mp4`, `.webp`, `.webm`, `.mov`) created by Remotion, Playwright, After Effects, or generative video tools (requires `ffmpeg` for external video decoding).

---

## Auditing a Loop Project (HTML / WebGL2)

```bash
npx loop audit <dir> --repo <repo-root> --themes dark,light
```

Checks performed:
- **Wrap Seam (`seam.json`)**: Measures pixel RMS delta for every transition including `N-1 -> 0`. Fails if `seamScore > 1.5`, `duplicateFrames > 0`, or `flickerScore > 2.5`.
- **Dual-Theme DOM Legibility (`legible.json`)**: Inspects Frame `0` and every step midpoint across dark & light themes for missing stage labels, reading time (`>= 0.5 + 0.3 * words`), DOM overflow (`scrollWidth > clientWidth`), `400px` phone scaling, and worst-case 8-point pixel halo WCAG `>= 4.5:1` contrast.
- **Source & Drift Check (`sources.json`)**: Verifies every `"source": "file:line"` (or `"file:start-end"`) is repo-relative, within `--repo`, in range, and contains every `"match"` symbol/token within ±3 lines.

---

## Auditing an External Video (`MP4` / `GIF` / `WebP` / `WebM`)

```bash
npx loop seam path/to/hero.webp
npx loop audit path/to/hero.mp4 --showcase path/to/showcase.json --repo . --max-kb 2048
```

- Automatically enables lossy-codec duplicate-frame tolerance (`0.002` RMS delta for `.mp4`/`.webm`/`.webp`, `0.0001` for lossless `.gif`).
- When `--showcase` (or a sibling `showcase.json`) is present, audits caption reading durations, `file:line` + `match` doc-drift citations, and optional `step.box` (`{ x, y, width, height }`) pixel contrast.
- Exit codes: `0` pass, `1` audit failure, `2` missing `ffmpeg` or invalid input.

---

## Zero-Context Cold Read

For any showcase animation, generate `<dir>/storyboard.png` (`npx loop story <dir>`) and invoke `loop-cold-reader` with **only** `storyboard.png` to verify a first-time viewer understands the visual without reading docs.
