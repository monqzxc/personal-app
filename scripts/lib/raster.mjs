// Tiny dependency-free raster helpers for the generated artwork: polygon fill, blur and PNG encoding.
import { deflateSync } from 'node:zlib';

// Nonzero scanline fill with 4x4 supersampling. Polygons are in art units; `scale` is pixels per unit.
export function rasterize(polygons, width, height, scale, ss = 4) {
  const nx = width * ss, ny = height * ss, s = scale * ss;
  const hits = new Uint8Array(nx * ny);
  for (const poly of polygons) {
    const pts = poly.map(([x, y]) => [x * s, y * s]);
    for (let row = 0; row < ny; row++) {
      const y = row + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push([x0 + ((y - y0) / (y1 - y0)) * (x1 - x0), y1 > y0 ? 1 : -1]);
      }
      xs.sort((a, b) => a[0] - b[0]);
      let winding = 0;
      for (let i = 0; i < xs.length - 1; i++) {
        winding += xs[i][1];
        if (winding === 0) continue;
        const from = Math.max(0, Math.ceil(xs[i][0] - 0.5)), to = Math.min(nx - 1, Math.floor(xs[i + 1][0] - 0.5));
        for (let col = from; col <= to; col++) hits[row * nx + col] = 1;
      }
    }
  }
  const alpha = new Float32Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) sum += hits[(y * ss + sy) * nx + x * ss + sx];
    alpha[y * width + x] = sum / (ss * ss);
  }
  return alpha;
}

// Three box passes approximate a Gaussian.
export function blur(src, width, height, radius) {
  let a = Float32Array.from(src), b = new Float32Array(width * height);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < height; y++) { let acc = 0; for (let x = -radius; x < width + radius; x++) {
      acc += a[y * width + Math.min(width - 1, Math.max(0, x + radius))] * (x + radius < width ? 1 : 0);
      const out = x - radius - 1; if (out >= 0) acc -= a[y * width + out];
      if (x >= 0 && x < width) b[y * width + x] = acc / (2 * radius + 1);
    } }
    [a, b] = [b, a];
    for (let x = 0; x < width; x++) { let acc = 0; for (let y = -radius; y < height + radius; y++) {
      acc += y + radius < height ? a[(y + radius) * width + x] : 0;
      const out = y - radius - 1; if (out >= 0) acc -= a[out * width + x];
      if (y >= 0 && y < height) b[y * width + x] = acc / (2 * radius + 1);
    } }
    [a, b] = [b, a];
  }
  return a;
}

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) { let c = 0xffffffff; for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
export function png(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width * 4 + 1)] = 0; rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4); }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// A white mask whose alpha is tinted at runtime with Image `tintColor`.
export function maskPng(width, height, alpha) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) { rgba.fill(255, i * 4, i * 4 + 3); rgba[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, alpha[i])) * 255); }
  return png(width, height, rgba);
}

// Composites tinted masks over a background colour, for checking art against a reference.
export function previewPng(width, height, background, layers) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const colour = [...background];
    for (const { alpha, color } of layers) {
      const a = Math.max(0, Math.min(1, alpha[i]));
      for (let c = 0; c < 3; c++) colour[c] = colour[c] * (1 - a) + color[c] * a;
    }
    for (let c = 0; c < 3; c++) rgba[i * 4 + c] = Math.round(colour[c]);
    rgba[i * 4 + 3] = 255;
  }
  return png(width, height, rgba);
}
export const hex = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
