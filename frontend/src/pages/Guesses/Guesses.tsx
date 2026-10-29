import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Globe,
  Loader2,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useGuessStore } from "../../store/useGuessStore";
import { useMovieStore } from "../../store/useMovieStore";
import { useUserStore } from "../../store/useUserStore";
import {
  formatPercentError,
  formatRank,
} from "../../utils/guessComparison";
import {
  resolveRunPhaseLocal,
  RUN_PHASE_SECTION,
  trackingStatusLabel,
} from "../../utils/runPhase";
import { getMovieRunPhases } from "../../services/movies.service";
import type { Guess, GuessStanding, MovieData, RunPhase } from "../../types";
import { joinGuessRows, type GuessMovieRow } from "./joinGuessRows";
import { GuessMetricCards } from "./GuessMetricCards";
import {
  buildTrackingNotes,
  type TrackingNoteKind,
} from "./trackingNotes";
import { standingInsightLine } from "./standingInsight";

const listShell =
  "divide-y divide-theater-gold/30 rounded-xl border border-theater-gold/35 bg-cinema-900";

const POSTER = "https://image.tmdb.org/t/p/w185";

const TIER_LABEL: Record<GuessStanding["tier"], string> = {
  nailed: "Spot on",
  close: "Close",
  off: "Missed",
};

const TIER_BADGE: Record<GuessStanding["tier"], string> = {
  nailed: "border-theater-gold/65 text-theater-gold",
  close: "border-stone-400/50 text-stone-200",
  off: "border-cinema-300/55 text-cinema-300",
};

const PHASE_ICON: Record<RunPhase, LucideIcon> = {
  not_opened: Clock,
  tracking: Activity,
  finished: Check,
};

const NOTE_ICON: Record<TrackingNoteKind, LucideIcon> = {
  opening: CalendarDays,
  opening_intl: Globe,
  weekly: Activity,
  weekly_intl: Globe,
  rt: Star,
};

type TierCounts = {
  nailed: number;
  close: number;
  off: number;
  scored: number;
};

