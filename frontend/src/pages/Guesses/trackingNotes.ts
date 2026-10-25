import type { MovieData, RunPhase } from "../../types";
import { parseMoney } from "../../utils/guessComparison";
import { formatDollars } from "../../utils/formatMoney";

export type TrackingNoteKind = "opening" | "weekly" | "rt";

export type TrackingNote = {
  kind: TrackingNoteKind;
  text: string;
};

/** Show opening/RT notes only while the release still feels “new.” */
const MILESTONE_WINDOW_DAYS = 14;
const THIS_WEEKEND_DAYS = 3;
const LAST_WEEKEND_DAYS = 10;
const MAX_NOTES = 2;

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
  if (days < MILESTONE_WINDOW_DAYS) return "a couple weeks ago";
  return null;
}

/**
 * Tracking-row news blurbs (max 2): timed opening, weekly domestic tip,
 * then a fresh RT beat. Prefer signals that add timeline context over
 * restating metric-card numbers alone.
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
        text: `Opened ${when} to ${formatDollars(dom)} domestic`,
      });
    } else {
      const intl = parseMoney(movie.internationalOpening);
      if (intl != null) {
        notes.push({
          kind: "opening",
          text: `Opened ${when} to ${formatDollars(intl)} intl`,
        });
      }
    }
  }

  const weekGross = movie.latestWeeklyGross;
  if (
    weekGross != null &&
    Number.isFinite(weekGross) &&
    weekGross > 0 &&
    notes.length < MAX_NOTES
  ) {
    notes.push({
      kind: "weekly",
      text: `Last week added ${formatDollars(weekGross)} domestic`,
    });
  }

  // RT only as a fresh early-window beat when we still have a slot —
  // weekly tip and opening take priority.
  if (when && notes.length < MAX_NOTES && movie.rottenTomatoesScore) {
    notes.push({
      kind: "rt",
      text: `Critics landed at ${movie.rottenTomatoesScore} on Rotten Tomatoes`,
    });
  }

  return notes.slice(0, MAX_NOTES);
}
