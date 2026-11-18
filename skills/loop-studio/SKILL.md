---
name: loop-studio
description: Entry skill and session orchestrator for Loop Studio. Activate whenever the user asks for a seamless animation loop, an animated background, a looping GIF/MP4/WebM, or a showcase video/animation explaining what a repository, CLI tool, API, or feature does.
---

# Loop Studio — Session Orchestrator

**Loop Studio** turns a natural-language prompt or a code repository into a deterministic, mathematically seamless animation (`loop.gif` / `showcase.gif`, `loop.mp4`, `loop.webm`, `poster.png`), verified by automated seam, legibility, source-accuracy, and cold-read checks.

## Core Invariant: Everything Comes From `phase`

A loop is seamless when Frame `N` is the exact same picture as Frame `0`. Every sketch in Loop Studio is a pure function of `phase = frame / totalFrames` (`phase ∈ [0, 1)`), where Frame `N` (`phase = 1.0`) is **never rendered**.

---

## Step 0: Route the Request (Ambient vs. Showcase)

Determine which of the two loop families the user wants:

| Mode | Trigger Examples | Default Specs | Primary Skills to Load |
| :--- | :--- | :--- | :--- |
| **Showcase Loop** | "Make a 10s looping video about what this repo does", "Animate how our CLI/pipeline works for the README" | `10s`, `30 fps`, `800×450` (or `800×320`), `showcase.json` | [`loop-showcase`](../loop-showcase/SKILL.md), [`loop-timeline`](../loop-timeline/SKILL.md), [`loop-type`](../loop-type/SKILL.md), [`loop-scenes`](../loop-scenes/SKILL.md), [`loop-cold-read`](../loop-cold-read/SKILL.md) |
| **Ambient Loop** | "Make a 4s square loop: deep sea, slow, bioluminescent", "Animated hero background with isometric blocks" | `4s`, `30 fps`, `1080×1080` (or `800×450`), `brief.json` | [`loop-brief`](../loop-brief/SKILL.md), [`loop-math`](../loop-math/SKILL.md), [`loop-compose`](../loop-compose/SKILL.md), [`loop-palette`](../loop-palette/SKILL.md), [`loop-styles`](../loop-styles/SKILL.md), [`loop-critique`](../loop-critique/SKILL.md) |

---

## Workflow A: Ambient Loop Session (8 Steps)

1. **Brief (`brief.json`)**:
   - Read [`loop-brief`](../loop-brief/SKILL.md). Translate the prompt into `brief.json` (duration, fps, width, height, mood, palette, style, seed, destination).
   - Scaffold the workspace with `npx loop new <dir> --mode ambient --style <style> --palette <palette>`.
2. **Select Style Pack**:
   - Read [`loop-styles`](../loop-styles/SKILL.md) and load the chosen style skill (`flow-field`, `particle-orbit`, `sdf-raymarch`, `kinetic-type`, `dither-mono`, `isometric-grid`, `blueprint-cad`, or `topographic-contour`).
3. **Author `sketch.js`**:
   - Apply [`loop-math`](../loop-math/SKILL.md), [`loop-compose`](../loop-compose/SKILL.md), and [`loop-palette`](../loop-palette/SKILL.md).
   - Use only `phase`, `meta`, and deterministic helpers from `kit` (`kit.rng`, `kit.loopNoise`, `kit.generations`, `kit.sin`).
4. **Render Contact Sheet (`sheet.png`)**:
   - Run `npx loop sheet <dir>` to tile every 8th frame with frame indices and phase readouts into `<dir>/sheet.png`.
5. **Visual Critique**:
   - Apply [`loop-critique`](../loop-critique/SKILL.md) (or invoke the `loop-critic` subagent) on `sheet.png`: verify focal point, depth/speed layering, spatial balance, and palette roles.
6. **Seam Check (`seam.json`)**:
   - Run `npx loop seam <dir>`. Verify `seamScore <= 1.5`, `duplicateFrames === 0`, and `flickerScore <= 2.5`.
   - *Revision Loop*: Repeat Steps 3–6 for **at most 3 rounds** until both visual critique and seam checks pass.
7. **Final Render**:
   - Follow [`loop-render`](../loop-render/SKILL.md): run `npx loop render <dir>` to produce `loop.gif`, `poster.png`, and (if FFmpeg is present) `loop.mp4` and `loop.webm`.
8. **Report**:
   - Summarize the output files, final `seamScore`, palette/style used, and what improved across rounds.

---

## Workflow B: Showcase Loop Session (7 Steps)

1. **Read the Repository**:
   - Load [`loop-showcase`](../loop-showcase/SKILL.md). Read `README.md`, package manifests, `examples/`, and `tests/`.
   - State in one sentence to the user what the project does (*what goes in -> what happens -> what comes out*) and proceed without stalling unless the repository's purpose is genuinely ambiguous.
2. **Select Scene Pack & Write `showcase.json`**:
   - Pick the single most telling cycle and choose a scene pack from [`loop-scenes`](../loop-scenes/SKILL.md) (`flow`, `transform`, `terminal`, `code`, `interface`, `structure`, `architecture`, or `benchmark`).
   - Write `showcase.json` with a fixed `stage`, wrap-around handover (`from: 8.5, to: 1.5`), and a verified `"source": "file:line"` for every step.
3. **Build `sketch.js`**:
   - Follow [`loop-timeline`](../loop-timeline/SKILL.md) and [`loop-type`](../loop-type/SKILL.md). Ensure Frame `0` shows the full labelled stage clearly.
4. **Render Storyboard (`storyboard.png`)**:
   - Run `npx loop story <dir>` to render Frame `0` plus the midpoint frame of each step into `storyboard.png`.
5. **Zero-Context Cold Read**:
   - Follow [`loop-cold-read`](../loop-cold-read/SKILL.md): invoke the `loop-cold-reader` subagent with *only* `storyboard.png`. If its 1-sentence interpretation does not match `showcase.json#says`, revise the labels, stage visuals, or captions.
6. **Automated Audit (`seam`, `legible`, `source-check`)**:
   - Run `npx loop audit <dir>` (which runs `loop seam`, `loop legible`, and `loop source-check`).
   - Verify:
     - `seamScore <= 1.5` and `duplicateFrames === 0`
     - Every caption stays visible `>= 0.5 + 0.3 * words` seconds and meets `>= 4.5:1` contrast at README (`800px`) and mobile (`400px`) widths
     - Every `"source"` resolves to a real `file:line`
   - *Revision Loop*: Cap revisions at **3 rounds**.
7. **Final Render & Embed**:
   - Run `npx loop render <dir>` to produce `showcase.gif`, `poster.png`, and `showcase.mp4`.
   - Use [`loop-embed`](../loop-embed/SKILL.md) to give the user a drop-in README snippet.
