import { Fragment, useId, useState } from "react";
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
import MissMeter, { type MissMeterOther } from "../MissMeter/MissMeter";
import LetterboardHeading, { backlightDelay } from "../Letterboard/LetterboardHeading";

interface ResultSectionProps {
  movie: MovieData;
  userGuess: Guess;
  allMovieGuesses: Guess[];
  friendGuesses?: Guess[];
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

const MAX_FRIEND_PINS = 3;

/** Badge copy: a verdict plus how far, and which way, the guess missed. */
function verdictFor(row: GuessComparison, tier: keyof typeof TIER_STYLES) {
  if (row.delta === 0) return { verdict: "Dead on", detail: "" };
  const amount = formatMissAmount(row);
  const direction = row.delta > 0 ? "over" : "under";

  if (tier === "off") {
    return { verdict: row.delta > 0 ? "Way over" : "Way under", detail: `by ${amount}` };
  }
  return { verdict: tier === "nailed" ? "Nailed it!" : "Close...", detail: `${amount} ${direction}` };
}

type FriendFieldRow = {
  guess: Guess;
  row: GuessComparison;
};

function meterOthers(friendsOnField: FriendFieldRow[]): MissMeterOther[] {
  return [...friendsOnField]
    .sort((a, b) => a.row.percentError - b.row.percentError)
    .slice(0, MAX_FRIEND_PINS)
    .map(({ guess, row }) => {
      const isRT = row.field === "Rotten Tomatoes";
      return {
        id: guess.id,
        name: guess.guess_user?.name ?? "Friend",
        delta: row.delta,
        percentError: row.percentError,
        missAmount: formatMissAmount(row),
        guessLabel: isRT ? `${row.guess}%` : formatDollars(row.guess),
      };
    });
}

/** Closest friend to the actual on this field — for the one-line rivalry. */
function rivalryLine(userRow: GuessComparison, friendsOnField: FriendFieldRow[]): string | null {
  if (friendsOnField.length === 0) return null;
  const rival = [...friendsOnField].sort(
    (a, b) => a.row.percentError - b.row.percentError
  )[0];
  const name = rival.guess.guess_user?.name ?? "Friend";
  const isRT = userRow.field === "Rotten Tomatoes";
  // How much closer the winner was to the actual (dollars for BO, score points for RT).
  const missGap = Math.abs(Math.abs(userRow.delta) - Math.abs(rival.row.delta));
  const gapLabel = isRT ? `${missGap} pts` : formatDollars(missGap);

  if (userRow.percentError < rival.row.percentError) {
    return `You beat ${name} by ${gapLabel}.`;
  }
  if (userRow.percentError > rival.row.percentError) {
    return `${name} beat you by ${gapLabel}.`;
  }
  return `You and ${name} tied for closest.`;
}

function AccuracyCard({
  row,
  leaderboardRow,
  friendLeaderboardRow,
  friendsOnField,
  featured = false,
  revealDelayMs = 0,
}: {
  row: GuessComparison;
  leaderboardRow?: CategoryLeaderboard;
  friendLeaderboardRow?: CategoryLeaderboard;
  friendsOnField: FriendFieldRow[];
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

  const others = meterOthers(friendsOnField);
  const rivalry = rivalryLine(row, friendsOnField);

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
          others={others}
        />
      </div>

      {rivalry && (
        <p className="mb-2 text-xs text-left text-stone-400">{rivalry}</p>
      )}

      {(leaderboardRow || friendLeaderboardRow) && (
        <div className="text-xs text-right italic [font-synthesis:style] tabular-nums text-stone-300 space-y-0.5">
          {leaderboardRow && (
            <p>{formatRank(leaderboardRow.userRank, leaderboardRow.totalGuesses)}</p>
          )}
          {friendLeaderboardRow && (
            <p>
              {formatRank(friendLeaderboardRow.userRank, friendLeaderboardRow.totalGuesses)} among
              friends
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function OverallPerformance({
  movie,
  userGuess,
  allMovieGuesses,
  friendGuesses = [],
  className = "",
}: ResultSectionProps) {
  const overall = overallRanking(userGuess, allMovieGuesses, movie);
  if (!overall) return null;

  const amongFriends =
    friendGuesses.length > 0
      ? overallRanking(userGuess, [userGuess, ...friendGuesses], movie)
      : null;

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
        {amongFriends && (
          <>
            {" "}
            ·{" "}
            <span className="text-theater-gold/90">
              #{amongFriends.overallRank} among {amongFriends.totalGuesses} friends
            </span>
          </>
        )}
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
  friendLeaderboard,
  friendsByField,
  className,
}: {
  title: string;
  rows: GuessComparison[];
  leaderboard: CategoryLeaderboard[];
  friendLeaderboard: CategoryLeaderboard[];
  friendsByField: Map<string, FriendFieldRow[]>;
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
            friendLeaderboardRow={friendLeaderboard.find((r) => r.field === row.field)}
            friendsOnField={friendsByField.get(row.field) ?? []}
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
  friendGuesses = [],
  className = "space-y-3",
}: ResultSectionProps) {
  const userResults = compareGuessToMovie(userGuess, movie);
  const categoryLeaderboard = compareUserToAllGuesses(
    userGuess,
    allMovieGuesses,
    movie
  );
  const friendLeaderboard =
    friendGuesses.length > 0
      ? compareUserToAllGuesses(userGuess, [userGuess, ...friendGuesses], movie)
      : [];

  const friendsByField = new Map<string, FriendFieldRow[]>();
  for (const g of friendGuesses) {
    for (const row of compareGuessToMovie(g, movie)) {
      const list = friendsByField.get(row.field) ?? [];
      list.push({ guess: g, row });
      friendsByField.set(row.field, list);
    }
  }

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
              friendLeaderboard={friendLeaderboard}
              friendsByField={friendsByField}
              className={className}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Prefer the inviter, else the friend you beat on the most categories, else the first. */
function defaultRivalId(
  userGuess: Guess,
  friends: Guess[],
  movie: MovieData,
  preferredId?: string
): string {
  if (preferredId && friends.some((f) => f.id === preferredId)) return preferredId;
  let bestId = friends[0]?.id ?? "";
  let bestWins = -1;
  for (const f of friends) {
    const vs = compareTwoGuesses(userGuess, f, movie);
    const wins = vs.filter((r) => r.winner === "A").length;
    if (wins > bestWins) {
      bestWins = wins;
      bestId = f.id;
    }
  }
  return bestId;
}

export function FriendComparison({
  movie,
  userGuess,
  friendGuesses,
  preferredFriendGuessId,
}: {
  movie: MovieData;
  userGuess: Guess;
  friendGuesses: Guess[];
  /** e.g. inviter guess id when arriving via share link */
  preferredFriendGuessId?: string;
}) {
  const groupId = useId();
  const [selectedId, setSelectedId] = useState(() =>
    defaultRivalId(userGuess, friendGuesses, movie, preferredFriendGuessId)
  );

  if (friendGuesses.length === 0) return null;

  const selected =
    friendGuesses.find((f) => f.id === selectedId) ?? friendGuesses[0];
  const vsResults = compareTwoGuesses(userGuess, selected, movie);
  if (vsResults.length === 0) return null;

  const friendName = selected.guess_user?.name ?? "Friend";
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
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="text-2xl font-semibold text-stone-200 uppercase tracking-wider">
          You vs {friendName}
        </h2>
        <span
          className="text-sm text-theater-gold font-semibold tabular-nums"
          aria-live="polite"
        >
          {tally}
        </span>
      </div>

      {friendGuesses.length > 1 && (
        <fieldset className="mb-4">
          <legend className="sr-only">Choose a friend to compare</legend>
          <div
            role="radiogroup"
            aria-label="Friend to compare"
            className="flex flex-wrap gap-2"
          >
            {friendGuesses.map((f) => {
              const name = f.guess_user?.name ?? "Friend";
              const checked = f.id === selected.id;
              return (
                <label
                  key={f.id}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-theater-gold ${
                    checked
                      ? "border-theater-gold/60 bg-theater-gold/10 text-theater-gold"
                      : "border-stone-700/60 text-stone-300 hover:border-stone-500"
                  }`}
                >
                  <input
                    type="radio"
                    name={groupId}
                    value={f.id}
                    checked={checked}
                    onChange={() => setSelectedId(f.id)}
                    className="sr-only"
                  />
                  {name}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        aria-live="polite"
      >
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
