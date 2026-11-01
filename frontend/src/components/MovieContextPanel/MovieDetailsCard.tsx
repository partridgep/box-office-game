import type { ReactNode } from "react";
import { MovieData } from "../../types";
import { formatDollars } from "../../utils/formatMoney";
import { parseMoney } from "../../utils/guessComparison";
import { theatricalWindow } from "../../utils/theatricalWindow";
import { leadStudioName } from "../../utils/studioName";

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

interface MovieDetailsCardProps {
  movie: MovieData;
  /** Omit outer chrome when a parent (sheet, frosted panel) already frames it. */
  bare?: boolean;
  /** Larger subsection title under "About this movie". */
  subsection?: boolean;
  className?: string;
}

export default function MovieDetailsCard({
  movie,
  bare = false,
  subsection = false,
  className = "",
}: MovieDetailsCardProps) {
  const budget = formatBudget(movie.budget);
  const release = releaseWindow(movie.released);
  const rated = movie.rated?.trim() || null;
  const studio = leadStudioName(movie.production);

  const body = (
    <>
      {subsection ? (
        <h3 className="text-lg text-left font-semibold text-stone-100 uppercase tracking-wider mb-5">
          Movie Details
        </h3>
      ) : bare ? null : (
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
        <p className="text-sm text-left text-stone-400 mt-5">
          {movie.plot}
        </p>
      )}
    </>
  );

  if (bare) {
    return <div className={`space-y-5 ${className}`}>{body}</div>;
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border-2 border-stone-600/50 bg-cinema-950/30 backdrop-blur-xl p-4 space-y-5 ${className}`}
    >
      {body}
    </div>
  );
}
