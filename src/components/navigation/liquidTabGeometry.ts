export const LIQUID_BAR_TOP = 24;
// Silhouette of assets/tab-indicator.png as fractions of the image (from scripts/tab-indicator.mjs): body centre and visible bounds.
export const INDICATOR_ART = { bodyX: 0.5, bodyY: 0.57, left: 0.227, right: 0.766, top: 0.211, bottom: 0.88 };
// Peak squash-and-stretch while the indicator travels: scale deltas, tilt in degrees, hop in dp.
export const INDICATOR_WAVE = { stretch: 0.12, squash: 0.1, tilt: 6, hop: 4 };
const ICON_CENTER = 24; // resting tab icons are centred this far below the bar top
export const liquidBodyHeight = (fontScale = 1) => 70 + Math.max(0, fontScale - 1) * 18;
export const liquidBarHeight = (bottomInset: number, fontScale = 1) => LIQUID_BAR_TOP + liquidBodyHeight(fontScale) + Math.max(12, bottomInset) + 8;

export function liquidTabGeometry(width: number, count: number) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isInteger(count) || count < 1) throw new Error('Invalid tab bar dimensions');
  // A compact bar keeps touch targets reachable in very narrow split-screen windows.
  const corner = width < 300 ? 14 : 20;
  const shoulder = width < 300 ? 8 : 10;
  const compact = width < (count - 1) * 44 + 2 * (corner + shoulder + 24);
  const radius = Math.min(33, (width - (count - 1) * 44) / 2 - corner - shoulder - 2);
  const notchRadius = compact ? 0 : radius;
  const inset = notchRadius + shoulder + corner + 2;
  const step = compact ? width / count : count === 1 ? 0 : (width - 2 * inset) / (count - 1);
  const first = count === 1 ? width / 2 : compact ? step / 2 : inset;
  const bubbleSize = compact ? Math.max(0, Math.min(42, step - 6)) : 2 * notchRadius - 12;
  // The body sits a little below the notch centre so the ear can rise above the bar.
  const indicatorCenter = compact ? ICON_CENTER : shoulder + 7;
  return { compact, corner, shoulder, notchRadius, first, step, bubbleSize,
    indicatorSize: bubbleSize * (compact ? 1.5 : 1.75), indicatorCenter, iconLift: ICON_CENTER - indicatorCenter,
    touchWidth: compact ? step : Math.min(72, count === 1 ? width : step),
    centers: Array.from({ length: count }, (_, index) => first + index * step) };
}
export type LiquidTabGeometry = ReturnType<typeof liquidTabGeometry>;
