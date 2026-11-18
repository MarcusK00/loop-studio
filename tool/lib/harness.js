// Loop Studio — Universal Browser/Shader/Canvas2D Harness Builder
// Shared by WebKit (macOS), Chromium CDP (cross-platform), and `loop serve` workbench.

import fs from "node:fs";
import path from "node:path";
import { palettes, color as colorUtil } from "./loop-kit.js";

export function detectProjectKind(absDir, sketchModule = null) {
  const sceneHtmlPath = path.join(absDir, "scene.html");
  const shaderFragPath = path.join(absDir, "shader.frag");
  if (fs.existsSync(sceneHtmlPath)) return "html";
  if (fs.existsSync(shaderFragPath)) return "shader";
  if (sketchModule && typeof sketchModule.renderHTML === "function") return "html-module";
  if (sketchModule && typeof sketchModule.shader === "string") return "shader-module";
  return "canvas2d";
}

function rgbVec3Literal(hex) {
  const [r, g, b] = colorUtil.parseHex(hex);
  return [(r / 255).toFixed(4), (g / 255).toFixed(4), (b / 255).toFixed(4)];
}

export function resolveThemePalette(paletteName = "studio-dark", themeFlag = null) {
  let resolved = paletteName;
  if (themeFlag === "dark") {
    resolved = paletteName && paletteName.includes("light") ? paletteName.replace("light", "dark") : (palettes[paletteName] && colorUtil.luminance(palettes[paletteName].ground) > 0.4 ? "studio-dark" : paletteName || "studio-dark");
  } else if (themeFlag === "light") {
    resolved = paletteName && paletteName.includes("dark") ? paletteName.replace("dark", "light") : (palettes[paletteName] && colorUtil.luminance(palettes[paletteName].ground) < 0.4 ? "studio-light" : paletteName || "studio-light");
  } else if (themeFlag && palettes[themeFlag]) {
    resolved = themeFlag;
  }
  return {
    name: resolved,
    colors: palettes[resolved] || palettes["studio-dark"]
  };
}

function bestContrastInk(bgHex) {
  const darkInk = "#090C16";
  const lightInk = "#FFFFFF";
  return colorUtil.contrastRatio(darkInk, bgHex) >= colorUtil.contrastRatio(lightInk, bgHex) ? darkInk : lightInk;
}

function buildThemeStyleTag(paletteColors) {
  const onAccent = bestContrastInk(paletteColors.accent);
  const onSpark = bestContrastInk(paletteColors.spark);
  return `<style id="loop-studio-theme-vars">
:root {
  --loop-ground: ${paletteColors.ground};
  --loop-surface: ${paletteColors.surface};
  --loop-body: ${paletteColors.body};
  --loop-muted: ${paletteColors.muted};
  --loop-accent: ${paletteColors.accent};
  --loop-spark: ${paletteColors.spark};
  --loop-line: ${paletteColors.line};
  --loop-on-accent: ${onAccent};
  --loop-on-spark: ${onSpark};
}
* { transition: none !important; animation: none !important; }
html, body { margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%; }
</style>`;
}

