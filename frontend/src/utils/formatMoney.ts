/** "412.3M" (or "412M" with wholeMillions) / "1.61B" — no currency sign. Input is in $M. */
export function formatMillionsShort(n: number, wholeMillions = false): string {
  const billionAt = wholeMillions ? 999.5 : 999.95;
  if (Math.abs(n) >= billionAt) return `${(n / 1000).toFixed(2)}B`;
  return `${n.toFixed(wholeMillions ? 0 : 1)}M`;
}

export function formatMillions(
  value: number | string | null | undefined,
): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return `$${formatMillionsShort(n)}`;
}

export function formatDollars(value: number | string): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return formatMillions(n / 1_000_000);
}

/**
 * Parse user-typed money into $M. A bare number means millions;
 * accepts k / m / mm / b / bn suffixes, "$", commas, and spaces.
 */
export function parseMoneyToMillions(input: string): number | null {
  const match = input
    .trim()
    .toLowerCase()
    .replace(/[$,\s]/g, "")
    .match(/^(\d*\.?\d+|\d+\.)(k|m|mm|b|bn)?$/);
  if (!match) return null;
  const n = parseFloat(match[1]);
  if (!Number.isFinite(n)) return null;
  switch (match[2]) {
    case "b":
    case "bn":
      return n * 1000;
    case "k":
      return n / 1000;
    default:
      return n;
  }
}
