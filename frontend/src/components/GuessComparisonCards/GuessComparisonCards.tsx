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

interface ResultSectionProps {
  movie: MovieData;
  userGuess: Guess;
  allMovieGuesses: Guess[];
  className?: string;
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
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
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

export function OverallPerformance({
  movie,
  userGuess,
  allMovieGuesses,
  className = "",
}: ResultSectionProps) {
  const overall = overallRanking(userGuess, allMovieGuesses, movie);
  if (!overall) return null;

  return (
    <div
      className={`p-5 rounded-xl bg-cinema-900/80 border border-theater-gold/30 ${className}`}
    >
      <h3 className="text-sm font-semibold text-theater-gold uppercase tracking-wider mb-3">
        Overall Performance
      </h3>
      <p className="text-stone-200 text-2xl md:text-3xl">
        Rank <strong>{overall.overallRank}</strong>
        <span className="text-stone-400 text-lg md:text-xl">
          {" "}
          of {overall.totalGuesses}
        </span>
      </p>
      <p className="text-sm text-stone-400 mt-1">
        Better than {overall.percentile}% of players
      </p>
    </div>
  );
}

const ACCURACY_GROUPS: { title: string; fields: string[] }[] = [
  {
    title: "Opening Weekend",
    fields: ["Domestic Opening", "International Opening", "Worldwide Opening"],
  },
  {
    title: "Final",
    fields: ["Domestic Final", "International Final", "Worldwide Final"],
  },
  { title: "Critical Reception", fields: ["Rotten Tomatoes"] },
];

function AccuracyGroup({
  title,
  rows,
  leaderboard,
  className,
}: {
  title: string;
  rows: GuessComparison[];
  leaderboard: CategoryLeaderboard[];
  className: string;
}) {
  const [parent] = useAutoAnimate();

  return (
    <div>
      <h4 className="text-left text-xs font-semibold text-theater-gold uppercase tracking-wider mb-3">
        {title}
      </h4>
      <div ref={parent} className={className}>
        {rows.map((row) => (
          <AccuracyCard
            key={row.field}
            row={row}
            leaderboardRow={leaderboard.find((r) => r.field === row.field)}
          />
        ))}
      </div>
    </div>
  );
}

export function AccuracyGrid({
  movie,
  userGuess,
  allMovieGuesses,
  className = "space-y-3",
}: ResultSectionProps) {
  const userResults = compareGuessToMovie(userGuess, movie);
  const categoryLeaderboard = compareUserToAllGuesses(
    userGuess,
    allMovieGuesses,
    movie
  );

  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-200 uppercase tracking-wider mb-4">
        Your Accuracy
      </h3>
      <div className="space-y-6">
        {ACCURACY_GROUPS.map((group) => {
          const rows = userResults.filter((r) => group.fields.includes(r.field));
          if (rows.length === 0) return null;
          return (
            <AccuracyGroup
              key={group.title}
              title={group.title}
              rows={rows}
              leaderboard={categoryLeaderboard}
              className={className}
            />
          );
        })}
      </div>
    </div>
  );
}

export function FriendComparison({
  movie,
  userGuess,
  friendGuess,
}: {
  movie: MovieData;
  userGuess: Guess;
  friendGuess?: Guess;
}) {
  const vsResults = friendGuess
    ? compareTwoGuesses(userGuess, friendGuess, movie)
    : [];
  if (!friendGuess || vsResults.length === 0) return null;

  return (
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
  );
}
