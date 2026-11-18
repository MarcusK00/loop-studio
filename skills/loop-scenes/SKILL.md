---
name: loop-scenes
description: Catalog and selector guide for Loop Studio Showcase Scene Packs (flow, transform, terminal, code, interface, structure, architecture, benchmark). Load this skill when designing a showcase animation to pick and load the right scene pack template.
---

# Loop Scenes — Showcase Scene Pack Catalog

Each Scene Pack provides a proven stage layout, wrap-point handover mechanics, and a ready-to-customize `template.js` for showcase loops.

## Scene Pack Selection Matrix

| Scene Pack | Skill Path | Best For | Visual Stage Mechanics |
| :--- | :--- | :--- | :--- |
| **`flow`** | [`skills/scenes/flow/SKILL.md`](../scenes/flow/SKILL.md) | Pipelines, compilers, routers, multi-step agents, request lifecycles | 3–5 fixed labelled boxes on a horizontal rail; payload orb travels node-to-node, transforms upon verification, and exits right as next orb enters left. |
| **`transform`** | [`skills/scenes/transform/SKILL.md`](../scenes/transform/SKILL.md) | Formatters, converters, linters, minifiers, data normalizers | Split stage: raw input card on left enters central processing core and emerges on right as structured/clean output card with diff highlights. |
| **`terminal`** | [`skills/scenes/terminal/SKILL.md`](../scenes/terminal/SKILL.md) | CLI tools, build runners, dev scripts, package managers | Vector terminal window with title bar, deterministic keystroke typing, progress/check lines, and crisp tabular result that resets cleanly across the seam. |
| **`code`** | [`skills/scenes/code/SKILL.md`](../scenes/code/SKILL.md) | Libraries, SDKs, declarative APIs, DSLs | Left pane: 5–7 lines of syntax-colored code with an active execution bar stepping down. Right pane: live state/output inspector updating in sync. |
| **`interface`** | [`skills/scenes/interface/SKILL.md`](../scenes/interface/SKILL.md) | UI components, web apps, plugins, visual editors | Minimalist app wireframe with a smooth Bezier cursor clicking/dragging one control and triggering an immediate visual state transition. |
| **`structure`** | [`skills/scenes/structure/SKILL.md`](../scenes/structure/SKILL.md) | Parsers, AST tools, bundlers, dependency graphs, file generators | Directed tree or graph whose nodes pulse, connect, and propagate a wave of state from root to leaves and back to equilibrium. |
| **`architecture`** | [`skills/scenes/architecture/SKILL.md`](../scenes/architecture/SKILL.md) | Microservices, MCP servers, databases, caches, event buses | Multi-tier topology (Client -> Gateway -> Workers / Store) with bidirectional request/response packets and status indicators. |
| **`benchmark`** | [`skills/scenes/benchmark/SKILL.md`](../scenes/benchmark/SKILL.md) | High-performance engines, fast runtimes, compression tools | Dual horizontal race lanes comparing baseline vs. repo throughput/latency using real cited benchmark metrics from the repository. |

## How to Use a Scene Pack

1. Read the chosen scene pack's `SKILL.md` in `skills/scenes/<scene>/SKILL.md`.
2. Scaffold from its template with:
   ```bash
   node tool/bin/loop.js new <dir> --mode showcase --scene <scene>
   ```
3. Customize `showcase.json` (`says`, `stage`, `steps` with `source: "file:line"`) and adapt the stage specifics in `sketch.js`.
