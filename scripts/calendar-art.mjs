// Generates the Calendar screen artwork as white alpha masks tinted at runtime (see CalendarScreen):
//   calendar-spirit-shade / -light: the fluffy spirit peeking from clouds (header, 230x160 dp)
//   agenda-ghost-body / -face:      a small sheet ghost trailing a wisp (agenda heading, 130x56 dp)
// Usage: node scripts/calendar-art.mjs [--preview <dir>]   (previews composite both themes)
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blur, hex, maskPng, previewPng, rasterize } from './lib/raster.mjs';
import { bodyPolygon, innerEar, place, taperedStroke, tail } from './lib/spirit.mjs';

const outDir = fileURLToPath(new URL('../assets/', import.meta.url));
const previewDir = process.argv[2] === '--preview' ? process.argv[3] ?? '.' : null;
export const HEADER = { width: 230, height: 160 };
export const GHOST = { width: 130, height: 56 };

const smooth = (from, to, v) => { const t = Math.max(0, Math.min(1, (v - from) / (to - from))); return t * t * (3 - 2 * t); };
const circle = (cx, cy, r, n = 96) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(2 * Math.PI * i / n), cy + r * Math.sin(2 * Math.PI * i / n)]);
const ellipse = (cx, cy, rx, ry, n = 48) => Array.from({ length: n }, (_, i) => [cx + rx * Math.cos(2 * Math.PI * i / n), cy + ry * Math.sin(2 * Math.PI * i / n)]);
const rotate = (poly, degrees, cx, cy) => { const a = degrees * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return poly.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };
// Four-point sparkle with slightly concave sides.
const sparkle = (cx, cy, r) => Array.from({ length: 64 }, (_, i) => {
  const t = 2 * Math.PI * i / 64, k = Math.pow(Math.abs(Math.cos(2 * t)), 3), radius = r * (0.24 + 0.76 * k);
  return [cx + radius * Math.cos(t), cy + radius * Math.sin(t)];
});
// Slanted mischievous eye: straight upper lid from the outer to the inner corner, round lower edge.
const eye = (outer, inner, control) => {
  const points = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40, u = 1 - t;
    points.push([u * u * inner[0] + 2 * u * t * control[0] + t * t * outer[0], u * u * inner[1] + 2 * u * t * control[1] + t * t * outer[1]]); }
  return points;
};
const clamp = v => Math.max(0, Math.min(1, v));
const union = (...values) => 1 - values.reduce((keep, v) => keep * (1 - clamp(v)), 1);
const edge = (shape, soft) => shape * (1 - clamp((soft - 0.8) * 6));
const map = (width, height, fn) => { const out = new Float32Array(width * height); for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) out[y * width + x] = fn(x, y, y * width + x); return out; };

function header(s) {
  const W = HEADER.width * s, H = HEADER.height * s, k = 2.6;
  const fill = polys => rasterize(polys, W, H, s);
  // Spirit body centred at (180, 128): its right side and lower body run off the canvas, under the clouds.
  const ox = 180 - 50 * k, oy = 128 - 57 * k;
  const creature = fill([place(bodyPolygon(), k, ox, oy), place(tail, k, ox, oy)]);
  const ear = fill([place(innerEar, k, ox, oy)]);
  const clouds = fill([[70, 162, 12], [98, 158, 16], [124, 152, 19], [151, 160, 18], [178, 151, 20], [205, 158, 19], [229, 147, 18], [244, 160, 18]].map(([x, y, r]) => circle(x, y, r)));
  const eyes = fill([eye([134, 103], [170, 117], [148, 139]), eye([226, 103], [190, 117], [212, 139])]);
  const stars = fill([sparkle(62, 38, 11), sparkle(36, 76, 4.5), sparkle(100, 16, 3.5), sparkle(118, 72, 3)]);
  const px = v => Math.max(1, Math.round(v * s));
  // Rim lights come from subtracting an eroded copy (blur then threshold) of each shape.
  const soft = blur(creature, W, H, px(1.4));
  const halo = blur(creature, W, H, px(4));
  const cloudSoft = blur(clouds, W, H, px(1.2));
  const eyeGlow = blur(eyes, W, H, px(3));
  const starGlow = blur(stars, W, H, px(2.5));
  const fadeCreature = (x, y) => smooth(100 * s, 145 * s, x) * (1 - smooth(140 * s, 160 * s, y));
  const fadeClouds = (x, y) => smooth(45 * s, 115 * s, x) * (1 - smooth(148 * s, 160 * s, y));
  const shade = map(W, H, (x, y, i) => creature[i] * (1 - clouds[i]) * fadeCreature(x, y));
  const light = map(W, H, (x, y, i) => {
    const visible = (1 - clouds[i]) * fadeCreature(x, y);
    // The body runs off the right edge (the screen edge), so no rim where the canvas cuts it.
    const rim = edge(creature[i], soft[i]) * 0.9 * visible * (1 - smooth(W - 8 * s, W - 3 * s, x));
    const earLine = ear[i] * 0.55 * visible;
    const glow = halo[i] * (1 - creature[i]) * 0.22 * visible;
    const cloud = (clouds[i] * 0.2 + edge(clouds[i], cloudSoft[i]) * 0.35) * fadeClouds(x, y);
    return union(rim, earLine, glow, cloud, eyes[i], eyeGlow[i] * 0.6 * (1 - eyes[i]), stars[i], starGlow[i] * 0.5);
  });
  return { W, H, shade, light };
}

