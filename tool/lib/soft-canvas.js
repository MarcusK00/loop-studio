// Loop Studio — Pure-JS Deterministic 2D Software Canvas Engine (v2)
// Features:
// - Sub-pixel anti-aliased Vector SDF Font Engine (smooth curves & diagonals, cached glyph atlas)
// - Linear & Radial Gradient support (createLinearGradient, createRadialGradient)
// - Anti-aliased discs, rings, thick capsule strokes, and scanline polygon fills
// - Pre-blend background contrast & bounding-box telemetry for `loop legible`

import { color as colorUtil } from "./loop-kit.js";

// Vector stroke definitions on a [0..8, 0..12] grid (baseline at y=10, cap-height y=1, x-height y=4, descender y=12)
// Commands: ["L", x0, y0, x1, y1] or ["A", cx, cy, rx, ry, startDeg, endDeg] or ["P", x0, y0, x1, y1, ...]
const VECTOR_GLYPHS = {
  " ": [],
  "!": [["L", 4, 1, 4, 7.5], ["A", 4, 10, 0.4, 0.4, 0, 360]],
  "\"": [["L", 2.8, 1, 2.8, 3.8], ["L", 5.2, 1, 5.2, 3.8]],
  "#": [["L", 2.8, 1.5, 2.2, 10], ["L", 5.8, 1.5, 5.2, 10], ["L", 1.2, 4.2, 6.8, 4.2], ["L", 1.0, 7.2, 6.6, 7.2]],
  "$": [["A", 4, 3.8, 2.3, 1.8, 110, 350], ["L", 2.2, 4.5, 5.8, 6.8], ["A", 4, 8.0, 2.3, 1.8, -70, 170], ["L", 4, 0.6, 4, 11]],
  "%": [["A", 2.3, 2.8, 1.3, 1.3, 0, 360], ["L", 6.4, 1.2, 1.6, 10], ["A", 5.7, 8.5, 1.3, 1.3, 0, 360]],
  "&": [["A", 3.8, 3.0, 1.7, 1.6, 0, 360], ["A", 3.6, 7.6, 2.3, 2.2, 40, 320], ["L", 2.2, 4.2, 6.8, 10]],
  "'": [["L", 4, 1, 3.6, 3.8]],
  "(": [["A", 5.5, 5.6, 2.8, 5.2, 115, 245]],
  ")": [["A", 2.5, 5.6, 2.8, 5.2, -65, 65]],
  "*": [["L", 4, 2.2, 4, 7.8], ["L", 1.5, 3.6, 6.5, 6.4], ["L", 6.5, 3.6, 1.5, 6.4]],
  "+": [["L", 4, 2.8, 4, 8.8], ["L", 1.2, 5.8, 6.8, 5.8]],
  ",": [["L", 4.2, 9.2, 3.2, 11.6]],
  "-": [["L", 1.5, 5.8, 6.5, 5.8]],
  ".": [["A", 4, 9.6, 0.5, 0.5, 0, 360]],
  "/": [["L", 6.2, 1, 1.8, 10.4]],
  "0": [["A", 4, 5.5, 2.6, 4.4, 0, 360], ["L", 2.2, 8.4, 5.8, 2.6]],
  "1": [["L", 2.2, 2.8, 4.2, 1.1], ["L", 4.2, 1.1, 4.2, 10], ["L", 2.0, 10, 6.4, 10]],
  "2": [["A", 4, 3.3, 2.3, 2.1, 195, 405], ["L", 6.0, 4.7, 1.5, 10], ["L", 1.5, 10, 6.6, 10]],
  "3": [["A", 3.9, 3.2, 2.2, 2.0, 200, 450], ["A", 4.0, 7.6, 2.4, 2.3, -90, 160]],
  "4": [["L", 5.2, 1.1, 1.3, 7.2], ["L", 1.3, 7.2, 6.8, 7.2], ["L", 5.2, 1.1, 5.2, 10]],
  "5": [["L", 6.2, 1.2, 2.0, 1.2], ["L", 2.0, 1.2, 1.8, 5.2], ["A", 4.0, 7.3, 2.5, 2.6, -135, 155]],
  "6": [["A", 4.2, 5.5, 2.6, 4.3, 140, 260], ["A", 4.0, 7.4, 2.4, 2.5, 0, 360]],
  "7": [["L", 1.4, 1.2, 6.6, 1.2], ["L", 6.6, 1.2, 2.8, 10]],
  "8": [["A", 4, 3.2, 2.1, 2.0, 0, 360], ["A", 4, 7.6, 2.4, 2.3, 0, 360]],
  "9": [["A", 4.0, 3.6, 2.4, 2.4, 0, 360], ["A", 3.8, 5.5, 2.6, 4.3, -40, 80]],
  ":": [["A", 4, 4.4, 0.5, 0.5, 0, 360], ["A", 4, 9.4, 0.5, 0.5, 0, 360]],
  ";": [["A", 4, 4.4, 0.5, 0.5, 0, 360], ["L", 4.2, 9.0, 3.2, 11.4]],
  "<": [["L", 6.2, 2.4, 1.8, 5.8], ["L", 1.8, 5.8, 6.2, 9.2]],
  "=": [["L", 1.4, 4.3, 6.6, 4.3], ["L", 1.4, 7.3, 6.6, 7.3]],
  ">": [["L", 1.8, 2.4, 6.2, 5.8], ["L", 6.2, 5.8, 1.8, 9.2]],
  "?": [["A", 4, 3.3, 2.3, 2.1, 195, 425], ["L", 4, 5.3, 4, 7.4], ["A", 4, 9.8, 0.45, 0.45, 0, 360]],
  "@": [["A", 4, 5.6, 3.1, 3.8, 35, 330], ["A", 4, 5.8, 1.4, 1.6, 0, 360], ["L", 5.4, 4.2, 5.4, 7.3]],
  "A": [["L", 1.2, 10, 4.0, 1.1], ["L", 4.0, 1.1, 6.8, 10], ["L", 2.1, 7.0, 5.9, 7.0]],
  "B": [["L", 1.6, 1.2, 1.6, 10], ["L", 1.6, 1.2, 4.4, 1.2], ["L", 1.6, 5.4, 4.5, 5.4], ["L", 1.6, 10, 4.5, 10], ["A", 4.4, 3.3, 1.9, 2.1, -90, 90], ["A", 4.5, 7.7, 2.1, 2.3, -90, 90]],
  "C": [["A", 4.2, 5.6, 2.7, 4.4, 42, 318]],
  "D": [["L", 1.6, 1.2, 1.6, 10], ["L", 1.6, 1.2, 3.8, 1.2], ["L", 1.6, 10, 3.8, 10], ["A", 3.8, 5.6, 2.8, 4.4, -90, 90]],
  "E": [["L", 1.6, 1.2, 1.6, 10], ["L", 1.6, 1.2, 6.4, 1.2], ["L", 1.6, 5.5, 5.6, 5.5], ["L", 1.6, 10, 6.4, 10]],
  "F": [["L", 1.6, 1.2, 1.6, 10], ["L", 1.6, 1.2, 6.4, 1.2], ["L", 1.6, 5.5, 5.6, 5.5]],
  "G": [["A", 4.2, 5.6, 2.7, 4.4, 35, 330], ["L", 4.2, 6.0, 6.8, 6.0], ["L", 6.8, 6.0, 6.8, 9.6]],
  "H": [["L", 1.6, 1.2, 1.6, 10], ["L", 6.4, 1.2, 6.4, 10], ["L", 1.6, 5.5, 6.4, 5.5]],
  "I": [["L", 2.2, 1.2, 5.8, 1.2], ["L", 4.0, 1.2, 4.0, 10], ["L", 2.2, 10, 5.8, 10]],
  "J": [["L", 2.4, 1.2, 6.2, 1.2], ["L", 5.2, 1.2, 5.2, 7.6], ["A", 3.4, 7.6, 1.8, 2.3, 0, 170]],
  "K": [["L", 1.6, 1.2, 1.6, 10], ["L", 6.4, 1.2, 1.6, 6.0], ["L", 3.2, 4.5, 6.5, 10]],
  "L": [["L", 1.8, 1.2, 1.8, 10], ["L", 1.8, 10, 6.4, 10]],
  "M": [["L", 1.3, 10, 1.3, 1.2], ["L", 1.3, 1.2, 4.0, 6.4], ["L", 4.0, 6.4, 6.7, 1.2], ["L", 6.7, 1.2, 6.7, 10]],
  "N": [["L", 1.5, 10, 1.5, 1.2], ["L", 1.5, 1.2, 6.5, 10], ["L", 6.5, 10, 6.5, 1.2]],
  "O": [["A", 4, 5.6, 2.7, 4.4, 0, 360]],
  "P": [["L", 1.6, 1.2, 1.6, 10], ["L", 1.6, 1.2, 4.4, 1.2], ["L", 1.6, 5.8, 4.4, 5.8], ["A", 4.4, 3.5, 2.1, 2.3, -90, 90]],
  "Q": [["A", 4, 5.4, 2.7, 4.2, 0, 360], ["L", 4.4, 7.2, 6.8, 10.4]],
  "R": [["L", 1.6, 1.2, 1.6, 10], ["L", 1.6, 1.2, 4.4, 1.2], ["L", 1.6, 5.6, 4.4, 5.6], ["A", 4.4, 3.4, 2.1, 2.2, -90, 90], ["L", 4.2, 5.6, 6.5, 10]],
  "S": [["A", 4.1, 3.3, 2.3, 2.0, 145, 350], ["L", 2.1, 4.2, 5.9, 6.8], ["A", 3.9, 7.8, 2.4, 2.1, -35, 165]],
  "T": [["L", 1.2, 1.2, 6.8, 1.2], ["L", 4.0, 1.2, 4.0, 10]],
  "U": [["L", 1.6, 1.2, 1.6, 7.2], ["L", 6.4, 1.2, 6.4, 7.2], ["A", 4.0, 7.2, 2.4, 2.8, 0, 180]],
  "V": [["L", 1.3, 1.2, 4.0, 10], ["L", 4.0, 10, 6.7, 1.2]],
  "W": [["L", 1.0, 1.2, 2.4, 10], ["L", 2.4, 10, 4.0, 4.8], ["L", 4.0, 4.8, 5.6, 10], ["L", 5.6, 10, 7.0, 1.2]],
  "X": [["L", 1.4, 1.2, 6.6, 10], ["L", 6.6, 1.2, 1.4, 10]],
  "Y": [["L", 1.4, 1.2, 4.0, 5.6], ["L", 6.6, 1.2, 4.0, 5.6], ["L", 4.0, 5.6, 4.0, 10]],
  "Z": [["L", 1.4, 1.2, 6.6, 1.2], ["L", 6.6, 1.2, 1.4, 10], ["L", 1.4, 10, 6.6, 10]],
  "[": [["L", 5.2, 1, 2.6, 1], ["L", 2.6, 1, 2.6, 10.6], ["L", 2.6, 10.6, 5.2, 10.6]],
  "\\": [["L", 1.8, 1, 6.2, 10.4]],
  "]": [["L", 2.8, 1, 5.4, 1], ["L", 5.4, 1, 5.4, 10.6], ["L", 5.4, 10.6, 2.8, 10.6]],
  "^": [["L", 1.8, 4.2, 4.0, 1.2], ["L", 4.0, 1.2, 6.2, 4.2]],
  "_": [["L", 1.0, 10.8, 7.0, 10.8]],
  "`": [["L", 3.2, 1.0, 4.6, 3.2]],
  "a": [["A", 3.8, 7.2, 2.2, 2.7, 50, 310], ["L", 6.0, 4.2, 6.0, 10], ["A", 3.9, 5.2, 2.0, 1.4, 200, 350]],
  "b": [["L", 1.7, 1.0, 1.7, 10], ["A", 4.0, 7.0, 2.3, 2.9, -115, 115]],
  "c": [["A", 4.3, 7.0, 2.4, 2.9, 45, 315]],
  "d": [["L", 6.3, 1.0, 6.3, 10], ["A", 4.0, 7.0, 2.3, 2.9, 65, 295]],
  "e": [["L", 1.6, 6.8, 6.4, 6.8], ["A", 4.0, 7.0, 2.4, 2.9, 35, 360]],
  "f": [["A", 4.8, 2.6, 1.5, 1.5, 180, 330], ["L", 3.3, 2.6, 3.3, 10], ["L", 1.8, 4.6, 5.4, 4.6]],
  "g": [["A", 4.0, 6.8, 2.2, 2.6, 0, 360], ["L", 6.2, 4.2, 6.2, 10.2], ["A", 3.9, 10.2, 2.3, 1.8, 0, 165]],
  "h": [["L", 1.7, 1.0, 1.7, 10], ["A", 4.0, 6.0, 2.2, 2.0, 180, 360], ["L", 6.2, 6.0, 6.2, 10]],
  "i": [["A", 4.0, 1.8, 0.5, 0.5, 0, 360], ["L", 2.6, 4.2, 4.2, 4.2], ["L", 4.2, 4.2, 4.2, 10], ["L", 2.4, 10, 5.8, 10]],
  "j": [["A", 4.8, 1.8, 0.5, 0.5, 0, 360], ["L", 4.8, 4.2, 4.8, 10.2], ["A", 3.2, 10.2, 1.6, 1.6, 0, 165]],
  "k": [["L", 1.8, 1.0, 1.8, 10], ["L", 6.0, 4.2, 1.8, 7.2], ["L", 3.4, 6.0, 6.2, 10]],
  "l": [["L", 2.6, 1.0, 4.2, 1.0], ["L", 4.2, 1.0, 4.2, 10], ["L", 2.4, 10, 5.8, 10]],
  "m": [["L", 1.2, 4.2, 1.2, 10], ["A", 2.6, 5.6, 1.4, 1.5, 180, 360], ["L", 4.0, 5.6, 4.0, 10], ["A", 5.4, 5.6, 1.4, 1.5, 180, 360], ["L", 6.8, 5.6, 6.8, 10]],
  "n": [["L", 1.7, 4.2, 1.7, 10], ["A", 4.0, 6.0, 2.2, 1.9, 180, 360], ["L", 6.2, 6.0, 6.2, 10]],
  "o": [["A", 4.0, 7.0, 2.4, 2.9, 0, 360]],
  "p": [["L", 1.7, 4.2, 1.7, 11.8], ["A", 4.0, 7.0, 2.3, 2.9, -115, 115]],
  "q": [["L", 6.3, 4.2, 6.3, 11.8], ["A", 4.0, 7.0, 2.3, 2.9, 65, 295]],
  "r": [["L", 2.2, 4.2, 2.2, 10], ["A", 4.4, 5.8, 2.1, 1.7, 180, 330]],
  "s": [["A", 4.0, 5.5, 2.0, 1.4, 140, 345], ["L", 2.2, 6.2, 5.8, 7.6], ["A", 4.0, 8.5, 2.1, 1.4, -35, 165]],
  "t": [["L", 3.6, 1.8, 3.6, 8.6], ["L", 1.8, 4.2, 5.8, 4.2], ["A", 4.8, 8.6, 1.2, 1.3, 90, 180]],
  "u": [["L", 1.7, 4.2, 1.7, 8.0], ["A", 4.0, 8.0, 2.2, 1.9, 0, 180], ["L", 6.2, 4.2, 6.2, 10]],
  "v": [["L", 1.5, 4.2, 4.0, 10], ["L", 4.0, 10, 6.5, 4.2]],
  "w": [["L", 1.0, 4.2, 2.4, 10], ["L", 2.4, 10, 4.0, 6.0], ["L", 4.0, 6.0, 5.6, 10], ["L", 5.6, 10, 7.0, 4.2]],
  "x": [["L", 1.6, 4.2, 6.4, 10], ["L", 6.4, 4.2, 1.6, 10]],
  "y": [["L", 1.6, 4.2, 4.0, 9.6], ["L", 6.4, 4.2, 2.4, 11.8]],
  "z": [["L", 1.6, 4.2, 6.4, 4.2], ["L", 6.4, 4.2, 1.6, 10], ["L", 1.6, 10, 6.4, 10]],
  "{": [["L", 5.0, 1, 3.6, 1.6], ["L", 3.6, 1.6, 3.6, 4.8], ["L", 3.6, 4.8, 2.2, 5.8], ["L", 2.2, 5.8, 3.6, 6.8], ["L", 3.6, 6.8, 3.6, 10], ["L", 3.6, 10, 5.0, 10.6]],
  "|": [["L", 4.0, 0.8, 4.0, 10.8]],
  "}": [["L", 3.0, 1, 4.4, 1.6], ["L", 4.4, 1.6, 4.4, 4.8], ["L", 4.4, 4.8, 5.8, 5.8], ["L", 5.8, 5.8, 4.4, 6.8], ["L", 4.4, 6.8, 4.4, 10], ["L", 4.4, 10, 3.0, 10.6]],
  "~": [["A", 2.6, 5.8, 1.4, 1.2, 180, 360], ["A", 5.4, 5.8, 1.4, 1.2, 0, 180]],
  "→": [["L", 1.0, 5.8, 6.6, 5.8], ["L", 4.4, 3.4, 6.8, 5.8], ["L", 4.4, 8.2, 6.8, 5.8]],
  "·": [["A", 4.0, 5.8, 0.7, 0.7, 0, 360]],
  "—": [["L", 0.8, 5.8, 7.2, 5.8]],
  "×": [["L", 1.8, 3.6, 6.2, 8.0], ["L", 6.2, 3.6, 1.8, 8.0]],
  "✓": [["L", 1.4, 6.2, 3.3, 8.8], ["L", 3.3, 8.8, 6.8, 2.4]],
  "π": [["L", 1.4, 4.2, 6.6, 4.2], ["L", 2.8, 4.2, 2.4, 10], ["L", 5.2, 4.2, 5.4, 10]]
};

