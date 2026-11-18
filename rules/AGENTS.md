# Loop Studio — Core Rules

Enforce these invariants when authoring or auditing animations in **Loop Studio**:

1. **Pure Phase (`phase ∈ [0, 1)`)**: Drive every animation frame from `phase = frame / (seconds * fps)` over frames `0..N-1`. Never render Frame `N` (`phase = 1.0`), and never rely on wall-clock time (`Date.now()`, `performance.now()`), unseeded `Math.random()`, `requestAnimationFrame` state drift, or CSS `transition`/`animation`.
2. **Real Web Tech Only**: Author `scene.html` (HTML5/CSS3/SVG with `--loop-*` theme tokens) or `shader.frag` (WebGL2 GLSL).
3. **Source Grounding (`file:line` + `match`)**: Every showcase step in `showcase.json` must cite a real repo-relative `"source": "path/to/file:line"` (and optionally `"match"` symbol/token) verified by `loop source-check`.
4. **Dual-Theme Readability**: Mark stage labels with `data-loop-stage` and step captions with `data-loop-caption`. Captions must stay visible `>= 0.5 + 0.3 * words` seconds, maintain WCAG `>= 4.5:1` contrast, and avoid overflow at both `800px` and `400px` mobile width across `--themes dark,light`.
5. **Verification Gate**: Run `loop audit <dir> --repo . --themes dark,light` and cold-read `storyboard.png` via `loop-cold-reader` before final `loop render`. Cap revisions at **3 rounds**.
6. **Concise Output**: Keep user-facing updates brief (2–5 short lines): state generated files, `seamScore`, and any key fix or blocker without dumping raw frame-delta arrays.
