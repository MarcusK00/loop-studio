---
name: loop-cold-read
description: Zero-context storyboard verification protocol for Loop Studio showcase animations. Hands storyboard.png to a fresh agent (loop-cold-reader) with zero repo context and judges whether its one-sentence guess matches what the project actually does.
---

# Loop Cold Read — Zero-Context Comprehension Gate

The most common failure of an explanation diagram is **curse of knowledge**: the author already knows what the repo does, so an abstract moving dot looks obvious to them while a newcomer has no idea what is happening.

The **Cold Read** turns comprehension into an objective test.

## Step 1: Render the Storyboard (`storyboard.png`)

Run:
```bash
node tool/bin/loop.js story <dir>
```
This renders a single composite image containing:
- **Panel 0**: Frame `0` (`t = 0.0s`, the static thumbnail)
- **Panels 1..K**: One frame from the exact midpoint of each step in `showcase.json`

## Step 2: Invoke a Fresh Zero-Context Subagent

Launch a fresh subagent (`loop-cold-reader` or `research` subagent) and give it **only** the path to `<dir>/storyboard.png` with this exact prompt:

> *"View ONLY the image at `<absolute-path-to-storyboard.png>`. Do NOT read any other files, READMEs, or JSON in the workspace. Based solely on the visual diagram and captions in this storyboard image: (1) State in one plain sentence what this project/tool takes as input, what it does to it, and what it produces as output. (2) Note any label or caption that is unclear, truncated, or hard to read."*

## Step 3: Judge the Cold-Read Response

Compare the subagent's `guessedPurpose` against `showcase.json#says` across three components:

| Component | Target (`showcase.json#says`) | Cold Reader Guess Must Capture |
| :--- | :--- | :--- |
| **1. Input** | What enters the system (e.g., "a one-line text prompt / request") | Recognizes the input artifact type |
| **2. Action / Process** | What happens inside (e.g., "writes a phase sketch and checks the seam") | Recognizes the core transformation or verification |
| **3. Output** | What comes out (e.g., "a seamless looping GIF / animation") | Recognizes the resulting artifact |

- **PASS**: All 3 components (Input, Process, Output) are recognizable in the subagent's one-sentence answer (`clarityScore >= 4`).
- **FAIL / REVISE**: If the cold reader guesses the wrong domain, misses what goes in or comes out, or flags an unclear panel, revise `showcase.json` labels/captions or `sketch.js` stage visuals and re-run `loop story` (up to the 3-round session limit).
