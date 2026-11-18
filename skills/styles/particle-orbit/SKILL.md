---
name: style-particle-orbit
description: Ambient Style Pack for nested orbital particle rings, deep-sea bioluminescence, cosmic constellations, and harmonic wave grids.
---

# Style Pack: `particle-orbit` (Nested Harmonic Orbits & Bioluminescent Waves)

`particle-orbit` combines three layers of points on nested elliptical/Lissajous orbits and radial wave lattices moving at `1x`, `2x`, and `3x` integer cycle ratios.

## Visual Signature & Parameters

| Parameter | Default | Range | Effect |
| :--- | :--- | :--- | :--- |
| `rings` | `5` | `3 – 9` | Number of nested orbital bands |
| `particlesPerRing` | `24` | `12 – 48` | Particles distributed around each ring with phase offset `i / N` |
| `tilt` | `0.62` | `0.35 – 1.0` | Elliptical perspective compression |
| `cycles` | `[1, 2, 3]` | Integer array | Whole-cycle harmonic velocities per layer |

## Template (`skills/styles/particle-orbit/template.js`)

See [template.js](./template.js).
