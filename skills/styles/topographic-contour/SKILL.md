---
name: style-topographic-contour
description: Ambient Style Pack for animated topographic elevation isolines, bathymetric sonar charts, and pressure maps generated over a cyclic 3D phase-noise scalar field.
---

# Style Pack: `topographic-contour` (Cyclic Scalar-Field Isolines)

`topographic-contour` evaluates a smooth 2D elevation field $E(x, y, \text{phase})$ driven by circular phase noise (`kit.noise2D(x + R*cos(τ*phase), y + R*sin(τ*phase))`) and draws quantized elevation bands and crisp contour edges where $\lfloor E \cdot K \rfloor$ changes across adjacent cells.

## Template (`skills/styles/topographic-contour/template.js`)

See [template.js](./template.js).
