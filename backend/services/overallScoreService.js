'use strict';

/**
 * Mirrors frontend/src/utils/guessComparison.ts overallScore / overallRanking
 * so Guesses standings match Movie Details.
 */

const RT_MAX_BONUS = 0.05;
const RT_BONUS_CUTOFF = 20;

function parseMoney(value) {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(n) ? n : null;
}

function millionsToDollars(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Number(value) * 1_000_000;
}

function getMovieActuals(movie) {
  const domesticOpening = parseMoney(movie.domesticOpening);
  const internationalOpening = parseMoney(movie.internationalOpening);
  const finalDomestic = parseMoney(movie.domesticGross);
  const finalInternational = parseMoney(movie.internationalGross);

  return {
    domesticOpening,
    internationalOpening,
    worldwideOpening:
      domesticOpening != null && internationalOpening != null
        ? domesticOpening + internationalOpening
        : null,
    finalDomestic,
    finalInternational,
    worldwideFinal:
      finalDomestic != null && finalInternational != null
        ? finalDomestic + finalInternational
        : null,
    rottenTomatoesScore: movie.rottenTomatoesScore
      ? Number(String(movie.rottenTomatoesScore).split('%')?.[0])
      : null,
  };
}

function hasAnyActuals(movie) {
  const actuals = getMovieActuals(movie);
  return (
    actuals.domesticOpening != null ||
    actuals.finalDomestic != null ||
    actuals.rottenTomatoesScore != null
  );
}

function rtBonus(guessRt, actualRt) {
  if (actualRt == null || guessRt == null) return 0;
  const pointsOff = Math.abs(guessRt - actualRt);
  return RT_MAX_BONUS * Math.max(0, 1 - pointsOff / RT_BONUS_CUTOFF);
}

/**
 * Lower is better. Returns { score, mode } where mode is 'box_office' | 'rt'.
 * null when the guess can't be scored yet.
 */
function overallScoreDetail(guess, movie) {
  const actuals = getMovieActuals(movie);
  const actualRt = actuals.rottenTomatoesScore;

  const boErrors = [
    actuals.worldwideOpening != null
      ? Math.abs(
          millionsToDollars(
            Number(guess.domestic_opening) + Number(guess.international_opening)
          ) - actuals.worldwideOpening
        ) / actuals.worldwideOpening
      : null,
    actuals.worldwideFinal != null
      ? Math.abs(
          millionsToDollars(
            Number(guess.final_domestic) + Number(guess.final_international)
          ) - actuals.worldwideFinal
        ) / actuals.worldwideFinal
      : null,
  ].filter((v) => typeof v === 'number' && Number.isFinite(v));

  if (boErrors.length) {
    const boScore = boErrors.reduce((a, b) => a + b, 0) / boErrors.length;
    return {
      score: boScore - rtBonus(guess.rotten_tomatoes_score, actualRt),
      mode: 'box_office',
    };
  }

  if (actualRt != null && guess.rotten_tomatoes_score != null) {
    return {
      score: Math.abs(Number(guess.rotten_tomatoes_score) - actualRt),
      mode: 'rt',
    };
  }

  return null;
}

function overallScore(guess, movie) {
  const detail = overallScoreDetail(guess, movie);
  return detail ? detail.score : null;
}

/** Same 5% / 15% cutoffs as getAccuracyTier; BO scores are fractions, RT is points. */
function tierFromOverall(detail) {
  if (!detail) return null;
  const pct = detail.mode === 'box_office' ? detail.score * 100 : detail.score;
  if (pct <= 5) return 'nailed';
  if (pct <= 15) return 'close';
  return 'off';
}

/**
 * Rank userGuess among allGuesses for one movie.
 * @returns {{ overallScore: number, overallRank: number, totalGuesses: number, percentile: number, tier: string } | null}
 */
function standingForGuess(userGuess, allGuesses, movie) {
  const userDetail = overallScoreDetail(userGuess, movie);
  if (!userDetail) return null;

  const scored = allGuesses
    .map((g) => {
      const d = overallScoreDetail(g, movie);
      return d ? { guess: g, score: d.score } : null;
    })
    .filter(Boolean);

  scored.sort((a, b) => a.score - b.score);
  const index = scored.findIndex((s) => String(s.guess.id) === String(userGuess.id));
  if (index === -1) return null;

  return {
    overallScore: userDetail.score,
    overallRank: index + 1,
    totalGuesses: scored.length,
    percentile: Math.round(
      ((scored.length - (index + 1)) / scored.length) * 100
    ),
    tier: tierFromOverall(userDetail),
    scoreMode: userDetail.mode,
  };
}

/**
 * Batch standings for a user's guesses given movies + all peer guesses keyed by movie_id.
 * @param {object[]} userGuesses
 * @param {Map<string, object>} movieById
 * @param {Map<string, object[]>} peersByMovieId
 */
function standingsForUserGuesses(userGuesses, movieById, peersByMovieId) {
  /** @type {Map<string, object>} guessId -> standing */
  const byGuessId = new Map();

  for (const guess of userGuesses) {
    const movie = movieById.get(String(guess.movie_id));
    if (!movie || !hasAnyActuals(movie)) continue;

    const peers = peersByMovieId.get(String(guess.movie_id)) || [guess];
    const standing = standingForGuess(guess, peers, movie);
    if (standing) byGuessId.set(String(guess.id), standing);
  }

  return byGuessId;
}

module.exports = {
  parseMoney,
  getMovieActuals,
  hasAnyActuals,
  overallScore,
  overallScoreDetail,
  tierFromOverall,
  standingForGuess,
  standingsForUserGuesses,
};
