---
name: scene-terminal
description: Showcase Scene Pack for CLI tools, build runners, dev utilities, and package managers. Renders a vector terminal window with deterministic command typing, structured execution progress, and verified output that loops cleanly.
---

# Scene Pack: `terminal` (Vector CLI Session)

Use `scenes/terminal` when the project's primary user interface is a command-line invocation (`npx loop audit gallery/loop-studio`).

## Stage Layout & Choreography

- **Vector Terminal Frame**: Centered terminal window (`680 × 200`) with window control dots, title bar (`stage[0]`), and monospace viewport.
- **Frame-0 Readiness**: At `phase = 0` (`t = 0.0s`), the terminal frame, prompt `$ `, and command are already visible so the static thumbnail looks like an informative terminal screenshot rather than an empty black box.
- **4-Stage Cycle**:
  1. Command prompt active & highlighted (`8.5s -> 1.5s`)
  2. Execution & progress steps appear (`1.5s -> 5.0s`)
  3. Verification table / metrics print (`5.0s -> 7.0s`)
  4. Final output badge highlights before handing back to the prompt (`7.0s -> 8.5s`)

## Template (`skills/scenes/terminal/template.js`)

Use [template.js](./template.js) as the base `sketch.js` for any `terminal` showcase loop.
