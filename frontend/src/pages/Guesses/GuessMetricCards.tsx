import type { Guess, MovieData, RunPhase } from "../../types";
import { getMovieActuals } from "../../utils/guessComparison";
import {
  formatDollars,
  formatMillions,
  formatMillionsShort,
} from "../../utils/formatMoney";

type GuessMetric = {
  key: string;
  label: string;
  /** Shown under the larger result number when present. */
  actualLabel: string;
  guessDisplay: string;
  actualDisplay: string | null;
};

function finiteGuess(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Number(value);
}

/**
 * Build up to five comparison metrics for fields the user actually called.
 * Final DOM/INTL use "So far" while tracking; "Actual" otherwise when a result exists.
 */
export function buildGuessMetrics(
  guess: Guess,
  movie: MovieData,
  phase: RunPhase
): GuessMetric[] {
  const actuals = getMovieActuals(movie);
  const grossLabel = phase === "tracking" ? "So far" : "Actual";
  const metrics: GuessMetric[] = [];

  const owDom = finiteGuess(guess.domestic_opening);
  if (owDom != null) {
    metrics.push({
      key: "ow-dom",
      label: "OW Dom",
      actualLabel: "Actual",
      guessDisplay: formatMillions(owDom),
      actualDisplay:
        actuals.domesticOpening != null
          ? formatDollars(actuals.domesticOpening)
          : null,
    });
  }

  const owIntl = finiteGuess(guess.international_opening);
  if (owIntl != null) {
    metrics.push({
      key: "ow-intl",
      label: "OW Intl",
      actualLabel: "Actual",
      guessDisplay: formatMillions(owIntl),
      actualDisplay:
        actuals.internationalOpening != null
          ? formatDollars(actuals.internationalOpening)
          : null,
    });
  }

  const finalDom = finiteGuess(guess.final_domestic);
  if (finalDom != null) {
    metrics.push({
      key: "final-dom",
      label: "Final Dom",
      actualLabel: grossLabel,
      guessDisplay: formatMillions(finalDom),
      actualDisplay:
        actuals.finalDomestic != null
          ? formatDollars(actuals.finalDomestic)
          : null,
    });
  }

  const finalIntl = finiteGuess(guess.final_international);
  if (finalIntl != null) {
    metrics.push({
      key: "final-intl",
      label: "Final Intl",
      actualLabel: grossLabel,
      guessDisplay: formatMillions(finalIntl),
      actualDisplay:
        actuals.finalInternational != null
          ? formatDollars(actuals.finalInternational)
          : null,
    });
  }

  const rt = finiteGuess(guess.rotten_tomatoes_score);
  if (rt != null) {
    metrics.push({
      key: "rt",
      label: "RT",
      actualLabel: "Actual",
      guessDisplay: `${Math.round(rt)}%`,
      actualDisplay:
        actuals.rottenTomatoesScore != null
          ? `${Math.round(actuals.rottenTomatoesScore)}%`
          : null,
    });
  }

  return metrics;
}

function MetricCard({ metric }: { metric: GuessMetric }) {
  const hasActual = metric.actualDisplay != null;

  return (
    <div className="min-w-0 rounded-md border border-theater-gold/30 bg-cinema-800 px-2.5 py-2 transition-[border-color,background-color] duration-150 group-hover:border-theater-gold/55 group-hover:bg-cinema-700 motion-reduce:transition-none sm:px-3 sm:py-2.5 md:px-3.5 md:py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stone-300">
        {metric.label}
      </p>
      <p
        className={[
          "mt-1 font-semibold tabular-nums text-theater-gold",
          hasActual ? "text-sm sm:text-base" : "text-base sm:text-lg",
        ].join(" ")}
        title="Your call"
      >
        <span className="sr-only">Your call: </span>
        {metric.guessDisplay}
      </p>
      {hasActual ? (
        <>
          <p className="mt-2 text-lg font-semibold tabular-nums text-white sm:text-xl">
            <span className="sr-only">{metric.actualLabel}: </span>
            {metric.actualDisplay}
          </p>
          <p className="mt-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-stone-300">
            {metric.actualLabel}
          </p>
        </>
      ) : null}
    </div>
  );
}

