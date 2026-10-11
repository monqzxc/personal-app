// Generates assets/tab-indicator(@2x,@3x).png: a white alpha mask (fluffy body, ear, tail and soft glow)
// that LiquidTabBar tints at runtime. After changing the shape, copy the printed bounds into INDICATOR_ART.
// Usage: node scripts/tab-indicator.mjs [--preview <dir>]   (the preview is lavender over the bar colour)
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blur, hex, maskPng, previewPng, rasterize } from './lib/raster.mjs';
import { BODY, bodyPolygon, innerEar, tail } from './lib/spirit.mjs';

const outDir = fileURLToPath(new URL('../assets/', import.meta.url));
const previewDir = process.argv[2] === '--preview' ? process.argv[3] ?? '.' : null;

function render(size) {
  const shape = rasterize([bodyPolygon(), tail], size, size, size / 100);
  const ear = rasterize([innerEar], size, size, size / 100);
  const glow = blur(shape, size, size, Math.max(1, Math.round(size * 0.028)));
  const alpha = new Float32Array(size * size);
  for (let i = 0; i < alpha.length; i++) {
    const body = shape[i] * (1 - 0.42 * ear[i]);
    alpha[i] = body + Math.min(1, 0.85 * glow[i]) * (1 - shape[i]);
  }
  return { alpha, shape };
}
// Visible-shape bounds in units, for the layout constants.
function bounds(shape, size) {
  let minX = size, maxX = 0, minY = size, maxY = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (shape[y * size + x] > 0.5) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const u = v => +(v / size * 100).toFixed(1);
  return { left: u(minX), right: u(maxX + 1), top: u(minY), bottom: u(maxY + 1) };
}

if (previewDir) {
  mkdirSync(previewDir, { recursive: true });
  writeFileSync(join(previewDir, 'tab-indicator-preview.png'), previewPng(400, 400, hex('#35204F'), [{ alpha: render(400).alpha, color: hex('#C8A7FF') }]));
} else {
  for (const [suffix, size] of [['', 128], ['@2x', 256], ['@3x', 384]]) {
    const { alpha, shape } = render(size);
    writeFileSync(join(outDir, `tab-indicator${suffix}.png`), maskPng(size, size, alpha));
    if (suffix === '@3x') console.log('visible bounds (units):', JSON.stringify(bounds(shape, size)), 'body:', JSON.stringify(BODY));
  }
}
console.log('done');
