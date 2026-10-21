import { useAutoAnimate } from "@formkit/auto-animate/react";
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

interface HistoricalCompsProps {
  groups: CompGroup[];
  /** Subject movie these comps belong to — hide/star prefs are scoped to this id. */
  subjectMovieId: string;
  /** Under "About this movie": match Prediction Pool / Movie Details title weight */
  subsection?: boolean;
}

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
  onHide,
  onToggleStar,
}: {
  movie: CompMovie;
  starred: boolean;
  /** True when at max stars and this row isn’t already starred. */
  starDisabled: boolean;
  onHide: (compMovieId: string) => void;
  onToggleStar: (compMovieId: string) => void;
}) {
  const metrics = getCompMetrics(movie);

  const cells: Array<{ label: string; value: string }> = [
    { label: "Dom Open", value: formatMetric(metrics.domesticOpening, "money") },
    { label: "Int Open", value: formatMetric(metrics.internationalOpening, "money") },
    { label: "Dom Final", value: formatMetric(metrics.finalDomestic, "money") },
    { label: "Int Final", value: formatMetric(metrics.finalInternational, "money") },
    { label: "RT", value: formatMetric(metrics.rottenTomatoesScore, "rt") },
  ];

  return (
    <div
      className={`w-full p-3 rounded-lg text-left border ${
        starred
          ? "bg-theater-gold/10 border-theater-gold/40"
          : "bg-cinema-900/50 border-cinema-800"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
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
        <div className="flex shrink-0 items-center gap-0.5">
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

export default function HistoricalComps({
  groups,
  subjectMovieId,
  subsection = false,
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
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3
          className={
            subsection
              ? "text-lg font-semibold text-stone-100 uppercase tracking-wider"
              : "text-sm font-semibold text-stone-200 uppercase tracking-wider"
          }
        >
          Historical Comps
        </h3>
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
                        onHide={handleHide}
                        onToggleStar={handleToggleStar}
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
 */
export function compsToMarkersByField(
  groups: CompGroup[],
  hiddenIds: ReadonlyArray<string> = EMPTY_HIDDEN,
  starredIds: ReadonlyArray<string> = EMPTY_STARRED
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
      if (starred && !starred.has(id)) continue;
      seen.add(id);

      const metrics = getCompMetrics(movie);
      const label = compLabel(movie);
      const title = movie.title;
      const isStarred = starred?.has(id) ?? false;

      const base = {
        compMovieId: id,
        label,
        title,
        starred: isStarred,
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
