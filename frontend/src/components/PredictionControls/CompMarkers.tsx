import { useLayoutEffect, useRef, useState } from "react";

export interface CompMarker {
  id?: string;
  /** Short label shown under the tick (movie acronym). */
  label: string;
  /** Full title for tooltips when different from label. */
  title?: string;
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
 * Pairs fan labels outward (L-arm when very close); 3+ stack labels under one tick.
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

const TOOLTIP_EDGE_PAD = 8;

/**
 * How far to nudge a centered tooltip so it stays inside `container`.
 * Positive shifts right; negative shifts left. Uses layout sizes only —
 * never mutates the tooltip's transform.
 */
function measureTooltipShift(
  tooltipEl: HTMLElement,
  containerEl: HTMLElement,
  pad = TOOLTIP_EDGE_PAD,
): number {
  const tipWidth = tooltipEl.offsetWidth;
  const anchor = tooltipEl.offsetParent instanceof HTMLElement
    ? tooltipEl.offsetParent
    : tooltipEl.parentElement;
  if (!anchor || tipWidth <= 0) return 0;

  const containerRect = containerEl.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  const anchorCenter = anchorRect.left + anchorRect.width / 2;
  const idealLeft = anchorCenter - tipWidth / 2;
  const minLeft = containerRect.left + pad;
  const maxLeft = containerRect.right - pad - tipWidth;
  const clampedLeft = Math.min(
    Math.max(idealLeft, minLeft),
    Math.max(minLeft, maxLeft),
  );
  return clampedLeft - idealLeft;
}

const tooltipBaseClass =
  "pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 whitespace-nowrap rounded px-1.5 py-0.5 text-center text-xs font-medium shadow-md";

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
  const [tooltipShift, setTooltipShift] = useState(0);
  const [tooltipReady, setTooltipReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isTicket = variant === "ticket";

  useLayoutEffect(() => {
    if (!openKey || !containerRef.current) {
      setTooltipShift(0);
      setTooltipReady(false);
      return;
    }

    const tip = containerRef.current.querySelector<HTMLElement>(
      `[data-tooltip-id="${CSS.escape(openKey)}"]`,
    );
    if (!tip) {
      setTooltipShift(0);
      setTooltipReady(false);
      return;
    }

    setTooltipShift(measureTooltipShift(tip, containerRef.current));
    setTooltipReady(true);
  }, [openKey]);

  const openTooltip = (key: string) => {
    setTooltipReady(false);
    setTooltipShift(0);
    setOpenKey(key);
  };

  const closeTooltip = (key?: string) => {
    setOpenKey((k) => {
      if (key != null && k !== key) return k;
      return null;
    });
    setTooltipReady(false);
    setTooltipShift(0);
  };

  if (markers.length === 0) return null;

  const items = layoutCompMarkers(markers, getPos);
  const maxClusterSize = items.reduce(
    (max, item) =>
      item.type === "cluster" ? Math.max(max, item.markers.length) : max,
    0,
  );
  // Tick (8px) + stacked 9px labels with a little gap
  const stackHeight =
    maxClusterSize > 0 ? 8 + maxClusterSize * 11 : 24;

  const tickClass = isTicket
    ? "bg-ticket-ink/40 group-hover:bg-ticket-ink group-focus-visible:bg-ticket-ink"
    : "bg-stone-500 group-hover:bg-theater-gold group-focus-visible:bg-theater-gold";

  const labelClass = isTicket
    ? "text-ticket-ink/50 group-hover:text-ticket-ink group-focus-visible:text-ticket-ink"
    : "text-stone-500 group-hover:text-theater-gold group-focus-visible:text-theater-gold";

  const tooltipClass = isTicket
    ? "border border-ticket-ink/30 bg-white/50 backdrop-blur-lg font-outfit"
    : "border border-cinema-700 bg-cinema-900 text-stone-200";

  const tooltipStyle = {
    transform: `translateX(calc(-50% + ${tooltipShift}px))`,
  };

  return (
    <div
      ref={containerRef}
      className="relative mt-1"
      style={{ height: `${Math.max(24, stackHeight)}px` }}
      onMouseLeave={() => closeTooltip()}
    >
      {items.map((item) => {
        if (item.type === "single") {
          const { marker, side, corner } = item;
          const key = marker.id ?? `${marker.label}-${marker.value}`;
          const displayName = marker.title ?? marker.label;
          const tooltip = `${displayName}: ${formatValue(marker.value)}`;
          const isOpen = openKey === key;
          const showTooltip = isOpen && tooltipReady;

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
              onMouseEnter={() => openTooltip(key)}
              onFocus={() => openTooltip(key)}
              onBlur={() => closeTooltip(key)}
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
                data-tooltip-id={key}
                // Keep centered transform while measuring (even at opacity 0).
                style={isOpen ? tooltipStyle : { transform: "translateX(-50%)" }}
                className={`${tooltipBaseClass} ${tooltipClass} ${
                  showTooltip ? "opacity-100" : "opacity-0"
                }`}
              >
                {tooltip}
              </span>
            </button>
          );
        }

        const { markers: cluster, pos, key } = item;

        return (
          <div
            key={key}
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${pos}%` }}
          >
            <span className={`w-0.5 h-2 shrink-0 ${tickClass}`} />
            <div className="flex flex-col items-center gap-px">
              {cluster.map((m) => {
                const itemKey = m.id ?? `${m.label}-${m.value}`;
                const displayName = m.title ?? m.label;
                const tooltip = `${displayName}: ${formatValue(m.value)}`;
                const isOpen = openKey === itemKey;
                const showTooltip = isOpen && tooltipReady;

                return (
                  <button
                    key={itemKey}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(m.value)}
                    onMouseEnter={() => openTooltip(itemKey)}
                    onFocus={() => openTooltip(itemKey)}
                    onBlur={() => closeTooltip(itemKey)}
                    className="relative group"
                    aria-label={tooltip}
                  >
                    <span
                      className={`block max-w-[60px] truncate text-[9px] leading-none transition-colors ${labelClass}`}
                    >
                      {m.label}
                    </span>
                    <span
                      role="tooltip"
                      data-tooltip-id={itemKey}
                      style={
                        isOpen ? tooltipStyle : { transform: "translateX(-50%)" }
                      }
                      className={`${tooltipBaseClass} ${tooltipClass} ${
                        showTooltip ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {tooltip}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
