import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  Guess,
  MovieData,
  GuessComparison,
  CategoryLeaderboard,
} from "../../types";
import {
  compareGuessToMovie,
  compareTwoGuesses,
  compareUserToAllGuesses,
  overallRanking,
  getAccuracyTier,
} from "../../utils/guessComparison";
import { formatDollars } from "../../utils/formatMoney";

interface GuessComparisonCardsProps {
  movie: MovieData;
  userGuess: Guess;
  friendGuess?: Guess;
  allMovieGuesses: Guess[];
}

const TIER_STYLES = {
  nailed: {
    label: "Nailed it",
    border: "border-green-500/40",
    badge: "bg-green-500/20 text-green-400",
    bar: "bg-green-500",
  },
  close: {
    label: "Close",
    border: "border-yellow-500/40",
    badge: "bg-yellow-500/20 text-yellow-400",
    bar: "bg-yellow-500",
  },
  off: {
    label: "Way off",
    border: "border-red-500/40",
    badge: "bg-red-500/20 text-red-400",
    bar: "bg-red-500",
  },
};

function AccuracyCard({
  row,
  leaderboardRow,
}: {
  row: GuessComparison;
  leaderboardRow?: CategoryLeaderboard;
}) {
  const tier = getAccuracyTier(row.percentError);
  const styles = TIER_STYLES[tier];
  const isRT = row.field === "Rotten Tomatoes";
  const maxVal = Math.max(row.guess, row.actual);
  const guessPct = maxVal > 0 ? (row.guess / maxVal) * 100 : 0;
  const actualPct = maxVal > 0 ? (row.actual / maxVal) * 100 : 0;

  const formatVal = (v: number) =>
    isRT ? `${v}%` : formatDollars(v);

  return (
    <div
      className={`rounded-xl border p-4 bg-cinema-900/50 ${styles.border}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-sm font-semibold text-stone-200">{row.field}</h4>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.badge}`}
        >
          {styles.label} · {row.percentError.toFixed(1)}% off
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <p className="text-stone-500 text-xs">Your Guess</p>
          <p className="text-stone-200 font-medium">{formatVal(row.guess)}</p>
        </div>
        <div>
          <p className="text-stone-500 text-xs">Actual</p>
          <p className="text-theater-gold font-medium">{formatVal(row.actual)}</p>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="h-1.5 bg-cinema-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full opacity-70 ${styles.bar}`}
            style={{ width: `${Math.min(guessPct, 100)}%` }}
          />
        </div>
        <div className="h-1.5 bg-cinema-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-theater-gold/60"
            style={{ width: `${Math.min(actualPct, 100)}%` }}
          />
        </div>
      </div>

      {leaderboardRow && (
        <p className="text-xs text-stone-500">
          Rank {leaderboardRow.userRank} / {leaderboardRow.totalGuesses}
          <span className="text-stone-400">
            {" "}
            · Top {leaderboardRow.percentile}%
          </span>
        </p>
      )}
    </div>
  );
}

export default function GuessComparisonCards({
  movie,
  userGuess,
  friendGuess,
  allMovieGuesses,
}: GuessComparisonCardsProps) {
  const [parent] = useAutoAnimate();

  const userResults = compareGuessToMovie(userGuess, movie);
  const vsResults = friendGuess
    ? compareTwoGuesses(userGuess, friendGuess, movie)
    : [];
  const categoryLeaderboard = compareUserToAllGuesses(
    userGuess,
    allMovieGuesses,
    movie
  );
  const overall = overallRanking(userGuess, allMovieGuesses, movie);

  return (
    <div className="space-y-6">
      {overall && (
        <div className="p-4 rounded-xl bg-cinema-900/80 border border-theater-gold/30">
          <h3 className="text-sm font-semibold text-theater-gold uppercase tracking-wider mb-2">
            Overall Performance
          </h3>
          <p className="text-stone-200">
            Rank <strong>{overall.overallRank}</strong> of{" "}
            {overall.totalGuesses}
          </p>
          <p className="text-sm text-stone-400">
            Better than {overall.percentile}% of players
          </p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-stone-200 uppercase tracking-wider mb-4">
          Your Accuracy
        </h3>
        <div ref={parent} className="space-y-3">
          {userResults.map((row) => (
            <AccuracyCard
              key={row.field}
              row={row}
              leaderboardRow={categoryLeaderboard.find(
                (r) => r.field === row.field
              )}
            />
          ))}
        </div>
      </div>

      {friendGuess && vsResults.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-200 uppercase tracking-wider mb-4">
            You vs {friendGuess.guess_user?.name ?? "Friend"}
          </h3>
          <div className="space-y-2">
            {vsResults.map((row) => {
              const isRT = row.field === "Rotten Tomatoes";
              const fmt = (v: number) => (isRT ? `${v}%` : formatDollars(v));
              const winnerLabel =
                row.winner === "tie"
                  ? "Tie"
                  : row.winner === "A"
                    ? "You"
                    : friendGuess.guess_user?.name ?? "Friend";

              return (
                <div
                  key={row.field}
                  className="flex items-center justify-between p-3 rounded-lg bg-cinema-900/50 border border-cinema-800 text-sm"
                >
                  <span className="text-stone-400">{row.field}</span>
                  <div className="flex items-center gap-3 text-stone-300">
                    <span className={row.winner === "A" ? "text-theater-gold font-semibold" : ""}>
                      {fmt(row.guessA)}
                    </span>
                    <span className="text-stone-600">vs</span>
                    <span className={row.winner === "B" ? "text-theater-gold font-semibold" : ""}>
                      {fmt(row.guessB)}
                    </span>
                    <span className="text-xs text-stone-500 ml-2">
                      → {winnerLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
