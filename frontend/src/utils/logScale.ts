export const DETENTS = [1, 5, 10, 15, 25, 40, 50, 75, 100, 150, 200, 300, 500];

export function snapToDetent(value: number, thresholdPct = 0.08): number {
  let nearest = value;
  let nearestDiff = Infinity;

  for (const detent of DETENTS) {
    const diff = Math.abs(detent - value) / value;
    if (diff <= thresholdPct && diff < nearestDiff) {
      nearestDiff = diff;
      nearest = detent;
    }
  }

  return nearest;
}

export function valueToPosition(value: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(max, value));
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const logVal = Math.log10(clamped);
  return ((logVal - logMin) / (logMax - logMin)) * 100;
}

export function positionToValue(position: number, min: number, max: number): number {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const logVal = logMin + (position / 100) * (logMax - logMin);
  return Math.pow(10, logVal);
}
