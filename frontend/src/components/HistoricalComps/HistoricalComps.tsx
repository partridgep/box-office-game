import { MovieComp } from "../../data/mockComps";
import { formatMillions } from "../../utils/formatMoney";

interface HistoricalCompsProps {
  comps: MovieComp[];
  onCompSelect?: (domesticOpening: number) => void;
}

export default function HistoricalComps({
  comps,
  onCompSelect,
}: HistoricalCompsProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-stone-200 uppercase tracking-wider">
          Historical Comps
        </h3>
        <span className="text-[10px] text-stone-500 bg-cinema-800 px-2 py-0.5 rounded-full">
          Mock data
        </span>
      </div>

      <div className="space-y-2">
        {comps.map((comp) => (
          <button
            key={comp.title}
            type="button"
            onClick={() => onCompSelect?.(comp.domesticOpening)}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-cinema-900/50 border border-cinema-800 hover:border-theater-gold/30 hover:bg-cinema-900 transition-colors text-left group"
          >
            <div>
              <p className="text-sm font-medium text-stone-200 group-hover:text-theater-gold transition-colors">
                {comp.title}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">{comp.reason}</p>
            </div>
            <span className="text-sm font-bold text-theater-gold/80 tabular-nums shrink-0 ml-3">
              {formatMillions(comp.domesticOpening)}
            </span>
          </button>
        ))}
      </div>

      <p className="text-[10px] text-stone-600 mt-3">
        Comps powered by official data — API coming soon. Tap a comp to set domestic opening.
      </p>
    </div>
  );
}
