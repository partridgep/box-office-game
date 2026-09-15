import { useState } from "react";

export interface CompMarker {
  id?: string;
  label: string;
  value: number;
}

type PositionedMarker = CompMarker & { pos: number };

export type LabelSide = "center" | "left" | "right";

export type LayoutItem =
  | {
      type: "single";
      marker: PositionedMarker;
      side: LabelSide;
      /** L-shaped tick arm when a pair is extremely close */
      corner: boolean;
    }
  | { type: "cluster"; markers: PositionedMarker[]; pos: number; key: string };

/** Percent of track width — labels are ~60px, so ~10% on a typical slider. */
export const COMP_BAND_THRESHOLD = 10;

/** Below this gap, pairs get an L-arm so labels can fan farther out. */
export const COMP_CORNER_THRESHOLD = 4;

/**
 * Group markers that sit within `bandThreshold` of each other.
 * Pairs fan labels outward (L-arm when very close); 3+ become a cluster.
 */
export function layoutCompMarkers(
  markers: CompMarker[],
  getPos: (value: number) => number,
  bandThreshold = COMP_BAND_THRESHOLD,
  cornerThreshold = COMP_CORNER_THRESHOLD,
): LayoutItem[] {
  if (markers.length === 0) return [];

  const positioned = markers
    .map((m) => ({ ...m, pos: getPos(m.value) }))
    .sort((a, b) => a.pos - b.pos || a.label.localeCompare(b.label));

  const bands: PositionedMarker[][] = [];
  let current: PositionedMarker[] = [positioned[0]];

  for (let i = 1; i < positioned.length; i++) {
    const prev = current[current.length - 1];
    if (positioned[i].pos - prev.pos <= bandThreshold) {
      current.push(positioned[i]);
    } else {
      bands.push(current);
      current = [positioned[i]];
    }
  }
  bands.push(current);

  const items: LayoutItem[] = [];
  for (const band of bands) {
    if (band.length >= 3) {
      const pos = band.reduce((sum, m) => sum + m.pos, 0) / band.length;
      const key = band.map((m) => m.id ?? `${m.label}-${m.value}`).join("|");
      items.push({ type: "cluster", markers: band, pos, key });
    } else if (band.length === 2) {
      const gap = band[1].pos - band[0].pos;
      const corner = gap <= cornerThreshold;
      items.push({ type: "single", marker: band[0], side: "left", corner });
      items.push({ type: "single", marker: band[1], side: "right", corner });
    } else {
      items.push({
        type: "single",
        marker: band[0],
        side: "center",
        corner: false,
      });
    }
  }
  return items;
}

interface CompMarkersProps {
  markers: CompMarker[];
  getPos: (value: number) => number;
  formatValue: (value: number) => string;
  onSelect: (value: number) => void;
  disabled?: boolean;
  variant?: "default" | "ticket";
}

