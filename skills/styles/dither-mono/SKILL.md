---
name: style-dither-mono
description: Ambient Style Pack for 1-bit and 2-bit ordered Bayer matrix dithering. Produces ultra-compact retro CRT and technical stipple GIFs with zero temporal noise shimmer.
---

# Style Pack: `dither-mono` (Ordered Bayer Matrix Dithering)

`dither-mono` shades rotating 3D/2D forms and compares each cell's continuous luminance $L \in [0, 1]$ against a deterministic $4\times 4$ or $8\times 8$ Bayer threshold matrix (`kit.dither.bayer4(gx, gy)`). Because the threshold matrix is fixed in screen space, stationary highlights never shimmer and GIF LZW compression achieves tiny file sizes.

## Template (`skills/styles/dither-mono/template.js`)

See [template.js](./template.js).