const GLYPH_ATLAS_CACHE = new Map();

function distToSegment(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-6) return Math.hypot(px - x0, py - y0);
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len2));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

function getGlyphBitmap(ch, pxSize, bold) {
  const key = `${ch}|${pxSize}|${bold ? 1 : 0}`;
  let cached = GLYPH_ATLAS_CACHE.get(key);
  if (cached) return cached;

  const ops = VECTOR_GLYPHS[ch] || VECTOR_GLYPHS[ch.toUpperCase()] || VECTOR_GLYPHS["?"];
  const scale = pxSize / 11.5;
  const w = Math.max(4, Math.ceil(8.0 * scale));
  const h = Math.max(6, Math.ceil(12.5 * scale));
  const alpha = new Uint8Array(w * h);

  if (ops.length === 0) {
    cached = { w, h, alpha };
    GLYPH_ATLAS_CACHE.set(key, cached);
    return cached;
  }

  // Convert arcs into fine polyline segments in pixel coordinates
  const segs = [];
  for (const op of ops) {
    if (op[0] === "L") {
      segs.push([op[1] * scale, op[2] * scale, op[3] * scale, op[4] * scale]);
    } else if (op[0] === "A") {
      const [, cx, cy, rx, ry, sDeg, eDeg] = op;
      const steps = 14;
      for (let i = 0; i < steps; i++) {
        const a0 = ((sDeg + ((eDeg - sDeg) * i) / steps) * Math.PI) / 180;
        const a1 = ((sDeg + ((eDeg - sDeg) * (i + 1)) / steps) * Math.PI) / 180;
        segs.push([
          (cx + Math.cos(a0) * rx) * scale,
          (cy + Math.sin(a0) * ry) * scale,
          (cx + Math.cos(a1) * rx) * scale,
          (cy + Math.sin(a1) * ry) * scale
        ]);
      }
    }
  }

  const strokeRadius = Math.max(0.58, (bold ? 0.88 : 0.70) * scale);
  const feather = 0.72;

  for (let py = 0; py < h; py++) {
    const cy = py + 0.5;
    for (let px = 0; px < w; px++) {
      const cx = px + 0.5;
      let minDist = Infinity;
      for (let s = 0; s < segs.length; s++) {
        const seg = segs[s];
        const d = distToSegment(cx, cy, seg[0], seg[1], seg[2], seg[3]);
        if (d < minDist) minDist = d;
      }
      const cov = Math.max(0, Math.min(1, (strokeRadius + feather * 0.5 - minDist) / feather));
      if (cov > 0) {
        alpha[py * w + px] = Math.round(cov * 255);
      }
    }
  }

  cached = { w, h, alpha };
  GLYPH_ATLAS_CACHE.set(key, cached);
  return cached;
}

