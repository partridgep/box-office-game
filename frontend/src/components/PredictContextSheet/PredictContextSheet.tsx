import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { CompGroup, MovieData } from "../../types";
import HistoricalComps, {
  type CompMetricAvailability,
  type PlaceCompMetric,
} from "../HistoricalComps/HistoricalComps";
import MovieDetailsCard from "../MovieContextPanel/MovieDetailsCard";
import { prefersReducedMotion } from "../../utils/viewTransitions";

export type SheetDetent = "peek" | "half" | "full";
type SheetTab = "comps" | "details";

/** Fraction of the gap between top rail and bottom nav. */
const DETENT_FRAC: Record<Exclude<SheetDetent, "peek">, number> = {
  half: 0.5,
  full: 1,
};

/** Fallback before ResizeObserver measures real chrome / chrome rails. */
const FALLBACK_PEEK_PX = 72;
const FALLBACK_NAV_PX = 72;
const FALLBACK_TOP_RAIL_PX = 60;
/** Breathing room under the top rail so the drag handle stays tappable. */
const FULL_TOP_GAP_PX = 8;

const DETENT_ORDER: SheetDetent[] = ["peek", "half", "full"];

export type SheetHeightChange = (
  heightPx: number,
  opts: { immediate: boolean },
) => void;

interface PredictContextSheetProps {
  movie: MovieData;
  compGroups: CompGroup[];
  highlightedCompId: string | null;
  onHighlightComp: (compMovieId: string | null) => void;
  /** Keep page padding in sync so ticket controls can scroll above the sheet. */
  onHeightChange?: SheetHeightChange;
  /** Place one pinned-comp metric onto a prediction slider. */
  onPlaceCompMetric?: PlaceCompMetric;
  metricAvailability?: CompMetricAvailability;
}

/** Usable height between top rail and bottom nav (sheet sits above the nav). */
function availableHeight(
  viewportH: number,
  navH: number,
  topRailH: number,
  peekH: number,
): number {
  return Math.max(
    viewportH - navH - topRailH - FULL_TOP_GAP_PX,
    peekH + 80,
  );
}

function detentHeightPx(
  detent: SheetDetent,
  viewportH: number,
  navH: number,
  topRailH: number,
  peekH: number,
): number {
  if (detent === "peek") return peekH;
  const avail = availableHeight(viewportH, navH, topRailH, peekH);
  return Math.round(avail * DETENT_FRAC[detent]);
}

/** Min drag travel (px) before a flick can skip to the next detent. */
const FLING_MIN_TRAVEL_PX = 28;
/** px/ms — single-frame spikes alone shouldn’t fling. */
const FLING_VELOCITY = 0.55;

