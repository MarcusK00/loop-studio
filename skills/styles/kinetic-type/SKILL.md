---
name: style-kinetic-type
description: Ambient Style Pack for kinetic typography posters, titles, and banners where words repeat, wave, and orbit on seamless phase curves.
---

# Style Pack: `kinetic-type` (Harmonic Wave Typography)

`kinetic-type` arranges stacked horizontal bands or orbital rings of high-contrast typography displaced by whole-cycle travelling phase waves.

## Visual Signature & Parameters

- **Row Phase Offset**: Row `r` of `R` receives `localPhase = (phase + r / R) % 1`.
- **Focal Row**: The central row stays upright and crisp in `spark` or `body` color while upper and lower echo rows shift horizontally by $\Delta x = A \sin(\tau(\text{phase} - r/R))$ in `accent` and `muted`.
- **Template**: See [template.js](./template.js).
