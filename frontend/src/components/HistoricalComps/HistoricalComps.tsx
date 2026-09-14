import { CompGroup, CompMovie } from "../../types";
import { formatMillions } from "../../utils/formatMoney";
import { parseMoney } from "../../utils/guessComparison";

interface HistoricalCompsProps {
  groups: CompGroup[];
  onCompSelect?: (domesticOpening: number) => void;
}

function CompRow({
  movie,
  onCompSelect,
}: {
  movie: CompMovie;
  onCompSelect?: (domesticOpening: number) => void;
}) {
  const domesticOpening = parseMoney(movie.domesticOpening);
  const domesticMillions =
    domesticOpening != null ? domesticOpening / 1_000_000 : null;
  const selectable = domesticMillions != null;

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={() => {
        if (domesticMillions != null) onCompSelect?.(domesticMillions);
      }}
      className={`w-full flex items-center justify-between p-3 rounded-lg bg-cinema-900/50 border border-cinema-800 text-left group transition-colors ${
        selectable
          ? "hover:border-theater-gold/30 hover:bg-cinema-900"
          : "opacity-70 cursor-default"
      }`}
    >
      <div>
        <p
          className={`text-sm font-medium text-stone-200 transition-colors ${
            selectable ? "group-hover:text-theater-gold" : ""
          }`}
        >
          {movie.title}
          {movie.year ? (
            <span className="text-stone-500 font-normal"> ({movie.year})</span>
          ) : null}
        </p>
        {movie.reason && (
          <p className="text-xs text-stone-500 mt-0.5">{movie.reason}</p>
        )}
      </div>
      <span className="text-sm font-bold text-theater-gold/80 tabular-nums shrink-0 ml-3">
        {formatMillions(domesticMillions)}
      </span>
    </button>
  );
}

export default function HistoricalComps({
  groups,
  onCompSelect,
}: HistoricalCompsProps) {
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
                <CompRow
                  key={`${group.id}-${movie.id}`}
                  movie={movie}
                  onCompSelect={onCompSelect}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-stone-600 mt-3">
        Tap a comp with opening data to seed domestic opening.
      </p>
    </div>
  );
}

export function compsToMarkers(groups: CompGroup[]) {
  const markers: Array<{ label: string; value: number }> = [];
  for (const group of groups) {
    for (const movie of group.movies) {
      const dollars = parseMoney(movie.domesticOpening);
      if (dollars == null) continue;
      markers.push({
        label: movie.title.split(":")[0].split(" ")[0],
        value: dollars / 1_000_000,
      });
    }
  }
  return markers;
}
