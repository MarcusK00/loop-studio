// Loop Studio — Cross-Platform Zero-NPM Chromium CDP Rendering Backend
// Supports Chrome / Chromium / Edge / Brave on macOS, Linux, and Windows.

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { decodePNG, detectCapabilities } from "../encoders.js";
import { normalizeInspectionResult } from "./telemetry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");
const KIT_PATH = path.join(REPO_ROOT, "tool", "lib", "loop-kit.js");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf"
};

function startHarnessServer(absDir, harnessHtml) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath === "/" || urlPath === "/index.html") {
        res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-store" });
        res.end(harnessHtml);
        return;
      }
      if (urlPath === "/loop-kit.js") {
        res.writeHead(200, { "Content-Type": MIME[".js"], "Cache-Control": "no-store" });
        res.end(fs.readFileSync(KIT_PATH));
        return;
      }
      const rel = urlPath.replace(/^\/+/, "");
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
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({ server, url: `http://127.0.0.1:${addr.port}/index.html` });
    });
  });
}

// Minimal RFC 6455 WebSocket client over node:net (zero npm deps, works on Node >= 18)
function connectWebSocket(wsUrl) {
  return new Promise((resolve, reject) => {
    const u = new URL(wsUrl);
    const key = crypto.randomBytes(16).toString("base64");
    const socket = net.createConnection({ host: u.hostname, port: Number(u.port) });
    let upgraded = false;
    let buf = Buffer.alloc(0);
    let fragBufs = [];
    const handlers = { message: [], close: [] };

    function emitMessage(text) {
      for (const fn of handlers.message) fn(text);
    }

    function sendFrame(opcode, payloadBuf) {
      const len = payloadBuf.length;
      const mask = crypto.randomBytes(4);
      let hdrLen = 2;
      if (len >= 126 && len < 65536) hdrLen = 4;
      else if (len >= 65536) hdrLen = 10;
      const frame = Buffer.alloc(hdrLen + 4 + len);
      frame[0] = 0x80 | opcode;
      if (len < 126) {
        frame[1] = 0x80 | len;
      } else if (len < 65536) {
        frame[1] = 0x80 | 126;
        frame.writeUInt16BE(len, 2);
      } else {
        frame[1] = 0x80 | 127;
        frame.writeBigUInt64BE(BigInt(len), 2);
      }
      mask.copy(frame, hdrLen);
      for (let i = 0; i < len; i++) {
        frame[hdrLen + 4 + i] = payloadBuf[i] ^ mask[i & 3];
      }
      socket.write(frame);
    }

    function parseFrames() {
      while (buf.length >= 2) {
        const b0 = buf[0];
        const b1 = buf[1];
        const fin = (b0 & 0x80) !== 0;
        const opcode = b0 & 0x0f;
        const masked = (b1 & 0x80) !== 0;
        let len = b1 & 0x7f;
        let offset = 2;
        if (len === 126) {
          if (buf.length < 4) return;
          len = buf.readUInt16BE(2);
          offset = 4;
        } else if (len === 127) {
          if (buf.length < 10) return;
          len = Number(buf.readBigUInt64BE(2));
          offset = 10;
        }
        const maskLen = masked ? 4 : 0;
        if (buf.length < offset + maskLen + len) return;
        const payload = Buffer.from(buf.subarray(offset + maskLen, offset + maskLen + len));
        if (masked) {
          const m = buf.subarray(offset, offset + 4);
          for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3];
        }
        buf = buf.subarray(offset + maskLen + len);

        if (opcode === 0x8) {
          socket.end();
          for (const fn of handlers.close) fn();
          return;
        }
        if (opcode === 0x9) {
          sendFrame(0x0a, payload); // Pong
          continue;
        }
        fragBufs.push(payload);
        if (fin) {
          const full = Buffer.concat(fragBufs);
          fragBufs = [];
          if (opcode === 0x1 || opcode === 0x0) {
            emitMessage(full.toString("utf8"));
          }
        }
      }
    }

    socket.on("connect", () => {
      const req = [
        `GET ${u.pathname}${u.search} HTTP/1.1`,
        `Host: ${u.host}`,
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Key: ${key}`,
        "Sec-WebSocket-Version: 13",
        "",
        ""
      ].join("\r\n");
      socket.write(req);
    });

    socket.on("data", (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (!upgraded) {
        const idx = buf.indexOf("\r\n\r\n");
        if (idx === -1) return;
        const head = buf.subarray(0, idx).toString("utf8");
        if (!head.includes("101")) {
          reject(new Error(`CDP WebSocket upgrade failed: ${head.split("\r\n")[0]}`));
          socket.destroy();
          return;
        }
        upgraded = true;
        buf = buf.subarray(idx + 4);
        resolve({
          sendText(str) {
            sendFrame(0x1, Buffer.from(str, "utf8"));
          },
          onMessage(fn) {
            handlers.message.push(fn);
          },
          close() {
            try { sendFrame(0x8, Buffer.alloc(0)); } catch {}
            socket.destroy();
          }
        });
      }
      if (upgraded && buf.length > 0) parseFrames();
    });

    socket.on("error", reject);
  });
}

async function createCdpClient(wsUrl) {
  const ws = await connectWebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const eventWaiters = [];

  ws.onMessage((raw) => {
    const msg = JSON.parse(raw);
    if (msg.id !== undefined) {
      const p = pending.get(msg.id);
      if (p) {
        pending.delete(msg.id);
        if (msg.error) p.reject(new Error(`CDP ${msg.error.message}`));
        else p.resolve(msg.result);
      }
    } else if (msg.method) {
      for (let i = eventWaiters.length - 1; i >= 0; i--) {
        if (eventWaiters[i].method === msg.method) {
          const w = eventWaiters.splice(i, 1)[0];
          w.resolve(msg.params);
        }
      }
    }
  });

  return {
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.sendText(JSON.stringify({ id, method, params }));
      });
    },
    waitForEvent(method, timeoutMs = 10000) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout waiting for CDP event ${method}`)), timeoutMs);
        eventWaiters.push({
          method,
          resolve: (params) => {
            clearTimeout(timer);
            resolve(params);
          }
        });
      });
    },
    close() {
      ws.close();
    }
  };
}

