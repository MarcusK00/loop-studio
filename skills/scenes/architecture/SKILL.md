---
name: scene-architecture
description: Showcase Scene Pack for distributed systems, MCP servers, API gateways, caches, and agent meshes. Animates bidirectional request/response packets across multi-tier system nodes.
---

# Scene Pack: `architecture` (Multi-Tier System Topology)

Use `scenes/architecture` when showing how a client or primary agent orchestrates subagents, external tools, MCP servers, or backend services.

## Stage Layout & Choreography

- **Left Tier**: Primary Client / Orchestrator (`loop-studio`).
- **Center Hub**: Core Router / Engine (`loop CLI`).
- **Right Tier**: 2–3 service or subagent nodes (`cold-reader`, `seam-analyzer`, `gif-encoder`) exchanging request (`accent`) and response (`spark`) packets along bidirectional lanes.
- **Template**: See [template.js](./template.js).
