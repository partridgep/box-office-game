import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useEffect, useRef } from "react";
import { EyeOff, Star } from "lucide-react";
import { CompGroup, CompMovie } from "../../types";
import { formatMillions } from "../../utils/formatMoney";
import { parseMoney } from "../../utils/guessComparison";
import { generateAcronym } from "../../utils/acronym";
import {
  EMPTY_HIDDEN,
  hiddenCompsUserKey,
  selectHiddenCompIds,
  useHiddenCompsStore,
} from "../../store/useHiddenCompsStore";
import {
  EMPTY_STARRED,
  STARRED_COMPS_MAX,
  selectStarredCompIds,
  useStarredCompsStore,
} from "../../store/useStarredCompsStore";
import { useUserStore } from "../../store/useUserStore";
import type { CompMarker } from "../PredictionControls/CompMarkers";

export type CompMarkersByField = {
  domesticOpening: CompMarker[];
  internationalOpening: CompMarker[];
  finalDomestic: CompMarker[];
  finalInternational: CompMarker[];
  rottenTomatoesScore: CompMarker[];
};

/** Prediction fields that can be set from a pinned comp metric on mobile. */
export type CompMetricField = keyof CompMarkersByField;

export type PlaceCompMetric = (field: CompMetricField, value: number) => void;

/** Which fields are still open for prediction (closed → metric not placeable). */
export type CompMetricAvailability = Partial<Record<CompMetricField, boolean>>;

interface HistoricalCompsProps {
  groups: CompGroup[];
  /** Subject movie these comps belong to — hide/star prefs are scoped to this id. */
  subjectMovieId: string;
  /** Under "About this movie": match Prediction Pool / Movie Details title weight */
  subsection?: boolean;
  /** Linked brushing: hover/focus a row → highlight matching slider ticks. */
  onHighlightComp?: (compMovieId: string | null) => void;
  /**
   * "hover": desktop brush (enter/leave).
   * "pin": tap to sticky-highlight for mobile sheet dual-view.
   */
  highlightMode?: "hover" | "pin";
  /** Controlled pin when highlightMode is "pin". */
  pinnedCompId?: string | null;
  /** Hide the section heading (sheet tab already labels Comps). */
  hideHeading?: boolean;
  /** Place one metric onto the matching prediction slider (pinned rows). */
  onPlaceCompMetric?: PlaceCompMetric;
  /** Closed fields stay non-interactive even when pinned. */
  metricAvailability?: CompMetricAvailability;
}

const METRIC_CELLS: Array<{
  field: CompMetricField;
  label: string;
  kind: "money" | "rt";
  ariaName: string;
}> = [
  {
    field: "domesticOpening",
    label: "Dom Open",
    kind: "money",
    ariaName: "domestic opening",
  },
  {
    field: "internationalOpening",
    label: "Int Open",
    kind: "money",
    ariaName: "international opening",
  },
  {
    field: "finalDomestic",
    label: "Dom Final",
    kind: "money",
    ariaName: "final domestic",
  },
  {
    field: "finalInternational",
    label: "Int Final",
    kind: "money",
    ariaName: "final international",
  },
  {
    field: "rottenTomatoesScore",
    label: "RT",
    kind: "rt",
    ariaName: "Rotten Tomatoes score",
  },
];

/**
 * Grace period when the pointer crosses `space-y-*` gaps between rows so the
 * brush tip can slide instead of clearing and remounting.
 */
const HIGHLIGHT_CLEAR_GRACE_MS = 120;

