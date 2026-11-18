---
name: scene-interface
description: Showcase Scene Pack for UI components, web apps, plugins, and interactive tools. Draws a simplified wireframe screen with a smooth pointer performing one clear user interaction and returning to its origin.
---

# Scene Pack: `interface` (Wireframe UI & Pointer Choreography)

Use `scenes/interface` when the project is a UI application, browser extension, IDE plugin, or interactive workbench (`loop serve`).

## Stage Layout & Choreography

- **App Frame (`640 × 192`)**: Minimal wireframe UI with a sidebar/controls panel, a central canvas preview, and a bottom phase scrubber bar.
- **Closed Pointer Trajectory**: The vector pointer moves along a smooth closed loop across the controls (Scrubber -> Seam Chart -> Export Button -> Scrubber), clicking at key timestamps with an expanding ring pulse.
- **Template**: See [template.js](./template.js).
