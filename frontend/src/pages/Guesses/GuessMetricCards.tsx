import type { Guess, MovieData, RunPhase } from "../../types";
import { getMovieActuals } from "../../utils/guessComparison";
import { formatDollars, formatMillions } from "../../utils/formatMoney";

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
