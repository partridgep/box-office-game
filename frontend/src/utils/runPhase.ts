import type { MovieData, RunPhase } from "../types";
import { parseMoney } from "./guessComparison";

const STALL_AFTER_WEEKS = 8;
const FINISHED_AFTER_WEEKS = 16;
/**
 * Finals enter overallScore after opening weekend (day 7 = start of week 2).
 * Keep in sync with backend overallScoreService + guessComparison.
 */
export const FINALS_SCORE_AFTER_DAYS = 7;

function daysSinceRelease(released: Date | string | null | undefined, now = Date.now()) {
  if (!released) return null;
  const t = new Date(released).getTime();
  if (Number.isNaN(t)) return null;
  return (now - t) / (1000 * 60 * 60 * 24);
}

/** Whether cumulative gross should count as the final leg in overallScore. */
export function scoresFinalGross(
  movie: Pick<MovieData, "released">,
  now = Date.now()
): boolean {
  const days = daysSinceRelease(movie.released, now);
  if (days == null) return true;
  return days >= FINALS_SCORE_AFTER_DAYS;
}

/**
 * Client-side phase when `movie.runPhase` is missing or stale.
 * Past release date → tracking/finished even before opening actuals land.
 */
export function resolveRunPhaseLocal(
  movie: Pick<MovieData, "domesticOpening" | "released" | "runPhase">,
  now = Date.now()
): RunPhase {
  const days = daysSinceRelease(movie.released, now);

  if (days != null && days < 0) return "not_opened";
  if (days == null && parseMoney(movie.domesticOpening) == null) {
    return "not_opened";
  }

  // Never keep a stored not_opened once the release date has passed.
  if (movie.runPhase === "tracking" || movie.runPhase === "finished") {
    return movie.runPhase;
  }

  if (days != null && days / 7 >= FINISHED_AFTER_WEEKS) return "finished";
  return "tracking";
}

export const RUN_PHASE_SECTION: Record<
  RunPhase,
  { heading: string; status: string }
> = {
  not_opened: {
    heading: "Waiting for movie to open",
    status: "Waiting",
  },
  tracking: {
    heading: "Currently Tracking",
    status: "Tracking",
  },
  finished: {
    heading: "Finished their run",
    status: "Finished",
  },
};

/**
 * Replaces the static "Tracking" chip: theater age + whether finals affect the rating.
 */
export function trackingStatusLabel(
  movie: Pick<MovieData, "released">,
  now = Date.now()
): string {
  const days = daysSinceRelease(movie.released, now);
  if (days == null || days < 0) return RUN_PHASE_SECTION.tracking.status;

  const week = Math.floor(days / 7) + 1;
  if (days < FINALS_SCORE_AFTER_DAYS) {
    return `Week ${week} in theaters`;
  }
  return `Week ${week} in theaters · Finals still updating`;
}

export { STALL_AFTER_WEEKS, FINISHED_AFTER_WEEKS, daysSinceRelease };
