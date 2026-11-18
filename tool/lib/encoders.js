// Loop Studio — Pure-JS PNG & GIF89a Encoders + Native MP4 (AVFoundation/FFmpeg), WebM & Animated WebP
// Zero external npm dependencies required.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SWIFT_MP4_SCRIPT = path.resolve(__dirname, "../scripts/encode-mp4.swift");
const SWIFT_WEBKIT_SCRIPT = path.resolve(__dirname, "../scripts/render-webkit.swift");

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

export function encodePNG(rgba, width, height, compressionLevel = 6) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type 0 (None)
    const srcStart = y * stride;
    for (let i = 0; i < stride; i++) {
      raw[rowStart + 1 + i] = rgba[srcStart + i];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: compressionLevel });
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePNG(buf) {
  if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) throw new Error("Invalid PNG signature");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (type === "IHDR") {
      width = buf.readUInt32BE(dataStart);
      height = buf.readUInt32BE(dataStart + 4);
      bitDepth = buf[dataStart + 8];
      colorType = buf[dataStart + 9];
    } else if (type === "IDAT") {
      idatChunks.push(buf.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }

  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`Unsupported PNG format (bitDepth=${bitDepth}, colorType=${colorType})`);
  }

  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const recon = new Uint8Array(height * stride);

  for (let y = 0; y < height; y++) {
    const inRow = y * (stride + 1);
    const filter = inflated[inRow];
    const outRow = y * stride;
    const prevRow = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const rawByte = inflated[inRow + 1 + x];
      const a = x >= bpp ? recon[outRow + x - bpp] : 0;
      const b = y > 0 ? recon[prevRow + x] : 0;
      const c = y > 0 && x >= bpp ? recon[prevRow + x - bpp] : 0;
      let val;
      if (filter === 0) val = rawByte;
      else if (filter === 1) val = rawByte + a;
      else if (filter === 2) val = rawByte + b;
      else if (filter === 3) val = rawByte + ((a + b) >> 1);
      else if (filter === 4) val = rawByte + paethPredictor(a, b, c);
      else throw new Error(`Unsupported PNG filter type ${filter}`);
      recon[outRow + x] = val & 0xff;
    }
  }

  if (colorType === 6) {
    return { width, height, data: recon };
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0, j = 0; i < recon.length; i += 3, j += 4) {
    rgba[j] = recon[i];
    rgba[j + 1] = recon[i + 1];
    rgba[j + 2] = recon[i + 2];
    rgba[j + 3] = 255;
  }
  return { width, height, data: rgba };
}

