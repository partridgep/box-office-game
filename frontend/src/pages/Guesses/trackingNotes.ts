import type { MovieData, RunPhase } from "../../types";
import { parseMoney } from "../../utils/guessComparison";
import { formatDollars } from "../../utils/formatMoney";

export type TrackingNoteKind =
  | "opening"
  | "opening_intl"
  | "weekly"
  | "weekly_intl"
  | "rt";

export type TrackingNote = {
  kind: TrackingNoteKind;
  text: string;
};

/** Opening + RT notes only for this/last weekend; then weeklies take over. */
const THIS_WEEKEND_DAYS = 3;
const LAST_WEEKEND_DAYS = 10;
/** Dom + intl opening, both weeklies, and RT when everything lines up. */
const MAX_NOTES = 5;

function daysSinceRelease(
  released: Date | string | null | undefined,
  now: number
) {
  if (!released) return null;
  const t = new Date(released).getTime();
  if (Number.isNaN(t)) return null;
  return (now - t) / (1000 * 60 * 60 * 24);
}

function openingWhenPhrase(days: number): string | null {
  if (days < 0) return null;
  if (days <= THIS_WEEKEND_DAYS) return "this weekend";
  if (days <= LAST_WEEKEND_DAYS) return "last weekend";
  return null;
}

function positiveGross(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

/**
 * Tracking-row news blurbs. This/last weekend: openings + RT.
 * After that: weekly adds only (no restating the open).
 */
export function buildTrackingNotes(
  movie: MovieData,
  phase: RunPhase,
  now = Date.now()
): TrackingNote[] {
  if (phase !== "tracking") return [];

  const notes: TrackingNote[] = [];
  const days = daysSinceRelease(movie.released, now);
  const when = days != null ? openingWhenPhrase(days) : null;

  if (when) {
    const dom = parseMoney(movie.domesticOpening);
    if (dom != null) {
      notes.push({
        kind: "opening",
        text: `Opened ${when} to ${formatDollars(dom)} domestically`,
      });
    }

    const intl = parseMoney(movie.internationalOpening);
    if (intl != null) {
      notes.push({
        kind: "opening_intl",
        text: `Opened ${when} to ${formatDollars(intl)} internationally`,
      });
    }
  } else {
    const weekGross = positiveGross(movie.latestWeeklyGross);
    if (weekGross != null) {
      notes.push({
        kind: "weekly",
        text: `Last week added ${formatDollars(weekGross)} domestically`,
      });
    }

    const intlWeek = positiveGross(movie.latestIntlWeeklyGross);
    if (intlWeek != null) {
      notes.push({
        kind: "weekly_intl",
        text: `Last weekend added ${formatDollars(intlWeek)} internationally`,
      });
    }
  }

  if (when && movie.rottenTomatoesScore) {
    notes.push({
      kind: "rt",
      text: `Critics landed at ${movie.rottenTomatoesScore} on Rotten Tomatoes`,
    });
  }

  return notes.slice(0, MAX_NOTES);
}