function ghost(s) {
  const W = GHOST.width * s, H = GHOST.height * s;
  const fill = polys => rasterize(polys, W, H, s);
  const head = [104, 22], tilt = 14;
  // Sheet ghost: round head, slightly flared sides and a three-scallop hem, leaning into its motion.
  const sheet = [];
  for (let i = 0; i <= 32; i++) { const a = Math.PI + Math.PI * i / 32; sheet.push([head[0] + 11 * Math.cos(a), head[1] + 11 * Math.sin(a)]); }
  sheet.push([head[0] + 12.5, head[1] + 17]);
  for (let i = 0; i <= 48; i++) { const u = i / 48; sheet.push([head[0] + 12.5 - 25 * u, head[1] + 17 + 3.2 * Math.abs(Math.sin(Math.PI * u * 3))]); }
  const body = fill([rotate(sheet, tilt, ...head)]);
  const trailPoly = taperedStroke([96, 34], [72, 50], [42, 28], [6, 41], 9, 0);
  const trail = fill([trailPoly]);
  const face = fill([rotate(ellipse(head[0] - 1.5, head[1] - 1, 1.6, 2.2), tilt, ...head), rotate(ellipse(head[0] + 5, head[1] - 1.5, 1.6, 2.2), tilt, ...head),
    rotate(taperedStroke([head[0] - 0.5, head[1] + 4], [head[0] + 0.5, head[1] + 6], [head[0] + 2.5, head[1] + 6], [head[0] + 3.8, head[1] + 4], 1.2, 1.2), tilt, ...head)]);
  const stars = fill([sparkle(123, 9, 4), sparkle(116, 48, 2.6), sparkle(66, 13, 2.2)]);
  const glow = blur(body, W, H, Math.max(1, Math.round(3 * s)));
  const trailGlow = blur(trail, W, H, Math.max(1, Math.round(2 * s)));
  const bodyLayer = map(W, H, (x, y, i) => {
    const fade = smooth(4 * s, 96 * s, x);
    return union(body[i], trail[i] * 0.5 * fade, trailGlow[i] * 0.25 * fade, glow[i] * 0.5 * (1 - body[i]), stars[i]);
  });
  return { W, H, body: bodyLayer, face: map(W, H, (x, y, i) => face[i] * body[i]) };
}

if (previewDir) {
  mkdirSync(previewDir, { recursive: true });
  const themes = { dark: { bg: '#171122', shade: '#2B1C3F', light: '#8B5CD6', face: '#25113F' }, light: { bg: '#F8F5FC', shade: '#E8DDF6', light: '#9B6BDF', face: '#25113F' } };
  const h = header(3), g = ghost(3);
  for (const [name, t] of Object.entries(themes)) {
    writeFileSync(join(previewDir, `calendar-spirit-${name}.png`), previewPng(h.W, h.H, hex(t.bg), [{ alpha: h.shade, color: hex(t.shade) }, { alpha: h.light, color: hex(t.light) }]));
    writeFileSync(join(previewDir, `agenda-ghost-${name}.png`), previewPng(g.W, g.H, hex(t.bg), [{ alpha: g.body, color: hex(t.light) }, { alpha: g.face, color: hex(t.face) }]));
  }
} else {
  for (const [suffix, s] of [['', 1], ['@2x', 2], ['@3x', 3]]) {
    const h = header(s), g = ghost(s);
    writeFileSync(join(outDir, `calendar-spirit-shade${suffix}.png`), maskPng(h.W, h.H, h.shade));
    writeFileSync(join(outDir, `calendar-spirit-light${suffix}.png`), maskPng(h.W, h.H, h.light));
    writeFileSync(join(outDir, `agenda-ghost-body${suffix}.png`), maskPng(g.W, g.H, g.body));
    writeFileSync(join(outDir, `agenda-ghost-face${suffix}.png`), maskPng(g.W, g.H, g.face));
  }
}
console.log('done');
