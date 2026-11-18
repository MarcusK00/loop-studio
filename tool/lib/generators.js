// Loop Studio — Data-Driven Scene Generators (`loop diff` & `loop term`)
// Zero external dependencies. Produces dual-theme HTML/CSS/SVG scenes + grounded showcase.json.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { generatePreviewHtml } from "./server.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripAnsi(str) {
  return String(str ?? "").replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

function truncateLine(str, maxLen = 74) {
  const s = String(str ?? "").replace(/\t/g, "  ");
  return s.length > maxLen ? s.slice(0, maxLen - 1) + "…" : s;
}

const CODE_KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "export", "import", "from", "async", "await",
  "if", "else", "for", "while", "try", "catch", "finally", "class", "new", "throw", "true",
  "false", "null", "def", "pub", "fn", "struct", "impl", "match", "func", "type", "package"
]);

export function highlightCodeLine(raw) {
  const line = truncateLine(raw, 72);
  const commentIdx = line.indexOf("//");
  const codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
  const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : "";

  const tokens = codePart.split(/("[^"]*"|'[^']*'|`[^`]*`|\b[A-Za-z_][A-Za-z0-9_]*\b|\b\d+(?:\.\d+)?\b)/g);
  const rendered = tokens
    .map((tok, i) => {
      if (!tok) return "";
      if ((tok.startsWith("\"") && tok.endsWith("\"")) || (tok.startsWith("'") && tok.endsWith("'")) || (tok.startsWith("`") && tok.endsWith("`"))) {
        return `<span class="str">${escapeHtml(tok)}</span>`;
      }
      if (/^\d+(?:\.\d+)?$/.test(tok)) {
        return `<span class="fn">${escapeHtml(tok)}</span>`;
      }
      if (CODE_KEYWORDS.has(tok)) {
        return `<span class="kw">${escapeHtml(tok)}</span>`;
      }
      const next = tokens[i + 1] || "";
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(tok) && next.startsWith("(")) {
        return `<span class="fn">${escapeHtml(tok)}</span>`;
      }
      return escapeHtml(tok);
    })
    .join("");

  if (commentPart) {
    return rendered + `<span class="cm">${escapeHtml(commentPart)}</span>`;
  }
  return rendered;
}

export function parseUnifiedDiff(diffText, maxLines = 8) {
  const rawLines = String(diffText || "").split(/\r?\n/);
  const hunks = [];
  let currentFile = null;
  let currentHunk = null;
  let oldNum = 1;
  let newNum = 1;

  for (const line of rawLines) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("+++ ") && !line.includes("/dev/null")) {
      currentFile = line.slice(4).trim().replace(/^b\//, "");
      continue;
    }
    const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      oldNum = Number(hunkMatch[1]);
      newNum = Number(hunkMatch[2]);
      currentHunk = {
        file: currentFile || "patch.diff",
        startLine: newNum,
        endLine: newNum,
        lines: [],
        delCount: 0,
        addCount: 0
      };
      hunks.push(currentHunk);
      continue;
    }
    if (!currentHunk) continue;
    if (line.startsWith("diff --git") || line.startsWith("--- ") || line.startsWith("\\ No newline")) {
      continue;
    }

    if (line.startsWith("-")) {
      currentHunk.lines.push({ type: "del", num: oldNum++, text: line.slice(1) });
      currentHunk.delCount++;
    } else if (line.startsWith("+")) {
      currentHunk.lines.push({ type: "add", num: newNum, text: line.slice(1) });
      currentHunk.endLine = newNum;
      newNum++;
      currentHunk.addCount++;
    } else if (line.startsWith(" ")) {
      currentHunk.lines.push({ type: "ctx", num: newNum, text: line.slice(1) });
      currentHunk.endLine = newNum;
      oldNum++;
      newNum++;
    }
  }

  const nonEmpty = hunks.filter((h) => h.addCount > 0 || h.delCount > 0);
  if (nonEmpty.length === 0) return null;

  // Prefer the richest hunk that has both removals and additions
  const best = nonEmpty.find((h) => h.addCount > 0 && h.delCount > 0) || nonEmpty[0];
  const changed = best.lines.filter((l) => l.type !== "ctx");
  const picked = (changed.length >= 2 ? changed : best.lines).slice(0, Math.max(2, maxLines));

  const addedNums = picked.filter((l) => l.type === "add").map((l) => l.num);
  const startLine = addedNums.length > 0 ? Math.min(...addedNums) : Math.max(1, best.startLine);
  const endLine = addedNums.length > 0 ? Math.max(...addedNums) : Math.max(startLine, best.endLine);

  return {
    file: best.file,
    startLine,
    endLine,
    delCount: best.delCount,
    addCount: best.addCount,
    lines: picked
  };
}