function buildDeterminismAndInspectScript({ width, height, meta, showcase, paletteName, paletteColors }) {
  const payload = JSON.stringify({
    width,
    height,
    meta: { ...meta, palette: paletteName },
    showcase: showcase || null,
    paletteColors
  });

  return `<script>
(function() {
  const CFG = ${payload};
  window.__LOOP_META__ = CFG.meta;
  window.__LOOP_SHOWCASE__ = CFG.showcase;
  window.__LOOP_PALETTE__ = CFG.paletteColors;
  window.__LOOP_TEXT_LOG__ = [];

  // Strict determinism guards: freeze clocks, seed Math.random
  const FIXED_EPOCH = 1700000000000;
  Date.now = function() { return FIXED_EPOCH; };
  if (window.performance && typeof window.performance.now === "function") {
    window.performance.now = function() { return 0; };
  }
  let _seed = ((CFG.meta && CFG.meta.seed) || 7) >>> 0;
  Math.random = function() {
    _seed = (_seed + 0x6d2b79f5) >>> 0;
    let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  function parseCssRgb(str) {
    if (!str) return [0, 0, 0, 0];
    const m = String(str).match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/i);
    if (!m) return [0, 0, 0, 1];
    return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] !== undefined ? Number(m[4]) : 1];
  }

  window.__LOOP_INSPECT__ = function() {
    const domItems = [];
    const candidates = Array.from(document.querySelectorAll("[data-loop-stage], [data-loop-caption]"));
    const nodes = candidates.length > 0
      ? candidates
      : Array.from(document.querySelectorAll("h1,h2,h3,p,span,div,code")).filter((el) => {
          if (el.children.length > 0) return false;
          const txt = (el.textContent || "").trim();
          return txt.length > 0 && txt.length <= 120;
        });

    for (const el of nodes) {
      const text = (el.textContent || "").trim();
      if (!text) continue;
      const cs = getComputedStyle(el);
      const opacity = parseFloat(cs.opacity || "1");
      if (cs.display === "none" || cs.visibility === "hidden" || opacity <= 0.05) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const fg = parseCssRgb(cs.color);
      const fontSize = parseFloat(cs.fontSize || "13");
      const overflows = el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2;
      domItems.push({
        text,
        role: el.hasAttribute("data-loop-stage") ? "stage" : el.hasAttribute("data-loop-caption") ? "caption" : "text",
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        fontSize,
        fg: [fg[0], fg[1], fg[2]],
        alpha: opacity * fg[3],
        overflows
      });
    }

    return {
      canvasTextLog: window.__LOOP_TEXT_LOG__ || [],
      domTextLog: domItems
    };
  };
})();
</script>`;
}

function buildHtmlSceneDoc({ htmlSource, width, height, meta, showcase, paletteName, paletteColors }) {
  const themeTag = buildThemeStyleTag(paletteColors);
  const preScript = buildDeterminismAndInspectScript({ width, height, meta, showcase, paletteName, paletteColors });
  const bridge = `<script type="module">
import { createKit } from "/loop-kit.js";
const kit = createKit({
  showcase: window.__LOOP_SHOWCASE__,
  meta: window.__LOOP_META__,
  palette: window.__LOOP_PALETTE__
});
window.__LOOP_KIT__ = kit;
const prevStep = window.__LOOP_STEP__;
window.__LOOP_STEP__ = function(phase) {
  window.__LOOP_TEXT_LOG__ = [];
  if (typeof window.renderLoop === "function") {
    return window.renderLoop(phase, kit, window.__LOOP_META__);
  }
  if (typeof prevStep === "function") {
    return prevStep(phase, kit, window.__LOOP_META__);
  }
  window.dispatchEvent(new CustomEvent("loop:phase", { detail: { phase, kit, meta: window.__LOOP_META__ } }));
};
if (typeof window.__LOOP_INIT__ === "function") {
  window.__LOOP_INIT__(kit, window.__LOOP_META__);
}
window.__LOOP_STEP__(0);
</script>`;

  let doc = htmlSource;
  if (/<head[^>]*>/i.test(doc)) {
    doc = doc.replace(/<head([^>]*)>/i, `<head$1>\n${themeTag}\n${preScript}`);
  } else {
    doc = `<!doctype html><html><head>${themeTag}${preScript}</head><body>${doc}</body></html>`;
  }
  if (/<\/body>/i.test(doc)) {
    doc = doc.replace(/<\/body>/i, `${bridge}\n</body>`);
  } else {
    doc += `\n${bridge}`;
  }
  return doc;
}

