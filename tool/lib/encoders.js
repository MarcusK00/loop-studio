// Loop Studio — Pure-JS PNG & GIF89a Encoders + Optional FFmpeg Driver
// Zero external npm dependencies required; uses Node's built-in node:zlib.

import zlib from "node:zlib";
import { spawnSync } from "node:child_process";

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

export function encodePNG(rgba, width, height) {
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

  const compressed = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

// Adaptive 256-color palette builder for GIF89a
function buildGlobalPalette(frames, width, height) {
  const counts = new Map();
  const totalPixels = width * height;
  const frameStep = Math.max(1, Math.floor(frames.length / 16));
  const pixStep = Math.max(1, Math.floor(totalPixels / 12000));

  for (let f = 0; f < frames.length; f += frameStep) {
    const data = frames[f];
    for (let p = 0; p < totalPixels; p += pixStep) {
      const idx = p * 4;
      // Quantize to 6-6-6 bits (18-bit key) to preserve exact UI/palette colors and smooth steps
      const r = data[idx] & 0xfc;
      const g = data[idx + 1] & 0xfc;
      const b = data[idx + 2] & 0xfc;
      const key = (r << 16) | (g << 8) | b;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const palette = [];
  for (const [key] of sorted) {
    if (palette.length >= 256) break;
    const r = (key >> 16) & 0xff;
    const g = (key >> 8) & 0xff;
    const b = key & 0xff;
    // Avoid adding near-duplicate colors if we have plenty of candidates
    let tooClose = false;
    if (sorted.length > 256 && palette.length > 16) {
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
    if (!tooClose) palette.push([r, g, b]);
  }

  // Fill any remaining slots if needed
  for (const [key] of sorted) {
    if (palette.length >= 256) break;
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
      for (let i = 0; i < palette.length; i++) {
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
  const clearCode = 1 << minCodeSize; // 256
  const eoiCode = clearCode + 1; // 257

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

  let codeSize = minCodeSize + 1; // 9
  let nextCode = eoiCode + 1; // 258
  // Flat hash table / Map from (prefix << 8) | suffix -> code
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

  // Pack into GIF sub-blocks of max 255 bytes
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
  chunks.push(Buffer.from([0x00])); // Block terminator
  return Buffer.concat(chunks);
}

export function encodeGIF(frames, width, height, fps = 24) {
  const palette = buildGlobalPalette(frames, width, height);
  const cache = new Map();
  const totalPixels = width * height;
  const delayCs = Math.max(2, Math.round(100 / fps));

  const header = Buffer.alloc(13);
  header.write("GIF89a", 0, "ascii");
  header.writeUInt16LE(width, 6);
  header.writeUInt16LE(height, 8);
  header[10] = 0xf7; // Global Color Table flag (1), color res (7), sort (0), size 2^(7+1)=256
  header[11] = 0; // bg color index
  header[12] = 0; // pixel aspect ratio

  const gct = Buffer.alloc(256 * 3);
  for (let i = 0; i < 256; i++) {
    gct[i * 3] = palette[i][0];
    gct[i * 3 + 1] = palette[i][1];
    gct[i * 3 + 2] = palette[i][2];
  }

  // Netscape 2.0 infinite loop extension
  const netscape = Buffer.from([
    0x21, 0xff, 0x0b,
    0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
    0x03, 0x01, 0x00, 0x00, 0x00
  ]);

  const parts = [header, gct, netscape];

  for (let f = 0; f < frames.length; f++) {
    const gce = Buffer.alloc(8);
    gce[0] = 0x21; // Extension Introducer
    gce[1] = 0xf9; // Graphic Control Label
    gce[2] = 0x04; // Byte size
    gce[3] = 0x04; // Disposal method 1 (Do not dispose / overwrite)
    gce.writeUInt16LE(delayCs, 4);
    gce[6] = 0x00;
    gce[7] = 0x00;

    const imgDesc = Buffer.alloc(10);
    imgDesc[0] = 0x2c; // Image Separator
    imgDesc.writeUInt16LE(0, 1);
    imgDesc.writeUInt16LE(0, 3);
    imgDesc.writeUInt16LE(width, 5);
    imgDesc.writeUInt16LE(height, 7);
    imgDesc[9] = 0x00; // Use Global Color Table

    const indices = mapFrameToIndices(frames[f], totalPixels, palette, cache);
    const lzw = lzwEncode(indices);
    parts.push(gce, imgDesc, lzw);
  }

  parts.push(Buffer.from([0x3b])); // GIF Trailer
  return Buffer.concat(parts);
}

export function detectFFmpeg() {
  const res = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  return res.status === 0;
}