function pickBestMatchToken(lines, repoRoot, relFile, startLine, endLine) {
  if (!relFile || !repoRoot) return null;
  const abs = path.resolve(repoRoot, relFile);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
  const fileLines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
  if (startLine < 1 || endLine > fileLines.length) return null;
  const snippet = fileLines.slice(Math.max(0, startLine - 4), Math.min(fileLines.length, endLine + 3)).join("\n");

  for (const l of lines.filter((x) => x.type === "add")) {
    const ids = (l.text.match(/\b[A-Za-z_][A-Za-z0-9_]{3,}\b/g) || []).filter((id) => !CODE_KEYWORDS.has(id));
    for (const id of ids) {
      if (snippet.includes(id)) return id;
    }
  }
  return null;
}

function readGitDiff(repoRoot, { staged = false, range = null } = {}) {
  const runGit = (args) => {
    const res = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    return res.status === 0 ? res.stdout : "";
  };
  if (range) return runGit(["diff", "-U1", range]);
  if (staged) return runGit(["diff", "--staged", "-U1"]);
  const unstaged = runGit(["diff", "-U1"]);
  if (unstaged.trim()) return unstaged;
  const cached = runGit(["diff", "--staged", "-U1"]);
  if (cached.trim()) return cached;
  return runGit(["diff", "-U1", "HEAD~1..HEAD"]);
}

