export const DETENTS = [
  0, 1, 5, 10, 15, 25, 40, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 2500, 3000,
];

/** Nice ceilings for money slider max ($M). */
export const NICE_MAXES = [
  5, 10, 15, 20, 25, 40, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 750, 1000, 1500,
  2000, 2500, 3000,
];

/** Hard caps for prediction fields ($M). */
export const ABSOLUTE_MAX_DOMESTIC_OPENING = 500;
export const ABSOLUTE_MAX_INTERNATIONAL_OPENING = 1000;
export const ABSOLUTE_MAX_DOMESTIC_LIFETIME = 1200;
export const ABSOLUTE_MAX_INTERNATIONAL_LIFETIME = 2400;

/** Overshoot expand: pixels of past-edge drag per +$1M. */
export const OVERSHOOT_PX_PER_MILLION = 10;
/** Max $M added per overshoot tick. */
export const OVERSHOOT_MAX_DELTA = 4;
/**
 * Hold against the scale max (past the track edge) before a range expand.
 * Creates resistance that yields only after sustained pressure.
 */
export const OVERSHOOT_HOLD_MS = 420;
/** How long the thumb eases left after a max expand. */
export const EXPAND_ANIM_MS = 380;
/** How long the thumb eases back toward the right edge while still held. */
export const EXPAND_RETURN_MS = 280;
/** How long the thumb eases into normal slider control after leaving the edge. */
export const EXPAND_HANDOFF_MS = 200;

/** $M added to the scale max when current max is below this threshold. */
export const OVERSHOOT_MAX_STEP_SMALL = 100;
/** $M added to the scale max when current max is at/above the threshold. */
export const OVERSHOOT_MAX_STEP_LARGE = 200;
/** Below this max ($M), overshoot expands by OVERSHOOT_MAX_STEP_SMALL. */
export const OVERSHOOT_STEP_THRESHOLD = 600;

/**
 * Grow max while overshooting: +$100M below $600M, otherwise +$200M
 * (capped at absoluteMax).
 */
export function growMaxForOvershoot(
  currentMax: number,
  _value: number,
  absoluteMax: number,
): number {
  if (currentMax >= absoluteMax) return absoluteMax;
  const step =
    currentMax < OVERSHOOT_STEP_THRESHOLD
      ? OVERSHOOT_MAX_STEP_SMALL
      : OVERSHOOT_MAX_STEP_LARGE;
  return Math.min(absoluteMax, currentMax + step);
}

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

/** Round up to the next nice slider max, optionally capped. */
export function niceCeil(n: number, absoluteMax?: number): number {
  if (!Number.isFinite(n) || n <= 0) return NICE_MAXES[0];
  const found = NICE_MAXES.find((v) => v >= n);
  let result = found != null ? found : Math.ceil(n / 500) * 500;
  if (absoluteMax != null) result = Math.min(result, absoluteMax);
  return result;
}

/** Step to the next nice max strictly above `current`, optionally capped. */
export function nextNiceMax(current: number, absoluteMax?: number): number {
  const found = NICE_MAXES.find((v) => v > current);
  let result =
    found != null ? found : Math.ceil((current + 500) / 500) * 500;
  if (absoluteMax != null) {
    if (current >= absoluteMax) return absoluteMax;
    result = Math.min(result, absoluteMax);
  }
  return result;
}

/**
 * Initial slider max from comps for a field: ceil(max(comps) * 1.4).
 * Falls back when there are no positive comps.
 */
export function initialMoneyMax(
  markers: { value: number }[],
  fallback: number,
  absoluteMax?: number,
): number {
  const values = markers
    .map((m) => m.value)
    .filter((v) => Number.isFinite(v) && v > 0);
  const raw =
    values.length === 0
      ? niceCeil(fallback, absoluteMax)
      : niceCeil(Math.max(...values) * 1.4, absoluteMax);
  return absoluteMax != null ? Math.min(raw, absoluteMax) : raw;
}

/** Raise max so `value` fits with a little headroom, optionally capped. */
export function fitMaxForValue(
  value: number,
  currentMax: number,
  absoluteMax?: number,
): number {
  if (!Number.isFinite(value) || value <= currentMax) {
    return absoluteMax != null ? Math.min(currentMax, absoluteMax) : currentMax;
  }
  return niceCeil(value * 1.05, absoluteMax);
}

/** Median of comps, snapped; or ~25% of fallback max. */
export function seedMoneyValue(
  markers: { value: number }[],
  fallbackMax: number,
  hardcodedFallback: number,
): number {
  const values = markers
    .map((m) => m.value)
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);

  if (values.length === 0) {
    return snapToDetent(
      roundToTenth(Math.max(hardcodedFallback, fallbackMax * 0.25)),
    );
  }

  const median = values[Math.floor(values.length / 2)];
  return snapToDetent(roundToTenth(median));
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

/** Treat the thumb as against the scale max within this $M tolerance. */
export const EDGE_AT_MAX_EPSILON = 0.15;
