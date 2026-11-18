---
name: loop-embed
description: Generates drop-in GitHub README Markdown, responsive dark/light theme <picture> embeds, accessibility prefers-reduced-motion fallbacks, and interactive HTML phase-scrubber snippets for rendered Loop Studio animations.
---

# Loop Embed — README & Web Integration Patterns

Once `loop render` finishes producing `showcase.gif` (or `loop.gif`), `poster.png`, and `loop.mp4`, use these snippets to embed the animation cleanly in a GitHub `README.md`, documentation site, or landing page.

## 1. Standard GitHub README Header (Centered with Poster Link)

```markdown
<p align="center">
  <img src="./gallery/loop-studio/showcase.gif" width="800" alt="Animated diagram: Loop Studio turns a one-line request into a checked, seamless loop.">
</p>
```

## 2. Dark / Light Theme Adaptive GitHub Embed (`<picture>`)

When you render both a dark-palette (`studio-dark`) and light-palette (`studio-light`) variant, GitHub's Markdown renderer automatically switches between them based on the viewer's OS/GitHub theme:

```html
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./gallery/loop-studio/showcase-dark.gif">
    <source media="(prefers-color-scheme: light)" srcset="./gallery/loop-studio/showcase-light.gif">
    <img alt="Loop Studio showcase animation" src="./gallery/loop-studio/showcase-dark.gif" width="800">
  </picture>
</p>
```

## 3. Accessible Web Video with Reduced-Motion Fallback

For documentation sites and landing pages where `<video>` is supported, serve `loop.mp4` / `loop.webm` (typically `5x–10x` smaller than GIF) with `poster.png`:

```html
<figure class="loop-stage">
  <video autoplay loop muted playsinline poster="./poster.png" width="800" height="320">
    <source src="./loop.webm" type="video/webm">
    <source src="./loop.mp4" type="video/mp4">
    <img src="./loop.gif" alt="Seamless animation loop" width="800" height="320">
  </video>
</figure>
```

## 4. Reproducible Gallery Table Entry

When adding a loop to a repository's gallery table, always link the rendered GIF alongside its `brief.json` / `showcase.json`, `sketch.js`, and measured `seamScore` so any reader can tweak one number and re-render:

```markdown
| Preview | Mode & Style/Scene | Specs | Seam Score | Source Files |
| :--- | :--- | :--- | :--- | :--- |
| <img src="./gallery/deep-sea-orbits/loop.gif" width="220" alt="Deep sea orbits"> | **Ambient** · `particle-orbit` (`abyss`) | `4s · 30fps · 400×400` | `1.04` (Pass) | [brief.json](./gallery/deep-sea-orbits/brief.json) · [sketch.js](./gallery/deep-sea-orbits/sketch.js) |
```