export function GuessMetricCards({
  guess,
  movie,
  phase,
}: {
  guess: Guess;
  movie: MovieData;
  phase: RunPhase;
}) {
  const metrics = buildGuessMetrics(guess, movie, phase);
  if (metrics.length === 0) return null;

  return (
    <div
      className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-theater-gold/20 pt-3.5 sm:mt-4 sm:grid-cols-3 sm:gap-x-3.5 sm:pt-4 md:grid-cols-5 md:gap-x-4 md:gap-y-3.5 lg:gap-x-5"
      aria-label="Guess versus actuals"
    >
      {metrics.map((metric) => (
        <MetricCard key={metric.key} metric={metric} />
      ))}
    </div>
  );
}

export type RivalryMetric = {
  key: string;
  label: string;
  actualLabel: string;
  yourDisplay: string | null;
  theirDisplay: string | null;
  actualDisplay: string | null;
  /** Who was closer to the result on this field; null if unscored or incomplete. */
  closer: "you" | "them" | "tie" | null;
  /** Comparable units: dollars for money fields, points for RT. */
  yourValue: number | null;
  theirValue: number | null;
  actualValue: number | null;
  isRt: boolean;
};

/** Whole millions for compact rivalry cards — "$206M" not "$206.0M". */
function moneyDisplay(millions: number | null): string | null {
  if (millions == null) return null;
  return `$${formatMillionsShort(millions, true)}`;
}

function rtDisplay(score: number | null): string | null {
  if (score == null) return null;
  return `${Math.round(score)}%`;
}

function fieldCloser(
  yourMillions: number | null,
  theirMillions: number | null,
  actualDollarsOrRt: number | null,
  isRt: boolean
): RivalryMetric["closer"] {
  if (
    actualDollarsOrRt == null ||
    yourMillions == null ||
    theirMillions == null
  ) {
    return null;
  }
  const yourVal = isRt ? yourMillions : yourMillions * 1_000_000;
  const theirVal = isRt ? theirMillions : theirMillions * 1_000_000;
  const dYou = Math.abs(yourVal - actualDollarsOrRt);
  const dThem = Math.abs(theirVal - actualDollarsOrRt);
  if (dYou < dThem) return "you";
  if (dThem < dYou) return "them";
  return "tie";
}

/**
 * Union of fields either player called — for friend rivalry rows.
 * Missing side shows as em dash in the UI.
 */
export function buildRivalryMetrics(
  yours: Guess,
  theirs: Guess,
  movie: MovieData,
  phase: RunPhase
): RivalryMetric[] {
  const actuals = getMovieActuals(movie);
  const grossLabel = phase === "tracking" ? "So far" : "Actual";

  // Guesses are stored in millions; actuals are dollars (same as buildGuessMetrics).
  const specs: {
    key: string;
    label: string;
    actualLabel: string;
    yourMillions: number | null;
    theirMillions: number | null;
    actualDollars: number | null;
    isRt?: boolean;
  }[] = [
    {
      key: "ow-dom",
      label: "OW Dom",
      actualLabel: "Actual",
      yourMillions: finiteGuess(yours.domestic_opening),
      theirMillions: finiteGuess(theirs.domestic_opening),
      actualDollars: actuals.domesticOpening,
    },
    {
      key: "ow-intl",
      label: "OW Intl",
      actualLabel: "Actual",
      yourMillions: finiteGuess(yours.international_opening),
      theirMillions: finiteGuess(theirs.international_opening),
      actualDollars: actuals.internationalOpening,
    },
    {
      key: "final-dom",
      label: "Final Dom",
      actualLabel: grossLabel,
      yourMillions: finiteGuess(yours.final_domestic),
      theirMillions: finiteGuess(theirs.final_domestic),
      actualDollars: actuals.finalDomestic,
    },
    {
      key: "final-intl",
      label: "Final Intl",
      actualLabel: grossLabel,
      yourMillions: finiteGuess(yours.final_international),
      theirMillions: finiteGuess(theirs.final_international),
      actualDollars: actuals.finalInternational,
    },
    {
      key: "rt",
      label: "RT",
      actualLabel: "Actual",
      yourMillions: finiteGuess(yours.rotten_tomatoes_score),
      theirMillions: finiteGuess(theirs.rotten_tomatoes_score),
      actualDollars: actuals.rottenTomatoesScore,
      isRt: true,
    },
  ];

  const metrics: RivalryMetric[] = [];
  for (const spec of specs) {
    if (spec.yourMillions == null && spec.theirMillions == null) continue;
    const isRt = Boolean(spec.isRt);
    metrics.push({
      key: spec.key,
      label: spec.label,
      actualLabel: spec.actualLabel,
      yourDisplay: isRt
        ? rtDisplay(spec.yourMillions)
        : moneyDisplay(spec.yourMillions),
      theirDisplay: isRt
        ? rtDisplay(spec.theirMillions)
        : moneyDisplay(spec.theirMillions),
      actualDisplay:
        spec.actualDollars == null
          ? null
          : isRt
            ? `${Math.round(spec.actualDollars)}%`
            : formatDollars(spec.actualDollars),
      closer: fieldCloser(
        spec.yourMillions,
        spec.theirMillions,
        spec.actualDollars,
        isRt
      ),
      yourValue:
        spec.yourMillions == null
          ? null
          : isRt
            ? spec.yourMillions
            : spec.yourMillions * 1_000_000,
      theirValue:
        spec.theirMillions == null
          ? null
          : isRt
            ? spec.theirMillions
            : spec.theirMillions * 1_000_000,
      actualValue: spec.actualDollars,
      isRt,
    });
  }
  return metrics;
}

