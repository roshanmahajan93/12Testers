#!/usr/bin/env node
/**
 * Generates the original 12Testers brand assets (no third-party art):
 * a ring of 12 gradient segments (the 12 testers) around a check mark.
 * Pure Node — renders with signed-distance shapes + 4×4 supersampling and writes PNGs via zlib.
 *
 *   node scripts/generate-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const OUT = path.resolve(import.meta.dirname, '../assets/images');
const BG = [11, 11, 20];
const VIOLET = [139, 108, 255];
const GREEN = [34, 224, 168];

// ---------- PNG encoding ----------
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePng(file, size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(path.join(OUT, file), png);
  console.log('wrote', file, size);
}

// ---------- shapes (unit space: -1..1) ----------
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => c1.map((v, i) => lerp(v, c2[i], t));

function segDist(px, py, ax, ay, bx, by) {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h);
}

/** Returns {cover, color} for the glyph at a point, glyph scaled by `s`. */
function glyph(x, y, s, mono) {
  x /= s;
  y /= s;
  const r = Math.hypot(x, y);
  // Ring of 12 segments.
  const R = 0.78, T = 0.13;
  let angle = Math.atan2(y, x) + Math.PI / 2; // 0 at top
  if (angle < 0) angle += Math.PI * 2;
  const seg = (Math.PI * 2) / 12;
  const within = (angle % seg) / seg; // 0..1 inside a segment slot
  const gapHalf = 0.13;
  const inRing = Math.abs(r - R) < T / 2 && within > gapHalf && within < 1 - gapHalf;
  if (inRing) {
    const t = angle / (Math.PI * 2);
    return mono ? [255, 255, 255] : mix(VIOLET, GREEN, 0.5 - 0.5 * Math.cos(t * Math.PI * 2));
  }
  // Check mark.
  const w = 0.105;
  const d = Math.min(segDist(x, y, -0.3, 0.02, -0.08, 0.24), segDist(x, y, -0.08, 0.24, 0.34, -0.2));
  if (d < w) return mono ? [255, 255, 255] : [244, 244, 250];
  return null;
}

function render(size, { background, scale, mono = false, rounded = 0 }) {
  const buf = Buffer.alloc(size * size * 4);
  const SS = 4;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = ((px + (sx + 0.5) / SS) / size) * 2 - 1;
          const y = ((py + (sy + 0.5) / SS) / size) * 2 - 1;
          if (rounded) {
            const q = Math.max(Math.abs(x) - (1 - rounded), 0) ** 2 + Math.max(Math.abs(y) - (1 - rounded), 0) ** 2;
            if (Math.sqrt(q) > rounded) continue;
          }
          const c = glyph(x, y, scale, mono);
          if (c) {
            r += c[0]; g += c[1]; b += c[2]; a += 255;
          } else if (background) {
            const bg = typeof background === 'function' ? background(x, y) : background;
            r += bg[0]; g += bg[1]; b += bg[2]; a += 255;
          }
        }
      }
      const n = SS * SS;
      const o = (py * size + px) * 4;
      const alpha = a / n;
      buf[o] = alpha ? Math.round((r / n) * (255 / alpha)) : 0;
      buf[o + 1] = alpha ? Math.round((g / n) * (255 / alpha)) : 0;
      buf[o + 2] = alpha ? Math.round((b / n) * (255 / alpha)) : 0;
      buf[o + 3] = Math.round(alpha);
    }
  }
  return buf;
}

const glowBg = (x, y) => {
  const d = Math.hypot(x, y + 0.2);
  const glow = Math.max(0, 1 - d / 1.4) * 0.22;
  return mix(BG, VIOLET, glow);
};

fs.mkdirSync(OUT, { recursive: true });
writePng('icon.png', 1024, render(1024, { background: glowBg, scale: 0.62 }));
writePng('android-icon-background.png', 1024, render(1024, { background: glowBg, scale: 0 }));
writePng('android-icon-foreground.png', 1024, render(1024, { background: null, scale: 0.44 }));
writePng('android-icon-monochrome.png', 1024, render(1024, { background: null, scale: 0.44, mono: true }));
writePng('splash-icon.png', 512, render(512, { background: null, scale: 0.9 }));
writePng('favicon.png', 64, render(64, { background: BG, scale: 0.8, rounded: 0.3 }));
writePng('notification-icon.png', 96, render(96, { background: null, scale: 0.9, mono: true }));