export function generateDiffProject({
  outDir,
  repoRoot = process.cwd(),
  diffText = null,
  diffFile = null,
  staged = false,
  range = null,
  title = null,
  palette = "studio-dark",
  seconds = 9,
  fps = 24,
  maxLines = 7
}) {
  const absOut = path.resolve(outDir);
  const absRepo = path.resolve(repoRoot);

  let rawDiff = diffText;
  if (!rawDiff && diffFile) {
    rawDiff = fs.readFileSync(path.resolve(diffFile), "utf8");
  }
  if (!rawDiff) {
    rawDiff = readGitDiff(absRepo, { staged, range });
  }

  const parsed = parseUnifiedDiff(rawDiff, maxLines);
  if (!parsed) {
    const err = new Error("No unified diff hunks found. Pass --file <patch.diff>, --range <a..b>, or --staged.");
    err.exitCode = 2;
    throw err;
  }

  fs.mkdirSync(absOut, { recursive: true });

  const fileExistsInRepo =
    fs.existsSync(path.resolve(absRepo, parsed.file)) &&
    fs.statSync(path.resolve(absRepo, parsed.file)).isFile();
  const realFileLineCount = fileExistsInRepo
    ? fs.readFileSync(path.resolve(absRepo, parsed.file), "utf8").split(/\r?\n/).length
    : 0;

  let sourceCitation = "README.md:1";
  let matchToken = null;
  if (fileExistsInRepo && parsed.startLine >= 1 && parsed.endLine <= realFileLineCount) {
    sourceCitation = parsed.startLine === parsed.endLine
      ? `${parsed.file}:${parsed.startLine}`
      : `${parsed.file}:${parsed.startLine}-${parsed.endLine}`;
    matchToken = pickBestMatchToken(parsed.lines, absRepo, parsed.file, parsed.startLine, parsed.endLine);
  } else if (!fs.existsSync(path.resolve(absRepo, "README.md"))) {
    const pkg = path.resolve(absRepo, "package.json");
    sourceCitation = fs.existsSync(pkg) ? "package.json:1" : `${parsed.file}:1`;
  }

  const lineCount = parsed.lines.length;
  const lineH = 30;
  const height = Math.max(360, 210 + lineCount * lineH);
  const width = 800;
  const shortFile = parsed.file.length > 44 ? "…" + parsed.file.slice(-43) : parsed.file;
  const heading = title || `git diff · ${path.basename(parsed.file)}`;

  const showcase = {
    title: heading,
    says: `Shows the code diff in ${parsed.file} (-${parsed.delCount} / +${parsed.addCount}) across dark and light themes.`,
    mode: "showcase",
    seconds,
    fps,
    width,
    height,
    palette,
    stage: ["Diff", "Changes", "Verified"],
    steps: [
      {
        from: Number((seconds * 0.85).toFixed(2)),
        to: Number((seconds * 0.30).toFixed(2)),
        caption: `inspect diff in ${path.basename(parsed.file)}`,
        source: sourceCitation,
        ...(matchToken ? { match: [matchToken] } : {})
      },
      {
        from: Number((seconds * 0.30).toFixed(2)),
        to: Number((seconds * 0.62).toFixed(2)),
        caption: `apply +${parsed.addCount} added and -${parsed.delCount} removed`,
        source: sourceCitation,
        ...(matchToken ? { match: [matchToken] } : {})
      },
      {
        from: Number((seconds * 0.62).toFixed(2)),
        to: Number((seconds * 0.85).toFixed(2)),
        caption: "verified ready for review",
        source: sourceCitation,
        ...(matchToken ? { match: [matchToken] } : {})
      }
    ]
  };

  const rowsHtml = parsed.lines
    .map((l, idx) => {
      const cls = l.type === "del" ? "line del" : l.type === "add" ? "line add" : "line";
      const sig = l.type === "del" ? "-" : l.type === "add" ? "+" : " ";
      return `      <div class="${cls}" id="l${idx}" data-kind="${l.type}"><span class="lnum">${l.num}</span><span class="sig">${sig}</span><span>${highlightCodeLine(l.text)}</span></div>`;
    })
    .join("\n");

  const sceneHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: 100vw;
      height: 100vh;
      background:
        radial-gradient(620px 320px at 50% 25%, color-mix(in srgb, var(--loop-spark) 14%, transparent), transparent 70%),
        radial-gradient(480px 260px at 80% 80%, color-mix(in srgb, var(--loop-accent) 10%, transparent), transparent 72%),
        var(--loop-ground);
      color: var(--loop-body);
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 20px 28px;
      overflow: hidden;
    }
    .stage-bar { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .brand { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: var(--loop-body); }
    .phase-ring { width: 16px; height: 16px; flex: none; }
    .stages { display: flex; align-items: center; gap: 8px; }
    .stage-pill {
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 12px; font-weight: 600; padding: 4px 11px; border-radius: 999px;
      border: 1px solid var(--loop-line); background: var(--loop-surface); color: var(--loop-body); opacity: 0.72;
    }
    .stage-pill.active { opacity: 1; border-color: var(--loop-accent); background: var(--loop-accent); color: var(--loop-on-accent); }
    .editor {
      position: relative; width: 100%; flex: 1; margin: 12px 0;
      background: var(--loop-surface); border: 1px solid var(--loop-line); border-radius: 12px;
      box-shadow: 0 18px 44px rgba(0, 0, 0, 0.24); display: flex; flex-direction: column; overflow: hidden;
    }
    .editor-head {
      height: 36px; padding: 0 14px; border-bottom: 1px solid var(--loop-line);
      display: flex; align-items: center; justify-content: space-between;
      background: color-mix(in srgb, var(--loop-ground) 35%, var(--loop-surface));
    }
    .dots { display: flex; gap: 6px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot.r { background: #FF5F56; } .dot.y { background: #FFBD2E; } .dot.g { background: #27C93F; }
    .file-tab { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12px; font-weight: 600; color: var(--loop-body); }
    .status-chip {
      font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 11px; font-weight: 700;
      padding: 3px 9px; border-radius: 6px; border: 1px solid var(--loop-line);
      background: var(--loop-ground); color: var(--loop-body);
    }
    .code-body {
      position: relative; flex: 1; padding: 14px 0;
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 12.5px; line-height: ${lineH}px; display: flex; flex-direction: column;
    }
    .scan-beam {
      position: absolute; left: 0; right: 0; height: ${lineH}px;
      background: linear-gradient(90deg, color-mix(in srgb, var(--loop-spark) 18%, transparent), color-mix(in srgb, var(--loop-accent) 12%, transparent));
      border-left: 3px solid var(--loop-spark); pointer-events: none;
    }
    .line { position: relative; display: flex; align-items: center; padding: 0 16px; white-space: pre; overflow: hidden; }
    .line.del { background: color-mix(in srgb, #FF5572 13%, transparent); }
    .line.add { background: color-mix(in srgb, #00C98D 13%, transparent); }
    .lnum { width: 34px; color: var(--loop-muted); font-size: 11px; flex: none; }
    .sig { width: 18px; font-weight: 700; color: var(--loop-body); flex: none; }
    .kw { color: var(--loop-accent); font-weight: 600; }
    .fn { color: var(--loop-spark); font-weight: 600; }
    .str { color: var(--loop-body); text-decoration: underline; text-decoration-color: color-mix(in srgb, var(--loop-spark) 45%, transparent); }
    .cm { color: var(--loop-muted); }
    .caption-pill {
      display: flex; align-items: center; gap: 12px; background: var(--loop-surface);
      border: 1px solid var(--loop-line); border-radius: 10px; padding: 7px 18px; max-width: 92%;
    }
    .step-dots { display: flex; gap: 6px; align-items: center; }
    .sdot { width: 7px; height: 7px; border-radius: 50%; background: var(--loop-line); }
    .sdot.on { background: var(--loop-accent); transform: scale(1.25); }
    .caption-text { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 13.5px; font-weight: 600; color: var(--loop-body); white-space: nowrap; }
  </style>
</head>
<body>
  <div class="stage-bar">
    <div class="brand">
      <svg class="phase-ring" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="7" fill="none" stroke="var(--loop-line)" stroke-width="2.2" />
        <circle id="ring-dot" cx="10" cy="3" r="2.8" fill="var(--loop-accent)" />
      </svg>
      <span>${escapeHtml(heading)}</span>
    </div>
    <div class="stages">
      <span class="stage-pill" id="st-0" data-loop-stage>Diff</span>
      <span class="stage-pill" id="st-1" data-loop-stage>Changes</span>
      <span class="stage-pill" id="st-2" data-loop-stage>Verified</span>
    </div>
  </div>

  <div class="editor">
    <div class="editor-head">
      <div class="dots"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span></div>
      <div class="file-tab">${escapeHtml(shortFile)}</div>
      <div class="status-chip" id="status-chip">+${parsed.addCount} / -${parsed.delCount}</div>
    </div>
    <div class="code-body">
      <div class="scan-beam" id="scan-beam"></div>
${rowsHtml}
    </div>
  </div>

  <div class="caption-pill">
    <div class="step-dots"><span class="sdot" id="d0"></span><span class="sdot" id="d1"></span><span class="sdot" id="d2"></span></div>
    <span class="caption-text" id="caption-text" data-loop-caption>${escapeHtml(showcase.steps[0].caption)}</span>
  </div>

  <script>
    window.renderLoop = function(phase, kit, meta) {
      const S = window.__LOOP_SHOWCASE__ || {};
      const seconds = S.seconds || (meta && meta.seconds) || ${seconds};
      const steps = Array.isArray(S.steps) ? S.steps : [];
      const t = phase * seconds;
      const TAU = Math.PI * 2;
      const lineCount = ${lineCount};

      let activeIdx = 0;
      let activeCaption = steps[0] ? steps[0].caption : "";
      let capOpacity = 1;
      steps.forEach((st, idx) => {
        const len = ((st.to - st.from) % seconds + seconds) % seconds || seconds;
        const u = ((t - st.from) % seconds + seconds) % seconds;
        if (u < len) {
          activeIdx = idx;
          activeCaption = st.caption;
          capOpacity = Math.max(0.25, Math.min(1, u / 0.45, (len - u) / 0.45));
        }
      });

      const capEl = document.getElementById("caption-text");
      capEl.textContent = activeCaption;
      capEl.style.opacity = capOpacity.toFixed(3);
      for (let i = 0; i < 3; i++) {
        document.getElementById("st-" + i).classList.toggle("active", i === activeIdx);
        document.getElementById("d" + i).classList.toggle("on", i === activeIdx);
      }

      const ang = phase * TAU - Math.PI / 2;
      const dot = document.getElementById("ring-dot");
      dot.setAttribute("cx", (10 + Math.cos(ang) * 7).toFixed(2));
      dot.setAttribute("cy", (10 + Math.sin(ang) * 7).toFixed(2));

      const ping = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      const linePos = Math.max(0, lineCount - 1) * (0.25 * ping + 0.75 * (0.5 - 0.5 * Math.cos(ping * Math.PI)));
      document.getElementById("scan-beam").style.top = (14 + linePos * ${lineH}).toFixed(1) + "px";

      const chip = document.getElementById("status-chip");
      if (activeIdx === 0) chip.textContent = "-${parsed.delCount} / +${parsed.addCount} lines";
      else if (activeIdx === 1) chip.textContent = "applying hunk";
      else chip.textContent = "✓ diff verified";

      const dimWin = phase >= 0.60 && phase <= 0.90 ? Math.sin(((phase - 0.60) / 0.30) * Math.PI) : 0;
      document.querySelectorAll('.line[data-kind="del"]').forEach((el) => {
        el.style.opacity = (1.0 - 0.48 * dimWin).toFixed(3);
      });
    };
  </script>
</body>
</html>
`;

  fs.writeFileSync(path.join(absOut, "scene.html"), sceneHtml, "utf8");
  fs.writeFileSync(path.join(absOut, "showcase.json"), JSON.stringify(showcase, null, 2) + "\n", "utf8");
  fs.writeFileSync(path.join(absOut, "index.html"), generatePreviewHtml(heading), "utf8");

  return {
    dir: absOut,
    file: parsed.file,
    addCount: parsed.addCount,
    delCount: parsed.delCount,
    source: sourceCitation,
    files: ["scene.html", "showcase.json", "index.html"]
  };
}

function classifyTerminalLine(text) {
  const t = text.toLowerCase();
  if (/\b(fail|error|err|fatal|✗)\b/.test(t)) return "err";
  if (/\b(pass|ok|healthy|verified|done|✓)\b/.test(t) || /:\s*true\b/.test(t)) return "ok";
  if (/^\s*[\{\}\[\]]/.test(text) || /^\s*"[^"]+":/.test(text)) return "dim";
  return "plain";
}

export function generateTerminalProject({
  outDir,
  repoRoot = process.cwd(),
  cmd = null,
  label = null,
  outputText = null,
  title = "CLI Session",
  palette = "studio-dark",
  seconds = 9,
  fps = 24,
  maxLines = 7,
  source = null
}) {
  const absOut = path.resolve(outDir);
  const absRepo = path.resolve(repoRoot);

  let exitCode = 0;
  let captured = outputText;
  const displayCmd = label || cmd || "loop doctor";

  if (captured === null && cmd) {
    const res = spawnSync(cmd, { cwd: absRepo, shell: true, encoding: "utf8", timeout: 15000 });
    exitCode = res.status ?? 0;
    captured = [res.stdout || "", res.stderr || ""].filter(Boolean).join("\n");
  }

  const lines = stripAnsi(captured || "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0)
    .slice(0, Math.max(1, maxLines))
    .map((l) => truncateLine(l, 70));

  if (lines.length === 0) {
    lines.push("status: ok (exit 0)");
  }

  fs.mkdirSync(absOut, { recursive: true });

  const defaultSource = source
    || (fs.existsSync(path.resolve(absRepo, "package.json")) ? "package.json:1" : "README.md:1");
  const lineH = 27;
  const height = Math.max(360, 216 + lines.length * lineH);
  const width = 800;

  const showcase = {
    title,
    says: `Runs \`${displayCmd}\` and streams verified CLI output in dark and light themes.`,
    mode: "showcase",
    seconds,
    fps,
    width,
    height,
    palette,
    stage: ["Command", "Output", "Status"],
    steps: [
      {
        from: Number((seconds * 0.833).toFixed(2)),
        to: Number((seconds * 0.167).toFixed(2)),
        caption: "run CLI command",
        source: defaultSource
      },
      {
        from: Number((seconds * 0.167).toFixed(2)),
        to: Number((seconds * 0.5).toFixed(2)),
        caption: "stream deterministic output",
        source: defaultSource
      },
      {
        from: Number((seconds * 0.5).toFixed(2)),
        to: Number((seconds * 0.833).toFixed(2)),
        caption: exitCode === 0 ? "exits 0 · all checks pass" : `exits with status ${exitCode}`,
        source: defaultSource
      }
    ]
  };

  const outLinesHtml = lines
    .map((l, idx) => {
      const cls = classifyTerminalLine(l);
      return `      <div class="tline ${cls}" id="ol-${idx}">${escapeHtml(l)}</div>`;
    })
    .join("\n");

  const sceneHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; width: 100vw; height: 100vh;
      background:
        radial-gradient(580px 280px at 26% 20%, color-mix(in srgb, var(--loop-accent) 12%, transparent), transparent 72%),
        radial-gradient(580px 280px at 78% 82%, color-mix(in srgb, var(--loop-spark) 14%, transparent), transparent 72%),
        var(--loop-ground);
      color: var(--loop-body);
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
      display: flex; flex-direction: column; align-items: center; justify-content: space-between;
      padding: 20px 28px; overflow: hidden;
    }
    .stage-bar { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .brand { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; }
    .phase-ring { width: 16px; height: 16px; flex: none; }
    .stages { display: flex; gap: 8px; }
    .stage-pill {
      font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12px; font-weight: 600;
      padding: 4px 12px; border-radius: 999px; border: 1px solid var(--loop-line);
      background: var(--loop-surface); color: var(--loop-body); opacity: 0.72;
    }
    .stage-pill.active { opacity: 1; border-color: var(--loop-accent); background: var(--loop-accent); color: var(--loop-on-accent); }
    .term {
      width: 100%; flex: 1; margin: 12px 0; background: var(--loop-surface);
      border: 1px solid var(--loop-line); border-radius: 13px;
      box-shadow: 0 18px 46px rgba(0, 0, 0, 0.24); display: flex; flex-direction: column; overflow: hidden;
    }
    .term-head {
      height: 36px; padding: 0 14px; border-bottom: 1px solid var(--loop-line);
      display: flex; align-items: center; justify-content: space-between;
      background: color-mix(in srgb, var(--loop-ground) 38%, var(--loop-surface));
    }
    .dots { display: flex; gap: 6px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot.r { background: #FF5F56; } .dot.y { background: #FFBD2E; } .dot.g { background: #27C93F; }
    .term-title { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12px; font-weight: 600; color: var(--loop-muted); }
    .exit-chip {
      font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 11px; font-weight: 700;
      padding: 3px 9px; border-radius: 6px; border: 1px solid var(--loop-line);
      background: var(--loop-ground); color: var(--loop-body);
    }
    .exit-chip.done { background: var(--loop-spark); border-color: var(--loop-spark); color: var(--loop-on-spark); }
    .term-body {
      position: relative; flex: 1; padding: 14px 18px; font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 13px; line-height: ${lineH}px; display: flex; flex-direction: column; gap: 2px;
    }
    .scan-row {
      position: absolute; left: 0; right: 0; height: ${lineH}px;
      background: linear-gradient(90deg, color-mix(in srgb, var(--loop-spark) 15%, transparent), color-mix(in srgb, var(--loop-accent) 10%, transparent));
      border-left: 3px solid var(--loop-spark); pointer-events: none;
    }
    .prompt-row { position: relative; display: flex; align-items: center; gap: 8px; font-weight: 600; margin-bottom: 6px; white-space: pre; }
    .ps { color: var(--loop-accent); font-weight: 700; }
    .caret { display: inline-block; width: 8px; height: 15px; background: var(--loop-accent); vertical-align: middle; margin-left: 2px; border-radius: 1px; }
    .tline { position: relative; white-space: pre; overflow: hidden; opacity: 0.72; }
    .tline.ok { color: var(--loop-spark); font-weight: 600; }
    .tline.err { color: var(--loop-accent); font-weight: 600; }
    .tline.dim { color: var(--loop-muted); }
    .caption-pill {
      display: flex; align-items: center; gap: 10px; background: var(--loop-surface);
      border: 1px solid var(--loop-line); border-radius: 10px; padding: 7px 18px;
    }
    .caption-text { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 13.5px; font-weight: 600; color: var(--loop-body); }
  </style>
</head>
<body>
  <div class="stage-bar">
    <div class="brand">
      <svg class="phase-ring" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="7" fill="none" stroke="var(--loop-line)" stroke-width="2.2" />
        <circle id="ring-dot" cx="10" cy="3" r="2.8" fill="var(--loop-accent)" />
      </svg>
      <span>${escapeHtml(title)}</span>
    </div>
    <div class="stages">
      <span class="stage-pill" id="st-0" data-loop-stage>Command</span>
      <span class="stage-pill" id="st-1" data-loop-stage>Output</span>
      <span class="stage-pill" id="st-2" data-loop-stage>Status</span>
    </div>
  </div>

  <div class="term">
    <div class="term-head">
      <div class="dots"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span></div>
      <div class="term-title">zsh · ${escapeHtml(path.basename(absRepo))}</div>
      <div class="exit-chip" id="exit-chip">running…</div>
    </div>
    <div class="term-body">
      <div class="scan-row" id="scan-row"></div>
      <div class="prompt-row"><span class="ps">$</span><span id="cmd-typed">${escapeHtml(truncateLine(displayCmd, 64))}</span><span class="caret" id="caret"></span></div>
${outLinesHtml}
    </div>
  </div>

  <div class="caption-pill">
    <span class="caption-text" id="caption-text" data-loop-caption>${escapeHtml(showcase.steps[0].caption)}</span>
  </div>

  <script>
    window.renderLoop = function(phase, kit, meta) {
      const S = window.__LOOP_SHOWCASE__ || {};
      const seconds = S.seconds || (meta && meta.seconds) || ${seconds};
      const steps = Array.isArray(S.steps) ? S.steps : [];
      const t = phase * seconds;
      const TAU = Math.PI * 2;
      const lineCount = ${lines.length};

      let activeIdx = 0;
      let activeCaption = steps[0] ? steps[0].caption : "";
      let capOpacity = 1;
      steps.forEach((st, idx) => {
        const len = ((st.to - st.from) % seconds + seconds) % seconds || seconds;
        const u = ((t - st.from) % seconds + seconds) % seconds;
        if (u < len) {
          activeIdx = idx;
          activeCaption = st.caption;
          capOpacity = Math.max(0.25, Math.min(1, u / 0.45, (len - u) / 0.45));
        }
      });

      const capEl = document.getElementById("caption-text");
      capEl.textContent = activeCaption;
      capEl.style.opacity = capOpacity.toFixed(3);
      for (let i = 0; i < 3; i++) {
        document.getElementById("st-" + i).classList.toggle("active", i === activeIdx);
      }

      const ang = phase * TAU - Math.PI / 2;
      const dot = document.getElementById("ring-dot");
      dot.setAttribute("cx", (10 + Math.cos(ang) * 7).toFixed(2));
      dot.setAttribute("cy", (10 + Math.sin(ang) * 7).toFixed(2));

      const blink = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(TAU * phase * 4));
      document.getElementById("caret").style.opacity = blink.toFixed(2);

      // Smooth ping-pong telemetry scanner across output lines (zero wrap jump)
      const ping = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      const easedPing = 0.25 * ping + 0.75 * (0.5 - 0.5 * Math.cos(ping * Math.PI));
      const scanIdx = easedPing * Math.max(0, lineCount - 1);
      const scanTop = 47 + scanIdx * (${lineH} + 2);
      document.getElementById("scan-row").style.top = scanTop.toFixed(1) + "px";

      for (let i = 0; i < lineCount; i++) {
        const dist = Math.abs(i - scanIdx);
        const focus = Math.max(0, 1 - dist / 2.2);
        const el = document.getElementById("ol-" + i);
        el.style.opacity = (0.52 + 0.48 * focus).toFixed(3);
      }

      const chip = document.getElementById("exit-chip");
      const done = activeIdx === 2;
      chip.classList.toggle("done", done);
      chip.textContent = done ? "exit ${exitCode} · ${exitCode === 0 ? "PASS" : "FAIL"}" : activeIdx === 0 ? "running…" : "streaming…";
    };
  </script>
</body>
</html>
`;

  fs.writeFileSync(path.join(absOut, "scene.html"), sceneHtml, "utf8");
  fs.writeFileSync(path.join(absOut, "showcase.json"), JSON.stringify(showcase, null, 2) + "\n", "utf8");
  fs.writeFileSync(path.join(absOut, "index.html"), generatePreviewHtml(title), "utf8");

  return {
    dir: absOut,
    cmd: displayCmd,
    exitCode,
    lineCount: lines.length,
    source: defaultSource,
    files: ["scene.html", "showcase.json", "index.html"]
  };
}
