---
name: loop-render
description: Guide for driving the `loop` CLI tool (new, sheet, story, seam, legible, source-check, audit, render, serve), choosing output formats (GIF, MP4, WebM, PNG), and meeting destination size budgets.
---

# Loop Render — CLI Execution & Encoding Budgets

Use the `loop` CLI (`npx loop <cmd>` or `node tool/bin/loop.js <cmd>`) to scaffold, inspect, measure, and encode animations.

## CLI Command Reference

### 1. Scaffold (`loop new`)
```bash
node tool/bin/loop.js new <dir> --mode showcase --scene flow --palette studio-dark
node tool/bin/loop.js new <dir> --mode ambient --style particle-orbit --palette abyss
```

### 2. Preview Contact Sheet (`loop sheet`)
Renders every Nth frame at reduced resolution with frame index and phase overlays into `<dir>/sheet.png`:
```bash
node tool/bin/loop.js sheet <dir> --every 8 --cols 4
```

### 3. Showcase Storyboard (`loop story`)
Renders Frame `0` plus the midpoint frame of every step in `showcase.json` into `<dir>/storyboard.png` for the zero-context cold read:
```bash
node tool/bin/loop.js story <dir>
```

### 4. Seam Analysis (`loop seam`)
Measures pixel root-mean-square deltas $\Delta(f, f+1)$ across all frames and computes the wrap ratio:

$$\text{seamScore} = \frac{\Delta(N-1, 0)}{\text{median}_{0 \le f < N-1} \Delta(f, f+1)}$$

```bash
node tool/bin/loop.js seam <dir>
```
Writes `<dir>/seam.json`. **Pass criteria**: `seamScore <= 1.5`, `duplicateFrames === 0`, `flickerScore <= 2.5`.

### 5. Text Legibility & WCAG Contrast Audit (`loop legible`)
For showcase and kinetic-type loops, verifies reading duration (`>= 0.5 + 0.3 * words`), WCAG AA contrast (`>= 4.5:1`), edge margins (`>= 24px`), and dual-scale readability (`800px` README and `400px` phone width):
```bash
node tool/bin/loop.js legible <dir>
```
Writes `<dir>/legible.json`.

### 6. Source Citation Verification (`loop source-check`)
Verifies that every `"source": "file:line"` in `showcase.json` points to an existing file and valid line number in the target repository:
```bash
node tool/bin/loop.js source-check <dir> --repo <repo-root>
```
Writes `<dir>/sources.json`.

### 7. Unified Audit (`loop audit`)
Runs `seam`, `legible`, and `source-check` in one pass and writes `<dir>/audit.json`:
```bash
node tool/bin/loop.js audit <dir> --repo <repo-root>
```

### 8. Final Render (`loop render`)
Renders all $N$ frames (`0..N-1`) at full resolution and encodes:
- `loop.gif` (or `showcase.gif` in showcase mode) using adaptive 256-color quantization + LZW encoding (GIF89a frame delays use integer centiseconds, capping reliable browser playback at `50 fps` / `2 cs`)
- `poster.png` (Frame `0` at full resolution)
- `loop.mp4` / `showcase.mp4` (`H.264 yuv420p` at exact requested `fps` — `24`, `30`, `60`, or `120 fps` — via **FFmpeg** or native **macOS AVFoundation**)
- `loop.webp` / `showcase.webp` (24-bit Animated WebP with exact millisecond frame timing at `30–60+ fps` via `cwebp`+`webpmux` or FFmpeg)
- `loop.webm` (`VP9` when FFmpeg is installed and `--formats webm` is requested)

```bash
node tool/bin/loop.js render <dir> --fps 60 --formats mp4,webp,gif,png
```

> [!TIP]
> **Choosing Frame Rates (`> 20 fps`)**:
> - For **GIFs**, use `20`, `25`, `30` (`3 cs` ≈ `33.3 fps`), or `50 fps` (`2 cs`, maximum reliable browser GIF speed).
> - For **true `30 / 60 / 120 fps` smooth video**, pass `--fps 60` with `--formats mp4,webp,png` (MP4 files are typically `4×–10×` smaller than GIFs with zero 256-color banding).

### 9. Live Interactive Workbench (`loop serve`)
Opens an interactive studio in the browser with a frame-exact phase scrubber, live seam-jump bar chart, mobile width toggle, and instant PNG/sheet export:
```bash
node tool/bin/loop.js serve <dir> --port 4173
```

---

## Destination Format & Size Budgets

| Destination | Recommended Dimensions | FPS | Formats | GIF Budget |
| :--- | :--- | :--- | :--- | :--- |
| **GitHub README Showcase** | `800 × 320` or `800 × 450` | `24` or `30` | `showcase.gif`, `poster.png`, `showcase.mp4` | `<= 3.5 MB` (hard limit `5.0 MB`) |
| **Ambient Gallery / Square** | `640 × 640` (GIF) / `1080 × 1080` (MP4) | `30` | `loop.gif`, `poster.png`, `loop.mp4` | `<= 4.0 MB` |
| **Compact Badge / Card** | `480 × 270` | `24` | `loop.gif`, `poster.png` | `<= 1.2 MB` |

### Reducing GIF File Size When Over Budget
If `loop render` reports a GIF over budget:
1. Reduce `fps` from `30` to `24` or `20` (saves `20%–33%` immediately).
2. Keep background areas steady (`ground` fill) rather than animating full-screen noise.
3. For showcase loops, use `800 × 320` (16:6 aspect ratio) instead of `800 × 450`.
