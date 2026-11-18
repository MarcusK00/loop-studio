# Loop Studio — Agent Instructions

@[rules/AGENTS.md](rules/AGENTS.md)

## Quick Command Reference

| Command | Purpose |
| :--- | :--- |
| `loop new <dir> [--template html\|code-diff\|shader]` | Scaffold a clean `scene.html` / `shader.frag` starter with `showcase.json` / `brief.json` |
| `loop diff <dir> [--range <a..b> \| --staged \| --file <patch>]` | Generate a dual-theme PR code-diff animation directly from real `git diff` output |
| `loop term <dir> --cmd "<command>" [--label "<text>"]` | Record real CLI command output into a dual-theme animated terminal showcase |
| `loop sheet <dir>` | Render a numbered contact sheet (`sheet.png`) |
| `loop story <dir>` | Render Frame `0` + step midpoints into `storyboard.png` for cold reading |
| `loop seam <dir\|video>` | Measure wrap-seam RMS delta, duplicate frames, and flicker (works on projects or external videos via `ffmpeg`) |
| `loop legible <dir> [--themes dark,light]` | Verify stage labels, reading time, DOM overflow, `400px` width, and WCAG `4.5:1` contrast |
| `loop source-check <dir\|showcase.json> [--repo .]` | Verify repo-relative `file:line` citations and `"match"` doc-drift tokens |
| `loop audit <dir\|video> [--repo .] [--themes dark,light]` | Unified verification gate (`0` pass, `1` fail, `2` missing runtime / invalid input) |
| `loop render <dir> [--themes dark,light] [--formats webp,gif,mp4]` | Export verified WebP, GIF, MP4, PNG, and GitHub `<picture>` embeds |
| `loop serve <dir>` | Launch interactive phase scrubber, dark/light switcher, and `400px` preview |
| `loop doctor` | Inspect available browser engines and encoders/decoders |

## Skills & Agent

- [`skills/loop-studio/SKILL.md`](skills/loop-studio/SKILL.md) — Author dual-theme README demos, PR code-diffs, UI walkthroughs, and WebGL2 loops.
- [`skills/loop-audit/SKILL.md`](skills/loop-audit/SKILL.md) — Audit Loop projects or external `.mp4`/`.gif`/`.webp` outputs from any tool.
- [`agents/loop-cold-reader.md`](agents/loop-cold-reader.md) — Zero-context comprehension check on `storyboard.png`.
