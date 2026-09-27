import {
  Guess,
  MovieData,
  GuessComparison,
  GuessVsGuess,
  CategoryLeaderboard,
  OverallPerformance,
} from "../types";

export function parseMoney(value: string | null | undefined): number | null {
  if (!value) return null;
  return Number(value.replace(/[^0-9.-]+/g, ""));
}

export function millionsToDollars(value: number | null | undefined): number | null {
  if (value == null) return null;
  return value * 1_000_000;
}

export function getMovieActuals(movie: MovieData) {
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
      ? Number(movie.rottenTomatoesScore.split("%")?.[0])
      : null,
  };
}

export function hasAnyActuals(movie: MovieData): boolean {
  const actuals = getMovieActuals(movie);
  return (
    actuals.domesticOpening != null ||
    actuals.finalDomestic != null ||
    actuals.rottenTomatoesScore != null
  );
}

export function getAccuracyTier(
  percentError: number
): "nailed" | "close" | "off" {
  if (percentError <= 5) return "nailed";
  if (percentError <= 15) return "close";
  return "off";
}

function compareNumber(
  field: string,
  guess: number | null,
  actual: number | null
): GuessComparison | null {
  if (actual == null || guess == null) return null;

  const delta = guess - actual;
  const percentError = (Math.abs(delta) / actual) * 100;

  return { field, guess, actual, delta, percentError };
}

export function compareGuessToMovie(
  guess: Guess,
  movie: MovieData
): GuessComparison[] {
  const actuals = getMovieActuals(movie);

  const compareArr = [
    compareNumber(
      "Domestic Opening",
      millionsToDollars(guess.domestic_opening)!,
      actuals.domesticOpening
    ),
    compareNumber(
      "International Opening",
      millionsToDollars(guess.international_opening)!,
      actuals.internationalOpening
    ),
    compareNumber(
      "Worldwide Opening",
      millionsToDollars(
        Number(guess.domestic_opening) + Number(guess.international_opening)
      )!,
      actuals.worldwideOpening
    ),
    compareNumber(
      "Domestic Final",
      millionsToDollars(guess.final_domestic)!,
      actuals.finalDomestic
    ),
    compareNumber(
      "International Final",
      millionsToDollars(guess.final_international)!,
      actuals.finalInternational
    ),
    compareNumber(
      "Worldwide Final",
      millionsToDollars(
        Number(guess.final_domestic) + Number(guess.final_international)
      )!,
      actuals.worldwideFinal
    ),
    compareNumber(
      "Rotten Tomatoes",
      guess.rotten_tomatoes_score,
      actuals.rottenTomatoesScore
    ),
  ];

  return compareArr.filter(Boolean) as GuessComparison[];
}

export function compareTwoGuesses(
  guessA: Guess,
  guessB: Guess,
  movie: MovieData
): GuessVsGuess[] {
  const actuals = getMovieActuals(movie);

  function compare(
    field: string,
    a: number | null,
    b: number | null,
    actual: number | null
  ): GuessVsGuess | null {
    if (actual == null || a == null || b == null) return null;

    const deltaA = Math.abs(a - actual);
    const deltaB = Math.abs(b - actual);

    return {
      field,
      guessA: a,
      guessB: b,
      actual,
      winner: deltaA < deltaB ? "A" : deltaB < deltaA ? "B" : "tie",
    };
  }

  return [
    compare(
      "Domestic Opening",
      millionsToDollars(Number(guessA.domestic_opening))!,
      millionsToDollars(Number(guessB.domestic_opening))!,
      actuals.domesticOpening
    ),
    compare(
      "International Opening",
      millionsToDollars(Number(guessA.international_opening))!,
      millionsToDollars(Number(guessB.international_opening))!,
      actuals.internationalOpening
    ),
    compare(
      "Worldwide Opening",
      millionsToDollars(
        Number(guessA.domestic_opening) + Number(guessA.international_opening)
      )!,
      millionsToDollars(
        Number(guessB.domestic_opening) + Number(guessB.international_opening)
      )!,
      actuals.worldwideOpening
    ),
    compare(
      "Domestic Final",
      millionsToDollars(Number(guessA.final_domestic))!,
      millionsToDollars(Number(guessB.final_domestic))!,
      actuals.finalDomestic
    ),
    compare(
      "International Final",
      millionsToDollars(Number(guessA.final_international))!,
      millionsToDollars(Number(guessB.final_international))!,
      actuals.finalInternational
    ),
    compare(
      "Worldwide Final",
      millionsToDollars(
        Number(guessA.final_domestic) + Number(guessA.final_international)
      )!,
      millionsToDollars(
        Number(guessB.final_domestic) + Number(guessB.final_international)
      )!,
      actuals.worldwideFinal
    ),
    compare(
      "Rotten Tomatoes",
      guessA.rotten_tomatoes_score,
      guessB.rotten_tomatoes_score,
      actuals.rottenTomatoesScore
    ),
  ].filter(Boolean) as GuessVsGuess[];
}

