import { CompGroup, CompMovie } from "../../types";
import { formatMillions } from "../../utils/formatMoney";
import { parseMoney } from "../../utils/guessComparison";
import type { CompMarker } from "../PredictionControls/CompMarkers";

export type CompMarkersByField = {
  domesticOpening: CompMarker[];
  internationalOpening: CompMarker[];
  finalDomestic: CompMarker[];
  finalInternational: CompMarker[];
  rottenTomatoesScore: CompMarker[];
};

interface HistoricalCompsProps {
  groups: CompGroup[];
}

function shortLabel(title: string) {
  return title.split(":")[0].split(" ")[0];
}

function dollarsToMillions(dollars: number | null): number | null {
  if (dollars == null) return null;
  return dollars / 1_000_000;
}

function parseRtScore(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number(String(value).split("%")[0]);
  return Number.isFinite(n) ? n : null;
}

export function getCompMetrics(movie: CompMovie) {
  return {
    domesticOpening: dollarsToMillions(parseMoney(movie.domesticOpening)),
    internationalOpening: dollarsToMillions(
      parseMoney(movie.internationalOpening)
    ),
    finalDomestic: dollarsToMillions(parseMoney(movie.domesticGross)),
    finalInternational: dollarsToMillions(
      parseMoney(movie.internationalGross)
    ),
    rottenTomatoesScore: parseRtScore(movie.rottenTomatoesScore),
  };
}

function formatMetric(
  value: number | null,
  kind: "money" | "rt"
): string {
  if (value == null) return "—";
  if (kind === "rt") return `${Math.round(value)}%`;
  return formatMillions(value);
}

function CompRow({ movie }: { movie: CompMovie }) {
  const metrics = getCompMetrics(movie);

  const cells: Array<{ label: string; value: string }> = [
    { label: "Dom Open", value: formatMetric(metrics.domesticOpening, "money") },
    { label: "Int Open", value: formatMetric(metrics.internationalOpening, "money") },
    { label: "Dom Final", value: formatMetric(metrics.finalDomestic, "money") },
    { label: "Int Final", value: formatMetric(metrics.finalInternational, "money") },
    { label: "RT", value: formatMetric(metrics.rottenTomatoesScore, "rt") },
  ];

  return (
    <div className="w-full p-3 rounded-lg bg-cinema-900/50 border border-cinema-800 text-left">
      <div className="min-w-0">
        <p className="text-sm font-medium text-stone-200">
          {movie.title}
          {movie.year ? (
            <span className="text-stone-500 font-normal"> ({movie.year})</span>
          ) : null}
        </p>
        {movie.reason && (
          <p className="text-xs text-stone-500 mt-0.5">{movie.reason}</p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {cells.map((cell) => (
          <div key={cell.label} className="min-w-0">
            <p className="text-[9px] uppercase tracking-wide text-stone-500 truncate">
              {cell.label}
            </p>
            <p className="text-xs font-semibold text-theater-gold/85 tabular-nums truncate">
              {cell.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HistoricalComps({ groups }: HistoricalCompsProps) {
  const hasComps = groups.some((group) => group.movies.length > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-stone-200 uppercase tracking-wider">
          Historical Comps
        </h3>
      </div>

      {!hasComps ? (
        <p className="text-sm text-stone-500">
          No comps yet. Add this movie to a category with other titles, or curate
          comps in admin.
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.id} className="space-y-2">
              {group.label && (
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  {group.label}
                </h4>
              )}
              {group.movies.map((movie) => (
                <CompRow key={`${group.id}-${movie.id}`} movie={movie} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function compsToMarkersByField(groups: CompGroup[]): CompMarkersByField {
  const result: CompMarkersByField = {
    domesticOpening: [],
    internationalOpening: [],
    finalDomestic: [],
    finalInternational: [],
    rottenTomatoesScore: [],
  };

  for (const group of groups) {
    for (const movie of group.movies) {
      const metrics = getCompMetrics(movie);
      const label = shortLabel(movie.title);
      const id = movie.id;

      if (metrics.domesticOpening != null) {
        result.domesticOpening.push({
          id: `${id}-dom-open`,
          label,
          value: metrics.domesticOpening,
        });
      }
      if (metrics.internationalOpening != null) {
        result.internationalOpening.push({
          id: `${id}-int-open`,
          label,
          value: metrics.internationalOpening,
        });
      }
      if (metrics.finalDomestic != null) {
        result.finalDomestic.push({
          id: `${id}-dom-final`,
          label,
          value: metrics.finalDomestic,
        });
      }
      if (metrics.finalInternational != null) {
        result.finalInternational.push({
          id: `${id}-int-final`,
          label,
          value: metrics.finalInternational,
        });
      }
      if (metrics.rottenTomatoesScore != null) {
        result.rottenTomatoesScore.push({
          id: `${id}-rt`,
          label,
          value: metrics.rottenTomatoesScore,
        });
      }
    }
  }

  return result;
}