function buildHtmlModuleDoc({ width, height, meta, showcase, paletteName, paletteColors }) {
  const themeTag = buildThemeStyleTag(paletteColors);
  const preScript = buildDeterminismAndInspectScript({ width, height, meta, showcase, paletteName, paletteColors });
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  ${themeTag}
  ${preScript}
</head>
<body>
  <div id="loop-root" style="width:${width}px;height:${height}px;position:relative;overflow:hidden;"></div>
  <script type="module">
    import * as sketch from "/sketch.js";
    import { createKit } from "/loop-kit.js";
    const root = document.getElementById("loop-root");
    const kit = createKit({
      showcase: window.__LOOP_SHOWCASE__ || sketch.showcase,
      meta: window.__LOOP_META__,
      palette: window.__LOOP_PALETTE__
    });
    window.__LOOP_STEP__ = function(phase) {
      window.__LOOP_TEXT_LOG__ = [];
      const out = sketch.renderHTML(phase, kit, window.__LOOP_META__, root);
      if (typeof out === "string") root.innerHTML = out;
    };
    window.__LOOP_STEP__(0);
  </script>
</body>
</html>`;
}

function buildCanvas2dDoc({ width, height, meta, showcase, paletteName, paletteColors }) {
  const themeTag = buildThemeStyleTag(paletteColors);
  const preScript = buildDeterminismAndInspectScript({ width, height, meta, showcase, paletteName, paletteColors });
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  ${themeTag}
  ${preScript}
</head>
<body style="background:${paletteColors.ground};">
  <canvas id="loop-canvas" width="${width}" height="${height}" style="display:block;width:${width}px;height:${height}px;"></canvas>
  <script type="module">
    import * as sketch from "/sketch.js";
    import { createKit } from "/loop-kit.js";

    const cv = document.getElementById("loop-canvas");
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    const kit = createKit({
      showcase: window.__LOOP_SHOWCASE__ || sketch.showcase,
      meta: window.__LOOP_META__,
      palette: window.__LOOP_PALETTE__
    });

    // Lightly instrument fillText so Browser Canvas2D reports exact pre-glyph contrast & box bounds
    const origFillText = ctx.fillText.bind(ctx);
    ctx.fillText = function(text, x, y, maxWidth) {
      const str = String(text ?? "");
      if (str) {
        const m = ctx.measureText(str);
        const fontMatch = String(ctx.font || "13px monospace").match(/(\\d+(?:\\.\\d+)?)px/);
        const px = fontMatch ? parseFloat(fontMatch[1]) : 13;
        const w = m.width;
        const h = px * 1.15;
        let sx = x;
        let sy = y;
        if (ctx.textAlign === "center") sx -= w / 2;
        else if (ctx.textAlign === "right" || ctx.textAlign === "end") sx -= w;
        if (ctx.textBaseline === "middle") sy -= h * 0.5;
        else if (ctx.textBaseline === "bottom") sy -= h;
        else if (ctx.textBaseline === "alphabetic") sy -= h * 0.8;

        const cx = Math.max(0, Math.min(${width} - 1, Math.round(sx + w / 2)));
        const cy = Math.max(0, Math.min(${height} - 1, Math.round(sy + h / 2)));
        let bg = [0, 0, 0];
        try {
          const pxData = ctx.getImageData(cx, cy, 1, 1).data;
          bg = [pxData[0], pxData[1], pxData[2]];
        } catch {}

        // Parse current fillStyle into RGB via helper probe
        let fg = [231, 233, 244];
        try {
          const parsed = kit.color.parseHex(String(ctx.fillStyle));
          if (String(ctx.fillStyle).startsWith("#")) fg = [parsed[0], parsed[1], parsed[2]];
        } catch {}

        window.__LOOP_TEXT_LOG__.push({
          text: str,
          x: Math.round(sx),
          y: Math.round(sy),
          width: Math.round(w),
          height: Math.round(h),
          fontSize: px,
          fg,
          bg,
          alpha: ctx.globalAlpha
        });
      }
      return maxWidth !== undefined ? origFillText(text, x, y, maxWidth) : origFillText(text, x, y);
    };

    // Temporarily override meta.palette in case --theme was passed
    if (sketch.meta && window.__LOOP_META__.palette) {
      try { sketch.meta.palette = window.__LOOP_META__.palette; } catch {}
    }

    window.__LOOP_STEP__ = function(phase) {
      window.__LOOP_TEXT_LOG__ = [];
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, ${width}, ${height});
      sketch.render(ctx, phase, kit);
    };

    window.__LOOP_STEP__(0);
  </script>
</body>
</html>`;
}