function compLabel(movie: CompMovie) {
  return movie.acronym?.trim() || generateAcronym(movie.title) || movie.title;
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

/** Historical comps should only include titles that have already opened. */
function isReleasedComp(movie: CompMovie, now = new Date()): boolean {
  if (!movie.released) return true;
  const release = new Date(movie.released);
  if (Number.isNaN(release.getTime())) return true;
  return release.getTime() <= now.getTime();
}

function filterReleasedGroups(groups: CompGroup[]): CompGroup[] {
  return groups
    .map((group) => ({
      ...group,
      movies: group.movies.filter((movie) => isReleasedComp(movie)),
    }))
    .filter((group) => group.movies.length > 0);
}

export function filterVisibleCompGroups(
  groups: CompGroup[],
  hiddenIds: ReadonlyArray<string> = EMPTY_HIDDEN
): CompGroup[] {
  const hidden = hiddenIds.length > 0 ? new Set(hiddenIds) : null;
  return filterReleasedGroups(groups)
    .map((group) => ({
      ...group,
      movies: hidden
        ? group.movies.filter((movie) => !hidden.has(movie.id))
        : group.movies,
    }))
    .filter((group) => group.movies.length > 0);
}

function countHiddenReleased(
  groups: CompGroup[],
  hiddenIds: ReadonlyArray<string>
): number {
  if (hiddenIds.length === 0) return 0;
  const hidden = new Set(hiddenIds);
  const ids = new Set<string>();
  for (const group of filterReleasedGroups(groups)) {
    for (const movie of group.movies) {
      if (hidden.has(movie.id)) ids.add(movie.id);
    }
  }
  return ids.size;
}

type GroupStarState = "none" | "some" | "all";

function CompGroupHeader({
  label,
  starState,
  starDisabled,
  onHideGroup,
  onToggleStarGroup,
}: {
  label: string;
  starState: GroupStarState;
  /** True only when none are starred and the global star cap blocks adding any. */
  starDisabled: boolean;
  onHideGroup: () => void;
  onToggleStarGroup: () => void;
}) {
  const allStarred = starState === "all";
  const someStarred = starState === "some";
  const hasStars = allStarred || someStarred;

  return (
    <div className="flex items-center justify-between gap-2">
      <h4 className="min-w-0 text-xs font-semibold uppercase tracking-wider text-stone-400 truncate">
        {label}
      </h4>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onToggleStarGroup}
          disabled={starDisabled}
          aria-pressed={allStarred ? true : someStarred ? "mixed" : false}
          aria-label={
            hasStars
              ? `Unstar comps in ${label}`
              : starDisabled
                ? `Star limit reached (${STARRED_COMPS_MAX}). Unstar another first.`
                : `Star comps in ${label} on the sliders`
          }
          title={
            hasStars
              ? "Unstar this category"
              : starDisabled
                ? `Up to ${STARRED_COMPS_MAX} starred comps`
                : "Star this category on sliders"
          }
          className={`rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theater-gold/60 disabled:opacity-40 disabled:cursor-not-allowed ${
            hasStars
              ? "text-theater-gold hover:text-theater-gold/80 hover:bg-theater-gold/10"
              : "text-stone-500 hover:text-theater-gold hover:bg-cinema-800/80"
          }`}
        >
          <Star
            size={14}
            aria-hidden
            className={
              allStarred
                ? "fill-theater-gold"
                : someStarred
                  ? "fill-theater-gold/40"
                  : undefined
            }
          />
        </button>
        <button
          type="button"
          onClick={onHideGroup}
          className="rounded-md p-1.5 text-stone-500 hover:text-stone-200 hover:bg-cinema-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theater-gold/60"
          aria-label={`Hide all comps in ${label}`}
          title="Hide this category"
        >
          <EyeOff size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}

function CompRow({
  movie,
  starred,
  starDisabled,
  pinned,
  highlightMode,
  onHide,
  onToggleStar,
  onHighlight,
  onTogglePin,
  onPlaceCompMetric,
  metricAvailability,
}: {
  movie: CompMovie;
  starred: boolean;
  /** True when at max stars and this row isn’t already starred. */
  starDisabled: boolean;
  pinned: boolean;
  highlightMode: "hover" | "pin";
  onHide: (compMovieId: string) => void;
  onToggleStar: (compMovieId: string) => void;
  onHighlight?: (compMovieId: string | null) => void;
  onTogglePin?: (compMovieId: string) => void;
  onPlaceCompMetric?: PlaceCompMetric;
  metricAvailability?: CompMetricAvailability;
}) {
  const metrics = getCompMetrics(movie);
  const pinMode = highlightMode === "pin";
  const canPlace = Boolean(pinned && onPlaceCompMetric);

  const clearHighlight = (related: EventTarget | null, current: HTMLElement) => {
    if (pinMode) return;
    if (related instanceof Node && current.contains(related)) return;
    onHighlight?.(null);
  };

  const pinChromeTransition =
    "transition-[background-color,border-color,padding] duration-[120ms] ease-out";

  // Star owns gold chrome. Pin is a cool left rail (+ cool border when not starred).
  const shellClass = starred
    ? "bg-theater-gold/10 border-theater-gold/40 hover:border-theater-gold/70 hover:bg-theater-gold/15"
    : pinned
      ? "bg-stone-100/5 border-stone-500/45"
      : "bg-cinema-900/50 border-cinema-800 hover:border-cinema-600";

  const pinRail = (
    <span
      className={`pointer-events-none absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-stone-100 transition-opacity duration-[120ms] ease-out ${
        pinned ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden
    />
  );

  const titleBlock = (
    <div className="min-w-0 text-left">
      <p className="text-sm font-medium text-stone-200 text-left">
        {movie.title}
        {movie.year ? (
          <span className="text-stone-500 font-normal"> ({movie.year})</span>
        ) : null}
      </p>
      {movie.reason && (
        <p className="text-xs text-stone-500 mt-0.5 text-left">{movie.reason}</p>
      )}
    </div>
  );

  const hasPlaceableMetric =
    canPlace &&
    METRIC_CELLS.some((cell) => {
      const raw = metrics[cell.field];
      const fieldOpen = metricAvailability?.[cell.field] !== false;
      return raw != null && Number.isFinite(raw) && fieldOpen;
    });

  /** Same box geometry pinned/unpinned — only border/fill change when placeable. */
  const metricCellLayout =
    "min-w-0 rounded-md px-1 py-1 text-left border transition-[background-color,border-color,transform] duration-[120ms] ease-out";

  const metricsGrid = (
    <div className="mt-3">
      <div className="grid grid-cols-5 gap-1.5">
        {METRIC_CELLS.map((cell) => {
          const raw = metrics[cell.field];
          const display = formatMetric(raw, cell.kind);
          const fieldOpen = metricAvailability?.[cell.field] !== false;
          const placeable =
            canPlace && raw != null && Number.isFinite(raw) && fieldOpen;

          const label = (
            <p className="text-[9px] uppercase tracking-wide text-stone-400 truncate">
              {cell.label}
            </p>
          );
          const value = (
            <p className="mt-0.5 text-xs font-semibold text-theater-gold tabular-nums truncate">
              {display}
            </p>
          );

          // Keep a <button> in pin mode so chrome can transition without remounting.
          if (pinMode && onPlaceCompMetric) {
            return (
              <button
                key={cell.field}
                type="button"
                disabled={!placeable}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!placeable) return;
                  onPlaceCompMetric(cell.field, raw!);
                }}
                aria-label={
                  placeable
                    ? `Set ${cell.ariaName} guess to ${display}`
                    : undefined
                }
                className={`${metricCellLayout} ${
                  placeable
                    ? "border-stone-500/40 bg-cinema-800/80 hover:border-stone-400/55 hover:bg-cinema-800 active:scale-[0.97] active:bg-stone-100/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-200/70"
                    : "border-transparent bg-transparent pointer-events-none"
                }`}
              >
                {label}
                {value}
              </button>
            );
          }

          return (
            <div
              key={cell.field}
              className={`${metricCellLayout} border-transparent bg-transparent`}
            >
              {label}
              {value}
            </div>
          );
        })}
      </div>
      <div
        className={`grid transition-[grid-template-rows,opacity,margin] duration-[120ms] ease-out ${
          hasPlaceableMetric
            ? "mt-2 grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
        aria-hidden={!hasPlaceableMetric}
      >
        <div className="overflow-hidden min-h-0">
          <p className="text-[11px] text-stone-400 text-left leading-snug">
            Tap a number to set as guess
          </p>
        </div>
      </div>
    </div>
  );

  const actionButtons = (
    <div className="relative z-10 flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={() => onToggleStar(movie.id)}
        disabled={starDisabled}
        aria-pressed={starred}
        aria-label={
          starred
            ? `Unstar ${movie.title} as a priority comparison`
            : starDisabled
              ? `Star limit reached (${STARRED_COMPS_MAX}). Unstar another first.`
              : `Star ${movie.title} as a priority comparison`
        }
        title={
          starDisabled
            ? `Up to ${STARRED_COMPS_MAX} starred comps`
            : starred
              ? "Un-star this comp"
              : "Star this comp"
        }
        className={`rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theater-gold/60 disabled:opacity-40 disabled:cursor-not-allowed ${
          starred
            ? "text-theater-gold hover:text-theater-gold/80 hover:bg-theater-gold/10"
            : "text-stone-500 hover:text-theater-gold hover:bg-cinema-800/80"
        }`}
      >
        <Star
          size={14}
          aria-hidden
          className={starred ? "fill-theater-gold" : undefined}
        />
      </button>
      <button
        type="button"
        onClick={() => onHide(movie.id)}
        className="rounded-md p-1.5 text-stone-500 hover:text-stone-200 hover:bg-cinema-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theater-gold/60"
        aria-label={`Hide ${movie.title} as a comparison`}
      >
        <EyeOff size={14} aria-hidden />
      </button>
    </div>
  );

  if (pinMode) {
    // Same padding/metrics placement pinned or not. Unpinned: invisible overlay
    // pins the whole card. Pinned: title clears pin; metric chips place values.
    return (
      <div
        data-comp-row
        data-pinned-comp={pinned ? movie.id : undefined}
        className={`relative w-full rounded-lg border p-3 ${pinChromeTransition} ${
          pinned ? "pl-3.5" : "pl-3"
        } ${shellClass}`}
      >
        {pinRail}
        {!pinned ? (
          <button
            type="button"
            onClick={() => onTogglePin?.(movie.id)}
            aria-pressed={false}
            aria-label={`Highlight ${movie.title} on prediction sliders`}
            className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-200/70"
          />
        ) : null}
        <div className={`relative ${pinned ? "" : "pointer-events-none"}`}>
          {pinned ? (
            <button
              type="button"
              onClick={() => onTogglePin?.(movie.id)}
              aria-pressed
              aria-label={`Clear highlight for ${movie.title} on prediction sliders`}
              className="w-full pr-16 text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-200/70"
            >
              {titleBlock}
            </button>
          ) : (
            <div className="pr-16 text-left">{titleBlock}</div>
          )}
          <div className={pinned ? "relative z-10" : undefined}>
            {metricsGrid}
          </div>
        </div>
        <div className="absolute top-2 right-2 z-20">{actionButtons}</div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full p-3 rounded-lg text-left border transition-colors ${shellClass}`}
      onPointerEnter={() => onHighlight?.(movie.id)}
      onPointerLeave={(e) => clearHighlight(e.relatedTarget, e.currentTarget)}
      onFocusCapture={() => onHighlight?.(movie.id)}
      onBlurCapture={(e) => clearHighlight(e.relatedTarget, e.currentTarget)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">{titleBlock}</div>
        {actionButtons}
      </div>
      {metricsGrid}
    </div>
  );
}

export default function HistoricalComps({
  groups,
  subjectMovieId,
  subsection = false,
  onHighlightComp,
  highlightMode = "hover",
  pinnedCompId = null,
  hideHeading = false,
  onPlaceCompMetric,
  metricAvailability,
}: HistoricalCompsProps) {
  const [listParent] = useAutoAnimate();
  const user = useUserStore((s) => s.user);
  const userKey = hiddenCompsUserKey(user?.id);
  const hiddenIds = useHiddenCompsStore((s) =>
    selectHiddenCompIds(s.byUser, userKey, subjectMovieId)
  );
  const starredIds = useStarredCompsStore((s) =>
    selectStarredCompIds(s.byUser, userKey, subjectMovieId)
  );
  const hide = useHiddenCompsStore((s) => s.hide);
  const hideMany = useHiddenCompsStore((s) => s.hideMany);
  const showAll = useHiddenCompsStore((s) => s.showAll);
  const toggleStar = useStarredCompsStore((s) => s.toggle);
  const unstar = useStarredCompsStore((s) => s.unstar);
  const unstarMany = useStarredCompsStore((s) => s.unstarMany);
  const starMany = useStarredCompsStore((s) => s.starMany);

  const visibleGroups = filterVisibleCompGroups(groups, hiddenIds);
  const hiddenCount = countHiddenReleased(groups, hiddenIds);
  const hasComps = visibleGroups.length > 0;
  const hadReleasedComps =
    filterReleasedGroups(groups).length > 0 || hiddenCount > 0;
  const starredSet = new Set(starredIds);
  const atStarMax = starredIds.length >= STARRED_COMPS_MAX;
  const pinMode = highlightMode === "pin";

  const highlightClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (highlightClearTimerRef.current != null) {
        clearTimeout(highlightClearTimerRef.current);
      }
    };
  }, []);

  /** Immediate highlight; delayed clear so row gaps don’t kill the brush slide. */
  const setHighlight = (compMovieId: string | null) => {
    if (!onHighlightComp || pinMode) return;
    if (compMovieId != null) {
      if (highlightClearTimerRef.current != null) {
        clearTimeout(highlightClearTimerRef.current);
        highlightClearTimerRef.current = null;
      }
      onHighlightComp(compMovieId);
      return;
    }
    if (highlightClearTimerRef.current != null) {
      clearTimeout(highlightClearTimerRef.current);
    }
    highlightClearTimerRef.current = setTimeout(() => {
      highlightClearTimerRef.current = null;
      onHighlightComp(null);
    }, HIGHLIGHT_CLEAR_GRACE_MS);
  };

  const togglePin = (compMovieId: string) => {
    if (!onHighlightComp) return;
    onHighlightComp(pinnedCompId === compMovieId ? null : compMovieId);
  };

  const handleHide = (compMovieId: string) => {
    unstar(userKey, subjectMovieId, compMovieId);
    hide(userKey, subjectMovieId, compMovieId);
  };

  const handleToggleStar = (compMovieId: string) => {
    toggleStar(userKey, subjectMovieId, compMovieId);
  };

  const handleHideGroup = (movies: CompMovie[]) => {
    const ids = movies.map((m) => m.id);
    unstarMany(userKey, subjectMovieId, ids);
    hideMany(userKey, subjectMovieId, ids);
  };

  const handleToggleStarGroup = (movies: CompMovie[]) => {
    const ids = movies.map((m) => m.id);
    const starredInGroup = ids.filter((id) => starredSet.has(id));
    // Any stars in this category → clear them (incl. partial fills when the
    // category is larger than STARRED_COMPS_MAX).
    if (starredInGroup.length > 0) {
      unstarMany(userKey, subjectMovieId, starredInGroup);
      return;
    }
    starMany(userKey, subjectMovieId, ids);
  };

  const groupStarState = (movies: CompMovie[]): GroupStarState => {
    if (movies.length === 0) return "none";
    let starredCount = 0;
    for (const m of movies) {
      if (starredSet.has(m.id)) starredCount += 1;
    }
    if (starredCount === 0) return "none";
    if (starredCount === movies.length) return "all";
    return "some";
  };

  const handleShowHidden = () => {
    showAll(userKey, subjectMovieId);
  };

  return (
    <div onPointerLeave={pinMode ? undefined : () => setHighlight(null)}>
      {(!hideHeading || hiddenCount > 0) && (
        <div
          className={`flex items-center gap-3 mb-4 ${
            hideHeading ? "justify-end" : "justify-between"
          }`}
        >
          {!hideHeading ? (
            <h3
              className={
                subsection
                  ? "text-lg font-semibold text-stone-100 uppercase tracking-wider"
                  : "text-sm font-semibold text-stone-200 uppercase tracking-wider"
              }
            >
              Historical Comps
            </h3>
          ) : (
            <span className="sr-only">Historical comps</span>
          )}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={handleShowHidden}
              className="shrink-0 text-xs font-medium text-theater-gold/90 hover:text-theater-gold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theater-gold/60 rounded"
            >
              Show {hiddenCount} hidden
            </button>
          )}
        </div>
      )}

      {!hadReleasedComps ? (
        <p className="text-sm text-stone-500">
          No comps yet. Add this movie to a category, borrow another category, or
          curate comps in admin.
        </p>
      ) : !hasComps ? (
        <p className="text-sm text-stone-500">
          All comps are hidden for this movie.
        </p>
      ) : (
        <div className="space-y-5">
          {visibleGroups.map((group) => {
            const categoryLabel = group.label?.trim() || "Comps";
            const starState = groupStarState(group.movies);
            // Only block when nothing in the group is starred and the cap is full
            // (stars live in other categories). Partial/oversize categories stay
            // clickable so a second press clears that group’s stars.
            const starDisabled = starState === "none" && atStarMax;

            return (
              <div key={group.id} className="space-y-2">
                <CompGroupHeader
                  label={categoryLabel}
                  starState={starState}
                  starDisabled={starDisabled}
                  onHideGroup={() => handleHideGroup(group.movies)}
                  onToggleStarGroup={() =>
                    handleToggleStarGroup(group.movies)
                  }
                />
                <div ref={listParent} className="space-y-2">
                  {group.movies.map((movie) => {
                    const starred = starredSet.has(movie.id);
                    return (
                      <CompRow
                        key={`${group.id}-${movie.id}`}
                        movie={movie}
                        starred={starred}
                        starDisabled={atStarMax && !starred}
                        pinned={pinnedCompId === movie.id}
                        highlightMode={highlightMode}
                        onHide={handleHide}
                        onToggleStar={handleToggleStar}
                        onHighlight={setHighlight}
                        onTogglePin={togglePin}
                        onPlaceCompMetric={onPlaceCompMetric}
                        metricAvailability={metricAvailability}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Build slider markers. Explicitly hidden comps are omitted.
 * When any comps are starred, only starred comps appear on the sliders
 * (non-starred stay visible in the Historical Comps list — not "hidden").
 * `transientCompId` optionally injects one non-starred comp for linked brushing.
 */
export function compsToMarkersByField(
  groups: CompGroup[],
  hiddenIds: ReadonlyArray<string> = EMPTY_HIDDEN,
  starredIds: ReadonlyArray<string> = EMPTY_STARRED,
  transientCompId: string | null = null,
): CompMarkersByField {
  const result: CompMarkersByField = {
    domesticOpening: [],
    internationalOpening: [],
    finalDomestic: [],
    finalInternational: [],
    rottenTomatoesScore: [],
  };

  const starred = starredIds.length > 0 ? new Set(starredIds) : null;
  // Same CompMovie can appear in multiple category groups — slider gets one mark.
  const seen = new Set<string>();

  for (const group of filterVisibleCompGroups(groups, hiddenIds)) {
    for (const movie of group.movies) {
      const id = movie.id;
      if (seen.has(id)) continue;
      // Focus mode: starring filters the slider map without calling hide().
      // Hover preview may temporarily re-include one non-starred id.
      if (starred && !starred.has(id) && id !== transientCompId) continue;
      seen.add(id);

      const metrics = getCompMetrics(movie);
      const label = compLabel(movie);
      const title = movie.title;
      const isStarred = starred?.has(id) ?? false;
      const isTransient =
        Boolean(starred) && !isStarred && id === transientCompId;

      const base = {
        compMovieId: id,
        label,
        title,
        starred: isStarred,
        transient: isTransient || undefined,
      };

      if (metrics.domesticOpening != null) {
        result.domesticOpening.push({
          ...base,
          id: `${id}-dom-open`,
          value: metrics.domesticOpening,
        });
      }
      if (metrics.internationalOpening != null) {
        result.internationalOpening.push({
          ...base,
          id: `${id}-int-open`,
          value: metrics.internationalOpening,
        });
      }
      if (metrics.finalDomestic != null) {
        result.finalDomestic.push({
          ...base,
          id: `${id}-dom-final`,
          value: metrics.finalDomestic,
        });
      }
      if (metrics.finalInternational != null) {
        result.finalInternational.push({
          ...base,
          id: `${id}-int-final`,
          value: metrics.finalInternational,
        });
      }
      if (metrics.rottenTomatoesScore != null) {
        result.rottenTomatoesScore.push({
          ...base,
          id: `${id}-rt`,
          value: metrics.rottenTomatoesScore,
        });
      }
    }
  }

  return result;
}
