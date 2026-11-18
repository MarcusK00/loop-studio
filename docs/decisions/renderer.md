# Architecture Decision Record: Real-Browser Harness + Universal Video Audit (`docs/decisions/renderer.md`)

## Context

Software-rasterized 2D canvas sketches (`SoftCanvas2D`) produce rigid box-and-dot diagrams with a low visual ceiling compared to modern HTML/CSS/SVG, WebGL2, or external tools like Remotion. At the same time, raw browser screen recording suffers from wall-clock jitter, dropped frames, broken loop seams, and unverified dark/light README contrast.

## Decision

1. **Drop Software Canvas2D Authoring (`SoftCanvas2D`)**: Agents author standard HTML/CSS/SVG (`scene.html`) or WebGL2 GLSL (`shader.frag`) rendered natively in **macOS `WKWebView`** or **Chrome/Chromium CDP** — with zero `npm install` dependencies.
2. **Deterministic Phase Stepping & Auto-Contrast Tokens**: `tool/lib/harness.js` freezes `Date.now`/`performance.now`, seeds `Math.random`, disables CSS transitions, computes WCAG-safe `--loop-on-accent`/`--loop-on-spark` theme variables, and captures real DOM bounding boxes + RGBA pixels.
3. **Support External Video Auditing (`ffmpeg`)**: `loop seam` and `loop audit` also accept external `.gif`, `.mp4`, `.webp`, and `.webm` files via `ffmpeg` (with lossy-codec duplicate tolerances and `step.box` pixel probing) so Loop's verification gates work alongside Remotion, Playwright, or After Effects.
4. **Source-Only Examples (Zero Binary Bloat in Git)**: Replace committed gallery GIFs/WebPs with tiny HTML/GLSL examples in `examples/`.
