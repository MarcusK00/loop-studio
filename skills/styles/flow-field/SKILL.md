---
name: style-flow-field
description: Ambient Style Pack for drifting, organic streamline fields driven by circular phase noise and overlapping generations. Ideal for ocean currents, wind, silk ribbons, and calm background loops.
---

# Style Pack: `flow-field` (Circular Curl-Noise Streamlines)

`flow-field` draws hundreds of silk-like streamlines advected across a 2D vector field whose angles evolve along a closed circle in noise space.

## Visual Signature & Parameters

| Parameter | Default | Range | Effect |
| :--- | :--- | :--- | :--- |
| `strands` | `90` | `50 – 250` | Number of active ribbon streamlines per generation |
| `steps` | `18` | `10 – 32` | Segment count along each streamline |
| `stepLen` | `7` | `4 – 12` | Length in pixels of each streamline segment |
| `noiseRadius` | `0.85` | `0.4 – 1.8` | Radius of the circular path in phase-noise space |

## Phase Math Recipe

1. Each strand $i$ starts from a seeded anchor $(x_i, y_i)$ using `kit.rng(meta.seed + i * 19)`.
2. We use 3 overlapping generations (`kit.generations(phase, 3, ...)`) so strands drift forward along the field while fading in and out with $\sin(\pi \cdot \text{age})$.
3. At each vertex $(x, y)$, the flow angle combines a base curl field with circular phase noise:
   $$\theta(x, y, \text{phase}) = \pi \cdot \text{noise2D}\left(\frac{x}{180} + R\cos(\tau\text{phase}), \frac{y}{180} + R\sin(\tau\text{phase})\right)$$

## Template (`skills/styles/flow-field/template.js`)

See [template.js](./template.js).
