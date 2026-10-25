import type { Guess, MovieData } from "../../types";
import { parseMoney } from "../../utils/guessComparison";
import { formatDollars } from "../../utils/formatMoney";

export type GuessUpdateKind = "opening" | "rt" | "tally";

export type GuessUpdateEvent = {
  id: string;
  kind: GuessUpdateKind;
  movieId: string;
  tmdbID: string;
  movieTitle: string;
  summary: string;
  releasedAt: number;
};

export type MovieUpdateSeen = {
  seenOpening?: boolean;
  seenRt?: boolean;
  /** undefined = tally baseline not seeded yet (suppress historical flood). */
  lastShownDomesticGross?: number | null;
  lastShownWorldwideGross?: number | null;
};

export type GuessUpdatesSeenState = Record<string, MovieUpdateSeen>;

export type GuessMovieRow = {
  guess: Guess;
  movie: MovieData;
};

const STORAGE_PREFIX = "bog:guessUpdates:v1:";
const MILESTONE_WINDOW_DAYS = 14;
const KIND_ORDER: Record<GuessUpdateKind, number> = {
  opening: 0,
  rt: 1,
  tally: 2,
};

type SeenListener = () => void;
const seenListeners = new Set<SeenListener>();

/** Subscribe to localStorage seen-state writes (nav badge refresh). */
export function subscribeGuessUpdatesSeen(listener: SeenListener) {
  seenListeners.add(listener);
  return () => {
    seenListeners.delete(listener);
  };
}

function notifyGuessUpdatesSeen() {
  seenListeners.forEach((listener) => listener());
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadGuessUpdatesSeen(userId: string): GuessUpdatesSeenState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as GuessUpdatesSeenState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveGuessUpdatesSeen(
  userId: string,
  state: GuessUpdatesSeenState
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
    notifyGuessUpdatesSeen();
  } catch {
    // Quota / private mode — ignore.
  }
}

function daysSince(date: Date | string | null | undefined, now: number) {
  if (!date) return Number.POSITIVE_INFINITY;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return (now - t) / (1000 * 60 * 60 * 24);
}

function withinMilestoneWindow(
  released: Date | string | null | undefined,
  now: number
) {
  const days = daysSince(released, now);
  return days >= 0 && days < MILESTONE_WINDOW_DAYS;
}

function isMaterialRise(current: number, previous: number) {
  const delta = current - previous;
  if (delta <= 0) return false;
  const threshold = Math.max(1_000_000, previous * 0.05);
  return delta >= threshold;
}

function worldwideGrossDollars(movie: MovieData): number | null {
  const ww = parseMoney(movie.worldwideGross);
  if (ww != null) return ww;
  const dom = parseMoney(movie.domesticGross);
  const intl = parseMoney(movie.internationalGross);
  if (dom != null && intl != null) return dom + intl;
  return dom ?? intl ?? null;
}

/**
 * Seed tally baselines for movies that already have grosses so first visit
 * does not emit a tally event for every historical title.
 */
export function seedTallyBaselines(
  rows: GuessMovieRow[],
  seen: GuessUpdatesSeenState
): GuessUpdatesSeenState {
  let changed = false;
  const next: GuessUpdatesSeenState = { ...seen };

  for (const { movie } of rows) {
    if (!movie.id) continue;
    const movieId = String(movie.id);
    const entry = { ...(next[movieId] ?? {}) };
    const domestic = parseMoney(movie.domesticGross);
    const worldwide = worldwideGrossDollars(movie);
    const needsDomestic =
      entry.lastShownDomesticGross === undefined && domestic != null;
    const needsWorldwide =
      entry.lastShownWorldwideGross === undefined && worldwide != null;
    if (!needsDomestic && !needsWorldwide) continue;

    if (needsDomestic) entry.lastShownDomesticGross = domestic;
    if (needsWorldwide) entry.lastShownWorldwideGross = worldwide;
    next[movieId] = entry;
    changed = true;
  }

  return changed ? next : seen;
}

