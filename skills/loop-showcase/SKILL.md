---
name: loop-showcase
description: Repository reading protocol and showcase.json authoring guide for Loop Studio. Teaches the agent how to read a repo, write a one-sentence statement of what it does, select a single telling transformation and scene pack, and ground every step in a verifiable file:line source citation.
---

# Loop Showcase — Repository-to-Animation Protocol

A **showcase loop** is a 6-to-15 second looping technical diagram that shows what a repository, CLI tool, API, or library does: **something goes in, something happens to it, something comes out**. It is a small moving diagram, never an advertisement.

## Step 1: Read the Repository & Extract the One-Sentence Thesis

Before writing any script or code, inspect the target repository in this order:
1. `README.md` (look for quickstart, architecture, and CLI/API usage examples)
2. Package manifest (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `plugin.json`)
3. `examples/` or `gallery/`
4. `tests/` or `evals/` (often the clearest specification of real inputs and outputs)

Distill what you found into **one plain sentence** (`says`):
- **Good**: *"Loop Studio turns a one-line request into a checked, seamless loop."*
- **Good**: *"esbuild bundles TypeScript modules into a single minified JS file."*
- **Bad (Marketing slogan)**: *"Supercharge your developer velocity with next-gen animations."*

State this one-sentence thesis up front to the user and continue immediately without blocking unless the repo's purpose cannot be determined.

---

## Step 2: Pick One Pass of One Thing & a Scene Pack

One loop carries **one idea**. Pick the single most telling cycle the project performs and match it to a scene pack (see [`loop-scenes`](../loop-scenes/SKILL.md)):

| Project Shape | Scene Pack | What Moves on the Stage |
| :--- | :--- | :--- |
| Multi-step pipeline, compiler, server, agent workflow | `flow` | An item travels along a rail across 3–5 fixed labelled boxes (`request -> sketch -> check -> loop.gif`) |
| Converter, formatter, linter, optimizer, refactor tool | `transform` | An input card enters on the left, passes a central transformer, and emerges changed on the right |
| Command-line tool (`cli`, `git`, build runner) | `terminal` | A real command from the README is typed at a prompt and its structured output appears |
| SDK, library, function API | `code` | A 4–7 line snippet executes line-by-line while an adjacent inspector panel displays the live return value |
| Web/desktop UI application or component | `interface` | A simplified wireframe screen where a pointer performs one concrete interaction |
| Parser, AST tool, file generator, dependency resolver | `structure` | A tree or graph grows/rearranges nodes and resolves cleanly |
| Distributed system, proxy, MCP server, database | `architecture` | Requests fan out across Client -> Gateway -> Worker/Store nodes with latency/status pulses |
| Performance tool, fast runtime, compression engine | `benchmark` | Side-by-side throughput/latency race using verified benchmark numbers from the repo |

---

## Step 3: Write `showcase.json` With Mandatory `file:line` Sourcing

Every step and caption in `showcase.json` **must** cite a real `"source": "relative/path:line"` in the repository. Real filenames, commands, and flags must come from the repository itself—never from imagination.

```json
{
  "title": "Loop Studio Showcase",
  "says": "Loop Studio turns a one-line request into a checked, seamless loop.",
  "seconds": 10,
  "fps": 24,
  "width": 800,
  "height": 320,
  "palette": "studio-dark",
  "scene": "flow",
  "stage": ["request", "sketch", "check", "loop.gif"],
  "steps": [
    {
      "from": 8.5,
      "to": 1.5,
      "label": "Arrives",
      "caption": "a request arrives: \"deep sea, slow, square\"",
      "source": "README.md:12"
    },
    {
      "from": 1.5,
      "to": 5.0,
      "label": "Sketch",
      "caption": "a sketch is written, driven by the phase",
      "source": "rules/AGENTS.md:8"
    },
    {
      "from": 5.0,
      "to": 7.0,
      "label": "Check",
      "caption": "the seam and legibility are measured",
      "source": "skills/loop-render/SKILL.md:30"
    },
    {
      "from": 7.0,
      "to": 8.5,
      "label": "Render",
      "caption": "the verified loop drops out",
      "source": "skills/loop-render/SKILL.md:54"
    }
  ]
}
```

## Step 4: Verify Sources Automatically

Run `npx loop source-check <dir> --repo <repo-path>` immediately after writing `showcase.json` to confirm every `file:line` exists before writing or rendering `sketch.js`.
