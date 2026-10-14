import { Fragment } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  Guess,
  MovieData,
  GuessComparison,
  GuessVsGuess,
  CategoryLeaderboard,
} from "../../types";
import {
  compareGuessToMovie,
  compareTwoGuesses,
  compareUserToAllGuesses,
  overallRanking,
  getAccuracyTier,
  formatMissAmount,
  formatRank,
} from "../../utils/guessComparison";
import { formatDollars } from "../../utils/formatMoney";
import TicketStub from "../TicketStub/TicketStub";
import MissMeter from "../MissMeter/MissMeter";
import LetterboardHeading, { backlightDelay } from "../Letterboard/LetterboardHeading";

interface ResultSectionProps {
  movie: MovieData;
  userGuess: Guess;
  allMovieGuesses: Guess[];
  className?: string;
}

const TIER_STYLES = {
  nailed: {
    border: "border-theater-gold/65",
    badge: "text-theater-gold",
    pin: "bg-theater-gold shadow-[0_0_10px_rgba(230,197,103,0.6)]",
  },
  close: {
    border: "border-stone-700/50",
    badge: "text-stone-300",
    pin: "bg-stone-300",
  },
  off: {
    border: "border-stone-700/50",
    badge: "text-cinema-300",
    pin: "bg-cinema-300",
  },
};

/** Badge copy: a verdict plus how far, and which way, the guess missed. */
function verdictFor(row: GuessComparison, tier: keyof typeof TIER_STYLES) {
  if (row.delta === 0) return { verdict: "Dead on", detail: "" };
  const amount = formatMissAmount(row);
  const direction = row.delta > 0 ? "over" : "under";

  if (tier === "off") {
    return { verdict: row.delta > 0 ? "Way over" : "Way under", detail: `by ${amount}` };
  }
  return { verdict: tier === "nailed" ? "Nailed it" : "Close", detail: `${amount} ${direction}` };
}

