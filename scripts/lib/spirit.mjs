// The fluffy spirit character (tab indicator and calendar art), in a 100x100 unit box (y down).
export const BODY = { cx: 50, cy: 57, r: 22 };
const deg = Math.PI / 180;
// Tufts: angle (deg, 0 = right, -90 = up), length beyond the core, lead/trail half-widths, tip lean
// (positive curls clockwise) and profile exponent (<1 gives convex, flame-like sides).
const tufts = [
  { a: -104, len: 15, lead: 15, trail: 18, lean: -2, k: 1.2 },  // ear
  { a: -66, len: 3.5, lead: 10, trail: 13, lean: 9, k: 0.75 },
  { a: -40, len: 11, lead: 13, trail: 22, lean: -16, k: 0.85 },  // big upper-right flame
  { a: -5, len: 4.5, lead: 11, trail: 17, lean: 11, k: 0.75 },
  { a: 25, len: 5, lead: 11, trail: 17, lean: 12, k: 0.75 },
  { a: 55, len: 4, lead: 10, trail: 15, lean: 12, k: 0.75 },
  { a: 82, len: 2, lead: 8, trail: 10, lean: 8, k: 0.75 },
  { a: 126, len: 4.5, lead: 17, trail: 10, lean: 13, k: 0.75 },
  { a: 158, len: 5.5, lead: 17, trail: 10, lean: 13, k: 0.75 },
  { a: 190, len: 4.5, lead: 16, trail: 10, lean: 12, k: 0.75 },
  { a: 220, len: 3.5, lead: 14, trail: 9, lean: 10, k: 0.75 },
];
function wrap(d) { while (d > 180) d -= 360; while (d < -180) d += 360; return d; }
export function bodyPolygon(samples = 1440) {
  const points = [];
  for (let i = 0; i < samples; i++) {
    const t = -180 + (360 * i) / samples;
    let bump = 0, lean = 0;
    for (const tuft of tufts) {
      const d = wrap(t - tuft.a);
      const w = d < 0 ? tuft.lead : tuft.trail;
      if (Math.abs(d) >= w) continue;
      const v = tuft.len * Math.pow(1 - Math.abs(d) / w, tuft.k);
      if (v > bump) { bump = v; lean = tuft.lean * (v / tuft.len); }
    }
    const r = BODY.r + 0.6 * Math.sin(t * deg * 3 + 0.6) + bump;
    const angle = (t + lean) * deg;
    points.push([BODY.cx + r * Math.cos(angle), BODY.cy + r * Math.sin(angle)]);
  }
  return points;
}
// A tapered stroke along a cubic centreline, from width w0 to w1.
export function taperedStroke(p0, p1, p2, p3, w0, w1, samples = 120) {
  const centre = [], left = [], right = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples, u = 1 - t;
    centre.push([u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
      u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]]);
  }
  for (let i = 0; i <= samples; i++) {
    const a = centre[Math.max(0, i - 1)], b = centre[Math.min(samples, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const t = i / samples, w = (w0 + (w1 - w0) * Math.pow(t, 0.8)) / 2;
    left.push([centre[i][0] - (dy / len) * w, centre[i][1] + (dx / len) * w]);
    right.push([centre[i][0] + (dy / len) * w, centre[i][1] - (dx / len) * w]);
  }
  return [...left, ...right.reverse()];
}
export const tail = taperedStroke([50, 71], [47, 82], [41, 87], [56, 88], 11, 0);
// Inner ear: a thin line inside the ear, drawn darker or lighter than the body.
export const innerEar = taperedStroke([41, 45], [40, 40], [41, 34.5], [43, 31], 1.7, 0.3);
// Places a unit-box polygon at `scale` units per box unit with its box origin at (x, y).
export const place = (polygon, scale, x, y) => polygon.map(([px, py]) => [x + px * scale, y + py * scale]);
