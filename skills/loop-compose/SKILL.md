---
name: loop-compose
description: Motion design and visual composition principles for short 2-to-15 second seamless loops. Covers focal hierarchy, three-depth parallax layering, harmonic speed contrast, asymmetric easing, and negative space.
---

# Loop Compose — Motion Design for Short Loops

An agent-written sketch often fails visually not because the math is wrong, but because **everything moves at the same speed, at the same scale, across the entire canvas**. Apply these five rules before writing `sketch.js`.

## 1. One Focal Anchor

Every frame (especially Frame `0`) needs a primary focal region occupying roughly `20%–35%` of the canvas area:
- **Radial / Orbital**: Anchor slightly off-center (`(0.5, 0.48)`) or dead-center with clear concentric falloff.
- **Directional / Flow**: Anchor along a primary diagonal or golden-ratio horizon (`y = 0.62 * height`), leaving quiet breathing room above or below.
- **Showcase Diagram**: The fixed stage occupies the central horizontal band (`y = 0.25H..0.68H`), with the bottom band (`y = 0.80H..0.90H`) reserved exclusively for captions.

## 2. Three Depth Layers at Harmonic Speeds

Never draw a single flat layer. Compose every ambient loop from three depth planes running at integer harmonic ratios:

| Plane | Canvas Share | Speed (`cycles/loop`) | Alpha / Contrast | Role |
| :--- | :--- | :--- | :--- | :--- |
| **1. Ground / Atmosphere** | `60%–75%` | `1x` (slowest) | `0.12 – 0.30` | Slow gradient tide, subtle grid, or deep field |
| **2. Body / Structure** | `20%–30%` | `1x` or `2x` | `0.60 – 0.90` | Primary ribbons, orbits, isometric blocks, or stage nodes |
| **3. Spark / Accent** | `5%–10%` | `2x` or `3x` | `0.90 – 1.00` | High-contrast highlights, pulses, data packets, or glints |

## 3. Easing Over Linear Motion

Linear interpolation (`x = a + (b - a) * u`) feels robotic. Use shaped easing curves from `kit.ease`:

- **Smooth departure & arrival**: `kit.ease.inOutCubic(u)` or `kit.ease.smoothstep(u)`
- **Snappy UI/terminal action**: `kit.ease.outExpo(u)` (fast attack, gentle settle)
- **Breathing pulse**: `Math.pow(0.5 + 0.5 * Math.sin(TAU * phase), 2.2)` (spends more time resting in the trough, then crests sharply)

## 4. Rest Beats & Negative Space

- **Keep at least 25% of the canvas quiet (`ground` color)** so the eye can rest and compression formats (GIF / MP4) stay crisp and small.
- **In showcase loops**, hold the item still inside each stage box for at least `0.6s–1.2s` after it arrives so the viewer can read the stage label and caption without chasing a constantly moving target.
