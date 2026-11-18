// Loop Studio — Interactive Browser Workbench (`loop serve`) & Standalone Preview HTML
// Supports HTML/CSS/SVG (`scene.html`), WebGL2 GLSL Shaders (`shader.frag`), and Canvas2D (`sketch.js`).

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildHarnessDocument } from "./harness.js";

export function generatePreviewHtml(title = "Loop Studio Workbench") {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} · Loop Studio</title>
  <style>
    :root {
      --bg: #0E1120; --surface: #171B2E; --stage: #0A0C18; --ink: #E7E9F4;
      --muted: #9BA1BC; --line: #2A3050; --accent: #FF6B9D; --spark: #7FA2FF;
      --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    body {
      margin: 0; padding: 2rem 1rem; background: var(--bg); color: var(--ink);
      font-family: system-ui, -apple-system, sans-serif;
    }
    .wrap { max-width: 60rem; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
    header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.5rem; }
    h1 { margin: 0; font-size: 1.35rem; font-weight: 700; }
    .badge { font-family: var(--mono); font-size: 0.78rem; color: var(--spark); background: var(--surface); border: 1px solid var(--line); padding: 0.25rem 0.6rem; border-radius: 4px; }
    .stage-box { border: 1px solid var(--line); border-radius: 8px; background: var(--stage); overflow: hidden; }
    .canvas-holder { display: flex; justify-content: center; align-items: center; padding: 1.25rem; background: var(--stage); }
    .frame-wrap { width: 100%; display: flex; justify-content: center; transition: max-width 0.15s ease; }
    .frame-wrap.mobile-width { max-width: 400px; margin: 0 auto; }
    iframe#stage-frame {
      display: block; border: none; border-radius: 6px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.45);
      max-width: 100%; background: var(--stage);
    }
    .transport {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1rem; background: var(--surface); border-top: 1px solid var(--line);
    }
    button {
      font: 500 0.82rem var(--mono); color: var(--ink); background: var(--bg);
      border: 1px solid var(--line); border-radius: 4px; padding: 0.4rem 0.75rem; cursor: pointer;
    }
    button:hover { border-color: var(--accent); }
    input[type="range"] { flex: 1 1 12rem; accent-color: var(--accent); }
    output { font-family: var(--mono); font-size: 0.8rem; color: var(--muted); font-variant-numeric: tabular-nums; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>${title}</h1>
      <span class="badge" id="meta-badge">loading project...</span>
    </header>
    <div class="stage-box">
      <div class="canvas-holder">
        <div class="frame-wrap" id="frame-wrap">
          <iframe id="stage-frame" title="Loop Studio Stage" scrolling="no"></iframe>
        </div>
      </div>
      <div class="transport">
        <button type="button" id="play-btn">Pause</button>
        <input type="range" id="scrubber" min="0" max="119" value="0" step="1">
        <output id="readout">frame 000 / 120 · phase 0.00</output>
        <button type="button" id="theme-btn">Theme: Auto</button>
        <button type="button" id="phone-btn">400px Phone View</button>
      </div>
    </div>
  </div>
  <script type="module">
    const iframe = document.getElementById("stage-frame");
    const frameWrap = document.getElementById("frame-wrap");
    const playBtn = document.getElementById("play-btn");
    const themeBtn = document.getElementById("theme-btn");
    const phoneBtn = document.getElementById("phone-btn");
    const scrubber = document.getElementById("scrubber");
    const readout = document.getElementById("readout");
    const badge = document.getElementById("meta-badge");

    let meta = { seconds: 4, fps: 30, width: 640, height: 360, kind: "canvas2d" };
    let totalFrames = 120;
    let frame = 0;
    let playing = true;
    let startedAt = null;
    let themeMode = "auto";

    async function loadMetaAndStage() {
      try {
        const res = await fetch("/__meta.json");
        if (res.ok) meta = await res.json();
      } catch {}
      const w = meta.width || 640;
      const h = meta.height || 360;
      totalFrames = Math.max(2, Math.round((meta.seconds || 4) * (meta.fps || 30)));
      iframe.width = w;
      iframe.height = h;
      iframe.style.aspectRatio = w + " / " + h;
      scrubber.max = String(totalFrames - 1);
      badge.textContent = (meta.kind || "loop") + " · " + meta.seconds + "s @ " + meta.fps + "fps (" + totalFrames + "f) · " + w + "×" + h;
      const qs = themeMode === "auto" ? "" : ("?theme=" + encodeURIComponent(themeMode));
      iframe.src = "/__harness.html" + qs;
    }

    function drawFrame() {
      const phase = frame / totalFrames;
      try {
        if (iframe.contentWindow && typeof iframe.contentWindow.__LOOP_STEP__ === "function") {
          iframe.contentWindow.__LOOP_STEP__(phase);
        }
      } catch {}
      scrubber.value = String(frame);
      readout.textContent = "frame " + String(frame).padStart(3, "0") + " / " + totalFrames + " · phase " + phase.toFixed(3);
    }

    function tick(now) {
      if (playing) {
        if (startedAt === null) startedAt = now - (frame / totalFrames) * (meta.seconds || 4) * 1000;
        const u = (((now - startedAt) / 1000 / (meta.seconds || 4)) % 1 + 1) % 1;
        const nextF = Math.floor(u * totalFrames) % totalFrames;
        if (nextF !== frame) {
          frame = nextF;
          drawFrame();
        }
      }
      requestAnimationFrame(tick);
    }

    iframe.addEventListener("load", () => drawFrame());
    playBtn.addEventListener("click", () => {
      playing = !playing;
      startedAt = null;
      playBtn.textContent = playing ? "Pause" : "Play";
    });
    phoneBtn.addEventListener("click", () => {
      frameWrap.classList.toggle("mobile-width");
    });
    themeBtn.addEventListener("click", () => {
      themeMode = themeMode === "auto" ? "dark" : themeMode === "dark" ? "light" : "auto";
      themeBtn.textContent = "Theme: " + themeMode[0].toUpperCase() + themeMode.slice(1);
      const qs = themeMode === "auto" ? "" : ("?theme=" + encodeURIComponent(themeMode));
      iframe.src = "/__harness.html" + qs;
    });
    scrubber.addEventListener("input", () => {
      playing = false;
      startedAt = null;
      playBtn.textContent = "Play";
      frame = parseInt(scrubber.value, 10) || 0;
      drawFrame();
    });

    await loadMetaAndStage();
    requestAnimationFrame(tick);
  </script>
</body>
</html>`;
}

function readJsonSafe(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

export function serveLoop(targetDir, port = 4173, kitSourcePath) {
  const absDir = path.resolve(targetDir);
  const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2"
  };

  async function loadProjectState() {
    const sketchPath = path.join(absDir, "sketch.js");
    const sketchModule = fs.existsSync(sketchPath)
      ? await import(pathToFileURL(sketchPath).href + `?t=${Date.now()}`)
      : null;
    const briefJson = readJsonSafe(path.join(absDir, "brief.json"));
    const showcaseJson = readJsonSafe(path.join(absDir, "showcase.json")) || sketchModule?.showcase || null;
    const meta = {
      ...(sketchModule?.meta || {}),
      ...(briefJson || {}),
      ...(showcaseJson || {})
    };
    return { sketchModule, briefJson, showcaseJson, meta };
  }

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = new URL(req.url || "/", "http://127.0.0.1");
      const urlPath = decodeURIComponent(parsedUrl.pathname);

      if (urlPath === "/loop-kit.js" && kitSourcePath && fs.existsSync(kitSourcePath)) {
        res.writeHead(200, { "Content-Type": MIME[".js"], "Cache-Control": "no-store" });
        res.end(fs.readFileSync(kitSourcePath));
        return;
      }

      if (urlPath === "/__meta.json") {
        const st = await loadProjectState();
        const harness = buildHarnessDocument({
          absDir,
          sketchModule: st.sketchModule,
          meta: st.meta,
          showcase: st.showcaseJson
        });
        res.writeHead(200, { "Content-Type": MIME[".json"], "Cache-Control": "no-store" });
        res.end(
          JSON.stringify({
            kind: harness.kind,
            width: harness.width,
            height: harness.height,
            seconds: st.meta.seconds || 4,
            fps: st.meta.fps || 30,
            palette: harness.paletteName
          })
        );
        return;
      }

      if (urlPath === "/__harness.html") {
        const theme = parsedUrl.searchParams.get("theme");
        const st = await loadProjectState();
        const harness = buildHarnessDocument({
          absDir,
          sketchModule: st.sketchModule,
          meta: st.meta,
          showcase: st.showcaseJson,
          theme
        });
        res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-store" });
        res.end(harness.html);
        return;
      }

      const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
      if (rel === "index.html") {
        const idxPath = path.join(absDir, "index.html");
        const html = fs.existsSync(idxPath) ? fs.readFileSync(idxPath, "utf8") : generatePreviewHtml(path.basename(absDir));
        res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-store" });
        res.end(html);
        return;
      }

      const filePath = path.resolve(absDir, rel);
      const basePrefix = absDir.endsWith(path.sep) ? absDir : absDir + path.sep;
      if (!filePath.startsWith(basePrefix) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(fs.readFileSync(filePath));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(err.message);
    }
  });

  server.listen(port, () => {
    console.log(`Loop Studio workbench running at http://localhost:${port} (serving ${absDir})`);
  });
  return server;
}