export default function CompMarkers({
  markers,
  getPos,
  formatValue,
  onSelect,
  disabled = false,
  variant = "default",
}: CompMarkersProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const isTicket = variant === "ticket";

  if (markers.length === 0) return null;

  const items = layoutCompMarkers(markers, getPos);

  const tickClass = isTicket
    ? "bg-ticket-ink/40 group-hover:bg-ticket-ink group-focus-visible:bg-ticket-ink"
    : "bg-stone-500 group-hover:bg-theater-gold group-focus-visible:bg-theater-gold";

  const labelClass = isTicket
    ? "text-ticket-ink/50 group-hover:text-ticket-ink group-focus-visible:text-ticket-ink"
    : "text-stone-500 group-hover:text-theater-gold group-focus-visible:text-theater-gold";

  const tooltipClass = isTicket
    ? "border border-ticket-ink/30 bg-ticket text-ticket-ink"
    : "border border-cinema-700 bg-cinema-900 text-stone-200";

  return (
    <div className="relative mt-1 h-6" onMouseLeave={() => setOpenKey(null)}>
      {items.map((item) => {
        if (item.type === "single") {
          const { marker, side, corner } = item;
          const key = marker.id ?? `${marker.label}-${marker.value}`;
          const tooltip = `${marker.label}: ${formatValue(marker.value)}`;
          const showTooltip = openKey === key;

          const labelPosClass =
            side === "left"
              ? // Hang left of the value line; tuck 1px toward the tick (half of w-0.5)
                `left-0 -translate-x-[calc(100%-12px)] text-right ${corner ? "pr-2" : ""}`
              : side === "right"
                ? `left-0 -translate-x-1.5 text-left ${corner ? "pl-2" : ""}`
                : "left-0 -translate-x-1/2 text-center";

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(marker.value)}
              onMouseEnter={() => setOpenKey(key)}
              onFocus={() => setOpenKey(key)}
              onBlur={() => setOpenKey((k) => (k === key ? null : k))}
              className="absolute top-0 h-6 w-0 group"
              style={{ left: `${marker.pos}%` }}
              aria-label={tooltip}
            >
              {/* Vertical tick, centered on value */}
              <span
                className={`absolute left-0 top-0 h-2 w-0.5 -translate-x-1/2 transition-colors ${tickClass}`}
              />
              {/* Horizontal L-arm when pair is very close */}
              {corner && side === "left" && (
                <span
                  className={`absolute left-0 top-2 h-0.5 w-2 -translate-x-full transition-colors ${tickClass}`}
                />
              )}
              {corner && side === "right" && (
                <span
                  className={`absolute left-0 top-2 h-0.5 w-2 transition-colors ${tickClass}`}
                />
              )}
              <span
                className={`absolute max-w-[60px] truncate text-[9px] leading-none transition-colors ${
                  corner ? "top-2.5" : "top-2"
                } ${labelPosClass} ${labelClass}`}
              >
                {marker.label}
              </span>
              <span
                role="tooltip"
                className={`pointer-events-none absolute bottom-full left-0 z-20 mb-1 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium shadow-md transition-opacity ${tooltipClass} ${
                  showTooltip ? "opacity-100" : "opacity-0"
                }`}
              >
                {tooltip}
              </span>
            </button>
          );
        }

        const { markers: cluster, pos, key } = item;
        const showMenu = openKey === key;

        return (
          <div
            key={key}
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center group"
            style={{ left: `${pos}%` }}
            onMouseEnter={() => setOpenKey(key)}
            onFocusCapture={() => setOpenKey(key)}
            onBlurCapture={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setOpenKey((k) => (k === key ? null : k));
              }
            }}
          >
            <button
              type="button"
              disabled={disabled}
              className="flex flex-col items-center"
              aria-expanded={showMenu}
              aria-haspopup="listbox"
              aria-label={`${cluster.length} comps nearby`}
            >
              <span className={`w-0.5 h-2 transition-colors ${tickClass}`} />
              <span
                className={`text-[9px] tabular-nums transition-colors ${labelClass}`}
              >
                {cluster.length}
              </span>
            </button>

            <div
              role="listbox"
              className={`absolute bottom-full left-1/2 z-30 min-w-[7.5rem] -translate-x-1/2 pb-1 transition-opacity ${
                showMenu
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              <div className={`rounded py-1 shadow-lg ${tooltipClass}`}>
                {cluster.map((m) => {
                  const itemKey = m.id ?? `${m.label}-${m.value}`;
                  return (
                    <button
                      key={itemKey}
                      type="button"
                      role="option"
                      disabled={disabled}
                      onClick={() => {
                        onSelect(m.value);
                        setOpenKey(null);
                      }}
                      className={`block w-full px-2 py-1 text-left text-[10px] whitespace-nowrap transition-colors ${
                        isTicket
                          ? "hover:bg-ticket-ink/10 focus:bg-ticket-ink/10"
                          : "hover:bg-cinema-800 focus:bg-cinema-800"
                      }`}
                    >
                      {m.label}: {formatValue(m.value)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