export function deriveGuessUpdateEvents(
  rows: GuessMovieRow[],
  seen: GuessUpdatesSeenState,
  {
    limit = 15,
    now = Date.now(),
  }: { limit?: number; now?: number } = {}
): GuessUpdateEvent[] {
  const events: GuessUpdateEvent[] = [];

  for (const { movie } of rows) {
    if (!movie.id) continue;
    const movieId = String(movie.id);
    const entry = seen[movieId] ?? {};
    const title = movie.title;
    const tmdbID = String(movie.tmdbID);
    const releasedAt = movie.released
      ? new Date(movie.released).getTime()
      : 0;

    const hasOpening =
      parseMoney(movie.domesticOpening) != null ||
      parseMoney(movie.internationalOpening) != null;

    if (
      hasOpening &&
      !entry.seenOpening &&
      withinMilestoneWindow(movie.released, now)
    ) {
      const dom = parseMoney(movie.domesticOpening);
      const summary =
        dom != null
          ? `Opening weekend in — ${formatDollars(dom)} domestic`
          : "Opening weekend figures are in";
      events.push({
        id: `${movieId}:opening`,
        kind: "opening",
        movieId,
        tmdbID,
        movieTitle: title,
        summary,
        releasedAt,
      });
    }

    const rt = movie.rottenTomatoesScore;
    if (
      rt &&
      !entry.seenRt &&
      withinMilestoneWindow(movie.released, now)
    ) {
      events.push({
        id: `${movieId}:rt`,
        kind: "rt",
        movieId,
        tmdbID,
        movieTitle: title,
        summary: `Rotten Tomatoes ${rt}`,
        releasedAt,
      });
    }

    const domestic = parseMoney(movie.domesticGross);
    const worldwide = worldwideGrossDollars(movie);
    const lastDom = entry.lastShownDomesticGross;
    const lastWw = entry.lastShownWorldwideGross;

    // Only emit tally after baseline has been seeded (not undefined).
    const domRise =
      domestic != null &&
      lastDom != null &&
      isMaterialRise(domestic, lastDom);
    const wwRise =
      worldwide != null &&
      lastWw != null &&
      isMaterialRise(worldwide, lastWw);

    if (domRise || wwRise) {
      const parts: string[] = [];
      if (domRise && domestic != null) {
        parts.push(`${formatDollars(domestic)} domestic to date`);
      }
      if (wwRise && worldwide != null && !domRise) {
        parts.push(`${formatDollars(worldwide)} worldwide to date`);
      } else if (wwRise && worldwide != null && domRise) {
        parts.push(`${formatDollars(worldwide)} worldwide to date`);
      }
      events.push({
        id: `${movieId}:tally`,
        kind: "tally",
        movieId,
        tmdbID,
        movieTitle: title,
        summary: parts.length
          ? `Tally up — ${parts.join("; ")}`
          : "Box office tally increased",
        releasedAt,
      });
    }
  }

  events.sort((a, b) => {
    if (b.releasedAt !== a.releasedAt) return b.releasedAt - a.releasedAt;
    return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  });

  return events.slice(0, limit);
}

/** Uncapped count for nav badge. */
export function countGuessUpdateEvents(
  rows: GuessMovieRow[],
  seen: GuessUpdatesSeenState,
  now = Date.now()
) {
  return deriveGuessUpdateEvents(rows, seen, { limit: Number.MAX_SAFE_INTEGER, now })
    .length;
}

export function markEventsSeen(
  seen: GuessUpdatesSeenState,
  events: GuessUpdateEvent[],
  rowsByMovieId: Map<string, GuessMovieRow>
): GuessUpdatesSeenState {
  if (events.length === 0) return seen;
  const next: GuessUpdatesSeenState = { ...seen };

  for (const event of events) {
    const entry = { ...(next[event.movieId] ?? {}) };
    const row = rowsByMovieId.get(event.movieId);

    if (event.kind === "opening") {
      entry.seenOpening = true;
    } else if (event.kind === "rt") {
      entry.seenRt = true;
    } else if (event.kind === "tally" && row) {
      const domestic = parseMoney(row.movie.domesticGross);
      const worldwide = worldwideGrossDollars(row.movie);
      if (domestic != null) entry.lastShownDomesticGross = domestic;
      if (worldwide != null) entry.lastShownWorldwideGross = worldwide;
    }

    next[event.movieId] = entry;
  }

  return next;
}
