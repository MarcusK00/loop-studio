---
name: loop-audit
description: Unified automated quality gate for Loop Studio. Combines seam measurement (loop seam), typography & WCAG contrast verification (loop legible), repository file:line citation checks (loop source-check), and file-size budget validation into audit.json.
---

# Loop Audit — Unified Quality Gate

Before running a final production render or committing a loop to a repository README, run the unified audit command:

```bash
node tool/bin/loop.js audit <dir> [--repo <target-repo-root>]
```

## What `loop audit` Measures

`loop audit` executes up to four automated verifiers and writes `<dir>/audit.json`:

| Check | Scope | Pass Threshold | Failure Meaning & Remediation |
| :--- | :--- | :--- | :--- |
| **1. Seam Continuity (`seam.json`)** | All loops | `seamScore <= 1.5` | Wrap step $\Delta(N-1, 0)$ is larger than normal step $\text{median}(\Delta)$. Fix fractional cycle multipliers or unclosed noise paths in `sketch.js`. |
| **2. Stutter / Duplicates (`seam.json`)** | All loops | `duplicateFrames === 0` | Two adjacent frames are pixel-identical (often because Frame $N$ was rendered or a timeline window has a dead gap). |
| **3. Flicker Stability (`seam.json`)** | All loops | `flickerScore <= 2.5` | Frame-to-frame step sizes swing erratically. Smooth transitions with `kit.ease.inOutCubic` or reduce strobe frequency. |
| **4. Reading Time (`legible.json`)** | Showcase / Text | `duration >= 0.5 + 0.3 * words` | A step caption disappears before a viewer can finish reading it. Shorten caption word count or widen step `(from, to)` window. |
| **5. WCAG AA Contrast (`legible.json`)** | Showcase / Text | `contrastRatio >= 4.5` | Caption or stage label blends into the background. Switch text to `palette.body` on `palette.surface`/`palette.ground` pill. |
| **6. Mobile & Margin Safety (`legible.json`)** | Showcase / Text | `margin >= 24px` at `800px` & readable at `400px` | Caption overflows canvas width on mobile phones. Keep captions `<= 58` characters and font size `>= 12.5px`. |
| **7. Source Honesty (`sources.json`)** | Showcase | `100%` of `steps[].source` exist | A step cites a nonexistent file or out-of-range line number. Re-verify `file:line` in the target repository. |

## Interpreting `audit.json`

Only proceed to `loop render` when `audit.json` reports `"pass": true`. If `"pass": false`, address the specific failing entry in `audit.json#failures` (within the 3-round revision cap).
