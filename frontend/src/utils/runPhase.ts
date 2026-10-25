import type { MovieData, RunPhase } from "../types";
import { parseMoney } from "./guessComparison";

const STALL_AFTER_WEEKS = 8;
const FINISHED_AFTER_WEEKS = 16;

function daysSinceRelease(released: Date | string | null | undefined, now = Date.now()) {
  if (!released) return null;
  const t = new Date(released).getTime();
  if (Number.isNaN(t)) return null;
  return (now - t) / (1000 * 60 * 60 * 24);
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

export { STALL_AFTER_WEEKS, FINISHED_AFTER_WEEKS };