class SoftGradient {
  constructor(type, coords) {
    this.type = type;
    this.coords = coords;
    this.stops = [];
  }
  addColorStop(offset, color) {
    this.stops.push({ offset: Math.max(0, Math.min(1, offset)), rgba: colorUtil.parseHex(color) });
    this.stops.sort((a, b) => a.offset - b.offset);
  }
  sample(px, py) {
    if (this.stops.length === 0) return [0, 0, 0, 255];
    if (this.stops.length === 1) return this.stops[0].rgba;
    let t = 0;
    if (this.type === "linear") {
      const [x0, y0, x1, y1] = this.coords;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len2 = dx * dx + dy * dy || 1;
      t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len2));
    } else {
      const [x0, y0, r0, x1, y1, r1] = this.coords;
      const d = Math.hypot(px - x1, py - y1);
      t = Math.max(0, Math.min(1, (d - r0) / Math.max(1, r1 - r0)));
    }
    for (let i = 0; i < this.stops.length - 1; i++) {
      const s0 = this.stops[i];
      const s1 = this.stops[i + 1];
      if (t >= s0.offset && t <= s1.offset) {
        const u = (t - s0.offset) / Math.max(1e-5, s1.offset - s0.offset);
        return [
          Math.round(s0.rgba[0] + (s1.rgba[0] - s0.rgba[0]) * u),
          Math.round(s0.rgba[1] + (s1.rgba[1] - s0.rgba[1]) * u),
          Math.round(s0.rgba[2] + (s1.rgba[2] - s0.rgba[2]) * u),
          255
        ];
      }
    }
    return this.stops[this.stops.length - 1].rgba;
  }
}

