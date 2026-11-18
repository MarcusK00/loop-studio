---
name: loop-type
description: Typography, caption pacing, WCAG contrast (4.5:1), and dual-scale readability rules (README 800px and mobile 400px) for Loop Studio animations containing text.
---

# Loop Type — Typography & Readability Engineering

An animation with unreadable text fails its only job. Apply these rules whenever a sketch includes stage labels, captions, terminal prompts, code snippets, or kinetic type.

## 1. Labels, Not Sentences

Keep text terse so a viewer can scan the stage and caption in a single glance:

| Text Element | Max Words | Max Characters | Min Font Size (at `800px` width) | Font Weight & Family |
| :--- | :--- | :--- | :--- | :--- |
| **Stage Box Label** | `1 – 3` words | `18` chars | `13px` (`monospace` or `sans-serif`) | `600` (Semi-bold) |
| **Step Caption** | `3 – 9` words | `58` chars | `13px` (`monospace`) | `400 / 500` |
| **Terminal / Code Line** | `1` command / line | `48` chars | `12.5px` (`monospace`) | `400 / 500` |
| **Badge / Metric** | `1 – 2` tokens | `12` chars | `12px` (`monospace`) | `700` |

## 2. Reading-Time Formula

Every caption must remain at full opacity long enough for an unprimed viewer to read it comfortably:

$$T_{\text{min}}(\text{words}) = 0.5\text{s} + 0.3\text{s} \times N_{\text{words}}$$

- Example: `"the seam is measured"` ($4$ words) requires at least $0.5 + 0.3 \times 4 = 1.7\text{s}$ (with `0.25s` cross-fade ramps, total step window $\ge 2.0\text{s}$).
- `npx loop legible <dir>` checks every step in `showcase.json` against this exact formula.

## 3. WCAG AA Contrast ($\ge 4.5 : 1$)

Every text label and caption must achieve a WCAG 2.1 contrast ratio of at least **`4.5 : 1`** against the background pixels directly behind it (`surface` for stage labels, `ground` for bottom captions):

$$\text{Contrast} = \frac{L_{\text{lighter}} + 0.05}{L_{\text{darker}} + 0.05} \ge 4.5$$

- Never draw captions directly on top of busy moving particles or high-contrast grid lines without a solid or semi-opaque pill/band behind the text (`surface` or `ground`).
- Use `kit.color.contrastRatio(textColor, bgColor)` or run `npx loop legible <dir>` to verify contrast automatically.

## 4. Dual-Scale Readability (README `800px` & Mobile `400px`)

A README GIF on GitHub is viewed at `~800px` wide on desktop and scaled down to `~360px–400px` wide on phones:
- Maintain at least **`24px` horizontal and `18px` vertical safe margin** between any text bounding box and the canvas edge at `800px` width.
- At half scale (`400px`), effective font size must remain `>= 6.25px` (i.e. `>= 12.5px` at `800px` base width) so glyphs never collapse into an illegible blur.