function RivalryMetricCard({
  metric,
  friendName,
}: {
  metric: RivalryMetric;
  friendName: string;
}) {
  const hasActual = metric.actualDisplay != null;
  const caption =
    "mt-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

  // When a result exists, mute the farther guess so the closer one reads as the win.
  const yourMuted = metric.closer === "them";
  const theirMuted = metric.closer === "you";
  const yourClass = yourMuted
    ? "text-stone-500"
    : "text-theater-gold";
  const theirClass = theirMuted ? "text-stone-500" : "text-stone-100";
  const youLabelClass = yourMuted
    ? "text-stone-500"
    : "text-theater-gold/80";
  const themLabelClass = theirMuted ? "text-stone-500" : "text-stone-400";

  return (
    <div className="min-w-0 rounded-md border border-theater-gold/30 bg-cinema-800 px-2.5 py-2 sm:px-3 sm:py-2.5 md:px-3.5 md:py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stone-300">
        {metric.label}
      </p>
      <div className="mt-1">
        <p className="flex flex-nowrap items-baseline gap-x-1 text-sm font-semibold tabular-nums sm:gap-x-1.5 sm:text-base">
          <span className={yourClass}>{metric.yourDisplay ?? "—"}</span>
          <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
            vs
          </span>
          <span className={theirClass}>{metric.theirDisplay ?? "—"}</span>
        </p>
        <p className={`${caption} text-stone-500`}>
          <span className={youLabelClass}>You</span>
          <span aria-hidden> · </span>
          <span className={`truncate ${themLabelClass}`} title={friendName}>
            {friendName}
          </span>
        </p>
      </div>
      {hasActual ? (
        <div className="mt-2">
          <p className="text-base font-semibold tabular-nums text-white sm:text-lg">
            {metric.actualDisplay}
          </p>
          <p className={`${caption} text-stone-300`}>{metric.actualLabel}</p>
        </div>
      ) : null}
    </div>
  );
}

/** You / friend / actual metric grid for shared rivalry rows. */
export function RivalryMetricCards({
  yours,
  theirs,
  movie,
  phase,
  friendName,
}: {
  yours: Guess;
  theirs: Guess;
  movie: MovieData;
  phase: RunPhase;
  friendName: string;
}) {
  const metrics = buildRivalryMetrics(yours, theirs, movie, phase);
  if (metrics.length === 0) return null;

  const hasAnyActual = metrics.some((m) => m.actualDisplay != null);

  return (
    <div className="mt-3.5 border-t border-theater-gold/20 pt-3.5 sm:mt-4 sm:pt-4">
      <div
        className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 sm:gap-x-3.5 md:grid-cols-5 md:gap-x-4 md:gap-y-3.5 lg:gap-x-5"
        aria-label={`You versus ${friendName}${hasAnyActual ? " versus results" : ""}`}
      >
        {metrics.map((metric) => (
          <RivalryMetricCard
            key={metric.key}
            metric={metric}
            friendName={friendName}
          />
        ))}
      </div>
    </div>
  );
}