function AccuracyCard({
  row,
  leaderboardRow,
  featured = false,
  revealDelayMs = 0,
}: {
  row: GuessComparison;
  leaderboardRow?: CategoryLeaderboard;
  revealDelayMs?: number;
  /** The group's headline result (Worldwide): spans two columns, and two rows beside the stacked cards on large screens. */
  featured?: boolean;
}) {
  const tier = getAccuracyTier(row.percentError);
  const styles = TIER_STYLES[tier];
  const { verdict, detail } = verdictFor(row, tier);
  const isRT = row.field === "Rotten Tomatoes";

  const formatVal = (v: number) =>
    isRT ? `${v}%` : formatDollars(v);
  const differenceLabel =
    row.delta > 0 ? "Your Overshot" : row.delta < 0 ? "Your Undershot" : "Difference";
  // Proper minus sign so "−" and "+" share a width and screen readers say "minus".
  const sign = row.delta > 0 ? "+" : row.delta < 0 ? "\u2212" : "";

  return (
    <div
      className={`backlit flex flex-col rounded-xl border bg-cinema-900/50 ${styles.border} ${
        featured ? "p-5 sm:p-6 sm:col-span-2 lg:row-span-2" : "p-4"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div className="text-left">
          <h4 className={`font-semibold text-stone-100 ${featured ? "text-base" : "text-sm"}`}>
            {row.field}
          </h4>
          {featured && (
            <p className="mt-0.5 text-xs text-stone-400">Domestic + international combined</p>
          )}
        </div>
        <span
          className={`text-[14px] uppercase tracking-wider tabular-nums px-2 py-0.5 rounded-sm border border-current/40 ${styles.badge}`}
        >
          <span className="font-bold">{verdict}</span>
          {detail && <span className="font-medium opacity-80"> {detail}</span>}
        </span>
      </div>

      {/* Ledger rows at one size, right-aligned, so the two figures compare digit for digit. */}
      <dl className={`mb-5 space-y-1 ${featured ? "flex-1 flex flex-col justify-center" : ""}`}>
        {[
          { label: "Your Guess", value: formatVal(row.guess), valueClass: "font-medium text-stone-100" },
          { label: "Actual", value: formatVal(row.actual), valueClass: "font-semibold text-theater-gold" },
          {
            label: differenceLabel,
            value: `${sign}${formatVal(Math.abs(row.delta))}`,
            valueClass: "font-medium text-stone-300",
            rowClass: "mt-1.5 pt-1.5 border-t border-stone-600/70",
            small: true,
          },
        ].map(({ label, value, valueClass, rowClass = "", small = false }) => (
          <div key={label} className={`flex items-baseline gap-3 ${rowClass}`}>
            <dt
              className={`font-medium uppercase tracking-wider text-stone-400 ${
                small ? (featured ? "text-sm" : "text-xs") : featured ? "sm:text-lg" : "text-base"
              }`}
            >
              {label}
            </dt>
            <span aria-hidden="true" className="flex-1 border-b border-dotted border-stone-600/70" />
            <dd
              className={`font-marquee leading-tight tabular-nums ${valueClass} ${
                small
                  ? featured ? "text-2xl sm:text-3xl" : "text-lg"
                  : featured ? "text-4xl sm:text-5xl" : "text-2xl"
              }`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mb-3">
        <MissMeter
          delta={row.delta}
          percentError={row.percentError}
          missAmount={formatMissAmount(row)}
          pinClassName={styles.pin}
          revealDelayMs={revealDelayMs}
          landingPulse={tier === "nailed"}
        />
      </div>

      {leaderboardRow && (
        <p className="text-xs tabular-nums text-stone-300">
          {formatRank(leaderboardRow.userRank, leaderboardRow.totalGuesses)}
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
      <h2 className="text-sm font-semibold text-theater-gold uppercase tracking-wider mb-3">
        Overall Performance
      </h2>
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
    fields: ["Worldwide Opening", "Domestic Opening", "International Opening"],
  },
  {
    title: "Final",
    fields: ["Worldwide Final", "Domestic Final", "International Final"],
  },
  { title: "Critical Reception", fields: ["Rotten Tomatoes"] },
];

const PIN_STAGGER_MS = 120;

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
    <div className="backlit-scope" style={backlightDelay(title)}>
      <LetterboardHeading className="mb-4">{title}</LetterboardHeading>
      <div ref={parent} className={className}>
        {rows.map((row, i) => (
          <AccuracyCard
            key={row.field}
            row={row}
            leaderboardRow={leaderboard.find((r) => r.field === row.field)}
            featured={rows.length > 1 && row.field.startsWith("Worldwide")}
            revealDelayMs={i * PIN_STAGGER_MS}
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
      <h2 className="text-2xl font-semibold text-stone-200 uppercase tracking-wider mb-4">
        Your Accuracy
      </h2>
      <div className="space-y-10">
        {ACCURACY_GROUPS.map((group) => {
          const rows = group.fields.flatMap((field) =>
            userResults.filter((r) => r.field === field)
          );
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

  const friendName = friendGuess.guess_user?.name ?? "Friend";
  const winsA = vsResults.filter((r) => r.winner === "A").length;
  const winsB = vsResults.filter((r) => r.winner === "B").length;
  const tally =
    winsA === winsB
      ? `Tied ${winsA}–${winsB}`
      : winsA > winsB
        ? `You win ${winsA}–${winsB}`
        : `${friendName} wins ${winsB}–${winsA}`;
  const footer = `ADMIT TWO · ${movie.title.toUpperCase()}`;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h2 className="text-sm font-semibold text-stone-200 uppercase tracking-wider">
          You vs {friendName}
        </h2>
        <span className="text-sm text-theater-gold font-semibold">{tally}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <VersusTicket
          name="You"
          side="A"
          rows={vsResults}
          wins={winsA}
          isWinner={winsA > winsB}
          footer={footer}
        />
        <VersusTicket
          name={friendName}
          side="B"
          rows={vsResults}
          wins={winsB}
          isWinner={winsB > winsA}
          footer={footer}
        />
      </div>
    </div>
  );
}

function VersusTicket({
  name,
  side,
  rows,
  wins,
  isWinner,
  footer,
}: {
  name: string;
  side: "A" | "B";
  rows: GuessVsGuess[];
  wins: number;
  isWinner: boolean;
  footer: string;
}) {
  return (
    <TicketStub footer={footer} className="rounded-r">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="text-left min-w-0">
          <p className="text-2xl uppercase leading-none truncate">{name}</p>
          <p className="text-xs uppercase tracking-wider text-ticket-ink/65 mt-1">
            {wins} {wins === 1 ? "win" : "wins"}
          </p>
        </div>
        {isWinner && (
          <span className="shrink-0 bg-ticket-ink text-ticket text-xs uppercase tracking-[0.2em] px-2 py-1">
            Winner
          </span>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm font-outfit text-left">
        {rows.map((row) => {
          const isRT = row.field === "Rotten Tomatoes";
          const value = side === "A" ? row.guessA : row.guessB;
          const won = row.winner === side;
          return (
            <Fragment key={row.field}>
              <span className="text-ticket-ink/65">{row.field}</span>
              <span
                className={`text-right ${won ? "font-bold text-ticket-ink" : "text-ticket-ink/55"}`}
              >
                {won && <span aria-label="won">★ </span>}
                {isRT ? `${value}%` : formatDollars(value)}
              </span>
            </Fragment>
          );
        })}
      </div>
    </TicketStub>
  );
}
