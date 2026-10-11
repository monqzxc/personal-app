export const LIQUID_BAR_TOP = 24;
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
  return { compact, corner, shoulder, notchRadius, first, step, bubbleSize,
    touchWidth: compact ? step : Math.min(72, count === 1 ? width : step),
    centers: Array.from({ length: count }, (_, index) => first + index * step) };
}
export type LiquidTabGeometry = ReturnType<typeof liquidTabGeometry>;
