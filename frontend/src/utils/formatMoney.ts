export function formatMillions(value: number | null | undefined): string {
  if (value == null) return "—";
  return `$${value.toFixed(1)}M`;
}

export function formatDollars(value: number): string {
  return `$${(value / 1_000_000).toFixed(1)}M`;
}
