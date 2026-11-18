---
name: loop-brief
description: Translates a loose user request into a structured brief.json specification for Loop Studio. Fills smart defaults for duration, frame rate, dimensions, aspect ratio, BPM tempo sync, palette, and style pack while asking at most one clarifying question if the destination format is ambiguous.
---

# Loop Brief — Specification Generator

Turn a short mood or use-case prompt (e.g., *"deep sea, slow, square"* or *"cyberpunk terminal banner for my GitHub profile"*) into a complete, deterministic `brief.json`.

## Default Destination Presets

When the user does not specify dimensions or duration, match their stated destination:

| Destination | Width × Height | Seconds | FPS | Total Frames | Max GIF Size Budget |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ambient Square** (`default`) | `640 × 640` (preview) / `1080 × 1080` (HD) | `4` | `30` | `120` | `4.0 MB` |
| **GitHub README Showcase / Banner** | `800 × 450` (16:9) or `800 × 320` (wide) | `10` (showcase) / `4` (banner) | `24` or `30` | `240` / `120` | `5.0 MB` (GitHub limit 10 MB) |
| **Social Vertical (Reels / Shorts)** | `1080 × 1920` | `6` | `30` | `180` | Prefer `MP4` (`< 8 MB`) |
| **Stream / Presentation Background** | `1280 × 720` or `1920 × 1080` | `6` | `30` | `180` | Prefer `MP4` / `WebM` |
| **Retro Badge / Icon** | `320 × 320` | `3` | `20` | `60` | `500 KB` |

## Tempo & BPM Locking (Music Visuals)

When a prompt specifies a tempo (e.g., `120 BPM`), lock duration to an integer number of bars (`4` or `8` beats) so the visual phase hits downbeats on exact integer cycles:

$$\text{seconds} = \frac{60}{\text{BPM}} \times \text{beats}$$

- Example: `120 BPM`, `8 beats` (2 bars of 4/4) -> `seconds = (60 / 120) * 8 = 4.0s`.

## `brief.json` Schema

Write `brief.json` in the target project directory:

```json
{
  "title": "Abyssal Bioluminescence",
  "prompt": "Deep sea, slow, square, bioluminescent orbits",
  "mode": "ambient",
  "style": "particle-orbit",
  "palette": "abyss",
  "seconds": 4,
  "fps": 30,
  "width": 640,
  "height": 640,
  "seed": 42,
  "bpm": null,
  "destination": "square",
  "formats": ["gif", "png", "mp4"],
  "budgetKB": 4096,
  "layers": {
    "background": "slow radial abyssal gradient with subtle 1-cycle caustic wave",
    "midground": "3 nested elliptical particle rings orbiting at 1x and 2x phase speed",
    "foreground": "8 bright bioluminescent sparks pulsing with phase offsets"
  }
}
```

## Mood-to-Style & Palette Mapping

| Mood / Keywords | Recommended Style Pack | Recommended Palette |
| :--- | :--- | :--- |
| Deep sea, cosmos, constellation, fireflies, data points | `particle-orbit` | `abyss` or `nebula` |
| Wind, currents, silk, smoke, calm, organic drift | `flow-field` | `aurora`, `tide`, or `ember` |
| 3D sculpture, chrome, liquid morph, monolithic | `sdf-raymarch` | `obsidian` or `solar` |
| Poster, manifesto, kinetic headline, lyrics | `kinetic-type` | `editorial` or `acid` |
| Retro OS, GameBoy, 1-bit, terminal matrix, low-fi | `dither-mono` | `phosphor` or `amber-crt` |
| Architecture, city blocks, hardware, modular waves | `isometric-grid` | `bauhaus` or `nordic` |
| Engineering schematic, radar, CAD, telemetry | `blueprint-cad` | `blueprint` |
| Terrain, elevation map, weather isobars, sonar | `topographic-contour` | `terra` or `abyss` |