function buildShaderDoc({ fragSource, width, height, meta, showcase, paletteName, paletteColors }) {
  const themeTag = buildThemeStyleTag(paletteColors);
  const preScript = buildDeterminismAndInspectScript({ width, height, meta, showcase, paletteName, paletteColors });
  const hasVersion = /^\s*#version\s+/m.test(fragSource);
  const cleanFrag = hasVersion
    ? fragSource
    : `#version 300 es
precision highp float;
uniform float u_phase;
uniform float u_tau;
uniform vec2 u_resolution;
uniform float u_seed;
uniform vec3 u_ground;
uniform vec3 u_surface;
uniform vec3 u_body;
uniform vec3 u_muted;
uniform vec3 u_accent;
uniform vec3 u_spark;
uniform vec3 u_line;
out vec4 fragColor;
${fragSource}
`;

  const uColors = {
    u_ground: rgbVec3Literal(paletteColors.ground),
    u_surface: rgbVec3Literal(paletteColors.surface),
    u_body: rgbVec3Literal(paletteColors.body),
    u_muted: rgbVec3Literal(paletteColors.muted),
    u_accent: rgbVec3Literal(paletteColors.accent),
    u_spark: rgbVec3Literal(paletteColors.spark),
    u_line: rgbVec3Literal(paletteColors.line)
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  ${themeTag}
  ${preScript}
</head>
<body style="background:${paletteColors.ground};">
  <canvas id="loop-gl" width="${width}" height="${height}" style="display:block;width:${width}px;height:${height}px;"></canvas>
  <script>
  (function() {
    const cv = document.getElementById("loop-gl");
    const gl = cv.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL2 unavailable in browser context");

    const vsSrc = \`#version 300 es
    in vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }\`;

    const fsSrc = ${JSON.stringify(cleanFrag)};

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error("GLSL compile error: " + gl.getShaderInfoLog(s));
      }
      return s;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error("GLSL link error: " + gl.getProgramInfoLog(prog));
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(prog);
    const uPhase = gl.getUniformLocation(prog, "u_phase");
    const uTau = gl.getUniformLocation(prog, "u_tau");
    const uRes = gl.getUniformLocation(prog, "u_resolution");
    const uSeed = gl.getUniformLocation(prog, "u_seed");
    const paletteU = ${JSON.stringify(uColors)};

    window.__LOOP_STEP__ = function(phase) {
      gl.viewport(0, 0, ${width}, ${height});
      gl.useProgram(prog);
      if (uPhase) gl.uniform1f(uPhase, phase);
      if (uTau) gl.uniform1f(uTau, Math.PI * 2);
      if (uRes) gl.uniform2f(uRes, ${width}, ${height});
      if (uSeed) gl.uniform1f(uSeed, Number((window.__LOOP_META__ && window.__LOOP_META__.seed) || 7));
      for (const [name, vec] of Object.entries(paletteU)) {
        const ul = gl.getUniformLocation(prog, name);
        if (ul) gl.uniform3f(ul, vec[0], vec[1], vec[2]);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.finish();
    };

    window.__LOOP_STEP__(0);
  })();
  </script>
</body>
</html>`;
}

export function buildHarnessDocument({ absDir, sketchModule, meta, showcase, theme = null }) {
  const kind = detectProjectKind(absDir, sketchModule);
  const width = meta.width || (showcase ? 800 : 400);
  const height = meta.height || (showcase ? 320 : 400);
  const { name: paletteName, colors: paletteColors } = resolveThemePalette(meta.palette || "studio-dark", theme);

  let html;
  if (kind === "html") {
    const htmlSource = fs.readFileSync(path.join(absDir, "scene.html"), "utf8");
    html = buildHtmlSceneDoc({ htmlSource, width, height, meta, showcase, paletteName, paletteColors });
  } else if (kind === "html-module") {
    html = buildHtmlModuleDoc({ width, height, meta, showcase, paletteName, paletteColors });
  } else if (kind === "shader") {
    const fragSource = fs.readFileSync(path.join(absDir, "shader.frag"), "utf8");
    html = buildShaderDoc({ fragSource, width, height, meta, showcase, paletteName, paletteColors });
  } else if (kind === "shader-module") {
    html = buildShaderDoc({ fragSource: sketchModule.shader, width, height, meta, showcase, paletteName, paletteColors });
  } else {
    html = buildCanvas2dDoc({ width, height, meta, showcase, paletteName, paletteColors });
  }

  return { kind, width, height, paletteName, paletteColors, html };
}
