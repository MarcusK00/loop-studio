# Architecture Decision Record: Renderer Engine (`docs/decisions/renderer.md`)

## Context

Stage 1 of the Loop Studio specification requires evaluating how sketches are stepped by `phase`, measured for seam continuity and WCAG legibility, and encoded to GIF, PNG, MP4, and WebM across developer laptops, CI runners, and sandboxed agent environments.

## Comparison

| Criterion | External Wrapper (`heygen-com/hyperframes`) | Hybrid Self-Contained Engine (`SoftCanvas2D` + Pure-JS GIF89a/PNG + Optional Browser/FFmpeg) |
| :--- | :--- | :--- |
| **Frame-Exact Phase Seeking** | Seeks via HTML time/CSS clock; requires adapter layer for `phase = f / N` | Native `render(ctx, f / N, kit)` contract; Frame `N` is mathematically excluded |
| **Machine-to-Machine Reproducibility** | Depends on host OS font shaping and GPU driver | 100% bit-identical output across macOS, Linux, CI, and sandboxes via `SoftCanvas2D` |
| **Zero-Dependency Sandbox / CI Execution** | Fails without headless Chromium + FFmpeg installed | Works out-of-the-box on pure Node.js 18+ (`node:zlib` PNG + adaptive 256-color LZW GIF89a) |
| **Telemetry for `loop legible`** | Requires DOM bounding-box scraping + screenshot pixel diffing | `SoftCanvas2D` instruments `fillText` directly, recording exact pixel background contrast before glyph blend |
| **MP4 / WebM / WebGL Upgrade Path** | Supported via Chromium + FFmpeg | Supported via optional FFmpeg / Headless Chrome detection (`loop doctor`) |

## Decision

We chose the **Hybrid Self-Contained Engine** (`tool/lib/soft-canvas.js` + `tool/lib/encoders.js` + optional FFmpeg/Browser acceleration):
1. **Zero friction**: Anyone cloning the repo or running an agent inside a restricted sandbox can run `node tool/bin/loop.js audit` and `node tool/bin/loop.js render` immediately without installing native binaries.
2. **Deterministic telemetry**: `SoftCanvas2D` measures actual background pixels behind every text draw call before compositing glyphs, making WCAG 2.1 contrast (`>= 4.5:1`) and dual-scale margin checks deterministic and instantaneous.