function nearestDetent(
  height: number,
  viewportH: number,
  navH: number,
  topRailH: number,
  peekH: number,
  velocityY: number,
  /** Height when the gesture began — used to ignore tiny noisy flicks. */
  startHeight?: number,
): SheetDetent {
  const heights = DETENT_ORDER.map((d) =>
    detentHeightPx(d, viewportH, navH, topRailH, peekH),
  );
  const travel =
    startHeight != null ? Math.abs(height - startHeight) : FLING_MIN_TRAVEL_PX;
  // Negative velocityY = dragging up = expand. Fling bias toward next detent.
  if (Math.abs(velocityY) > FLING_VELOCITY && travel >= FLING_MIN_TRAVEL_PX) {
    const current = nearestIndex(height, heights);
    if (velocityY < 0 && current < DETENT_ORDER.length - 1) {
      return DETENT_ORDER[current + 1];
    }
    if (velocityY > 0 && current > 0) {
      return DETENT_ORDER[current - 1];
    }
  }
  let best: SheetDetent = "peek";
  let bestDist = Infinity;
  for (const d of DETENT_ORDER) {
    const dist = Math.abs(
      height - detentHeightPx(d, viewportH, navH, topRailH, peekH),
    );
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
}

function nearestIndex(height: number, heights: number[]): number {
  let best = 0;
  let bestDist = Infinity;
  heights.forEach((h, i) => {
    const dist = Math.abs(height - h);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

function readElementHeight(selector: string, fallback: number): number {
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) return fallback;
  const h = el.getBoundingClientRect().height;
  return h > 0 ? Math.ceil(h) : fallback;
}

/** Distance from viewport bottom to the nav’s top — used to tuck the sheet under it. */
function readBottomNavLift(fallback: number): number {
  const el = document.querySelector("[data-bottom-nav]");
  if (!(el instanceof HTMLElement)) return fallback;
  const lift = window.innerHeight - el.getBoundingClientRect().top;
  return lift > 0 ? Math.ceil(lift) : fallback;
}

export default function PredictContextSheet({
  movie,
  compGroups,
  highlightedCompId,
  onHighlightComp,
  onHeightChange,
  onPlaceCompMetric,
  metricAvailability,
}: PredictContextSheetProps) {
  const titleId = useId();
  const tabCompsId = useId();
  const tabDetailsId = useId();
  const panelCompsId = useId();
  const panelDetailsId = useId();

  const [detent, setDetent] = useState<SheetDetent>("peek");
  const [tab, setTab] = useState<SheetTab>("comps");
  const [viewportH, setViewportH] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 800,
  );
  const [navH, setNavH] = useState(() =>
    typeof window !== "undefined"
      ? readBottomNavLift(FALLBACK_NAV_PX)
      : FALLBACK_NAV_PX,
  );
  const [topRailH, setTopRailH] = useState(() =>
    typeof window !== "undefined"
      ? readElementHeight("[data-top-rail]", FALLBACK_TOP_RAIL_PX)
      : FALLBACK_TOP_RAIL_PX,
  );
  const [peekH, setPeekH] = useState(FALLBACK_PEEK_PX);
  const [dragHeight, setDragHeight] = useState<number | null>(null);

  const chromeRef = useRef<HTMLDivElement>(null);
  /** Mirrors dragHeight for pointer-up (state can lag the last move). */
  const dragHeightRef = useRef<number | null>(null);
  /**
   * Handle: claim immediately.
   * Scroll panel: pending → sheet (pull down at top) or scroll (native).
   */
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startHeight: number;
    lastY: number;
    lastT: number;
    velocityY: number;
    claim: "handle" | "pending" | "sheet" | "scroll";
  } | null>(null);

  const reduceMotion = prefersReducedMotion();
  const fullH = detentHeightPx("full", viewportH, navH, topRailH, peekH);
  const targetH = detentHeightPx(detent, viewportH, navH, topRailH, peekH);
  const height = dragHeight ?? targetH;
  /** Peek at rest (not mid-drag) — chrome-only; content panels stay collapsed. */
  const peekAtRest = detent === "peek" && dragHeight == null;
  const expanded = !peekAtRest;

  useLayoutEffect(() => {
    const updateViewport = () => setViewportH(window.innerHeight);
    updateViewport();
    window.addEventListener("resize", updateViewport);

    const observers: ResizeObserver[] = [];
    const watchNav = () => {
      const update = () => setNavH(readBottomNavLift(FALLBACK_NAV_PX));
      update();
      const el = document.querySelector("[data-bottom-nav]");
      if (el instanceof HTMLElement) {
        const ro = new ResizeObserver(update);
        ro.observe(el);
        observers.push(ro);
      }
    };
    const watchTopRail = () => {
      const update = () =>
        setTopRailH(readElementHeight("[data-top-rail]", FALLBACK_TOP_RAIL_PX));
      update();
      const el = document.querySelector("[data-top-rail]");
      if (el instanceof HTMLElement) {
        const ro = new ResizeObserver(update);
        ro.observe(el);
        observers.push(ro);
      }
    };
    watchNav();
    watchTopRail();

    return () => {
      window.removeEventListener("resize", updateViewport);
      observers.forEach((ro) => ro.disconnect());
    };
  }, []);

  useLayoutEffect(() => {
    const el = chromeRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setPeekH(Math.ceil(h));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const reported = peekAtRest ? peekH : height;
    onHeightChange?.(reported, {
      immediate: dragHeight != null || reduceMotion,
    });
  }, [height, peekH, peekAtRest, dragHeight, onHeightChange, reduceMotion]);

  useEffect(() => {
    return () => {
      onHighlightComp(null);
      onHeightChange?.(0, { immediate: true });
    };
  }, [onHighlightComp, onHeightChange]);

  const promoteFromPeek = useCallback(() => {
    setDetent((d) => (d === "peek" ? "half" : d));
  }, []);

  const handlePinComp = useCallback(
    (compMovieId: string | null) => {
      // Expand first so parent scroll math sees half-sheet occlusion.
      if (compMovieId != null) promoteFromPeek();
      onHighlightComp(compMovieId);
    },
    [onHighlightComp, promoteFromPeek],
  );

  const setDragHeightLive = (next: number | null) => {
    dragHeightRef.current = next;
    setDragHeight(next);
  };

  const applySheetDragY = (drag: NonNullable<typeof dragRef.current>, clientY: number) => {
    const next = Math.min(
      fullH,
      Math.max(peekH, drag.startHeight + (drag.startY - clientY)),
    );
    setDragHeightLive(next);
  };

  const trackDragVelocity = (
    drag: NonNullable<typeof dragRef.current>,
    clientY: number,
  ) => {
    const now = performance.now();
    const dt = Math.max(now - drag.lastT, 1);
    const sample = (clientY - drag.lastY) / dt;
    // EMA — last-frame spikes on pointerup were causing half→peek jerks.
    drag.velocityY = drag.velocityY * 0.65 + sample * 0.35;
    drag.lastY = clientY;
    drag.lastT = now;
  };

  const finishSheetDrag = (
    velocityY: number,
    finalHeight: number,
    startHeight: number,
  ) => {
    const next = nearestDetent(
      finalHeight,
      viewportH,
      navH,
      topRailH,
      peekH,
      velocityY,
      startHeight,
    );
    setDetent(next);
    setDragHeightLive(null);
  };

  const onHandlePointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const now = performance.now();
    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startHeight: height,
      lastY: e.clientY,
      lastT: now,
      velocityY: 0,
      claim: "handle",
    };
    setDragHeightLive(height);
  };

  const onHandlePointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId || drag.claim !== "handle") {
      return;
    }
    trackDragVelocity(drag, e.clientY);
    applySheetDragY(drag, e.clientY);
  };

  const endDrag = (e: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const { claim, velocityY, startHeight } = drag;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (claim === "scroll" || claim === "pending") return;
    finishSheetDrag(
      velocityY,
      dragHeightRef.current ?? startHeight,
      startHeight,
    );
  };

  /** Pulling down at the top of a tab scrollport collapses the sheet. */
  const onPanelPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || peekAtRest) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startHeight: height,
      lastY: e.clientY,
      lastT: performance.now(),
      velocityY: 0,
      claim: "pending",
    };
  };

  const onPanelPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (drag.claim === "scroll" || drag.claim === "handle") return;

    trackDragVelocity(drag, e.clientY);
    const panel = e.currentTarget;
    const totalDy = e.clientY - drag.startY;

    if (drag.claim === "pending") {
      if (Math.abs(totalDy) < 10) return;
      // Finger down + already at top → overscroll owns the sheet.
      if (totalDy > 0 && panel.scrollTop <= 1) {
        drag.claim = "sheet";
        drag.startY = e.clientY;
        drag.startHeight = height;
        try {
          panel.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        setDragHeightLive(height);
      } else {
        drag.claim = "scroll";
      }
      return;
    }

    if (drag.claim === "sheet") {
      e.preventDefault();
      applySheetDragY(drag, e.clientY);
    }
  };

  const selectTab = (next: SheetTab) => {
    setTab(next);
    promoteFromPeek();
  };

  // Keep transition on release (incl. half→peek). peekAtRest used to force
  // height:auto + transition:none, which read as a jerky snap.
  const transition =
    dragHeight != null || reduceMotion
      ? "none"
      : "height 280ms var(--ease-snappy)";

  // Sheet paints under the nav (z-40 < nav z-50) so subpixel seams can’t leak.
  const sheetFrameH = height + navH;
  const sheetFrameMaxH = fullH + navH;

  return (
    <div
      data-predict-sheet
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden"
    >
      <section
        aria-labelledby={titleId}
        className="pointer-events-auto flex flex-col overflow-hidden rounded-t-2xl border border-b-0 border-theater-gold/25 bg-cinema-950/96 shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        style={{
          height: sheetFrameH,
          maxHeight: sheetFrameMaxH,
          paddingBottom: navH,
          transition,
        }}
      >
        <h2 id={titleId} className="sr-only">
          Movie comps and details
        </h2>

        {/* Peek chrome — measured so collapsed height never clips the tabs. */}
        <div ref={chromeRef} className="shrink-0" data-sheet-chrome>
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-valuetext={
              detent === "peek"
                ? "Collapsed"
                : detent === "half"
                  ? "Half height"
                  : "Full height"
            }
            aria-label="Resize comps sheet. Drag up to expand, down to collapse."
            tabIndex={0}
            className="flex cursor-grab touch-none flex-col items-center pt-2 pb-1 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theater-gold/70"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setDetent((d) => {
                  const i = DETENT_ORDER.indexOf(d);
                  return DETENT_ORDER[Math.min(i + 1, DETENT_ORDER.length - 1)];
                });
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setDetent((d) => {
                  const i = DETENT_ORDER.indexOf(d);
                  return DETENT_ORDER[Math.max(i - 1, 0)];
                });
              } else if (e.key === "Home") {
                e.preventDefault();
                setDetent("full");
              } else if (e.key === "End") {
                e.preventDefault();
                setDetent("peek");
              }
            }}
          >
            <span
              className="mb-2 h-1 w-10 rounded-full bg-stone-500"
              aria-hidden
            />
          </div>

          <div
            role="tablist"
            aria-label="Context"
            className="mx-3 mb-2 grid grid-cols-2 gap-1 rounded-lg border border-stone-700/60 bg-cinema-900/70 p-1"
          >
            {(
              [
                {
                  id: "comps",
                  label: "Comps",
                  tabId: tabCompsId,
                  panelId: panelCompsId,
                },
                {
                  id: "details",
                  label: "Details",
                  tabId: tabDetailsId,
                  panelId: panelDetailsId,
                },
              ] as const
            ).map((item) => {
              const selected = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={item.tabId}
                  aria-selected={selected}
                  aria-controls={item.panelId}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectTab(item.id)}
                  className={`rounded-md px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theater-gold/70 ${
                    selected
                      ? "bg-theater-gold text-cinema-950"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/*
          Separate scrollports per tab. Keep both mounted and avoid display:none
          so each panel’s scrollTop survives tab switches.
        */}
        <div
          className={`relative min-h-0 flex-1 ${
            expanded ? "" : "invisible pointer-events-none"
          }`}
          aria-hidden={!expanded}
        >
          <div
            role="tabpanel"
            id={panelCompsId}
            aria-labelledby={tabCompsId}
            aria-hidden={tab !== "comps"}
            inert={tab !== "comps" ? true : undefined}
            onPointerDown={onPanelPointerDown}
            onPointerMove={onPanelPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={`absolute inset-0 overflow-y-auto overscroll-contain px-3 pb-3 ${
              dragHeight != null ? "touch-none" : ""
            } ${tab === "comps" ? "" : "invisible pointer-events-none"}`}
          >
            {movie.id ? (
              <div className="pb-2">
                <HistoricalComps
                  groups={compGroups}
                  subjectMovieId={movie.id}
                  highlightMode="pin"
                  pinnedCompId={highlightedCompId}
                  onHighlightComp={handlePinComp}
                  hideHeading
                  onPlaceCompMetric={onPlaceCompMetric}
                  metricAvailability={metricAvailability}
                />
              </div>
            ) : null}
          </div>
          <div
            role="tabpanel"
            id={panelDetailsId}
            aria-labelledby={tabDetailsId}
            aria-hidden={tab !== "details"}
            inert={tab !== "details" ? true : undefined}
            onPointerDown={onPanelPointerDown}
            onPointerMove={onPanelPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={`absolute inset-0 overflow-y-auto overscroll-contain px-3 pb-3 ${
              dragHeight != null ? "touch-none" : ""
            } ${tab === "details" ? "" : "invisible pointer-events-none"}`}
          >
            <div className="pb-2">
              <MovieDetailsCard movie={movie} bare />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Initial page pad before the sheet mounts / reports height. */
export const PREDICT_SHEET_PEEK_HEIGHT = FALLBACK_PEEK_PX;
