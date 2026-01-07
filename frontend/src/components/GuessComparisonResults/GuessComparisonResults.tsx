import {
  Guess,
  MovieData,
  GuessComparison,
  GuessVsGuess,
  CategoryLeaderboard,
  OverallPerformance
} from "../../types";
import styles from "./GuessComparisonResults.module.css";

function parseMoney(value: string | null | undefined): number | null {
  if (!value) return null;
  return Number(value.replace(/[^0-9.-]+/g, ""));
}

function millionsToDollars(value: number | null | undefined): number | null {
  if (value == null) return null;
  return value * 1_000_000;
}

function getMovieActuals(movie: MovieData) {
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

function compareNumber(
  field: string,
  guess: number,
  actual: number | null
): GuessComparison | null {
  if (actual == null) return null;

  const delta = guess - actual;
  const percentError = Math.abs(delta) / actual * 100;

  return {
    field,
    guess,
    actual,
    delta,
    percentError,
  };
}

function compareGuessToMovie(
  guess: Guess,
  movie: MovieData
): GuessComparison[] {
  const actuals = getMovieActuals(movie);

  let compareArr = [
    compareNumber("Domestic Opening", millionsToDollars(guess.domestic_opening)!, actuals.domesticOpening),
    compareNumber("International Opening", millionsToDollars(guess.international_opening)!, actuals.internationalOpening),
    compareNumber(
      "Worldwide Opening",
      millionsToDollars(Number(guess.domestic_opening) + Number(guess.international_opening))!,
      actuals.worldwideOpening
    ),
    compareNumber("Domestic Final", millionsToDollars(guess.final_domestic)!, actuals.finalDomestic),
    compareNumber("International Final", millionsToDollars(guess.final_international)!, actuals.finalInternational),
    compareNumber(
      "Worldwide Final",
      millionsToDollars(Number(guess.final_domestic) + Number(guess.final_international))!,
      actuals.worldwideFinal
    ),
    compareNumber("Rotten Tomatoes", guess.rotten_tomatoes_score, actuals.rottenTomatoesScore),
  ]

  return compareArr.filter(Boolean) as GuessComparison[];
}

function compareTwoGuesses(
  guessA: Guess,
  guessB: Guess,
  movie: MovieData
): GuessVsGuess[] {
  const actuals = getMovieActuals(movie);

  function compare(
    field: string,
    a: number,
    b: number,
    actual: number | null
  ): GuessVsGuess | null {
    if (actual == null) return null;

    const deltaA = Math.abs(a - actual);
    const deltaB = Math.abs(b - actual);

    return {
      field,
      guessA: a,
      guessB: b,
      actual,
      winner:
        deltaA < deltaB ? "A" :
        deltaB < deltaA ? "B" :
        "tie",
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
      millionsToDollars(Number(guessA.domestic_opening) + Number(guessA.international_opening))!,
      millionsToDollars(Number(guessB.domestic_opening) + Number(guessB.international_opening))!,
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
      millionsToDollars(Number(guessA.final_domestic) + Number(guessA.final_international))!,
      millionsToDollars(Number(guessB.final_domestic) + Number(guessB.final_international))!,
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
      return Math.abs(
        millionsToDollars(guess.domestic_opening)! - actual
      );

    case "International Opening":
      return Math.abs(
        millionsToDollars(guess.international_opening)! - actual
      );

    case "Worldwide Opening":
      return Math.abs(
        millionsToDollars(
          guess.domestic_opening + guess.international_opening
        )! - actual
      );

    case "Domestic Final":
      return Math.abs(
        millionsToDollars(guess.final_domestic)! - actual
      );

    case "International Final":
      return Math.abs(
        millionsToDollars(guess.final_international)! - actual
      );

    case "Worldwide Final":
      return Math.abs(
        millionsToDollars(
          guess.final_domestic + guess.final_international
        )! - actual
      );

    case "Rotten Tomatoes":
      return Math.abs(
        guess.rotten_tomatoes_score - actual
      );

    default:
      return null;
  }
}

function compareUserToAllGuesses(
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
        .map(g => {
          const error = getGuessError(g, field, actual);
          return error != null
            ? { guess: g, error }
            : null;
        })
        .filter(Boolean) as { guess: Guess; error: number }[];

      scored.sort((a, b) => a.error - b.error);

      const userIndex = scored.findIndex(
        s => s.guess.id === userGuess.id
      );

      if (userIndex === -1) return null;

      const errors = scored.map(s => s.error);
      const medianError = errors[Math.floor(errors.length / 2)];

      return {
        field,
        totalGuesses: scored.length,
        userRank: userIndex + 1,
        percentile: Math.round(
          ((scored.length - userIndex) / scored.length) * 100
        ),
        bestError: errors[0],
        medianError,
      };
    })

    return result.filter(Boolean) as CategoryLeaderboard[];
  }