function getGuessError(
  guess: Guess,
  field: string,
  actual: number | null
): number | null {
  if (actual == null) return null;

  switch (field) {
    case "Domestic Opening":
      return Math.abs(millionsToDollars(guess.domestic_opening)! - actual);
    case "International Opening":
      return Math.abs(millionsToDollars(guess.international_opening)! - actual);
    case "Worldwide Opening":
      return Math.abs(
        millionsToDollars(
          guess.domestic_opening + guess.international_opening
        )! - actual
      );
    case "Domestic Final":
      return Math.abs(millionsToDollars(guess.final_domestic)! - actual);
    case "International Final":
      return Math.abs(millionsToDollars(guess.final_international)! - actual);
    case "Worldwide Final":
      return Math.abs(
        millionsToDollars(
          guess.final_domestic + guess.final_international
        )! - actual
      );
    case "Rotten Tomatoes":
      if (guess.rotten_tomatoes_score == null) return null;
      return Math.abs(guess.rotten_tomatoes_score - actual);
    default:
      return null;
  }
}

export function compareUserToAllGuesses(
  userGuess: Guess,
  allGuesses: Guess[],
  movie: MovieData
): CategoryLeaderboard[] {
  const actuals = getMovieActuals(movie);

  const categories = [
    { field: "Domestic Opening", actual: actuals.domesticOpening },
    { field: "International Opening", actual: actuals.internationalOpening },
    { field: "Worldwide Opening", actual: actuals.worldwideOpening },
    { field: "Domestic Final", actual: actuals.finalDomestic },
    { field: "International Final", actual: actuals.finalInternational },
    { field: "Worldwide Final", actual: actuals.worldwideFinal },
    { field: "Rotten Tomatoes", actual: actuals.rottenTomatoesScore },
  ];

  const result = categories
    .map(({ field, actual }) => {
      if (actual == null) return null;

      const scored = allGuesses
        .map((g) => {
          const error = getGuessError(g, field, actual);
          return error != null ? { guess: g, error } : null;
        })
        .filter(Boolean) as { guess: Guess; error: number }[];

      scored.sort((a, b) => a.error - b.error);

      const userIndex = scored.findIndex((s) => s.guess.id === userGuess.id);
      if (userIndex === -1) return null;

      const errors = scored.map((s) => s.error);
      const medianError = errors[Math.floor(errors.length / 2)];

      return {
        field,
        totalGuesses: scored.length,
        userRank: userIndex + 1,
        percentile: Math.round(
          ((scored.length - (userIndex + 1)) / scored.length) * 100
        ),
        bestError: errors[0],
        medianError,
      };
    })
    .filter(Boolean) as CategoryLeaderboard[];

  return result;
}

/** Max reduction in box office error (as a fraction) for an exact RT guess. */
const RT_MAX_BONUS = 0.05;
/** RT guesses this many points off (or more) earn no bonus. */
const RT_BONUS_CUTOFF = 20;

function rtBonus(guessRt: number | null, actualRt: number | null): number {
  if (actualRt == null || guessRt == null) return 0;
  const pointsOff = Math.abs(guessRt - actualRt);
  return RT_MAX_BONUS * Math.max(0, 1 - pointsOff / RT_BONUS_CUTOFF);
}

export function overallRanking(
  userGuess: Guess,
  allGuesses: Guess[],
  movie: MovieData
): OverallPerformance | null {
  const actuals = getMovieActuals(movie);
  const actualRt = actuals.rottenTomatoesScore;

  function scoreGuess(g: Guess): number | null {
    const boErrors = [
      actuals.worldwideOpening &&
        Math.abs(
          millionsToDollars(g.domestic_opening + g.international_opening)! -
            actuals.worldwideOpening
        ) / actuals.worldwideOpening,
      actuals.worldwideFinal &&
        Math.abs(
          millionsToDollars(g.final_domestic + g.final_international)! -
            actuals.worldwideFinal
        ) / actuals.worldwideFinal,
    ].filter((v): v is number => typeof v === "number");

    if (boErrors.length) {
      const boScore = boErrors.reduce((a, b) => a + b, 0) / boErrors.length;
      return boScore - rtBonus(g.rotten_tomatoes_score, actualRt);
    }

    // Before box office numbers are in, rank on RT alone; players who
    // skipped RT have nothing to be ranked on yet.
    if (actualRt != null && g.rotten_tomatoes_score != null) {
      return Math.abs(g.rotten_tomatoes_score - actualRt);
    }

    return null;
  }

  const scores = allGuesses
    .map((g) => {
      const s = scoreGuess(g);
      return s != null ? { guess: g, score: s } : null;
    })
    .filter(Boolean) as { guess: Guess; score: number }[];

  scores.sort((a, b) => a.score - b.score);

  const index = scores.findIndex((s) => s.guess.id === userGuess.id);
  if (index === -1) return null;

  return {
    overallRank: index + 1,
    totalGuesses: scores.length,
    percentile: Math.round(
      ((scores.length - (index + 1)) / scores.length) * 100
    ),
  };
}
