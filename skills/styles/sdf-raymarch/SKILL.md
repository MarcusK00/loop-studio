---
name: style-sdf-raymarch
description: Ambient Style Pack for solid 3D Signed Distance Field (SDF) shapes morphing and orbiting under directional shading. Bounded to 28 raymarch steps so previews render smoothly in software without a GPU.
---

# Style Pack: `sdf-raymarch` (3D Signed Distance Field Morphing)

`sdf-raymarch` evaluates a 3D Signed Distance Field (smooth boolean union of an orbiting torus and satellite spheres) on a coarse pixel/tile grid with Lambertian + rim lighting.

## Software-Safe Step Limits

Headless browsers and pure-JS software canvases render on the CPU. Keep:
- `gridStep = 4` (or `5` at `400×400`)
- `MAX_STEPS = 24`
- `SURF_DIST = 0.015`

## Template (`skills/styles/sdf-raymarch/template.js`)

See [template.js](./template.js).