function overallRanking(
  userGuess: Guess,
  allGuesses: Guess[],
  movie: MovieData
): OverallPerformance | null {
  const actuals = getMovieActuals(movie);

  function scoreGuess(g: Guess): number | null {
    let score = 0;
    let count = 0;

    const fields = [
      actuals.worldwideOpening &&
        Math.abs(
          millionsToDollars(
            g.domestic_opening + g.international_opening
          )! - actuals.worldwideOpening
        ) / actuals.worldwideOpening,

      actuals.worldwideFinal &&
        Math.abs(
          millionsToDollars(
            g.final_domestic + g.final_international
          )! - actuals.worldwideFinal
        ) / actuals.worldwideFinal,

      actuals.rottenTomatoesScore &&
        Math.abs(
          g.rotten_tomatoes_score - actuals.rottenTomatoesScore
        ) / actuals.rottenTomatoesScore,
    ];

    fields.forEach(v => {
      if (typeof v === "number") {
        score += v;
        count++;
      }
    });

    return count ? score / count : null;
  }

  const scores = allGuesses
    .map(g => {
      const s = scoreGuess(g);
      return s != null ? { guess: g, score: s } : null;
    })
    .filter(Boolean) as { guess: Guess; score: number }[];

  scores.sort((a, b) => a.score - b.score);

  const index = scores.findIndex(s => s.guess.id === userGuess.id);
  if (index === -1) return null;

  return {
    overallRank: index + 1,
    totalGuesses: scores.length,
    percentile: Math.round(
      ((scores.length - index) / scores.length) * 100
    ),
  };
}


interface GuessComparisonResultsProps {
  movie: MovieData;
  userGuess: Guess;
  friendGuess?: Guess;
  allMovieGuesses: Guess[];
}

export default function GuessComparisonResults({
  movie,
  userGuess,
  friendGuess,
  allMovieGuesses,
}: GuessComparisonResultsProps) {

  const userResults = compareGuessToMovie(userGuess, movie);
  const vsResults =
    friendGuess ? compareTwoGuesses(userGuess, friendGuess, movie) : [];
  
  const categoryLeaderboard = compareUserToAllGuesses(
    userGuess,
    allMovieGuesses ?? [],
    movie
  );

  const overall = overallRanking(
    userGuess,
    allMovieGuesses ?? [],
    movie
  );

  function formatMillions(value: number) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }


  return (
    <div className={styles.wrapper}>
      {/* USER VS ACTUALS */}
      <section>
        {overall && (
          <section className={styles.overall}>
            <h3>Overall Performance</h3>
            <p>
              Rank: <strong>{overall.overallRank}</strong> /{" "}
              {overall.totalGuesses}
            </p>
            <p>
              Better than{" "}
              <strong>{overall.percentile}%</strong> of players
            </p>
          </section>
        )}

        <h3>Your Accuracy</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Your Guess</th>
              <th>Actual</th>
              <th>% Off</th>
              <th>Vs Others</th>
            </tr>
          </thead>
          <tbody>
            {userResults.map((row) => {
              const leaderboardRow = categoryLeaderboard.find(
                (r) => r.field === row.field
              );

              return (
                <tr key={row.field}>
                  <td>{row.field}</td>
                  <td>{row.field == 'Rotten Tomatoes' ? row.guess + "%" : formatMillions(row.guess)}</td>
                  <td>{row.field == 'Rotten Tomatoes' ? row.actual + "%" : formatMillions(row.actual)}</td>
                  <td>{row.delta > 0 ? "+" : "-"}{row.percentError.toFixed(1)}%</td>
                  <td>
                    
                    {leaderboardRow ? (
                      <>
                        {/* <pre className={styles['json-data']}>{JSON.stringify(leaderboardRow, null, 2)}</pre> */}
                        {leaderboardRow.userRank} / {leaderboardRow.totalGuesses}
                        <span className={styles.percentile}>
                          {" "}
                          ({leaderboardRow.percentile}th %)
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {/* USER VS FRIEND */}
      {friendGuess && (
        <section>
          <h3>You vs {friendGuess.guess_user?.name ?? "Friend"}</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Category</th>
                <th>You</th>
                <th>{friendGuess.guess_user?.name ?? "Them"}</th>
                <th>Actual</th>
                <th>Winner</th>
              </tr>
            </thead>
            <tbody>
              {vsResults.map((row) => (
                <tr key={row.field}>
                  <td>{row.field}</td>
                  <td>{row.field == 'Rotten Tomatoes' ? row.guessA + "%" : formatMillions(row.guessA)}</td>
                  <td>{row.field == 'Rotten Tomatoes' ? row.guessB + "%" : formatMillions(row.guessB)}</td>
                  <td>{row.field == 'Rotten Tomatoes' ? row.actual + "%" : formatMillions(row.actual)}</td>
                  <td>
                    {row.winner === "tie"
                      ? "Tie"
                      : row.winner === "A"
                      ? "You"
                      : friendGuess.guess_user?.name ?? "Friend"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