function releaseTime(movie: MovieData) {
  if (!movie.released) return 0;
  const t = new Date(movie.released).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function formatRelease(released: Date | string | null | undefined) {
  if (!released) return "Date TBD";
  const date = new Date(released);
  if (Number.isNaN(date.getTime())) return "Date TBD";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Count movies (not fields) by aggregate tier. */
function movieTierCounts(rows: GuessMovieRow[]): TierCounts {
  let nailed = 0;
  let close = 0;
  let off = 0;
  for (const { guess } of rows) {
    const tier = guess.standing?.tier;
    if (tier === "nailed") nailed += 1;
    else if (tier === "close") close += 1;
    else if (tier === "off") off += 1;
  }
  return { nailed, close, off, scored: nailed + close + off };
}

/**
 * Mean overall box-office miss (percent). RT-only scores excluded — different units.
 */
function averageBoxOfficeMiss(rows: GuessMovieRow[]): number | null {
  const percents: number[] = [];
  for (const { guess } of rows) {
    const standing = guess.standing;
    if (!standing || standing.scoreMode !== "box_office") continue;
    if (!Number.isFinite(standing.overallScore)) continue;
    // RT bonus can nudge a great BO score slightly negative — treat as 0% miss.
    percents.push(Math.max(0, standing.overallScore * 100));
  }
  if (percents.length === 0) return null;
  return percents.reduce((sum, n) => sum + n, 0) / percents.length;
}

const TIER_STAT: {
  key: keyof Pick<TierCounts, "nailed" | "close" | "off">;
  word: string;
  valueClass: string;
  labelClass: string;
}[] = [
  {
    key: "nailed",
    word: "Spot on",
    valueClass: "text-theater-gold",
    labelClass: "text-theater-gold/80",
  },
  {
    key: "close",
    word: "Close",
    valueClass: "text-stone-100",
    labelClass: "text-stone-400",
  },
  {
    key: "off",
    word: "Missed",
    valueClass: "text-cinema-300",
    labelClass: "text-cinema-300/80",
  },
];

type ScoreboardBlock = {
  key: "tracking" | "finished";
  label: string;
  counts: TierCounts;
  avgMiss: number | null;
};

function Scoreboard({ blocks }: { blocks: ScoreboardBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <div
      className="mt-6 flex flex-col gap-6 border-t border-theater-gold/20 pt-6 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-x-12 sm:gap-y-8 sm:pt-8"
      role="region"
      aria-label="Guess accuracy"
    >
      {blocks.map((block) => {
        const stats = TIER_STAT.filter((tier) => block.counts[tier.key] > 0);
        return (
          <div key={block.key} className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-stone-500">
              {block.label}
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3 sm:mt-3.5 sm:gap-x-10">
              {stats.map((tier) => (
                <div key={tier.key} className="min-w-18">
                  <p
                    className={[
                      "font-semibold tabular-nums leading-none text-4xl sm:text-5xl",
                      tier.valueClass,
                    ].join(" ")}
                  >
                    {block.counts[tier.key]}
                  </p>
                  <p
                    className={[
                      "mt-1.5 text-xs font-semibold uppercase tracking-[0.14em] sm:text-sm",
                      tier.labelClass,
                    ].join(" ")}
                  >
                    {tier.word}
                  </p>
                </div>
              ))}
              {block.avgMiss != null ? (
                <div className="min-w-18">
                  <p className="font-semibold tabular-nums leading-none text-4xl text-stone-100 sm:text-5xl">
                    {formatPercentError(block.avgMiss)}
                  </p>
                  <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500 sm:text-sm">
                    Avg miss
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function phaseOf(movie: MovieData): RunPhase {
  return resolveRunPhaseLocal(movie);
}

export default function Guesses() {
  const user = useUserStore((s) => s.user);
  const sessionStatus = useUserStore((s) => s.sessionStatus);
  const openRestoreAccess = useUserStore((s) => s.openRestoreAccess);
  const guesses = useGuessStore((s) => s.guesses);
  const movies = useMovieStore((s) => s.movies);
  const applyRunPhases = useMovieStore((s) => s.applyRunPhases);

  const signedIn = sessionStatus === "ready" && Boolean(user);

  const rows = useMemo(
    () => joinGuessRows(guesses, movies),
    [guesses, movies]
  );

  useEffect(() => {
    if (!signedIn || rows.length === 0) return;
    const missing = rows
      .filter(({ movie }) => !movie.runPhase && movie.id)
      .map(({ movie }) => String(movie.id));
    if (missing.length === 0) return;

    let cancelled = false;
    getMovieRunPhases(missing)
      .then((phases) => {
        if (!cancelled) applyRunPhases(phases);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [signedIn, rows, applyRunPhases]);

  const notOpened = useMemo(
    () =>
      rows
        .filter(({ movie }) => phaseOf(movie) === "not_opened")
        .sort((a, b) => releaseTime(a.movie) - releaseTime(b.movie)),
    [rows]
  );

  const tracking = useMemo(
    () =>
      rows
        .filter(({ movie }) => phaseOf(movie) === "tracking")
        .sort((a, b) => releaseTime(b.movie) - releaseTime(a.movie)),
    [rows]
  );

  const finished = useMemo(
    () =>
      rows
        .filter(({ movie }) => phaseOf(movie) === "finished")
        .sort((a, b) => releaseTime(b.movie) - releaseTime(a.movie)),
    [rows]
  );

  const trackingAccuracy = useMemo(
    () => movieTierCounts(tracking),
    [tracking]
  );
  const finishedAccuracy = useMemo(
    () => movieTierCounts(finished),
    [finished]
  );

  const summaryBlocks = useMemo((): ScoreboardBlock[] => {
    const blocks: ScoreboardBlock[] = [];

    if (trackingAccuracy.scored > 0) {
      blocks.push({
        key: "tracking",
        label: "Currently Tracking",
        counts: trackingAccuracy,
        avgMiss: averageBoxOfficeMiss(tracking),
      });
    }
    if (finishedAccuracy.scored > 0) {
      blocks.push({
        key: "finished",
        label: "Finished",
        counts: finishedAccuracy,
        avgMiss: averageBoxOfficeMiss(finished),
      });
    }
    return blocks;
  }, [tracking, finished, trackingAccuracy, finishedAccuracy]);

  if (sessionStatus === "booting") {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-stone-400">
        <Loader2 size={18} className="animate-spin" aria-hidden />
        Reconnecting…
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center space-y-4">
        <h1 className="font-marquee text-4xl uppercase tracking-wide text-theater-gold">
          Guesses
        </h1>
        <p className="text-stone-400">
          Sign in to see your calls and score updates.
        </p>
        <button
          type="button"
          onClick={() => openRestoreAccess()}
          className="inline-flex items-center justify-center rounded-lg bg-theater-gold px-4 py-2 text-sm font-semibold text-cinema-950 hover:bg-theater-gold/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theater-gold"
        >
          Restore Access
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full mt-2 md:mt-6 max-w-4xl space-y-10 text-left">
      <header>
        <h1 className="font-marquee text-4xl uppercase tracking-wide text-theater-gold sm:text-5xl">
          Your Guesses
        </h1>
        <Scoreboard blocks={summaryBlocks} />
      </header>

      <section aria-label="Guess list">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-theater-gold/20 bg-cinema-950/80 px-4 py-5 text-sm text-stone-400">
            No guesses yet.{" "}
            <Link
              to="/"
              className="text-theater-gold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-theater-gold"
            >
              Browse upcoming titles
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-8">
            <GuessGroup phase="tracking" rows={tracking} showStanding />
            <GuessGroup phase="not_opened" rows={notOpened} showStanding={false} />
            <GuessGroup phase="finished" rows={finished} showStanding />
          </div>
        )}
      </section>
    </div>
  );
}

function GuessGroup({
  phase,
  rows,
  showStanding,
}: {
  phase: RunPhase;
  rows: GuessMovieRow[];
  showStanding: boolean;
}) {
  if (rows.length === 0) return null;
  const { heading } = RUN_PHASE_SECTION[phase];
  const Icon = PHASE_ICON[phase];

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-stone-400">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {heading} ({rows.length})
      </h3>
      <ul className={listShell}>
        {rows.map(({ guess, movie }) => (
          <GuessRow
            key={guess.id}
            guess={guess}
            movie={movie}
            phase={phase}
            standing={showStanding ? guess.standing : null}
            expectStanding={showStanding}
          />
        ))}
      </ul>
    </div>
  );
}

function StandingSummary({
  standing,
  guess,
  movie,
  phase,
}: {
  standing: GuessStanding;
  guess: Guess;
  movie: MovieData;
  phase: RunPhase;
}) {
  const insight =
    standing.scoreMode === "box_office"
      ? standingInsightLine(guess, movie, phase)
      : null;

  return (
    <div className="mt-1.5 sm:mt-2">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span
          className={[
            "inline-flex items-center rounded-sm border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] sm:px-2.5 sm:text-[0.7rem]",
            TIER_BADGE[standing.tier],
          ].join(" ")}
        >
          {TIER_LABEL[standing.tier]}
        </span>
        <span className="text-sm text-stone-400 sm:text-[0.9375rem]">
          {formatRank(standing.overallRank, standing.totalGuesses)}
        </span>
      </div>
      {insight ? (
        <p className="mt-1.5 text-xs leading-snug text-stone-400 sm:mt-2 sm:text-sm">
          {insight}
        </p>
      ) : null}
    </div>
  );
}

function GuessRow({
  guess,
  movie,
  phase,
  standing,
  expectStanding,
}: {
  guess: Guess;
  movie: MovieData;
  phase: RunPhase;
  standing?: GuessStanding | null;
  expectStanding?: boolean;
}) {
  const posterSrc = movie.poster ? `${POSTER}${movie.poster}` : null;
  const status =
    phase === "tracking"
      ? trackingStatusLabel(movie)
      : RUN_PHASE_SECTION[phase].status;
  const weekStatusParts =
    phase === "tracking" && status.startsWith("Week ")
      ? status.split(" · ")
      : null;

  return (
    <li>
      <Link
        to={`/movie/${movie.tmdbID}`}
        aria-label={`Details for ${movie.title}`}
        className="group flex gap-3 px-3 py-5 transition-colors hover:bg-theater-gold/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-theater-gold sm:gap-4 sm:px-5 sm:py-6 md:gap-5 md:px-6 lg:px-7"
      >
        <div className="h-18 w-12 shrink-0 overflow-hidden rounded bg-cinema-900 ring-1 ring-stone-600/40 transition-[box-shadow,ring-color] duration-150 group-hover:ring-theater-gold/50 motion-reduce:transition-none sm:h-24 sm:w-16 md:h-28 md:w-20 md:rounded-md">
          {posterSrc ? (
            <img
              src={posterSrc}
              alt=""
              className="h-full w-full object-cover transition-[filter] duration-150 group-hover:brightness-110 motion-reduce:transition-none"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <span className="text-lg font-semibold leading-snug text-stone-50 transition-colors duration-150 group-hover:text-theater-gold motion-reduce:transition-none sm:text-xl md:text-[1.35rem]">
              {movie.title}
            </span>
            {weekStatusParts ? (
              <span className="flex shrink-0 flex-col items-end pt-1 text-right text-[0.65rem] leading-snug text-stone-400 sm:text-xs">
                <span className="whitespace-nowrap">{weekStatusParts[0]}</span>
                {weekStatusParts[1] ? (
                  <span className="whitespace-nowrap">{weekStatusParts[1]}</span>
                ) : null}
              </span>
            ) : (
              <span className="shrink-0 pt-1 text-[0.6rem] uppercase tracking-[0.18em] text-stone-400 sm:text-[0.65rem]">
                {status}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-stone-400 sm:text-sm">
            {formatRelease(movie.released)}
          </p>
          {standing ? (
            <StandingSummary
              standing={standing}
              guess={guess}
              movie={movie}
              phase={phase}
            />
          ) : expectStanding ? (
            <p className="mt-1.5 text-sm text-stone-400">Awaiting results</p>
          ) : null}
          <GuessMetricCards guess={guess} movie={movie} phase={phase} />
          <TrackingNotes movie={movie} phase={phase} />
        </div>
        <ChevronRight
          className="h-5 w-5 shrink-0 self-center text-stone-500 transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-theater-gold motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          aria-hidden
        />
      </Link>
    </li>
  );
}

function TrackingNotes({
  movie,
  phase,
}: {
  movie: MovieData;
  phase: RunPhase;
}) {
  const notes = buildTrackingNotes(movie, phase);
  if (notes.length === 0) return null;

  return (
    <ul
      className="mt-3 space-y-1.5 rounded-md border border-theater-gold/25 bg-white/10 px-2.5 py-2.5 sm:mt-4 sm:px-3.5 sm:py-3"
      aria-label="Tracking updates"
    >
      {notes.map((note) => {
        const Icon = NOTE_ICON[note.kind];
        return (
          <li
            key={`${note.kind}:${note.text}`}
            className="flex items-start gap-2 text-xs tabular-nums text-stone-200 sm:gap-2.5 sm:text-sm"
          >
            <Icon
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-theater-gold/80 sm:h-4 sm:w-4"
              aria-hidden
            />
            <span>{note.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