function launchChromium(chromePath, width, height, userDataDir) {
  return new Promise((resolve, reject) => {
    const args = [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--force-device-scale-factor=1",
      "--hide-scrollbars",
      "--mute-audio",
      `--window-size=${width},${height}`,
      "about:blank"
    ];
    if (process.platform === "linux") {
      args.push("--no-sandbox", "--disable-dev-shm-usage");
    }

    const child = spawn(chromePath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderrBuf = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { child.kill("SIGKILL"); } catch {}
        reject(new Error(`Timed out starting Chromium: ${stderrBuf}`));
      }
    }, 30000);

    child.stderr.on("data", async (chunk) => {
      stderrBuf += chunk.toString("utf8");
      const m = stderrBuf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m && !settled) {
        settled = true;
        clearTimeout(timer);
        const browserWs = m[1];
        const parsed = new URL(browserWs);
        try {
          const listRes = await new Promise((resOk, resErr) => {
            http.get(`http://127.0.0.1:${parsed.port}/json/list`, (r) => {
              let d = "";
              r.on("data", (c) => (d += c));
              r.on("end", () => resOk(JSON.parse(d)));
            }).on("error", resErr);
          });
          const pageTarget = listRes.find((t) => t.type === "page") || listRes[0];
          resolve({ child, wsUrl: pageTarget.webSocketDebuggerUrl });
        } catch (err) {
          child.kill("SIGKILL");
          reject(err);
        }
      }
    });

    child.on("exit", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Chromium exited prematurely (${code}): ${stderrBuf}`));
      }
    });
  });
}

export async function renderWithChromium({ absDir, harnessHtml, width, height, phases, inspectIndices = [] }) {
  const caps = detectCapabilities();
  if (!caps.chromePath) {
    throw new Error("Chromium/Chrome binary not found. Install Chrome or set LOOP_CHROME_PATH.");
  }

  const tmpUserDir = fs.mkdtempSync(path.join(os.tmpdir(), "loop-studio-chrome-"));
  const { server, url } = await startHarnessServer(absDir, harnessHtml);
  let child = null;
  let cdp = null;

  try {
    const launched = await launchChromium(caps.chromePath, width, height, tmpUserDir);
    child = launched.child;
    cdp = await createCdpClient(launched.wsUrl);

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false
    });

    const loadWait = cdp.waitForEvent("Page.loadEventFired");
    await cdp.send("Page.navigate", { url });
    await loadWait;

    await cdp.send("Runtime.evaluate", {
      expression: `(async () => {
        let tries = 0;
        while (typeof window.__LOOP_STEP__ !== 'function' && tries++ < 800) {
          await new Promise(r => setTimeout(r, 10));
        }
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        return typeof window.__LOOP_STEP__ === 'function';
      })()`,
      awaitPromise: true
    });

    const inspectSet = new Set(inspectIndices);
    const frames = [];
    const telemetryByIndex = {};

    for (let i = 0; i < phases.length; i++) {
      await cdp.send("Runtime.evaluate", {
        expression: `window.__LOOP_STEP__(${phases[i]}); true;`,
        returnByValue: true
      });
      const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
      const pngBuf = Buffer.from(shot.data, "base64");
      const { data: rgba } = decodePNG(pngBuf);
      frames.push(rgba);

      if (inspectSet.has(i)) {
        const insp = await cdp.send("Runtime.evaluate", {
          expression: `window.__LOOP_INSPECT__()`,
          returnByValue: true
        });
        telemetryByIndex[i] = normalizeInspectionResult(insp.result?.value, rgba, width, height);
      }
    }

    return {
      backend: "chromium",
      frames,
      width,
      height,
      telemetryByIndex
    };
  } finally {
    if (cdp) {
      try { await Promise.race([cdp.send("Browser.close"), new Promise((r) => setTimeout(r, 400))]); } catch {}
      cdp.close();
    }
    if (child) {
      const waitExit = new Promise((resolve) => {
        if (child.exitCode !== null || child.signalCode !== null) return resolve();
        const t = setTimeout(resolve, 1500);
        child.once("exit", () => {
          clearTimeout(t);
          resolve();
        });
      });
      try {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      } catch {}
      await waitExit;
    }
    server.close();
    try {
      fs.rmSync(tmpUserDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 50 });
    } catch {
      // Ignore transient Chromium helper lock files during temp profile cleanup
    }
  }
}
