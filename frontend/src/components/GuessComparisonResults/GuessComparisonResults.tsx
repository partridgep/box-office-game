import { Guess, MovieData, GuessComparison, GuessVsGuess } from "../../types";
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
  console.log(movie, movie.rottenTomatoesScore, Number(movie.rottenTomatoesScore))

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

  return [
    compareNumber("Domestic Opening", millionsToDollars(guess.domestic_opening)!, actuals.domesticOpening),
    compareNumber("International Opening", millionsToDollars(guess.international_opening)!, actuals.internationalOpening),
    compareNumber(
      "Worldwide Opening",
      millionsToDollars(Number(guess.domestic_opening) + Number(guess.international_opening))!,
      actuals.worldwideOpening
    ),
    compareNumber("Final Domestic", millionsToDollars(guess.final_domestic)!, actuals.finalDomestic),
    compareNumber("Final International", millionsToDollars(guess.final_international)!, actuals.finalInternational),
    compareNumber(
      "Worldwide Final",
      millionsToDollars(Number(guess.final_domestic) + Number(guess.final_international))!,
      actuals.worldwideFinal
    ),
    compareNumber("Rotten Tomatoes", guess.rotten_tomatoes_score, actuals.rottenTomatoesScore),
  ].filter(Boolean) as GuessComparison[];
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
    console.log({field, actual})
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

interface GuessComparisonResultsProps {
  movie: MovieData;
  userGuess: Guess;
  friendGuess?: Guess;
}

export default function GuessComparisonResults({
  movie,
  userGuess,
  friendGuess,
}: GuessComparisonResultsProps) {
  const userResults = compareGuessToMovie(userGuess, movie);
  const vsResults =
    friendGuess ? compareTwoGuesses(userGuess, friendGuess, movie) : [];

    function formatMillions(value: number) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }


  return (
    <div className={styles.wrapper}>
      {/* USER VS ACTUALS */}
      <section>
        <h3>Your Accuracy</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Your Guess</th>
              <th>Actual</th>
              <th>% Off</th>
            </tr>
          </thead>
          <tbody>
            {userResults.map((row) => (
              <tr key={row.field}>
                <td>{row.field}</td>
                <td>{row.field == 'Rotten Tomatoes' ? row.guess + "%" : formatMillions(row.guess)}</td>
                <td>{row.field == 'Rotten Tomatoes' ? row.actual + "%" : formatMillions(row.actual)}</td>
                <td>{row.delta > 0 ? "+" : "-"}{row.percentError.toFixed(1)}%</td>
              </tr>
            ))}
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
