export const DETENTS = [1, 5, 10, 15, 25, 40, 50, 75, 100, 150, 200, 300, 500];

export function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Stick to whole millions when close; otherwise keep 0.1 precision. */
export function snapToWholeMagnet(
  value: number,
  magnetRadius = 0.22,
): number {
  const tenths = roundToTenth(value);
  const nearestWhole = Math.round(tenths);
  if (Math.abs(tenths - nearestWhole) <= magnetRadius) {
    return nearestWhole;
  }
  return tenths;
}

/** Pull to milestone detents only within an absolute $M window (not %). */
export function snapToDetent(value: number, thresholdAbs = 1.25): number {
  let nearest = value;
  let nearestDiff = Infinity;

  for (const detent of DETENTS) {
    const diff = Math.abs(detent - value);
    if (diff <= thresholdAbs && diff < nearestDiff) {
      nearestDiff = diff;
      nearest = detent;
    }
  }

  return nearest;
}

/** Linear 0–100 position for markers / CSS layout. */
export function valueToPosition(value: number, min: number, max: number): number {
  if (max === min) return 0;
  const clamped = Math.max(min, Math.min(max, value));
  return ((clamped - min) / (max - min)) * 100;
}

/** $M per second — above this, treat the gesture as a fast fling. */
export const FAST_SLIDE_SPEED = 60;
/** Below this, apply whole-number magnets for fine adjustment. */
export const SLOW_SLIDE_SPEED = 18;
