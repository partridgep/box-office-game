import type { Guess, MovieData, RunPhase } from "../../types";
import {
  formatPercentError,
  scoredBoxOfficeLegs,
  type ScoreLeg,
} from "../../utils/guessComparison";
import { scoresFinalGross } from "../../utils/runPhase";

/** Absolute % gap at or below which opening and final count as similar. */
const SIMILAR_GAP = 15;

function pct(leg: ScoreLeg): number {
  return leg.error * 100;
}

/** Finals are in the score but the run isn’t locked — use “current” language. */
function finalsStillUpdating(movie: MovieData, phase?: RunPhase): boolean {
  return phase === "tracking" && scoresFinalGross(movie);
}

function singleLegLine(leg: ScoreLeg, live: boolean): string {
  const off = formatPercentError(pct(leg));
  if (live) {
    if (leg.error <= 0.05) return `${leg.label} is nearly exact (${off})`;
    if (leg.error <= 0.15) return `${leg.label} is close (${off} off)`;
    return `${leg.label} (${off}) is the current miss`;
  }
  if (leg.error <= 0.05) return `${leg.label} was nearly exact (${off})`;
  if (leg.error <= 0.15) return `${leg.label} was close (${off} off)`;
  return `${leg.label} was the miss (${off} off)`;
}

function pairLine(a: ScoreLeg, b: ScoreLeg, live: boolean): string {
  const aPct = pct(a);
  const bPct = pct(b);
  const gap = Math.abs(aPct - bPct);

  if (gap <= SIMILAR_GAP) {
    const left = `${a.label} (${formatPercentError(aPct)})`;
    const right = `${b.label} (${formatPercentError(bPct)})`;
    const best = Math.min(aPct, bPct);
    const worst = Math.max(aPct, bPct);

    if (live) {
      if (best > 15) return `Currently off on both ${left} and ${right}`;
      if (worst <= 5) return `Holding well on both ${left} and ${right}`;
      if (worst <= 15) return `Currently close on both ${left} and ${right}`;
      return `Currently off on both ${left} and ${right}`;
    }

    if (best > 15) return `Missed on both ${left} and ${right}`;
    if (worst <= 5) return `Spot on for both ${left} and ${right}`;
    if (worst <= 15) return `Close on both ${left} and ${right}`;
    return `Missed on both ${left} and ${right}`;
  }

  const worse = aPct >= bPct ? a : b;
  const better = aPct < bPct ? a : b;
  const worsePct = formatPercentError(pct(worse));
  const betterPct = formatPercentError(pct(better));

  if (live) {
    const betterPhrase =
      better.error <= 0.05
        ? `is nearly exact (${betterPct})`
        : better.error <= 0.15
          ? `is closer (${betterPct})`
          : `is also quite off (${betterPct})`;
    return `${worse.label} (${worsePct}) is the current miss; ${better.label} ${betterPhrase}`;
  }

  const betterPhrase =
    better.error <= 0.05
      ? `was nearly exact (${betterPct})`
      : `was closer (${betterPct} off)`;

  return `${worse.label} was the miss (${worsePct} off); ${better.label} ${betterPhrase}`;
}

/**
 * One-line read of where a guess helped or hurt vs the overall rating.
 * Uses the same opening/final legs as overallScore. While tracking with
 * finals in play, copy uses “current” language (totals still moving).
 */
export function standingInsightLine(
  guess: Guess,
  movie: MovieData,
  phase?: RunPhase
): string | null {
  const legs = scoredBoxOfficeLegs(guess, movie);
  if (legs.length === 0) return null;
  const live = finalsStillUpdating(movie, phase);
  if (legs.length === 1) return singleLegLine(legs[0], live);
  return pairLine(legs[0], legs[1], live);
}
