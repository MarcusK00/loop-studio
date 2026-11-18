// Loop Studio — Pure-JS Deterministic 2D Software Canvas Engine
// Provides zero-dependency 2D Canvas rendering for Node.js, CI, and sandboxed environments,
// plus telemetry hooks for `loop legible` contrast and bounding-box verification.

import { color as colorUtil } from "./loop-kit.js";

// Compact 5x7 bitmap font for printable ASCII (each char is 7 rows of 5-bit integers, MSB on left)
const GLYPHS = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  "!": [4, 4, 4, 4, 4, 0, 4],
  "\"": [10, 10, 4, 0, 0, 0, 0],
  "#": [10, 31, 10, 10, 31, 10, 0],
  "$": [4, 15, 20, 14, 5, 30, 4],
  "%": [25, 26, 4, 8, 19, 0, 0],
  "&": [12, 18, 20, 8, 21, 18, 13],
  "'": [4, 4, 0, 0, 0, 0, 0],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  "*": [0, 4, 21, 14, 21, 4, 0],
  "+": [0, 4, 4, 31, 4, 4, 0],
  ",": [0, 0, 0, 0, 4, 4, 8],
  "-": [0, 0, 0, 31, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 12, 12],
  "/": [1, 2, 4, 4, 8, 16, 0],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 6, 8, 16, 31],
  "3": [31, 2, 4, 6, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [6, 8, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 2, 12],
  ":": [0, 12, 12, 0, 12, 12, 0],
  ";": [0, 12, 12, 0, 12, 4, 8],
  "<": [2, 4, 8, 16, 8, 4, 2],
  "=": [0, 0, 31, 0, 31, 0, 0],
  ">": [8, 4, 2, 1, 2, 4, 8],
  "?": [14, 17, 1, 6, 4, 0, 4],
  "@": [14, 17, 23, 21, 23, 16, 14],
  "A": [14, 17, 17, 31, 17, 17, 17],
  "B": [30, 17, 17, 30, 17, 17, 30],
  "C": [14, 17, 16, 16, 16, 17, 14],
  "D": [28, 18, 17, 17, 17, 18, 28],
  "E": [31, 16, 16, 30, 16, 16, 31],
  "F": [31, 16, 16, 30, 16, 16, 16],
  "G": [14, 17, 16, 23, 17, 17, 15],
  "H": [17, 17, 17, 31, 17, 17, 17],
  "I": [14, 4, 4, 4, 4, 4, 14],
  "J": [7, 2, 2, 2, 2, 18, 12],
  "K": [17, 18, 20, 24, 20, 18, 17],
  "L": [16, 16, 16, 16, 16, 16, 31],
  "M": [17, 27, 21, 21, 17, 17, 17],
  "N": [17, 25, 21, 19, 17, 17, 17],
  "O": [14, 17, 17, 17, 17, 17, 14],
  "P": [30, 17, 17, 30, 16, 16, 16],
  "Q": [14, 17, 17, 17, 21, 18, 13],
  "R": [30, 17, 17, 30, 20, 18, 17],
  "S": [15, 16, 16, 14, 1, 1, 30],
  "T": [31, 4, 4, 4, 4, 4, 4],
  "U": [17, 17, 17, 17, 17, 17, 14],
  "V": [17, 17, 17, 17, 17, 10, 4],
  "W": [17, 17, 17, 21, 21, 27, 17],
  "X": [17, 17, 10, 4, 10, 17, 17],
  "Y": [17, 17, 10, 4, 4, 4, 4],
  "Z": [31, 1, 2, 4, 8, 16, 31],
  "[": [14, 8, 8, 8, 8, 8, 14],
  "\\": [16, 8, 4, 4, 2, 1, 0],
  "]": [14, 2, 2, 2, 2, 2, 14],
  "^": [4, 10, 17, 0, 0, 0, 0],
  "_": [0, 0, 0, 0, 0, 0, 31],
  "`": [8, 4, 0, 0, 0, 0, 0],
  "a": [0, 0, 14, 1, 15, 17, 15],
  "b": [16, 16, 22, 25, 17, 17, 30],
  "c": [0, 0, 14, 16, 16, 17, 14],
  "d": [1, 1, 13, 19, 17, 17, 15],
  "e": [0, 0, 14, 17, 31, 16, 14],
  "f": [6, 9, 8, 28, 8, 8, 8],
  "g": [0, 15, 17, 17, 15, 1, 14],
  "h": [16, 16, 22, 25, 17, 17, 17],
  "i": [4, 0, 12, 4, 4, 4, 14],
  "j": [2, 0, 6, 2, 2, 18, 12],
  "k": [16, 16, 18, 20, 24, 20, 18],
  "l": [12, 4, 4, 4, 4, 4, 14],
  "m": [0, 0, 26, 21, 21, 17, 17],
  "n": [0, 0, 22, 25, 17, 17, 17],
  "o": [0, 0, 14, 17, 17, 17, 14],
  "p": [0, 0, 30, 17, 30, 16, 16],
  "q": [0, 0, 15, 17, 15, 1, 1],
  "r": [0, 0, 22, 25, 16, 16, 16],
  "s": [0, 0, 15, 16, 14, 1, 30],
  "t": [8, 8, 28, 8, 8, 9, 6],
  "u": [0, 0, 17, 17, 17, 19, 13],
  "v": [0, 0, 17, 17, 17, 10, 4],
  "w": [0, 0, 17, 17, 21, 21, 10],
  "x": [0, 0, 17, 10, 4, 10, 17],
  "y": [0, 0, 17, 17, 15, 1, 14],
  "z": [0, 0, 31, 2, 4, 8, 31],
  "{": [2, 4, 4, 8, 4, 4, 2],
  "|": [4, 4, 4, 4, 4, 4, 4],
  "}": [8, 4, 4, 2, 4, 4, 8],
  "~": [0, 0, 8, 21, 2, 0, 0],
  "→": [0, 4, 2, 31, 2, 4, 0],
  "·": [0, 0, 0, 6, 6, 0, 0],
  "—": [0, 0, 0, 31, 0, 0, 0],
  "×": [0, 17, 10, 4, 10, 17, 0]
};

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

  _parseColor(style) {
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
    const [r, g, b, a] = this._parseColor(this.fillStyle);
    if (a <= 0) return;
    const x0 = Math.max(0, Math.round(this._mapX(x)));
    const y0 = Math.max(0, Math.round(this._mapY(y)));
    const x1 = Math.min(this.width, Math.round(this._mapX(x + w)));
    const y1 = Math.min(this.height, Math.round(this._mapY(y + h)));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
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
    const steps = Math.max(12, Math.min(64, Math.ceil(Math.abs(delta) * mr * 0.45)));
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
    // Smooth corner approximation with 4 segments
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
    for (let i = 1; i <= 4; i++) {
      const u = i / 4;
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
    const steps = 16;
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
    const steps = 12;
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
    const [r, g, b, a] = this._parseColor(this.fillStyle);
    if (a <= 0) return;

    // Fast anti-aliased disc rasterizer for full circles
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
          if (d <= rad + 0.5) {
            const cov = Math.max(0, Math.min(1, rad + 0.5 - d));
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
        const x0 = Math.max(0, Math.round(nodes[k]));
        const x1 = Math.min(this.width - 1, Math.round(nodes[k + 1]));
        for (let x = x0; x <= x1; x++) {
          this._blendPixel(x, y, r, g, b, a);
        }
      }
    }
  }

  stroke() {
    const [r, g, b, a] = this._parseColor(this.strokeStyle);
    if (a <= 0 || this._path.length < 2) return;
    const hw = Math.max(0.5, (this.lineWidth * this._sx) / 2);

    for (let i = 1; i < this._path.length; i++) {
      const p0 = this._path[i - 1];
      const p1 = this._path[i];
      if (p1.type === "M") continue;
      this._drawSegment(p0.x, p0.y, p1.x, p1.y, hw, r, g, b, a);
    }
  }

  _drawSegment(x0, y0, x1, y1, hw, r, g, b, a) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return;

    const steps = Math.ceil(len * 1.5);
    const rad = Math.max(0.5, hw);
    const ir = Math.ceil(rad);
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const cx = x0 + dx * u;
      const cy = y0 + dy * u;
      const ix0 = Math.round(cx);
      const iy0 = Math.round(cy);
      if (rad <= 0.85) {
        this._blendPixel(ix0, iy0, r, g, b, a);
      } else {
        for (let oy = -ir; oy <= ir; oy++) {
          for (let ox = -ir; ox <= ir; ox++) {
            if (ox * ox + oy * oy <= rad * rad + 0.35) {
              this._blendPixel(ix0 + ox, iy0 + oy, r, g, b, a);
            }
          }
        }
      }
    }
  }

  _parseFont() {
    const m = String(this.font || "13px monospace").match(/(\d+(?:\.\d+)?)px/);
    const px = m ? parseFloat(m[1]) : 13;
    const bold = /bold|[6789]00/i.test(String(this.font));
    const effPx = px * this._sx;
    const scale = effPx >= 12.5 ? Math.max(2, Math.round(effPx / 7.5)) : 1;
    const charW = 5 * scale + Math.max(1, scale - 1);
    const charH = 7 * scale;
    return { px, bold, scale, charW, charH };
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

    const { px, scale, charW, charH } = this._parseFont();
    const totalW = str.length * charW;
    let startX = this._mapX(x);
    let startY = this._mapY(y);

    if (this.textAlign === "center") startX -= totalW / 2;
    else if (this.textAlign === "right" || this.textAlign === "end") startX -= totalW;

    if (this.textBaseline === "middle") startY -= charH / 2;
    else if (this.textBaseline === "bottom") startY -= charH;
    else if (this.textBaseline === "alphabetic") startY -= charH * 0.8;

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
      const rows = GLYPHS[ch] || GLYPHS[ch.toUpperCase()] || GLYPHS["?"];
      const cx0 = startX + c * charW;
      for (let ry = 0; ry < 7; ry++) {
        const rowBits = rows[ry];
        if (!rowBits) continue;
        for (let rx = 0; rx < 5; rx++) {
          if ((rowBits >> (4 - rx)) & 1) {
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                this._blendPixel(cx0 + rx * scale + sx, startY + ry * scale + sy, r, g, b, a);
              }
            }
          }
        }
      }
    }
  }
}
