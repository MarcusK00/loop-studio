---
name: loop-studio
description: Create source-grounded, dual-theme (dark & light) animated README demos, PR code diffs, UI walkthroughs, and WebGL2 loops using native browser HTML/CSS/SVG or GLSL shaders verified for loop seams, WCAG contrast, mobile legibility, and codebase accuracy.
---

# Loop Studio — Grounded Dual-Theme Motion for READMEs & PRs

Loop Studio turns a repository feature, PR diff, or product UI into a crisp, deterministic HTML/CSS/SVG (`scene.html`) or WebGL2 (`shader.frag`) loop exported as dark/light `<picture>` WebP, GIF, and MP4 bundles.

Every animation is driven by `phase = frame / (seconds * fps)` (`phase ∈ [0, 1)`), where Frame `N` (`phase = 1.0`) is **never rendered**.

---

## Primary Use Cases

1. **README / Docs Explainers**: Source-grounded product UI, CLI, or architecture animations exported as dark + light `<picture>` WebP/GIF bundles (GitHub READMEs strip JS/CSS animations).
2. **PR & Changelog Code Diffs**: Crisp syntax-highlighted before/after code refactor clips (`--template code-diff`).
3. **Zero-Dependency WebGL2 Shaders**: Procedural GLSL fragment shader hero loops (`--template shader`) rendered via macOS WebKit or headless Chromium.

---

## Workflow (5 Steps)

### 1. Ground the Script (`showcase.json`)
Read the target repository's `README.md`, manifest, and key implementation files. Write `showcase.json` describing **one concrete input -> transformation -> output** flow:
- Keep stage labels `<= 3` words and captions `<= 10` words (`>= 0.5 + 0.3 * words` seconds visible).
- Every step **must** cite a repo-relative `"source": "path/to/file:line"` (or `"file:start-end"`), plus optional `"match": ["SymbolName"]` to catch documentation drift when code moves.
- Hand over continuously across the `1.0 -> 0.0` wrap boundary (e.g., Step 1 `from: 8.0, to: 3.0` on a `9s` loop).

### 2. Scaffold, Generate, or Author Modern HTML/CSS/SVG (`scene.html`) or GLSL (`shader.frag`)
Start from a real repo artifact or clean starter:
```bash
npx loop diff <dir> --range dev..HEAD                   # real git diff -> dual-theme code-diff scene
npx loop term <dir> --cmd "npm test" --label "npm test" # real CLI output -> dual-theme terminal scene
npx loop new <dir> --template html                      # clean HTML/CSS/SVG or code-diff | shader starter
```
Author `scene.html` using standard HTML/CSS/SVG and the injected CSS theme variables so dark & light variants render automatically:
- `--loop-ground`, `--loop-surface`, `--loop-body`, `--loop-muted`, `--loop-accent`, `--loop-spark`, `--loop-line`
- `--loop-on-accent`, `--loop-on-spark` (automatically computed for WCAG `>= 4.5:1` contrast)
- Mark stage labels with `data-loop-stage` and the step caption with `data-loop-caption`.
- Implement `window.renderLoop = function(phase, kit, meta) { ... }` purely as a function of `phase ∈ [0, 1)` (no `Date.now()`, `Math.random()`, `requestAnimationFrame`, or CSS `transition`/`animation`).

### 3. Cold-Read Comprehension Check
```bash
npx loop story <dir>
```
Pass **only** `<dir>/storyboard.png` to the `loop-cold-reader` subagent. If an unprimed reader cannot tell what the repo/feature does in one sentence matching `showcase.json#says`, tighten the stage labels or visual cues.

### 4. Dual-Theme Verification Gate
```bash
npx loop audit <dir> --repo . --themes dark,light
```
Verifies in real rendered browser pixels:
- `seamScore <= 1.5`, `duplicateFrames === 0`, `flickerScore <= 2.5`
- WCAG AA `>= 4.5:1` contrast, reading duration, and `400px` mobile-width non-overflow across **both** dark & light themes
- Every `"source"` and `"match"` token exists in the target repository

Fix any failure (cap revisions at **3 rounds**).

### 5. Render Dual-Theme README Bundle
```bash
npx loop render <dir> --themes dark,light --formats webp,gif,mp4 --max-kb 2048
```
Copy the emitted `<picture>` Markdown snippet directly into `README.md` or your PR description, and avoid committing heavy temporary test renders into git unless needed for release docs.