// Adaptive 255-color palette builder for GIF89a (index 255 reserved for delta transparency)
function buildGlobalPalette(frames, width, height) {
  const counts = new Map();
  const totalPixels = width * height;
  const frameStep = Math.max(1, Math.floor(frames.length / 20));
  const pixStep = Math.max(1, Math.floor(totalPixels / 16000));

  for (let f = 0; f < frames.length; f += frameStep) {
    const data = frames[f];
    for (let p = 0; p < totalPixels; p += pixStep) {
      const idx = p * 4;
      const r = data[idx] & 0xfc;
      const g = data[idx + 1] & 0xfc;
      const b = data[idx + 2] & 0xfc;
      const key = (r << 16) | (g << 8) | b;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const palette = [];
  const usedKeys = new Set();
  for (const [key] of sorted) {
    if (palette.length >= 255) break;
    const r = (key >> 16) & 0xff;
    const g = (key >> 8) & 0xff;
    const b = key & 0xff;
    let tooClose = false;
    if (sorted.length > 255 && palette.length > 16) {
      for (let i = 0; i < palette.length; i++) {
        const pr = palette[i][0];
        const pg = palette[i][1];
        const pb = palette[i][2];
        const dist2 = (r - pr) * (r - pr) + (g - pg) * (g - pg) + (b - pb) * (b - pb);
        if (dist2 < 36) {
          tooClose = true;
          break;
        }
      }
    }
    if (!tooClose) {
      palette.push([r, g, b]);
      usedKeys.add(key);
    }
  }

  for (const [key] of sorted) {
    if (palette.length >= 255) break;
    if (usedKeys.has(key)) continue;
    const r = (key >> 16) & 0xff;
    const g = (key >> 8) & 0xff;
    const b = key & 0xff;
    palette.push([r, g, b]);
  }
  while (palette.length < 256) {
    palette.push([0, 0, 0]);
  }
  return palette;
}

function mapFrameToIndices(rgba, totalPixels, palette, cache) {
  const indices = new Uint8Array(totalPixels);
  const solidCount = 255; // index 255 reserved for transparent unchanged pixels
  for (let p = 0; p < totalPixels; p++) {
    const idx = p * 4;
    const r = rgba[idx] & 0xfc;
    const g = rgba[idx + 1] & 0xfc;
    const b = rgba[idx + 2] & 0xfc;
    const key = (r << 16) | (g << 8) | b;
    let best = cache.get(key);
    if (best === undefined) {
      let minDist = Infinity;
      best = 0;
      for (let i = 0; i < solidCount; i++) {
        const pr = palette[i][0];
        const pg = palette[i][1];
        const pb = palette[i][2];
        const d = (r - pr) * (r - pr) + (g - pg) * (g - pg) + (b - pb) * (b - pb);
        if (d < minDist) {
          minDist = d;
          best = i;
          if (d === 0) break;
        }
      }
      cache.set(key, best);
    }
    indices[p] = best;
  }
  return indices;
}

// LZW encoder for GIF89a 8-bit indices
function lzwEncode(indices) {
  const minCodeSize = 8;
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;

  const outBytes = [];
  let bitBuf = 0;
  let bitCount = 0;

  function emitCode(code, size) {
    bitBuf |= code << bitCount;
    bitCount += size;
    while (bitCount >= 8) {
      outBytes.push(bitBuf & 0xff);
      bitBuf >>= 8;
      bitCount -= 8;
    }
  }

  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  let table = new Map();

  emitCode(clearCode, codeSize);

  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    const found = table.get(key);
    if (found !== undefined) {
      prefix = found;
    } else {
      emitCode(prefix, codeSize);
      if (nextCode < 4096) {
        table.set(key, nextCode);
        nextCode++;
        if (nextCode > (1 << codeSize) && codeSize < 12) {
          codeSize++;
        }
      } else {
        emitCode(clearCode, codeSize);
        table.clear();
        codeSize = minCodeSize + 1;
        nextCode = eoiCode + 1;
      }
      prefix = k;
    }
  }

  emitCode(prefix, codeSize);
  emitCode(eoiCode, codeSize);
  if (bitCount > 0) {
    outBytes.push(bitBuf & 0xff);
  }

  const chunks = [Buffer.from([minCodeSize])];
  let offset = 0;
  while (offset < outBytes.length) {
    const size = Math.min(255, outBytes.length - offset);
    const block = Buffer.alloc(1 + size);
    block[0] = size;
    for (let i = 0; i < size; i++) {
      block[1 + i] = outBytes[offset + i];
    }
    chunks.push(block);
    offset += size;
  }
  chunks.push(Buffer.from([0x00]));
  return Buffer.concat(chunks);
}

const TRANSPARENT_GIF_INDEX = 255;

export function encodeGIF(frames, width, height, fps = 24, opts = {}) {
  if (!frames.length) throw new Error("encodeGIF requires at least 1 frame.");

  const ffmpegPath = opts.pureJs ? null : findBinary("ffmpeg", ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"]);
  if (ffmpegPath && opts.useFFmpeg !== false) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "loop-studio-gif-"));
    const tmpRaw = path.join(tmpDir, "frames.rgba");
    const tmpPal = path.join(tmpDir, "palette.png");
    const tmpGif = path.join(tmpDir, "out.gif");
    try {
      const fd = fs.openSync(tmpRaw, "w");
      for (const frame of frames) fs.writeSync(fd, frame);
      fs.closeSync(fd);
      const gifFps = Math.min(50, Math.max(1, fps));
      const p1 = spawnSync(
        ffmpegPath,
        ["-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${width}x${height}`, "-r", String(gifFps), "-i", tmpRaw, "-vf", "palettegen=stats_mode=diff", tmpPal],
        { encoding: "utf8" }
      );
      if (p1.status === 0) {
        const p2 = spawnSync(
          ffmpegPath,
          [
            "-y",
            "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${width}x${height}`, "-r", String(gifFps), "-i", tmpRaw,
            "-i", tmpPal,
            "-lavfi", "paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle",
            "-loop", "0",
            tmpGif
          ],
          { encoding: "utf8" }
        );
        if (p2.status === 0 && fs.existsSync(tmpGif)) {
          return fs.readFileSync(tmpGif);
        }
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  const palette = buildGlobalPalette(frames, width, height);
  const cache = new Map();
  const totalPixels = width * height;
  // GIF89a stores frame delay in centiseconds; 2cs (50fps) is the fastest reliable browser speed
  const delayCs = Math.max(2, Math.round(100 / fps));

  const header = Buffer.alloc(13);
  header.write("GIF89a", 0, "ascii");
  header.writeUInt16LE(width, 6);
  header.writeUInt16LE(height, 8);
  header[10] = 0xf7;
  header[11] = 0;
  header[12] = 0;

  const gct = Buffer.alloc(256 * 3);
  for (let i = 0; i < 256; i++) {
    gct[i * 3] = palette[i][0];
    gct[i * 3 + 1] = palette[i][1];
    gct[i * 3 + 2] = palette[i][2];
  }

  const netscape = Buffer.from([
    0x21, 0xff, 0x0b,
    0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
    0x03, 0x01, 0x00, 0x00, 0x00
  ]);

  const parts = [header, gct, netscape];
  let prevIndices = null;

  for (let f = 0; f < frames.length; f++) {
    const indices = mapFrameToIndices(frames[f], totalPixels, palette, cache);

    if (f === 0 || opts.delta === false) {
      prevIndices = new Uint8Array(indices);
      const gce = Buffer.alloc(8);
      gce[0] = 0x21;
      gce[1] = 0xf9;
      gce[2] = 0x04;
      gce[3] = 0x04; // Disposal 1, no transparent index
      gce.writeUInt16LE(delayCs, 4);
      gce[6] = 0x00;
      gce[7] = 0x00;

      const imgDesc = Buffer.alloc(10);
      imgDesc[0] = 0x2c;
      imgDesc.writeUInt16LE(0, 1);
      imgDesc.writeUInt16LE(0, 3);
      imgDesc.writeUInt16LE(width, 5);
      imgDesc.writeUInt16LE(height, 7);
      imgDesc[9] = 0x00;

      parts.push(gce, imgDesc, lzwEncode(indices));
      continue;
    }

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
      const rowOff = y * width;
      for (let x = 0; x < width; x++) {
        const p = rowOff + x;
        if (indices[p] !== prevIndices[p]) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const gce = Buffer.alloc(8);
    gce[0] = 0x21;
    gce[1] = 0xf9;
    gce[2] = 0x04;
    gce[3] = 0x05; // Disposal 1 (Do Not Dispose) + Transparent Color Flag (bit 0)
    gce.writeUInt16LE(delayCs, 4);
    gce[6] = TRANSPARENT_GIF_INDEX;
    gce[7] = 0x00;

    if (maxX < minX) {
      const imgDesc = Buffer.alloc(10);
      imgDesc[0] = 0x2c;
      imgDesc.writeUInt16LE(0, 1);
      imgDesc.writeUInt16LE(0, 3);
      imgDesc.writeUInt16LE(1, 5);
      imgDesc.writeUInt16LE(1, 7);
      imgDesc[9] = 0x00;
      parts.push(gce, imgDesc, lzwEncode(new Uint8Array([TRANSPARENT_GIF_INDEX])));
      continue;
    }

    const dirtyW = maxX - minX + 1;
    const dirtyH = maxY - minY + 1;
    const subIndices = new Uint8Array(dirtyW * dirtyH);

    for (let dy = 0; dy < dirtyH; dy++) {
      const srcRow = (minY + dy) * width + minX;
      const dstRow = dy * dirtyW;
      for (let dx = 0; dx < dirtyW; dx++) {
        const p = srcRow + dx;
        if (indices[p] === prevIndices[p]) {
          subIndices[dstRow + dx] = TRANSPARENT_GIF_INDEX;
        } else {
          subIndices[dstRow + dx] = indices[p];
          prevIndices[p] = indices[p];
        }
      }
    }

    const imgDesc = Buffer.alloc(10);
    imgDesc[0] = 0x2c;
    imgDesc.writeUInt16LE(minX, 1);
    imgDesc.writeUInt16LE(minY, 3);
    imgDesc.writeUInt16LE(dirtyW, 5);
    imgDesc.writeUInt16LE(dirtyH, 7);
    imgDesc[9] = 0x00;

    parts.push(gce, imgDesc, lzwEncode(subIndices));
  }

  parts.push(Buffer.from([0x3b]));
  return Buffer.concat(parts);
}

function findBinary(name, extraPaths = []) {
  const direct = spawnSync("which", [name], { encoding: "utf8" });
  if (direct.status === 0 && direct.stdout.trim()) {
    return direct.stdout.trim().split("\n")[0];
  }
  for (const p of extraPaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function detectFFmpeg() {
  return Boolean(findBinary("ffmpeg", ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"]));
}

function findChromeBinary() {
  const candidates = [
    process.env.LOOP_CHROME_PATH,
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  for (const bin of ["google-chrome", "chromium", "chromium-browser", "chrome"]) {
    const found = findBinary(bin);
    if (found) return found;
  }

  const pwCache = path.join(os.homedir(), ".cache", "ms-playwright");
  if (fs.existsSync(pwCache)) {
    try {
      const dirs = fs.readdirSync(pwCache).filter((d) => d.startsWith("chromium"));
      for (const d of dirs.sort().reverse()) {
        const linuxBin = path.join(pwCache, d, "chrome-linux", "chrome");
        const macBin = path.join(pwCache, d, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium");
        if (fs.existsSync(linuxBin)) return linuxBin;
        if (fs.existsSync(macBin)) return macBin;
      }
    } catch {
      // Ignore permission errors scanning cache
    }
  }
  return null;
}

export function detectCapabilities() {
  const ffmpegPath = findBinary("ffmpeg", ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"]);
  const ffprobePath = findBinary("ffprobe", ["/opt/homebrew/bin/ffprobe", "/usr/local/bin/ffprobe"]);
  const swiftPath = process.platform === "darwin" ? findBinary("swift", ["/usr/bin/swift"]) : null;
  const swiftcPath = process.platform === "darwin" ? findBinary("swiftc", ["/usr/bin/swiftc"]) : null;
  const cwebpPath = findBinary("cwebp", ["/opt/homebrew/bin/cwebp", "/usr/local/bin/cwebp"]);
  const webpmuxPath = findBinary("webpmux", ["/opt/homebrew/bin/webpmux", "/usr/local/bin/webpmux"]);
  const img2webpPath = findBinary("img2webp", ["/opt/homebrew/bin/img2webp", "/usr/local/bin/img2webp"]);
  const chromePath = findChromeBinary();
  const macosWebKit = Boolean(process.platform === "darwin" && swiftPath && fs.existsSync(SWIFT_WEBKIT_SCRIPT));

  return {
    ffmpeg: Boolean(ffmpegPath),
    ffmpegPath,
    ffprobe: Boolean(ffprobePath),
    ffprobePath,
    macosAVFoundation: Boolean(swiftPath && fs.existsSync(SWIFT_MP4_SCRIPT)),
    macosWebKit,
    swiftPath,
    swiftcPath,
    headlessChrome: Boolean(chromePath),
    chromePath,
    browserEngine: macosWebKit ? "webkit" : chromePath ? "chromium" : null,
    animatedWebP: Boolean(img2webpPath || (cwebpPath && webpmuxPath) || ffmpegPath),
    img2webpPath,
    cwebpPath,
    webpmuxPath
  };
}

export function encodeMP4(frames, width, height, fps = 30, outPath) {
  const caps = detectCapabilities();
  const absOut = path.resolve(outPath);

  if (caps.ffmpegPath) {
    const tmpRaw = path.join(os.tmpdir(), `loop-studio-${process.pid}-${Date.now()}.rgba`);
    try {
      const fd = fs.openSync(tmpRaw, "w");
      for (const frame of frames) fs.writeSync(fd, frame);
      fs.closeSync(fd);

      const res = spawnSync(
        caps.ffmpegPath,
        [
          "-y",
          "-f", "rawvideo",
          "-pix_fmt", "rgba",
          "-s", `${width}x${height}`,
          "-r", String(fps),
          "-i", tmpRaw,
          "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart",
          "-crf", "17",
          absOut
        ],
        { encoding: "utf8" }
      );
      if (res.status !== 0) {
        if (fs.existsSync(absOut)) fs.unlinkSync(absOut);
        throw new Error(`ffmpeg MP4 encoding failed: ${res.stderr}`);
      }
      return { backend: "ffmpeg", path: absOut, bytes: fs.statSync(absOut).size };
    } finally {
      if (fs.existsSync(tmpRaw)) fs.unlinkSync(tmpRaw);
    }
  }

  if (caps.macosAVFoundation) {
    const tmpRaw = path.join(os.tmpdir(), `loop-studio-${process.pid}-${Date.now()}.rgba`);
    try {
      const fd = fs.openSync(tmpRaw, "w");
      for (const frame of frames) fs.writeSync(fd, frame);
      fs.closeSync(fd);

      const res = spawnSync(
        caps.swiftPath,
        [SWIFT_MP4_SCRIPT, tmpRaw, String(width), String(height), String(fps), String(frames.length), absOut],
        { encoding: "utf8" }
      );
      if (res.status !== 0) {
        if (fs.existsSync(absOut)) fs.unlinkSync(absOut);
        throw new Error(`macOS AVFoundation MP4 encoding failed: ${res.stderr || res.stdout}`);
      }
      return { backend: "macos-avfoundation", path: absOut, bytes: fs.statSync(absOut).size };
    } finally {
      if (fs.existsSync(tmpRaw)) fs.unlinkSync(tmpRaw);
    }
  }

  throw new Error("No MP4 encoder found (install ffmpeg or run on macOS with Swift AVFoundation).");
}

export function encodeWebM(frames, width, height, fps = 30, outPath) {
  const caps = detectCapabilities();
  if (!caps.ffmpegPath) {
    throw new Error("WebM encoding requires ffmpeg (install via `brew install ffmpeg`).");
  }
  const absOut = path.resolve(outPath);
  const tmpRaw = path.join(os.tmpdir(), `loop-studio-webm-${process.pid}-${Date.now()}.rgba`);
  try {
    const fd = fs.openSync(tmpRaw, "w");
    for (const frame of frames) fs.writeSync(fd, frame);
    fs.closeSync(fd);

    const res = spawnSync(
      caps.ffmpegPath,
      [
        "-y",
        "-f", "rawvideo",
        "-pix_fmt", "rgba",
        "-s", `${width}x${height}`,
        "-r", String(fps),
        "-i", tmpRaw,
        "-c:v", "libvpx-vp9",
        "-pix_fmt", "yuv420p",
        "-b:v", "0",
        "-crf", "24",
        absOut
      ],
      { encoding: "utf8" }
    );
    if (res.status !== 0) {
      throw new Error(`ffmpeg WebM encoding failed: ${res.stderr}`);
    }
    return { backend: "ffmpeg", path: absOut, bytes: fs.statSync(absOut).size };
  } finally {
    if (fs.existsSync(tmpRaw)) fs.unlinkSync(tmpRaw);
  }
}

export function encodeAnimatedWebP(frames, width, height, fps = 30, outPath) {
  const caps = detectCapabilities();
  const absOut = path.resolve(outPath);
  const durationMs = Math.max(8, Math.round(1000 / fps));

  if (caps.img2webpPath) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "loop-studio-i2w-"));
    const quality = frames.length > 200 ? "80" : "86";
    try {
      const lines = [
        "-min_size",
        "-loop", "0",
        "-lossy",
        "-q", quality,
        "-m", "3",
        "-d", String(durationMs)
      ];
      for (let i = 0; i < frames.length; i++) {
        const pngPath = path.join(tmpDir, `f_${i}.png`);
        fs.writeFileSync(pngPath, encodePNG(frames[i], width, height, 1));
        lines.push(pngPath);
      }
      lines.push("-o", absOut);
      const cfgPath = path.join(tmpDir, "args.txt");
      fs.writeFileSync(cfgPath, lines.join("\n") + "\n", "utf8");

      const res = spawnSync(caps.img2webpPath, [cfgPath], { encoding: "utf8" });
      if (res.status !== 0) {
        if (fs.existsSync(absOut)) fs.unlinkSync(absOut);
        throw new Error(`img2webp failed: ${res.stderr || res.stdout}`);
      }
      return { backend: "img2webp", path: absOut, bytes: fs.statSync(absOut).size };
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  if (caps.cwebpPath && caps.webpmuxPath) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "loop-studio-webp-"));
    const quality = frames.length > 200 ? "80" : "88";
    try {
      const muxArgs = [];
      for (let i = 0; i < frames.length; i++) {
        const pngPath = path.join(tmpDir, `f_${i}.png`);
        const webpPath = path.join(tmpDir, `f_${i}.webp`);
        fs.writeFileSync(pngPath, encodePNG(frames[i], width, height, 1));
        const cw = spawnSync(caps.cwebpPath, ["-quiet", "-q", quality, pngPath, "-o", webpPath], { encoding: "utf8" });
        if (cw.status !== 0) {
          throw new Error(`cwebp failed on frame ${i}: ${cw.stderr}`);
        }
        muxArgs.push("-frame", webpPath, `+${durationMs}+0+0+1-b`);
      }
      muxArgs.push("-loop", "0", "-o", absOut);

      const mux = spawnSync(caps.webpmuxPath, muxArgs, { encoding: "utf8" });
      if (mux.status !== 0) {
        throw new Error(`webpmux failed: ${mux.stderr}`);
      }
      return { backend: "cwebp+webpmux", path: absOut, bytes: fs.statSync(absOut).size };
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  if (caps.ffmpegPath) {
    const tmpRaw = path.join(os.tmpdir(), `loop-studio-webp-${process.pid}-${Date.now()}.rgba`);
    try {
      const fd = fs.openSync(tmpRaw, "w");
      for (const frame of frames) fs.writeSync(fd, frame);
      fs.closeSync(fd);
      const res = spawnSync(
        caps.ffmpegPath,
        [
          "-y",
          "-f", "rawvideo",
          "-pix_fmt", "rgba",
          "-s", `${width}x${height}`,
          "-r", String(fps),
          "-i", tmpRaw,
          "-vcodec", "libwebp",
          "-loop", "0",
          "-q:v", "85",
          absOut
        ],
        { encoding: "utf8" }
      );
      if (res.status !== 0) {
        throw new Error(`ffmpeg WebP encoding failed: ${res.stderr}`);
      }
      return { backend: "ffmpeg", path: absOut, bytes: fs.statSync(absOut).size };
    } finally {
      if (fs.existsSync(tmpRaw)) fs.unlinkSync(tmpRaw);
    }
  }

  throw new Error("No Animated WebP encoder found (requires img2webp, cwebp+webpmux, or ffmpeg).");
}

const VIDEO_EXTS = new Set([".gif", ".mp4", ".m4v", ".mov", ".webm", ".webp", ".apng"]);
const LOSSY_EXTS = new Set([".mp4", ".m4v", ".mov", ".webm", ".webp"]);

export function isVideoFilePath(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) return false;
  if (!fs.statSync(targetPath).isFile()) return false;
  return VIDEO_EXTS.has(path.extname(targetPath).toLowerCase());
}

function parseFrameRate(rateStr) {
  if (!rateStr) return 24;
  const parts = String(rateStr).split("/");
  if (parts.length === 2) {
    const num = Number(parts[0]);
    const den = Number(parts[1]);
    if (den > 0 && Number.isFinite(num)) return Number((num / den).toFixed(3));
  }
  const v = Number(rateStr);
  return Number.isFinite(v) && v > 0 ? v : 24;
}

export function probeVideoMeta(absVideoPath, caps = detectCapabilities()) {
  if (caps.ffprobePath) {
    const res = spawnSync(
      caps.ffprobePath,
      [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate,avg_frame_rate",
        "-of", "json",
        absVideoPath
      ],
      { encoding: "utf8" }
    );
    if (res.status === 0 && res.stdout) {
      const parsed = JSON.parse(res.stdout);
      const stream = parsed.streams && parsed.streams[0];
      if (stream && stream.width && stream.height) {
        return {
          width: Number(stream.width),
          height: Number(stream.height),
          fps: parseFrameRate(stream.avg_frame_rate !== "0/0" ? stream.avg_frame_rate : stream.r_frame_rate)
        };
      }
    }
  }

  if (caps.ffmpegPath) {
    const probe = spawnSync(caps.ffmpegPath, ["-hide_banner", "-i", absVideoPath], { encoding: "utf8" });
    const info = probe.stderr || "";
    const dimMatch = info.match(/,\s*(\d{2,5})x(\d{2,5})[\s,]/);
    const fpsMatch = info.match(/(\d+(?:\.\d+)?)\s*(?:fps|tbr)/);
    if (dimMatch) {
      return {
        width: Number(dimMatch[1]),
        height: Number(dimMatch[2]),
        fps: fpsMatch ? Number(fpsMatch[1]) : 24
      };
    }
  }

  const err = new Error(`Could not probe video dimensions for ${absVideoPath}.`);
  err.exitCode = 2;
  throw err;
}

export function decodeVideoFrames(videoPath) {
  const absPath = path.resolve(videoPath);
  if (!fs.existsSync(absPath)) {
    const err = new Error(`Video file not found: ${absPath}`);
    err.exitCode = 2;
    throw err;
  }

  const caps = detectCapabilities();
  if (!caps.ffmpegPath) {
    const err = new Error(
      `Auditing external video files requires ffmpeg (install via \`brew install ffmpeg\` or \`apt install ffmpeg\`). Note: rendering & auditing HTML/Shader Loop projects works natively on macOS/Chrome without ffmpeg.`
    );
    err.exitCode = 2;
    throw err;
  }

  const { width, height, fps } = probeVideoMeta(absPath, caps);
  const res = spawnSync(
    caps.ffmpegPath,
    ["-v", "error", "-i", absPath, "-f", "rawvideo", "-pix_fmt", "rgba", "-"],
    { maxBuffer: 512 * 1024 * 1024 }
  );

  if (res.status !== 0 || !res.stdout || res.stdout.length === 0) {
    const err = new Error(`ffmpeg failed to decode ${absPath}: ${res.stderr ? res.stderr.toString("utf8") : "no frame output"}`);
    err.exitCode = 2;
    throw err;
  }

  const frameSize = width * height * 4;
  const totalFrames = Math.floor(res.stdout.length / frameSize);
  if (totalFrames < 2) {
    const err = new Error(`Expected >= 2 video frames in ${absPath}, decoded ${totalFrames}.`);
    err.exitCode = 2;
    throw err;
  }

  const frames = [];
  for (let i = 0; i < totalFrames; i++) {
    const start = i * frameSize;
    frames.push(new Uint8Array(res.stdout.subarray(start, start + frameSize)));
  }

  const ext = path.extname(absPath).toLowerCase();
  return {
    path: absPath,
    bytes: fs.statSync(absPath).size,
    width,
    height,
    fps,
    totalFrames,
    lossy: LOSSY_EXTS.has(ext),
    frames
  };
}

