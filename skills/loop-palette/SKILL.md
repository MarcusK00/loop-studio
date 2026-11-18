---
name: loop-palette
description: Curated color systems with semantic roles (ground, surface, body, muted, accent, spark, line), GIF 256-color quantization strategies, ordered Bayer dithering, and procedural grain for Loop Studio.
---

# Loop Palette — Color Architecture & GIF Quantization Safety

Every Loop Studio palette assigns seven semantic roles so sketches and scene packs can switch themes without rewriting drawing logic.

## Semantic Color Roles

Access any palette via `kit.palettes[meta.palette || "abyss"]`:

| Role | Purpose | Recommended Pixel Share |
| :--- | :--- | :--- |
| `ground` | Primary canvas background fill | `60% – 75%` |
| `surface` | Stage cards, elevated panels, terminal background | `10% – 20%` |
| `line` | Borders, rails, grid lines, connectors | `3% – 8%` |
| `muted` | Secondary captions, inactive tracks, subtle grid ticks | `5% – 10%` |
| `body` | Primary text, foreground geometry, active outlines | `10% – 20%` |
| `accent` | Primary focal motion, active stage border, wave body | `8% – 15%` |
| `spark` | Secondary highlight, completion badge, bioluminescent core | `2% – 6%` |

## Built-In Named Palettes (`kit.palettes`)

1. **`abyss`** (Deep sea bioluminescence): Ground `#070B16`, Surface `#10172A`, Body `#E6EDF8`, Muted `#7C8BA6`, Accent `#00E5B0`, Spark `#38B6FF`, Line `#22304D`
2. **`studio-dark`** (Loop Studio signature dark): Ground `#0A0C18`, Surface `#171B2E`, Body `#E7E9F4`, Muted `#9BA1BC`, Accent `#FF6B9D`, Spark `#7FA2FF`, Line `#2A3050`
3. **`studio-light`** (Loop Studio signature light): Ground `#FBFBFE`, Surface `#FFFFFF`, Body `#141829`, Muted `#565C75`, Accent `#C8306A`, Spark `#2A5BD7`, Line `#D5D8E4`
4. **`aurora`** (Arctic nocturnal currents): Ground `#081018`, Surface `#11202E`, Body `#E4F5F2`, Muted `#789A9F`, Accent `#3EF0B5`, Spark `#A78BFA`, Line `#20384C`
5. **`ember`** (Volcanic forge & warm sparks): Ground `#120B0A`, Surface `#211513`, Body `#F7EAE4`, Muted `#A6877C`, Accent `#FF6B35`, Spark `#FFD166`, Line `#3B2420`
6. **`nebula`** (Deep space magenta/violet): Ground `#0B0714`, Surface `#181128`, Body `#F0E8FF`, Muted `#9888B5`, Accent `#E056FD`, Spark `#00D2D3`, Line `#2E2049`
7. **`phosphor`** (Classic green CRT terminal): Ground `#050D08`, Surface `#0B1B11`, Body `#D8FFE4`, Muted `#56996B`, Accent `#26F76D`, Spark `#A3FF00`, Line `#173823`
8. **`amber-crt`** (Vintage amber oscilloscope): Ground `#0E0904`, Surface `#1C1308`, Body `#FFF0D6`, Muted `#A67E46`, Accent `#FFB000`, Spark `#FFE169`, Line `#382610`
9. **`bauhaus`** (Architectural primary isometric): Ground `#F4F1EA`, Surface `#FFFFFF`, Body `#1A1A1A`, Muted `#636059`, Accent `#E63946`, Spark `#1D3557`, Line `#D4CFC4`
10. **`nordic`** (Clean slate & frost): Ground `#1E242B`, Surface `#28303A`, Body `#ECEFF4`, Muted `#909EAE`, Accent `#88C0D0`, Spark `#EBCB8B`, Line `#3B4654`
11. **`blueprint`** (Engineering schematic CAD): Ground `#0A2458`, Surface `#0F3175`, Body `#FFFFFF`, Muted `#8FB1E8`, Accent `#5CE1E6`, Spark `#FFD166`, Line `#244F9E`
12. **`editorial`** (High-contrast kinetic poster): Ground `#0D0D0D`, Surface `#1A1A1A`, Body `#FAFAFA`, Muted `#8E8E8E`, Accent `#FF3366`, Spark `#E2FF32`, Line `#2E2E2E`

## Staying Inside GIF's 256 Colors Without Banding

GIFs are limited to 256 colors per frame/palette. Wide, soft linear gradients across a dark background often produce visible concentric "staircase" rings (Mach banding) when quantized to 256 colors.

To eliminate GIF banding and keep file size compact:
1. **Prefer crisp stepped layers or geometric opacity bands** over ultra-wide radial blurs.
2. **Use Ordered Bayer Dithering** (`kit.dither.bayer4(x, y)`) at gradient thresholds so 2–4 colors blend optically with zero temporal shimmer (unlike random per-frame noise, which explodes GIF LZW file size!).
3. **Static grain only**: If you add texture, anchor its coordinates or cycle it cleanly rather than rolling white noise every frame (rolling per-pixel white noise defeats LZW compression and triples GIF file size).
