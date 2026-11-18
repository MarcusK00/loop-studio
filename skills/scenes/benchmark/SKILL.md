---
name: scene-benchmark
description: Showcase Scene Pack for comparing quantitative metrics (seam score, latency, throughput, file size) between an unverified baseline and the repository's verified approach, sourced from real numbers in the repo.
---

# Scene Pack: `benchmark` (Side-by-Side Metric Comparison)

Use `scenes/benchmark` when a project's primary distinction is measurable quality, accuracy, or speed (e.g., naive unlooped sketch with `seamScore 4.2 FAIL` vs. phase-driven Loop Studio sketch with `seamScore 1.05 PASS`).

## Stage Layout & Choreography

- **Top Lane**: Baseline / Unchecked approach (`seamScore 4.2 · FAIL`) showing a visible spike at the wrap seam.
- **Bottom Lane**: Verified Loop Studio approach (`seamScore 1.05 · PASS`) showing uniform step bars across the entire cycle including `last -> first`.
- **Scanning Playhead**: A synchronized phase playhead sweeps across both lanes from frame `0` to `N-1` and wraps seamlessly.
- **Template**: See [template.js](./template.js).
