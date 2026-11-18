// Loop Studio — Interactive Browser Workbench (`loop serve`) & Standalone Preview HTML

import http from "node:http";
import fs from "node:fs";
import path from "node:path";

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
    .wrap { max-width: 56rem; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
    header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.5rem; }
    h1 { margin: 0; font-size: 1.35rem; font-weight: 700; }
    .badge { font-family: var(--mono); font-size: 0.78rem; color: var(--spark); background: var(--surface); border: 1px solid var(--line); padding: 0.25rem 0.6rem; border-radius: 4px; }
    .stage-box { border: 1px solid var(--line); border-radius: 8px; background: var(--stage); overflow: hidden; }
    .canvas-holder { display: flex; justify-content: center; align-items: center; padding: 1rem; background: var(--stage); }
    canvas { display: block; max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 8px 24px rgba(0,0,0,0.35); }
    canvas.mobile-width { max-width: 400px; }
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
      <span class="badge" id="meta-badge">loading sketch.js...</span>
    </header>
    <div class="stage-box">
      <div class="canvas-holder">
        <canvas id="stage-canvas"></canvas>
      </div>
      <div class="transport">
        <button type="button" id="play-btn">Pause</button>
        <input type="range" id="scrubber" min="0" max="119" value="0" step="1">
        <output id="readout">frame 000 / 120 · phase 0.00</output>
        <button type="button" id="phone-btn">400px Phone View</button>
      </div>
    </div>
  </div>
  <script type="module">
    import * as sketch from "./sketch.js";
    import { createKit } from "./loop-kit.js";

    const cv = document.getElementById("stage-canvas");
    const ctx = cv.getContext("2d");
    const playBtn = document.getElementById("play-btn");
    const phoneBtn = document.getElementById("phone-btn");
    const scrubber = document.getElementById("scrubber");
    const readout = document.getElementById("readout");
    const badge = document.getElementById("meta-badge");

    const meta = sketch.meta || { seconds: 4, fps: 30, width: 640, height: 640 };
    const totalFrames = Math.round((meta.seconds || 4) * (meta.fps || 30));
    cv.width = meta.width || 640;
    cv.height = meta.height || 640;
    scrubber.max = String(totalFrames - 1);
    badge.textContent = \`\${meta.mode || "loop"} · \${meta.seconds}s @ \${meta.fps}fps (\${totalFrames}f) · \${cv.width}×\${cv.height}\`;

    const kit = createKit({ showcase: sketch.showcase });
    let frame = 0;
    let playing = true;
    let startedAt = null;

    function drawFrame() {
      const phase = frame / totalFrames;
      sketch.render(ctx, phase, kit);
      scrubber.value = String(frame);
      readout.textContent = \`frame \${String(frame).padStart(3, "0")} / \${totalFrames} · phase \${phase.toFixed(3)}\`;
    }

    function tick(now) {
      if (playing) {
        if (startedAt === null) startedAt = now - (frame / totalFrames) * meta.seconds * 1000;
        const u = (((now - startedAt) / 1000 / meta.seconds) % 1 + 1) % 1;
        const nextF = Math.floor(u * totalFrames) % totalFrames;
        if (nextF !== frame) {
          frame = nextF;
          drawFrame();
        }
      }
      requestAnimationFrame(tick);
    }

    playBtn.addEventListener("click", () => {
      playing = !playing;
      startedAt = null;
      playBtn.textContent = playing ? "Pause" : "Play";
    });
    phoneBtn.addEventListener("click", () => {
      cv.classList.toggle("mobile-width");
    });
    scrubber.addEventListener("input", () => {
      playing = false;
      startedAt = null;
      playBtn.textContent = "Play";
      frame = parseInt(scrubber.value, 10) || 0;
      drawFrame();
    });

    drawFrame();
    requestAnimationFrame(tick);
  </script>
</body>
</html>`;
}

export function serveLoop(targetDir, port = 4173, kitSourcePath) {
  const absDir = path.resolve(targetDir);
  const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".gif": "image/gif",
    ".svg": "image/svg+xml"
  };

  const server = http.createServer((req, res) => {
    const urlPath = (req.url || "/").split("?")[0];
    if (urlPath === "/loop-kit.js" && kitSourcePath && fs.existsSync(kitSourcePath)) {
      res.writeHead(200, { "Content-Type": MIME[".js"] });
      res.end(fs.readFileSync(kitSourcePath));
      return;
    }
    const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
    const filePath = path.join(absDir, rel);
    if (!filePath.startsWith(absDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(fs.readFileSync(filePath));
  });

  server.listen(port, () => {
    console.log(`Loop Studio workbench running at http://localhost:${port} (serving ${absDir})`);
  });
  return server;
}
