import {
  compareOverall,
  formatPercentError,
} from "../../utils/guessComparison";
import { resolveRunPhaseLocal } from "../../utils/runPhase";
import type { Guess, MovieData, RunPhase } from "../../types";
import { joinGuessRows, type GuessMovieRow } from "../Guesses/joinGuessRows";

export type SharedMovieDuel = {
  movie: MovieData;
  yours: Guess;
  theirs: Guess;
  phase: RunPhase;
  /** Overall winner using the same metric as Movie Details. Null = not scorable yet. */
  overall: "you" | "them" | "tie" | null;
  /** Box-office miss % from standing; null when unscored or RT-only. */
  yourMiss: number | null;
  theirMiss: number | null;
};

export type FriendRivalry = {
  shared: SharedMovieDuel[];
  onlyTheirs: GuessMovieRow[];
  onlyYours: GuessMovieRow[];
  record: {
    you: number;
    them: number;
    ties: number;
    pending: number;
  };
  /** Avg box-office miss % across each player's full scored board. */
  yourOverallAvgMiss: number | null;
  theirOverallAvgMiss: number | null;
};

function releaseTime(movie: MovieData) {
  if (!movie.released) return 0;
  const t = new Date(movie.released).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Box-office miss percent for one guess; null when unscored or RT-only. */
function boxOfficeMiss(guess: Guess): number | null {
  const standing = guess.standing;
  if (!standing || standing.scoreMode !== "box_office") return null;
  if (!Number.isFinite(standing.overallScore)) return null;
  return Math.max(0, standing.overallScore * 100);
}

function avgBoxOfficeMiss(guesses: Guess[]): number | null {
  const percents: number[] = [];
  for (const guess of guesses) {
    const miss = boxOfficeMiss(guess);
    if (miss != null) percents.push(miss);
  }
  if (percents.length === 0) return null;
  return percents.reduce((sum, n) => sum + n, 0) / percents.length;
}

function preferMovie(a: MovieData, b: MovieData): MovieData {
  // Prefer the copy with a stored runPhase / richer actuals when merging.
  if (a.runPhase && !b.runPhase) return a;
  if (b.runPhase && !a.runPhase) return b;
  return a;
}

/**
 * Join viewer + friend boards into overlap, one-sided lists, and a scored rivalry record.
 */
export function buildFriendRivalry(
  yourGuesses: Record<string, Guess> | Guess[],
  theirGuesses: Guess[],
  movies: Record<string, MovieData> | MovieData[]
): FriendRivalry {
  const yourRows = joinGuessRows(yourGuesses, movies);
  const theirRows = joinGuessRows(theirGuesses, movies);

  const yoursByMovie = new Map(
    yourRows.map((row) => [String(row.guess.movie_id), row] as const)
  );
  const theirsByMovie = new Map(
    theirRows.map((row) => [String(row.guess.movie_id), row] as const)
  );

  const shared: SharedMovieDuel[] = [];
  const onlyYours: GuessMovieRow[] = [];
  const onlyTheirs: GuessMovieRow[] = [];

  for (const [movieId, yourRow] of yoursByMovie) {
    const theirRow = theirsByMovie.get(movieId);
    if (!theirRow) {
      onlyYours.push(yourRow);
      continue;
    }
    const movie = preferMovie(yourRow.movie, theirRow.movie);
    const phase = resolveRunPhaseLocal(movie);
    const raw = compareOverall(yourRow.guess, theirRow.guess, movie);
    const overall =
      raw === "A" ? "you" : raw === "B" ? "them" : raw === "tie" ? "tie" : null;
    shared.push({
      movie,
      yours: yourRow.guess,
      theirs: theirRow.guess,
      phase,
      overall,
      yourMiss: boxOfficeMiss(yourRow.guess),
      theirMiss: boxOfficeMiss(theirRow.guess),
    });
  }

  for (const [movieId, theirRow] of theirsByMovie) {
    if (!yoursByMovie.has(movieId)) onlyTheirs.push(theirRow);
  }

  // Scored / finished first, then tracking, then waiting — newest release within each.
  const phaseRank: Record<RunPhase, number> = {
    finished: 0,
    tracking: 1,
    not_opened: 2,
  };
  shared.sort((a, b) => {
    const pr = phaseRank[a.phase] - phaseRank[b.phase];
    if (pr !== 0) return pr;
    return releaseTime(b.movie) - releaseTime(a.movie);
  });
  onlyTheirs.sort((a, b) => releaseTime(b.movie) - releaseTime(a.movie));
  onlyYours.sort((a, b) => releaseTime(b.movie) - releaseTime(a.movie));

  // Locked wins only — tracking titles still move, so they stay out of "Movies won".
  const record = { you: 0, them: 0, ties: 0, pending: 0 };
  for (const duel of shared) {
    if (duel.phase !== "finished" || duel.overall == null) {
      if (duel.overall == null) record.pending += 1;
      continue;
    }
    if (duel.overall === "you") record.you += 1;
    else if (duel.overall === "them") record.them += 1;
    else record.ties += 1;
  }

  return {
    shared,
    onlyTheirs,
    onlyYours,
    record,
    yourOverallAvgMiss: avgBoxOfficeMiss(yourRows.map((r) => r.guess)),
    theirOverallAvgMiss: avgBoxOfficeMiss(theirRows.map((r) => r.guess)),
  };
}

export function formatAvgMiss(value: number | null): string | null {
  if (value == null) return null;
  return formatPercentError(value);
}

export function duelOutcomeLabel(
  overall: SharedMovieDuel["overall"],
  friendName: string,
  phase: RunPhase
): string {
  if (overall == null) return "Awaiting";

  // Only finished runs are locked — anything earlier stays provisional.
  if (phase !== "finished") {
    if (overall === "you") return "You're ahead";
    if (overall === "them") return `${friendName} is ahead`;
    return "Tied so far";
  }

  if (overall === "you") return "You won";
  if (overall === "them") return `${friendName} won`;
  return "Tied";
}

/** Plain-text vs line for aria labels. */
export function duelMissAria(
  duel: SharedMovieDuel,
  friendName: string
): string | null {
  if (duel.yourMiss == null && duel.theirMiss == null) return null;
  if (duel.yourMiss != null && duel.theirMiss != null) {
    return `You ${formatPercentError(duel.yourMiss)} off versus ${friendName} ${formatPercentError(duel.theirMiss)} off`;
  }
  if (duel.yourMiss != null) {
    return `You ${formatPercentError(duel.yourMiss)} off`;
  }
  return `${friendName} ${formatPercentError(duel.theirMiss!)} off`;
}
