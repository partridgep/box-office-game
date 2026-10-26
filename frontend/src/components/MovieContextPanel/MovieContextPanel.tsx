import type { ReactNode } from "react";
import { MovieData, Guess, CompGroup } from "../../types";
import SocialProof from "../SocialProof/SocialProof";
import HistoricalComps from "../HistoricalComps/HistoricalComps";
import { formatDollars } from "../../utils/formatMoney";
import { parseMoney } from "../../utils/guessComparison";
import { theatricalWindow } from "../../utils/theatricalWindow";
import { leadStudioName } from "../../utils/studioName";

interface MovieContextPanelProps {
  movie: MovieData;
  allMovieGuesses: Guess[];
  friendGuesses: Guess[];
  revealGuesses: boolean;
  compGroups?: CompGroup[];
  /**
   * "stack": Pool + Details + Comps (predict/waiting).
   * "wide": Details + Comps only — Pool lives in the results reel.
   */
  variant?: "stack" | "wide";
  /** Linked brushing with prediction sliders (predict layout). */
  onHighlightComp?: (compMovieId: string | null) => void;
}

const frosted =
  "overflow-hidden rounded-xl border-2 border-stone-600/50 bg-cinema-950/30 backdrop-blur-xl";
/** Results "wide" layout: flush below sm; cards regain chrome from sm up */
const frostedWide =
  "overflow-hidden rounded-none sm:rounded-xl border-0 sm:border-2 border-stone-600/50 bg-transparent sm:bg-cinema-950/30 backdrop-blur-none sm:backdrop-blur-xl";

/** Shared subsection title under "About this movie" */
const subsectionHeading =
  "text-lg text-left font-semibold text-stone-100 uppercase tracking-wider";

const scaleLabel =
  "text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400";

function formatBudget(budget: string | null | undefined): string | null {
  const dollars = parseMoney(budget);
  if (dollars == null || dollars <= 0) return null;
  return formatDollars(dollars);
}

function releaseWindow(released: Date | string | null | undefined): string | null {
  if (!released) return null;
  const date = new Date(released);
  if (Number.isNaN(date.getTime())) return null;
  const shortDate = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${shortDate} (${theatricalWindow(date)})`;
}

function ScaleRow({
  label,
  children,
  emphasize,
}: {
  label: string;
  children: ReactNode;
  /** Larger value type — used for known budget. */
  emphasize?: boolean;
}) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 gap-y-0.5 items-baseline text-left">
      <p className={scaleLabel}>{label}</p>
      <div
        className={
          emphasize
            ? "text-sm tabular-nums text-stone-100"
            : "text-sm text-stone-100"
        }
      >
        {children}
      </div>
    </div>
  );
}

export default function MovieContextPanel({
  movie,
  allMovieGuesses,
  friendGuesses,
  revealGuesses,
  compGroups = [],
  variant = "stack",
  onHighlightComp,
}: MovieContextPanelProps) {
  const budget = formatBudget(movie.budget);
  const release = releaseWindow(movie.released);
  const rated = movie.rated?.trim() || null;
  const studio = leadStudioName(movie.production);

  const isWide = variant === "wide";
  const shell = isWide ? frostedWide : frosted;

  const details = (
    <div className={`${shell} p-4 space-y-5`}>
      {isWide ? (
        <h3 className={`${subsectionHeading} mb-5`}>Movie Details</h3>
      ) : (
        <h2 className="text-xl text-left font-semibold text-stone-200 uppercase tracking-wider mb-4">
          Movie Details
        </h2>
      )}

      <div className="space-y-2.5">
        <ScaleRow label="Budget" emphasize={Boolean(budget)}>
          {budget ? (
            budget
          ) : (
            <span className="text-stone-400 font-normal text-sm">Not listed</span>
          )}
        </ScaleRow>
        <ScaleRow label="Rated">
          {rated ? (
            rated
          ) : (
            <span className="text-stone-400 font-normal text-sm">Not listed</span>
          )}
        </ScaleRow>
        <ScaleRow label="Release">
          {release ?? <span className="text-stone-400">TBA</span>}
        </ScaleRow>
        {studio ? <ScaleRow label="Studio">{studio}</ScaleRow> : null}
        <ScaleRow label="Director">
          {movie.director?.trim() || (
            <span className="text-stone-400">—</span>
          )}
        </ScaleRow>
        {movie.actors?.trim() ? (
          <ScaleRow label="Cast">
            <span className="line-clamp-2">{movie.actors}</span>
          </ScaleRow>
        ) : null}
        <ScaleRow label="Genre">
          {movie.genre?.trim() || <span className="text-stone-400">—</span>}
        </ScaleRow>
      </div>
      {movie.plot && (
        <p className="text-sm text-left text-stone-400 line-clamp-4">
          {movie.plot}
        </p>
      )}
    </div>
  );

  const comps = movie.id ? (
    <div className={`${shell} p-4`}>
      <HistoricalComps
        groups={compGroups}
        subjectMovieId={movie.id}
        subsection={isWide}
        onHighlightComp={onHighlightComp}
      />
    </div>
  ) : null;

  if (isWide) {
    return (
      <div className="space-y-8 bg-cinema-950/90 backdrop-blur-md sm:space-y-6 sm:bg-transparent sm:backdrop-blur-none">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 sm:gap-6 items-start">
          <div className="min-w-0">{details}</div>
          <div className="min-w-0">{comps}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={shell}>
        <SocialProof
          movie={movie}
          allMovieGuesses={allMovieGuesses}
          friendGuesses={friendGuesses}
          revealGuesses={revealGuesses}
          bare
        />
      </div>
      {details}
      {comps}
    </div>
  );
}
