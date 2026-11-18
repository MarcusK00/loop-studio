// Loop Studio — Deterministic Phase & Math Kit (loop-studio/kit)

export const TAU = Math.PI * 2;

export const palettes = {
  abyss: {
    ground: "#070B16",
    surface: "#10172A",
    body: "#E6EDF8",
    muted: "#7C8BA6",
    accent: "#00E5B0",
    spark: "#38B6FF",
    line: "#22304D"
  },
  "studio-dark": {
    ground: "#0A0C18",
    surface: "#171B2E",
    body: "#E7E9F4",
    muted: "#9BA1BC",
    accent: "#FF6B9D",
    spark: "#7FA2FF",
    line: "#2A3050"
  },
  "studio-light": {
    ground: "#FBFBFE",
    surface: "#FFFFFF",
    body: "#141829",
    muted: "#565C75",
    accent: "#C8306A",
    spark: "#2A5BD7",
    line: "#D5D8E4"
  },
  aurora: {
    ground: "#081018",
    surface: "#11202E",
    body: "#E4F5F2",
    muted: "#789A9F",
    accent: "#3EF0B5",
    spark: "#A78BFA",
    line: "#20384C"
  },
  ember: {
    ground: "#120B0A",
    surface: "#211513",
    body: "#F7EAE4",
    muted: "#A6877C",
    accent: "#FF6B35",
    spark: "#FFD166",
    line: "#3B2420"
  },
  nebula: {
    ground: "#0B0714",
    surface: "#181128",
    body: "#F0E8FF",
    muted: "#9888B5",
    accent: "#E056FD",
    spark: "#00D2D3",
    line: "#2E2049"
  },
  phosphor: {
    ground: "#050D08",
    surface: "#0B1B11",
    body: "#D8FFE4",
    muted: "#56996B",
    accent: "#26F76D",
    spark: "#A3FF00",
    line: "#173823"
  },
  "amber-crt": {
    ground: "#0E0904",
    surface: "#1C1308",
    body: "#FFF0D6",
    muted: "#A67E46",
    accent: "#FFB000",
    spark: "#FFE169",
    line: "#382610"
  },
  bauhaus: {
    ground: "#F4F1EA",
    surface: "#FFFFFF",
    body: "#1A1A1A",
    muted: "#636059",
    accent: "#E63946",
    spark: "#1D3557",
    line: "#D4CFC4"
  },
  nordic: {
    ground: "#1E242B",
    surface: "#28303A",
    body: "#ECEFF4",
    muted: "#909EAE",
    accent: "#88C0D0",
    spark: "#EBCB8B",
    line: "#3B4654"
  },
  blueprint: {
    ground: "#0A2458",
    surface: "#0F3175",
    body: "#FFFFFF",
    muted: "#8FB1E8",
    accent: "#5CE1E6",
    spark: "#FFD166",
    line: "#244F9E"
  },
  editorial: {
    ground: "#0D0D0D",
    surface: "#1A1A1A",
    body: "#FAFAFA",
    muted: "#8E8E8E",
    accent: "#FF3366",
    spark: "#E2FF32",
    line: "#2E2E2E"
  }
};

export function cycle(phase, cycles = 1, offset = 0) {
  const k = Math.round(cycles) || 1;
  return (((phase * k + offset) % 1) + 1) % 1;
}

export function sin(phase, cycles = 1, offset = 0) {
  return Math.sin(TAU * cycle(phase, cycles, offset));
}

export function cos(phase, cycles = 1, offset = 0) {
  return Math.cos(TAU * cycle(phase, cycles, offset));
}

export function pingPong(phase, cycles = 1) {
  const u = cycle(phase, cycles, 0);
  return u < 0.5 ? u * 2 : (1 - u) * 2;
}

export function window(phase, fromNorm, toNorm) {
  const span = (((toNorm - fromNorm) % 1) + 1) % 1 || 1;
  const elapsed = (((phase - fromNorm) % 1) + 1) % 1;
  if (elapsed > span) return null;
  return elapsed / span;
}

export const ease = {
  smoothstep(x) {
    const t = Math.max(0, Math.min(1, x));
    return t * t * (3 - 2 * t);
  },
  inOutCubic(x) {
    const t = Math.max(0, Math.min(1, x));
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },
  outCubic(x) {
    const t = Math.max(0, Math.min(1, x));
    return 1 - Math.pow(1 - t, 3);
  },
  inCubic(x) {
    const t = Math.max(0, Math.min(1, x));
    return t * t * t;
  },
  outExpo(x) {
    const t = Math.max(0, Math.min(1, x));
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }
};

// Mulberry32 deterministic PRNG
export function rng(seed = 1) {
  let a = (seed >>> 0) + 0x6d2b79f5;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed | 0, 1442695041);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 2147483648 - 1; // [-1, 1]
}

export function noise2D(x, y, seed = 1) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function loopNoise(phase, radius = 0.8, seedOffset = 0, cycles = 1) {
  const theta = TAU * cycle(phase, cycles, 0);
  const nx = Math.cos(theta) * radius + (seedOffset % 17) * 3.1;
  const ny = Math.sin(theta) * radius + ((seedOffset * 7) % 23) * 2.7;
  return noise2D(nx, ny, seedOffset);
}

export function generations(phase, count = 3, callback) {
  for (let g = 0; g < count; g++) {
    const age = (phase + g / count) % 1;
    const alpha = Math.sin(Math.PI * age);
    callback(age, alpha, g);
  }
}

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

export const dither = {
  bayer4(x, y) {
    return (BAYER4[(y & 3 + 4) & 3][(x & 3 + 4) & 3] + 0.5) / 16;
  },
  bayer8(x, y) {
    const b4 = dither.bayer4(x, y);
    const sub = ((x >> 2) & 1) ^ ((y >> 2) & 1);
    return b4 * 0.9 + sub * 0.05;
  }
};

export const color = {
  parseHex(hex) {
    if (!hex || typeof hex !== "string") return [0, 0, 0, 255];
    const clean = hex.trim().replace(/^#/, "");
    if (clean.length === 3) {
      return [
        parseInt(clean[0] + clean[0], 16),
        parseInt(clean[1] + clean[1], 16),
        parseInt(clean[2] + clean[2], 16),
        255
      ];
    }
    if (clean.length >= 6) {
      return [
        parseInt(clean.slice(0, 2), 16),
        parseInt(clean.slice(2, 4), 16),
        parseInt(clean.slice(4, 6), 16),
        255
      ];
    }
    return [0, 0, 0, 255];
  },
  luminance(hexOrRgb) {
    const rgb = Array.isArray(hexOrRgb) ? hexOrRgb : color.parseHex(hexOrRgb);
    const chan = rgb.slice(0, 3).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
  },
  contrastRatio(fg, bg) {
    const l1 = color.luminance(fg);
    const l2 = color.luminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }
};

export function roundRect(ctx, x, y, w, h, r = 6) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.arcTo(x + w, y, x + w, y + rad, rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
  ctx.lineTo(x + rad, y + h);
  ctx.arcTo(x, y + h, x, y + h - rad, rad);
  ctx.lineTo(x, y + rad);
  ctx.arcTo(x, y, x + rad, y, rad);
  ctx.closePath();
}

export function createKit(overrides = {}) {
  return {
    TAU,
    tau: TAU,
    palettes,
    cycle,
    sin,
    cos,
    pingPong,
    window,
    ease,
    rng,
    noise2D,
    loopNoise,
    generations,
    dither,
    color,
    roundRect,
    ...overrides
  };
}
