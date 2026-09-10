import { Guess, MovieData } from "../../types";
import {
  compareGuessToMovie,
  compareTwoGuesses,
  compareUserToAllGuesses,
  overallRanking,
} from "../../utils/guessComparison";
import { formatDollars } from "../../utils/formatMoney";
import styles from "./GuessComparisonResults.module.css";

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
  const vsResults = friendGuess
    ? compareTwoGuesses(userGuess, friendGuess, movie)
    : [];

  const categoryLeaderboard = compareUserToAllGuesses(
    userGuess,
    allMovieGuesses ?? [],
    movie
  );

  const overall = overallRanking(userGuess, allMovieGuesses ?? [], movie);

  function formatMillions(value: number) {
    return formatDollars(value);
  }

  return (
    <div className={styles.wrapper}>
      <section>
        {overall && (
          <section className={styles.overall}>
            <h3>Overall Performance</h3>
            <p>
              Rank: <strong>{overall.overallRank}</strong> /{" "}
              {overall.totalGuesses}
            </p>
            <p>
              Better than <strong>{overall.percentile}%</strong> of players
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
                  <td>
                    {row.field === "Rotten Tomatoes"
                      ? row.guess + "%"
                      : formatMillions(row.guess)}
                  </td>
                  <td>
                    {row.field === "Rotten Tomatoes"
                      ? row.actual + "%"
                      : formatMillions(row.actual)}
                  </td>
                  <td>
                    {row.delta > 0 ? "+" : "-"}
                    {row.percentError.toFixed(1)}%
                  </td>
                  <td>
                    {leaderboardRow ? (
                      <>
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
              );
            })}
          </tbody>
        </table>
      </section>

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
                  <td>
                    {row.field === "Rotten Tomatoes"
                      ? row.guessA + "%"
                      : formatMillions(row.guessA)}
                  </td>
                  <td>
                    {row.field === "Rotten Tomatoes"
                      ? row.guessB + "%"
                      : formatMillions(row.guessB)}
                  </td>
                  <td>
                    {row.field === "Rotten Tomatoes"
                      ? row.actual + "%"
                      : formatMillions(row.actual)}
                  </td>
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
