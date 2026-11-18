---
name: style-isometric-grid
description: Ambient Style Pack for orthographic 3D isometric blocks rising and falling in harmonic phase waves. Clean, architectural, and high-contrast.
---

# Style Pack: `isometric-grid` (Orthographic Harmonic Block Lattice)

`isometric-grid` renders an $N \times N$ lattice of 3D isometric prisms back-to-front (Painter's algorithm: increasing $i + j$), modulating each column's elevation $h(i, j, \text{phase})$ with a radial and diagonal integer wave.

## Isometric Projection Formula

$$x_{\text{screen}} = c_x + (i - j) \frac{w_{\text{tile}}}{2}, \quad y_{\text{screen}} = c_y + (i + j) \frac{h_{\text{tile}}}{2} - z$$

Each prism draws three shaded polygon faces:
- **Top face**: `spark` or `accent` (brightest)
- **Left face**: `surface` / mid-tone
- **Right face**: `line` / shadow tone

## Template (`skills/styles/isometric-grid/template.js`)

See [template.js](./template.js).
