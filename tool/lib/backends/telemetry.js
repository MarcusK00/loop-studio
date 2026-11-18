// Loop Studio — Shared DOM & Canvas Text Telemetry Normalizer for Browser Backends

import { color as colorUtil } from "../loop-kit.js";

function rgbDist2(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

export function sampleBackgroundBehindDomBox(rgba, width, height, box, fgRgb) {
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(box.x)));
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(box.y)));
  const x1 = Math.max(0, Math.min(width - 1, Math.ceil(box.x + box.width)));
  const y1 = Math.max(0, Math.min(height - 1, Math.ceil(box.y + box.height)));

  // Probe around box border + outer 2px halo so we hit the actual surface behind glyphs, not glyph strokes themselves
  const probes = [
    [x0, y0],
    [x1, y0],
    [x0, y1],
    [x1, y1],
    [Math.round((x0 + x1) / 2), Math.max(0, y0 - 2)],
    [Math.round((x0 + x1) / 2), Math.min(height - 1, y1 + 2)],
    [Math.max(0, x0 - 2), Math.round((y0 + y1) / 2)],
    [Math.min(width - 1, x1 + 2), Math.round((y0 + y1) / 2)]
  ];

  const bgCandidates = [];
  for (const [px, py] of probes) {
    const idx = (py * width + px) * 4;
    const rgb = [rgba[idx], rgba[idx + 1], rgba[idx + 2]];
    // Ignore pixels very close to the foreground glyph color itself
    if (rgbDist2(rgb, fgRgb) > 400) {
      bgCandidates.push(rgb);
    }
  }

  const list = bgCandidates.length > 0
    ? bgCandidates
    : probes.map(([px, py]) => {
        const idx = (py * width + px) * 4;
        return [rgba[idx], rgba[idx + 1], rgba[idx + 2]];
      });

  // Pick worst-case (lowest contrast) background among candidates
  let worstBg = list[0];
  let worstRatio = Infinity;
  for (const bg of list) {
    const cr = colorUtil.contrastRatio(fgRgb, bg);
    if (cr < worstRatio) {
      worstRatio = cr;
      worstBg = bg;
    }
  }
  return worstBg;
}

export function normalizeInspectionResult(rawInspect, rgba, width, height) {
  if (!rawInspect) return [];
  const canvasEntries = Array.isArray(rawInspect.canvasTextLog) ? rawInspect.canvasTextLog : [];
  const domEntries = Array.isArray(rawInspect.domTextLog)
    ? rawInspect.domTextLog.map((entry) => ({
        ...entry,
        bg: sampleBackgroundBehindDomBox(rgba, width, height, entry, entry.fg || [231, 233, 244])
      }))
    : [];
  // Prefer DOM entries when present (HTML/SVG scenes), otherwise Canvas2D entries
  return domEntries.length > 0 ? domEntries : canvasEntries;
}
