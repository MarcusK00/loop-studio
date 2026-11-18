---
name: scene-structure
description: Showcase Scene Pack for parsers, AST tools, dependency graphs, file generators, and plugin bundles. Animates a hierarchical tree or directed graph where signals propagate from root to leaf nodes in a seamless cycle.
---

# Scene Pack: `structure` (Tree / Graph Propagation)

Use `scenes/structure` when a project organizes, parses, or resolves a tree or graph (and as the primary fallback for libraries without a traditional visual screen).

## Stage Layout & Choreography

- **Root Node (`left` or `top`)**: E.g., `plugin.json` or `loop-studio`.
- **Child Branches**: Connected by cubic Bezier edges to 3–4 child nodes (`skills/`, `rules/`, `agents/`, `tool/`).
- **Signal Packets**: Phase-locked signal pulses travel from the root node along every branch to the child nodes, lighting up each node's verification ring in turn.
- **Template**: See [template.js](./template.js).
