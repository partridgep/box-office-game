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

/**
 * One entry per marker — stable identity so `left` can CSS-transition when the
 * scale changes. Clustering only changes presentation (tick / label layout).
 */
export type MarkerLayout = {
  marker: PositionedMarker;
  /** False for non-leaders in a 3+ band (tick is shared visually). */
  showTick: boolean;
  side: LabelSide;
  /** L-shaped tick arm when a pair is extremely close */
  corner: boolean;
  /** Vertical stack index within a 3+ band (0 = directly under tick). */
  stackIndex: number;
  /** Band size; >1 only for 3+ clusters. */
  stackSize: number;
};

/** @deprecated Use MarkerLayout — kept as an alias for any external imports. */
export type LayoutItem = MarkerLayout;

/** Percent of track width — labels are ~60px, so ~10% on a typical slider. */
export const COMP_BAND_THRESHOLD = 10;

/** Below this gap, pairs get an L-arm so labels can fan farther out. */
export const COMP_CORNER_THRESHOLD = 4;

/**
 * Layout each marker with its own position. Markers within `bandThreshold`
 * share presentation: pairs fan labels; 3+ stack labels and share one tick.
 */
export function layoutCompMarkers(
  markers: CompMarker[],
  getPos: (value: number) => number,
  bandThreshold = COMP_BAND_THRESHOLD,
  cornerThreshold = COMP_CORNER_THRESHOLD,
): MarkerLayout[] {
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

  const items: MarkerLayout[] = [];
  for (const band of bands) {
    if (band.length >= 3) {
      for (let i = 0; i < band.length; i++) {
        items.push({
          marker: band[i],
          showTick: i === 0,
          side: "center",
          corner: false,
          stackIndex: i,
          stackSize: band.length,
        });
      }
    } else if (band.length === 2) {
      const gap = band[1].pos - band[0].pos;
      const corner = gap <= cornerThreshold;
      items.push({
        marker: band[0],
        showTick: true,
        side: "left",
        corner,
        stackIndex: 0,
        stackSize: 1,
      });
      items.push({
        marker: band[1],
        showTick: true,
        side: "right",
        corner,
        stackIndex: 0,
        stackSize: 1,
      });
    } else {
      items.push({
        marker: band[0],
        showTick: true,
        side: "center",
        corner: false,
        stackIndex: 0,
        stackSize: 1,
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
  /** When set, ease `left` on scale changes (ms). Matches thumb expand ease. */
  positionTransitionMs?: number;
}

export default function CompMarkers({
  markers,
  getPos,
  formatValue,
  onSelect,
  disabled = false,
  variant = "default",
  positionTransitionMs = 0,
}: CompMarkersProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [tooltipShift, setTooltipShift] = useState(0);
  const [tooltipReady, setTooltipReady] = useState(false);
  const [transitionsReady, setTransitionsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isTicket = variant === "ticket";

  // Skip animating from 0% on first paint.
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => setTransitionsReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

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
  const maxStackSize = items.reduce(
    (max, item) => Math.max(max, item.stackSize),
    1,
  );
  // Tick (8px) + stacked 9px labels with a little gap
  const stackHeight =
    maxStackSize > 1 ? 8 + maxStackSize * 11 : 24;

  const positionTransition =
    transitionsReady && positionTransitionMs > 0
      ? `left ${positionTransitionMs}ms cubic-bezier(0.33, 1, 0.68, 1), opacity ${positionTransitionMs}ms ease-out`
      : undefined;

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
        const { marker, showTick, side, corner, stackIndex, stackSize } = item;
        const key = marker.id ?? `${marker.label}-${marker.value}`;
        const displayName = marker.title ?? marker.label;
        const tooltip = `${displayName}: ${formatValue(marker.value)}`;
        const isOpen = openKey === key;
        const showTooltip = isOpen && tooltipReady;
        const isStacked = stackSize >= 3;

        const labelPosClass =
          side === "left"
            ? // Hang left of the value line; tuck 1px toward the tick (half of w-0.5)
              `left-0 -translate-x-[calc(100%-12px)] text-right ${corner ? "pr-2" : ""}`
            : side === "right"
              ? `left-0 -translate-x-1.5 text-left ${corner ? "pl-2" : ""}`
              : "left-0 -translate-x-1/2 text-center";

        // Stacked band: leader keeps tick+first label; others only show stacked labels.
        const labelTop = isStacked
          ? 8 + stackIndex * 11
          : corner
            ? 10
            : 8;

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
            style={{
              left: `${marker.pos}%`,
              transition: positionTransition,
            }}
            aria-label={tooltip}
          >
            {/* Vertical tick — fade out when this marker joins a cluster as a follower */}
            <span
              className={`absolute left-0 top-0 h-2 w-0.5 -translate-x-1/2 transition-[colors,opacity] ${tickClass} ${
                showTick ? "opacity-100" : "opacity-0"
              }`}
              style={
                positionTransitionMs > 0 && transitionsReady
                  ? { transitionDuration: `${positionTransitionMs}ms` }
                  : undefined
              }
              aria-hidden
            />
            {/* Horizontal L-arm when pair is very close */}
            {corner && side === "left" && showTick && (
              <span
                className={`absolute left-0 top-2 h-0.5 w-2 -translate-x-full transition-colors ${tickClass}`}
              />
            )}
            {corner && side === "right" && showTick && (
              <span
                className={`absolute left-0 top-2 h-0.5 w-2 transition-colors ${tickClass}`}
              />
            )}
            <span
              className={`absolute max-w-[60px] truncate text-[9px] leading-none transition-[colors,top] ${labelPosClass} ${labelClass}`}
              style={{
                top: `${labelTop}px`,
                transitionDuration:
                  positionTransitionMs > 0 && transitionsReady
                    ? `${positionTransitionMs}ms`
                    : undefined,
              }}
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
      })}
    </div>
  );
}