export class SoftCanvas2D {
  constructor(width, height) {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.data = new Uint8Array(this.width * this.height * 4);
    this.resetState();
    this.textLog = [];
  }

  resetState() {
    this.fillStyle = "#000000";
    this.strokeStyle = "#000000";
    this.globalAlpha = 1;
    this.lineWidth = 1;
    this.lineCap = "butt";
    this.lineJoin = "miter";
    this.font = "500 13px monospace";
    this.textAlign = "left";
    this.textBaseline = "alphabetic";
    this._stack = [];
    this._tx = 0;
    this._ty = 0;
    this._sx = 1;
    this._sy = 1;
    this._path = [];
    this._circleFastPath = null;
  }

  getContext() {
    return this;
  }

  createLinearGradient(x0, y0, x1, y1) {
    return new SoftGradient("linear", [this._mapX(x0), this._mapY(y0), this._mapX(x1), this._mapY(y1)]);
  }

  createRadialGradient(x0, y0, r0, x1, y1, r1) {
    return new SoftGradient("radial", [
      this._mapX(x0),
      this._mapY(y0),
      r0 * this._sx,
      this._mapX(x1),
      this._mapY(y1),
      r1 * this._sx
    ]);
  }

  save() {
    this._stack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      globalAlpha: this.globalAlpha,
      lineWidth: this.lineWidth,
      lineCap: this.lineCap,
      lineJoin: this.lineJoin,
      font: this.font,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      tx: this._tx,
      ty: this._ty,
      sx: this._sx,
      sy: this._sy
    });
  }

  restore() {
    const s = this._stack.pop();
    if (!s) return;
    this.fillStyle = s.fillStyle;
    this.strokeStyle = s.strokeStyle;
    this.globalAlpha = s.globalAlpha;
    this.lineWidth = s.lineWidth;
    this.lineCap = s.lineCap;
    this.lineJoin = s.lineJoin;
    this.font = s.font;
    this.textAlign = s.textAlign;
    this.textBaseline = s.textBaseline;
    this._tx = s.tx;
    this._ty = s.ty;
    this._sx = s.sx;
    this._sy = s.sy;
  }

  translate(dx, dy) {
    this._tx += dx * this._sx;
    this._ty += dy * this._sy;
  }

  scale(sx, sy) {
    this._sx *= sx;
    this._sy *= sy;
  }

  rotate() {}
  setLineDash() {}

  _mapX(x) {
    return x * this._sx + this._tx;
  }

  _mapY(y) {
    return y * this._sy + this._ty;
  }

  _parseColor(style, px = 0, py = 0) {
    if (style instanceof SoftGradient) {
      const rgba = style.sample(px, py);
      const a = Math.max(0, Math.min(1, this.globalAlpha));
      return [rgba[0], rgba[1], rgba[2], Math.round(rgba[3] * a)];
    }
    const rgba = colorUtil.parseHex(style);
    const a = Math.max(0, Math.min(1, this.globalAlpha));
    return [rgba[0], rgba[1], rgba[2], Math.round(rgba[3] * a)];
  }

  _blendPixel(ix, iy, r, g, b, a) {
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height || a <= 0) return;
    const idx = (iy * this.width + ix) * 4;
    if (a >= 254) {
      this.data[idx] = r;
      this.data[idx + 1] = g;
      this.data[idx + 2] = b;
      this.data[idx + 3] = 255;
    } else {
      const inv = 255 - a;
      this.data[idx] = (r * a + this.data[idx] * inv) >> 8;
      this.data[idx + 1] = (g * a + this.data[idx + 1] * inv) >> 8;
      this.data[idx + 2] = (b * a + this.data[idx + 2] * inv) >> 8;
      this.data[idx + 3] = 255;
    }
  }

  clearRect(x, y, w, h) {
    const x0 = Math.max(0, Math.floor(this._mapX(x)));
    const y0 = Math.max(0, Math.floor(this._mapY(y)));
    const x1 = Math.min(this.width, Math.ceil(this._mapX(x + w)));
    const y1 = Math.min(this.height, Math.ceil(this._mapY(y + h)));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const idx = (py * this.width + px) * 4;
        this.data[idx] = 0;
        this.data[idx + 1] = 0;
        this.data[idx + 2] = 0;
        this.data[idx + 3] = 0;
      }
    }
  }

  fillRect(x, y, w, h) {
    const isGrad = this.fillStyle instanceof SoftGradient;
    const base = isGrad ? null : this._parseColor(this.fillStyle);
    if (!isGrad && base[3] <= 0) return;
    const x0 = Math.max(0, Math.round(this._mapX(x)));
    const y0 = Math.max(0, Math.round(this._mapY(y)));
    const x1 = Math.min(this.width, Math.round(this._mapX(x + w)));
    const y1 = Math.min(this.height, Math.round(this._mapY(y + h)));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const [r, g, b, a] = isGrad ? this._parseColor(this.fillStyle, px, py) : base;
        this._blendPixel(px, py, r, g, b, a);
      }
    }
  }

  strokeRect(x, y, w, h) {
    this.beginPath();
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.closePath();
    this.stroke();
  }

  beginPath() {
    this._path = [];
    this._circleFastPath = null;
  }

  moveTo(x, y) {
    this._circleFastPath = null;
    this._path.push({ type: "M", x: this._mapX(x), y: this._mapY(y) });
  }

  lineTo(x, y) {
    this._circleFastPath = null;
    this._path.push({ type: "L", x: this._mapX(x), y: this._mapY(y) });
  }

  arc(cx, cy, radius, startAngle = 0, endAngle = Math.PI * 2, ccw = false) {
    const mcx = this._mapX(cx);
    const mcy = this._mapY(cy);
    const mr = Math.abs(radius * this._sx);
    if (this._path.length === 0 && Math.abs(endAngle - startAngle) >= Math.PI * 1.99) {
      this._circleFastPath = { cx: mcx, cy: mcy, r: mr };
    } else {
      this._circleFastPath = null;
    }

    let delta = endAngle - startAngle;
    if (!ccw && delta < 0) delta += Math.PI * 2;
    const steps = Math.max(16, Math.min(72, Math.ceil(Math.abs(delta) * mr * 0.55)));
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (delta * i) / steps;
      const px = mcx + Math.cos(a) * mr;
      const py = mcy + Math.sin(a) * mr;
      if (this._path.length === 0 && i === 0) {
        this._path.push({ type: "M", x: px, y: py });
      } else {
        this._path.push({ type: "L", x: px, y: py });
      }
    }
  }

  arcTo(x1, y1, x2, y2, radius) {
    this._circleFastPath = null;
    const last = this._path[this._path.length - 1];
    const mx1 = this._mapX(x1);
    const my1 = this._mapY(y1);
    const mx2 = this._mapX(x2);
    const my2 = this._mapY(y2);
    if (!last || radius <= 0) {
      this._path.push({ type: "L", x: mx1, y: my1 });
      return;
    }
    const x0 = last.x;
    const y0 = last.y;
    const dx0 = x0 - mx1;
    const dy0 = y0 - my1;
    const len0 = Math.sqrt(dx0 * dx0 + dy0 * dy0) || 1;
    const dx2 = mx2 - mx1;
    const dy2 = my2 - my1;
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
    const t = Math.min(radius, len0 * 0.5, len2 * 0.5);
    const sx = mx1 + (dx0 / len0) * t;
    const sy = my1 + (dy0 / len0) * t;
    const ex = mx1 + (dx2 / len2) * t;
    const ey = my1 + (dy2 / len2) * t;
    for (let i = 1; i <= 6; i++) {
      const u = i / 6;
      const iu = 1 - u;
      const qx = iu * iu * sx + 2 * iu * u * mx1 + u * u * ex;
      const qy = iu * iu * sy + 2 * iu * u * my1 + u * u * ey;
      this._path.push({ type: "L", x: qx, y: qy });
    }
  }

  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
    this._circleFastPath = null;
    const last = this._path[this._path.length - 1] || { x: 0, y: 0 };
    const x0 = last.x;
    const y0 = last.y;
    const x1 = this._mapX(cp1x);
    const y1 = this._mapY(cp1y);
    const x2 = this._mapX(cp2x);
    const y2 = this._mapY(cp2y);
    const x3 = this._mapX(x);
    const y3 = this._mapY(y);
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      const u = i / steps;
      const iu = 1 - u;
      const bx = iu * iu * iu * x0 + 3 * iu * iu * u * x1 + 3 * iu * u * u * x2 + u * u * u * x3;
      const by = iu * iu * iu * y0 + 3 * iu * iu * u * y1 + 3 * iu * u * u * y2 + u * u * u * y3;
      this._path.push({ type: "L", x: bx, y: by });
    }
  }

  quadraticCurveTo(cpx, cpy, x, y) {
    this._circleFastPath = null;
    const last = this._path[this._path.length - 1] || { x: 0, y: 0 };
    const x0 = last.x;
    const y0 = last.y;
    const x1 = this._mapX(cpx);
    const y1 = this._mapY(cpy);
    const x2 = this._mapX(x);
    const y2 = this._mapY(y);
    const steps = 14;
    for (let i = 1; i <= steps; i++) {
      const u = i / steps;
      const iu = 1 - u;
      const qx = iu * iu * x0 + 2 * iu * u * x1 + u * u * x2;
      const qy = iu * iu * y0 + 2 * iu * u * y1 + u * u * y2;
      this._path.push({ type: "L", x: qx, y: qy });
    }
  }

  closePath() {
    if (this._path.length > 1) {
      this._path.push({ type: "L", x: this._path[0].x, y: this._path[0].y });
    }
  }

  fill() {
    const isGrad = this.fillStyle instanceof SoftGradient;
    const base = isGrad ? null : this._parseColor(this.fillStyle);
    if (!isGrad && base[3] <= 0) return;

    if (this._circleFastPath) {
      const { cx, cy, r: rad } = this._circleFastPath;
      const x0 = Math.max(0, Math.floor(cx - rad - 1));
      const x1 = Math.min(this.width - 1, Math.ceil(cx + rad + 1));
      const y0 = Math.max(0, Math.floor(cy - rad - 1));
      const y1 = Math.min(this.height - 1, Math.ceil(cy + rad + 1));
      for (let py = y0; py <= y1; py++) {
        const dy = py - cy;
        for (let px = x0; px <= x1; px++) {
          const dx = px - cx;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= rad + 0.65) {
            const cov = Math.max(0, Math.min(1, rad + 0.65 - d));
            const [r, g, b, a] = isGrad ? this._parseColor(this.fillStyle, px, py) : base;
            this._blendPixel(px, py, r, g, b, Math.round(a * cov));
          }
        }
      }
      return;
    }

    if (this._path.length < 3) return;
    let minY = this.height;
    let maxY = 0;
    for (let i = 0; i < this._path.length; i++) {
      const py = this._path[i].y;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
    const yStart = Math.max(0, Math.floor(minY));
    const yEnd = Math.min(this.height - 1, Math.ceil(maxY));

    for (let y = yStart; y <= yEnd; y++) {
      const sy = y + 0.5;
      const nodes = [];
      let j = this._path.length - 1;
      for (let i = 0; i < this._path.length; i++) {
        const pi = this._path[i];
        const pj = this._path[j];
        if ((pi.y < sy && pj.y >= sy) || (pj.y < sy && pi.y >= sy)) {
          nodes.push(pi.x + ((sy - pi.y) / (pj.y - pi.y)) * (pj.x - pi.x));
        }
        j = i;
      }
      nodes.sort((u, v) => u - v);
      for (let k = 0; k < nodes.length - 1; k += 2) {
        const x0 = Math.max(0, Math.floor(nodes[k]));
        const x1 = Math.min(this.width - 1, Math.ceil(nodes[k + 1]));
        for (let x = x0; x <= x1; x++) {
          const [r, g, b, a] = isGrad ? this._parseColor(this.fillStyle, x, y) : base;
          this._blendPixel(x, y, r, g, b, a);
        }
      }
    }
  }

  stroke() {
    const [r, g, b, a] = this._parseColor(this.strokeStyle);
    if (a <= 0 || this._path.length < 2) return;
    const hw = Math.max(0.55, (this.lineWidth * this._sx) / 2);

    // Anti-aliased circle ring fast path
    if (this._circleFastPath) {
      const { cx, cy, r: rad } = this._circleFastPath;
      const pad = Math.ceil(hw + 1.5);
      const x0 = Math.max(0, Math.floor(cx - rad - pad));
      const x1 = Math.min(this.width - 1, Math.ceil(cx + rad + pad));
      const y0 = Math.max(0, Math.floor(cy - rad - pad));
      const y1 = Math.min(this.height - 1, Math.ceil(cy + rad + pad));
      for (let py = y0; py <= y1; py++) {
        const dy = py - cy;
        for (let px = x0; px <= x1; px++) {
          const dx = px - cx;
          const dist = Math.abs(Math.sqrt(dx * dx + dy * dy) - rad);
          if (dist <= hw + 0.7) {
            const cov = Math.max(0, Math.min(1, hw + 0.7 - dist));
            this._blendPixel(px, py, r, g, b, Math.round(a * cov));
          }
        }
      }
      return;
    }

    for (let i = 1; i < this._path.length; i++) {
      const p0 = this._path[i - 1];
      const p1 = this._path[i];
      if (p1.type === "M") continue;
      this._drawAntiAliasedSegment(p0.x, p0.y, p1.x, p1.y, hw, r, g, b, a);
    }
  }

  _drawAntiAliasedSegment(x0, y0, x1, y1, hw, r, g, b, a) {
    const pad = Math.ceil(hw + 1.2);
    const minX = Math.max(0, Math.floor(Math.min(x0, x1) - pad));
    const maxX = Math.min(this.width - 1, Math.ceil(Math.max(x0, x1) + pad));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1) - pad));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(y0, y1) + pad));

    for (let py = minY; py <= maxY; py++) {
      const cy = py + 0.5;
      for (let px = minX; px <= maxX; px++) {
        const cx = px + 0.5;
        const d = distToSegment(cx, cy, x0, y0, x1, y1);
        if (d <= hw + 0.65) {
          const cov = Math.max(0, Math.min(1, hw + 0.65 - d));
          this._blendPixel(px, py, r, g, b, Math.round(a * cov));
        }
      }
    }
  }

  _parseFont() {
    const m = String(this.font || "13px monospace").match(/(\d+(?:\.\d+)?)px/);
    const px = m ? parseFloat(m[1]) : 13;
    const bold = /bold|[6789]00/i.test(String(this.font));
    const effPx = Math.max(9, Math.round(px * this._sx));
    const sample = getGlyphBitmap("M", effPx, bold);
    return { px, effPx, bold, charW: sample.w, charH: sample.h };
  }

  measureText(text) {
    const str = String(text ?? "");
    const { charW } = this._parseFont();
    return { width: str.length * charW };
  }

  fillText(text, x, y) {
    const str = String(text ?? "");
    if (!str) return;
    const [r, g, b, a] = this._parseColor(this.fillStyle);
    if (a <= 0) return;

    const { px, effPx, bold, charW, charH } = this._parseFont();
    const totalW = str.length * charW;
    let startX = this._mapX(x);
    let startY = this._mapY(y);

    if (this.textAlign === "center") startX -= totalW / 2;
    else if (this.textAlign === "right" || this.textAlign === "end") startX -= totalW;

    if (this.textBaseline === "middle") startY -= charH * 0.46;
    else if (this.textBaseline === "bottom") startY -= charH * 0.9;
    else if (this.textBaseline === "alphabetic") startY -= charH * 0.78;

    startX = Math.round(startX);
    startY = Math.round(startY);

    // Sample background pixel directly behind the text box center before drawing glyphs
    const sampleX = Math.max(0, Math.min(this.width - 1, Math.round(startX + totalW / 2)));
    const sampleY = Math.max(0, Math.min(this.height - 1, Math.round(startY + charH / 2)));
    const sIdx = (sampleY * this.width + sampleX) * 4;
    const bgRgb = [this.data[sIdx], this.data[sIdx + 1], this.data[sIdx + 2]];

    this.textLog.push({
      text: str,
      x: startX,
      y: startY,
      width: totalW,
      height: charH,
      fontSize: px,
      fg: [r, g, b],
      bg: bgRgb,
      alpha: this.globalAlpha
    });

    for (let c = 0; c < str.length; c++) {
      const ch = str[c];
      const bmp = getGlyphBitmap(ch, effPx, bold);
      const cx0 = startX + c * charW;
      for (let gy = 0; gy < bmp.h; gy++) {
        for (let gx = 0; gx < bmp.w; gx++) {
          const ga = bmp.alpha[gy * bmp.w + gx];
          if (ga > 0) {
            this._blendPixel(cx0 + gx, startY + gy, r, g, b, (a * ga) >> 8);
          }
        }
      }
    }
  }
}
