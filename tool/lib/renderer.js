// Loop Studio — Browser Rendering Router (`webkit` | `chromium`)

import { detectCapabilities } from "./encoders.js";
import { buildHarnessDocument } from "./harness.js";
import { renderWithWebKit } from "./backends/webkit.js";
import { renderWithChromium } from "./backends/chromium.js";

export function chooseEngine({ engine = "auto" } = {}) {
  const requested = String(engine || "auto").toLowerCase();
  const caps = detectCapabilities();

  if (requested === "webkit") {
    if (!caps.macosWebKit) throw new Error('Engine "webkit" requires macOS with Swift & WebKit.');
    return "webkit";
  }

  if (requested === "chromium" || requested === "chrome") {
    if (!caps.headlessChrome) {
      throw new Error('Engine "chromium" requires Google Chrome or Chromium installed (or set LOOP_CHROME_PATH).');
    }
    return "chromium";
  }

  if (caps.macosWebKit) return "webkit";
  if (caps.headlessChrome) return "chromium";
  throw new Error(
    "No browser engine found. Install Google Chrome/Chromium (or set LOOP_CHROME_PATH), or run on macOS with Swift/WebKit."
  );
}

export async function renderProjectPhases({
  absDir,
  sketchModule,
  meta,
  showcase,
  width,
  height,
  phases,
  inspectIndices = [],
  engine = "auto",
  theme = null
}) {
  const selected = chooseEngine({ engine });
  const harness = buildHarnessDocument({
    absDir,
    sketchModule,
    meta: { ...meta, width, height },
    showcase,
    theme
  });

  if (selected === "webkit") {
    return renderWithWebKit({
      absDir,
      harnessHtml: harness.html,
      width,
      height,
      phases,
      inspectIndices
    });
  }

  return await renderWithChromium({
    absDir,
    harnessHtml: harness.html,
    width,
    height,
    phases,
    inspectIndices
  });
}
