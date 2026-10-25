import type { Guess } from "../types";
import { formatMillionsShort } from "./formatMoney";

function finiteMoney(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Number(value);
}

function formatMoneyTag(n: number) {
  return `$${formatMillionsShort(n, true)}`;
}

function formatDomIntlLine(
  prefix: string,
  domestic: number | null,
  international: number | null
) {
  if (domestic != null && international != null) {
    return `${prefix} ${formatMoneyTag(domestic)} DOM + ${formatMoneyTag(international)} INTL`;
  }
  if (domestic != null) return `${prefix} ${formatMoneyTag(domestic)} DOM`;
  if (international != null) {
    return `${prefix} ${formatMoneyTag(international)} INTL`;
  }
  return null;
}

/**
 * Multi-line prediction call lines, e.g.:
 * OW $85M DOM + $110M INTL
 * FINAL $300M DOM + $450M INTL
 * RT 78%
 */
export function formatPredictionBadgeLines(
  guess: Guess | undefined | null
): string[] {
  if (!guess) return [];
  const lines: string[] = [];

  const opening = formatDomIntlLine(
    "OW",
    finiteMoney(guess.domestic_opening),
    finiteMoney(guess.international_opening)
  );
  if (opening) lines.push(opening);

  const finale = formatDomIntlLine(
    "FINAL",
    finiteMoney(guess.final_domestic),
    finiteMoney(guess.final_international)
  );
  if (finale) lines.push(finale);

  const rt = finiteMoney(guess.rotten_tomatoes_score);
  if (rt != null) lines.push(`RT ${Math.round(rt)}%`);

  return lines;
}
