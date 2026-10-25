import {
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { EyeOff, Star } from "lucide-react";
import { CompGroup, Guess, MovieData } from "../../types";
import { formatMillions, formatMillionsShort } from "../../utils/formatMoney";
import { getMovieActuals } from "../../utils/guessComparison";
import {
  filterVisibleCompGroups,
  getCompMetrics,
} from "../HistoricalComps/HistoricalComps";
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

/** Match Prediction Pool / results-section titles on Movie Details. */
const SECTION_TITLE =
  "text-xl text-left font-semibold text-stone-200 uppercase tracking-wider mb-2";

export type CompMetricKey =
  | "domesticOpening"
  | "internationalOpening"
  | "finalDomestic"
  | "finalInternational"
  | "rottenTomatoesScore";

const METRICS: { key: CompMetricKey; label: string; short: string }[] = [
  { key: "domesticOpening", label: "Domestic Opening", short: "Dom Open" },
  { key: "internationalOpening", label: "International Opening", short: "Int Open" },
  { key: "finalDomestic", label: "Domestic Final", short: "Dom Final" },
  { key: "finalInternational", label: "International Final", short: "Int Final" },
  { key: "rottenTomatoesScore", label: "Rotten Tomatoes", short: "RT" },
];

const COMP_ROW_CAP = 8;

type BarKind = "you" | "actual" | "comp";

type BarRow = {
  id: string;
  kind: BarKind;
  label: string;
  title: string;
  value: number;
  starred?: boolean;
  compMovieId?: string;
};

function formatMetricValue(value: number, metric: CompMetricKey): string {
  if (metric === "rottenTomatoesScore") return `${Math.round(value)}%`;
  return formatMillions(value);
}

function formatAmountDelta(diff: number, metric: CompMetricKey): string {
  const abs = Math.abs(diff);
  if (metric === "rottenTomatoesScore") {
    const n = Math.round(abs);
    return n === 1 ? "1 percentage point" : `${n} percentage points`;
  }
  return `$${formatMillionsShort(abs)}`;
}

/** Short clause after a lead verb: "$34.5M under The Dark Knight" / "in line with Oppenheimer". */
function vsCompClause(
  actual: number,
  comp: number,
  metric: CompMetricKey,
  compTitle: string
): string {
  const diff = actual - comp;
  if (diff === 0) return `in line with ${compTitle}`;
  const amount = formatAmountDelta(diff, metric);
  return diff > 0
    ? `${amount} over ${compTitle}`
    : `${amount} under ${compTitle}`;
}

function insightLead(metric: CompMetricKey): string {
  switch (metric) {
    case "domesticOpening":
      return "The movie opened";
    case "internationalOpening":
      return "Internationally it opened";
    case "finalDomestic":
      return "Domestically it finished";
    case "finalInternational":
      return "Internationally it finished";
    case "rottenTomatoesScore":
      return "Its RT score";
  }
}

/** RT: "Its RT score tied with A and B." / "…tied with A, and 1 percentage point over B." */
function buildRtInsight(
  actual: number,
  comps: { title: string; value: number }[]
): string {
  const ties = comps.filter((c) => actual - c.value === 0);
  const deltas = comps.filter((c) => actual - c.value !== 0);

  const parts: string[] = [];
  if (ties.length === 1) {
    parts.push(`tied with ${ties[0].title}`);
  } else if (ties.length >= 2) {
    parts.push(`tied with ${ties.map((t) => t.title).join(" and ")}`);
  }
  for (const c of deltas) {
    const diff = actual - c.value;
    const amount = formatAmountDelta(diff, "rottenTomatoesScore");
    parts.push(
      diff > 0 ? `${amount} over ${c.title}` : `${amount} under ${c.title}`
    );
  }

  if (parts.length === 0) return "";
  if (parts.length === 1) return `Its RT score ${parts[0]}.`;

  // Tie + delta (or two deltas same direction): ", and". Opposite deltas: ", but".
  const bothDeltas = ties.length === 0 && deltas.length === 2;
  const opposite =
    bothDeltas &&
    actual - deltas[0].value > 0 !== actual - deltas[1].value > 0;
  const joiner = opposite ? ", but" : ", and";
  return `Its RT score ${parts[0]}${joiner} ${parts[1]}.`;
}

/** e.g. "The movie opened $34.5M under A, but $41M over B." */
function buildActualVsCompsInsight(
  actual: number,
  metric: CompMetricKey,
  comps: { title: string; value: number }[]
): string {
  if (comps.length === 0) return "";
  if (metric === "rottenTomatoesScore") return buildRtInsight(actual, comps);

  const clauses = comps.map((c) =>
    vsCompClause(actual, c.value, metric, c.title)
  );
  const lead = insightLead(metric);

  if (clauses.length === 1) return `${lead} ${clauses[0]}.`;

  const [a, b] = clauses;
  const aOver = actual - comps[0].value > 0;
  const bOver = actual - comps[1].value > 0;
  const joiner = aOver !== bOver ? ", but" : " and";
  return `${lead} ${a}${joiner} ${b}.`;
}

function guessValueMillions(guess: Guess, metric: CompMetricKey): number | null {
  switch (metric) {
    case "domesticOpening":
      return guess.domestic_opening;
    case "internationalOpening":
      return guess.international_opening;
    case "finalDomestic":
      return guess.final_domestic;
    case "finalInternational":
      return guess.final_international;
    case "rottenTomatoesScore":
      return guess.rotten_tomatoes_score;
  }
}

function actualValueMillions(movie: MovieData, metric: CompMetricKey): number | null {
  const actuals = getMovieActuals(movie);
  switch (metric) {
    case "domesticOpening":
      return actuals.domesticOpening != null ? actuals.domesticOpening / 1_000_000 : null;
    case "internationalOpening":
      return actuals.internationalOpening != null
        ? actuals.internationalOpening / 1_000_000
        : null;
    case "finalDomestic":
      return actuals.finalDomestic != null ? actuals.finalDomestic / 1_000_000 : null;
    case "finalInternational":
      return actuals.finalInternational != null
        ? actuals.finalInternational / 1_000_000
        : null;
    case "rottenTomatoesScore":
      return actuals.rottenTomatoesScore;
  }
}

function defaultMetric(movie: MovieData, group: CompGroup | null): CompMetricKey {
  for (const { key } of METRICS) {
    if (actualValueMillions(movie, key) == null) continue;
    if (!group) return key;
    const hasComp = group.movies.some((m) => getCompMetrics(m)[key] != null);
    if (hasComp) return key;
  }
  for (const { key } of METRICS) {
    if (!group) return key;
    if (group.movies.some((m) => getCompMetrics(m)[key] != null)) return key;
  }
  return "domesticOpening";
}

function pickDefaultGroupId(
  groups: CompGroup[],
  starredIds: ReadonlyArray<string>
): string | null {
  if (groups.length === 0) return null;
  if (starredIds.length === 0) return groups[0].id;
  const starred = new Set(starredIds);
  let bestId = groups[0].id;
  let bestCount = -1;
  for (const group of groups) {
    const count = group.movies.filter((m) => starred.has(m.id)).length;
    if (count > bestCount) {
      bestCount = count;
      bestId = group.id;
    }
  }
  return bestId;
}

function barFillClass(kind: BarKind, starred?: boolean): string {
  // Dashed = prediction; solid = settled result.
  if (kind === "you") {
    return "bg-transparent border-2 border-dashed border-theater-gold";
  }
  if (kind === "actual") return "bg-stone-200";
  if (starred) return "bg-theater-gold/55";
  return "bg-cinema-300/80";
}

/** Arrow/Home/End within a tablist; activates the newly focused tab. */
function handleTablistKeyDown(
  e: ReactKeyboardEvent<HTMLElement>,
  onActivate: (index: number) => void
) {
  const tabs = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])')
  );
  if (tabs.length === 0) return;
  const current = tabs.indexOf(e.target as HTMLElement);
  if (current < 0) return;

  let next = current;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (current + 1) % tabs.length;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
    next = (current - 1 + tabs.length) % tabs.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = tabs.length - 1;
  else return;

  e.preventDefault();
  tabs[next]?.focus();
  onActivate(next);
}

interface VersusCompsProps {
  movie: MovieData;
  userGuess: Guess;
  groups: CompGroup[];
  className?: string;
}

export default function VersusComps({
  movie,
  userGuess,
  groups,
  className = "",
}: VersusCompsProps) {
  const headingId = useId();
  const categoryTabId = useId();
  const metricTabId = useId();
  const tableId = useId();

  const user = useUserStore((s) => s.user);
  const userKey = hiddenCompsUserKey(user?.id);
  const subjectMovieId = movie.id;

  const hiddenIds = useHiddenCompsStore((s) =>
    subjectMovieId
      ? selectHiddenCompIds(s.byUser, userKey, subjectMovieId)
      : EMPTY_HIDDEN
  );
  const starredIds = useStarredCompsStore((s) =>
    subjectMovieId
      ? selectStarredCompIds(s.byUser, userKey, subjectMovieId)
      : EMPTY_STARRED
  );
  const hide = useHiddenCompsStore((s) => s.hide);
  const showAllHidden = useHiddenCompsStore((s) => s.showAll);
  const toggleStar = useStarredCompsStore((s) => s.toggle);

  const visibleGroups = useMemo(
    () => filterVisibleCompGroups(groups, hiddenIds),
    [groups, hiddenIds]
  );

  const [groupId, setGroupId] = useState<string | null>(null);
  const [metric, setMetric] = useState<CompMetricKey | null>(null);
  const [starredOnly, setStarredOnly] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (visibleGroups.length === 0) {
      setGroupId(null);
      return;
    }
    const stillValid = groupId && visibleGroups.some((g) => g.id === groupId);
    if (!stillValid) {
      setGroupId(pickDefaultGroupId(visibleGroups, starredIds));
    }
  }, [visibleGroups, starredIds, groupId]);

  const activeGroup =
    visibleGroups.find((g) => g.id === groupId) ?? visibleGroups[0] ?? null;

  useEffect(() => {
    const group =
      visibleGroups.find((g) => g.id === groupId) ?? visibleGroups[0] ?? null;
    if (!group) {
      setMetric(null);
      return;
    }
    const next = defaultMetric(movie, group);
    setMetric((prev) => {
      if (prev && group.movies.some((m) => getCompMetrics(m)[prev] != null)) {
        return prev;
      }
      return next;
    });
  }, [visibleGroups, groupId, movie]);

  useEffect(() => {
    setShowAllRows(false);
  }, [groupId, metric, starredOnly]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setAnimateIn(true);
      return;
    }
    const id = requestAnimationFrame(() => setAnimateIn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const activeMetric = metric ?? defaultMetric(movie, activeGroup);
  const starredSet = useMemo(() => new Set(starredIds), [starredIds]);
  const atStarMax = starredIds.length >= STARRED_COMPS_MAX;

  const guessVal = guessValueMillions(userGuess, activeMetric);
  const actualVal = actualValueMillions(movie, activeMetric);

  const sortedComps = useMemo(() => {
    const comps = (activeGroup?.movies ?? []).filter((m) => {
      if (getCompMetrics(m)[activeMetric] == null) return false;
      if (starredOnly && !starredSet.has(m.id)) return false;
      return true;
    });
    return [...comps].sort((a, b) => {
      const aStar = starredSet.has(a.id) ? 1 : 0;
      const bStar = starredSet.has(b.id) ? 1 : 0;
      if (aStar !== bStar) return bStar - aStar;
      const aVal = getCompMetrics(a)[activeMetric]!;
      const bVal = getCompMetrics(b)[activeMetric]!;
      if (guessVal != null) {
        const aDist = Math.abs(aVal - guessVal);
        const bDist = Math.abs(bVal - guessVal);
        if (aDist !== bDist) return aDist - bDist;
      }
      return bVal - aVal;
    });
  }, [activeGroup, activeMetric, starredOnly, starredSet, guessVal]);

  const availableMetrics = useMemo(
    () =>
      METRICS.filter(({ key }) =>
        (activeGroup?.movies ?? []).some((m) => getCompMetrics(m)[key] != null)
      ),
    [activeGroup]
  );

  const truncated = !showAllRows && sortedComps.length > COMP_ROW_CAP;
  const visibleComps = truncated
    ? sortedComps.slice(0, COMP_ROW_CAP)
    : sortedComps;

  const referenceRows: BarRow[] = [];
  if (guessVal != null) {
    referenceRows.push({
      id: "you",
      kind: "you",
      label: "You",
      title: `${movie.title} - Your Guess`,
      value: guessVal,
    });
  }
  if (actualVal != null) {
    referenceRows.push({
      id: "actual",
      kind: "actual",
      label: "Actual",
      title: `${movie.title} - Actual`,
      value: actualVal,
    });
  }

  const compRows: BarRow[] = visibleComps.map((m) => ({
    id: m.id,
    kind: "comp" as const,
    label: m.title,
    title: m.title,
    value: getCompMetrics(m)[activeMetric]!,
    starred: starredSet.has(m.id),
    compMovieId: m.id,
  }));

  const allRows = [...referenceRows, ...compRows];
  const maxValue = Math.max(...allRows.map((r) => r.value), 0.0001);

  const closestToActual =
    actualVal == null
      ? []
      : [...sortedComps]
          .sort((a, b) => {
            const aVal = getCompMetrics(a)[activeMetric]!;
            const bVal = getCompMetrics(b)[activeMetric]!;
            return (
              Math.abs(aVal - actualVal) - Math.abs(bVal - actualVal) ||
              bVal - aVal
            );
          })
          .slice(0, 2)
          .map((m) => ({
            title: m.title,
            value: getCompMetrics(m)[activeMetric]!,
          }));

  const insight =
    actualVal != null && closestToActual.length > 0
      ? buildActualVsCompsInsight(actualVal, activeMetric, closestToActual)
      : actualVal != null
        ? `Actual: ${formatMetricValue(actualVal, activeMetric)}.`
        : guessVal != null
          ? `Your guess: ${formatMetricValue(guessVal, activeMetric)}. Actual not in yet.`
          : "No prediction for this metric.";

  const handleToggleStar = (compMovieId: string) => {
    if (!subjectMovieId) return;
    toggleStar(userKey, subjectMovieId, compMovieId);
  };

  const handleHide = (compMovieId: string) => {
    if (!subjectMovieId) return;
    hide(userKey, subjectMovieId, compMovieId);
  };

  if (!subjectMovieId || visibleGroups.length === 0) {
    const anyHidden = hiddenIds.length > 0 && groups.length > 0;
    if (!anyHidden || !subjectMovieId) return null;
    return (
      <section className={className}>
        <h2 className={SECTION_TITLE}>Versus Comps</h2>
        <p className="text-sm text-stone-400">
          All comps are hidden for this title.
        </p>
        <button
          type="button"
          onClick={() => showAllHidden(userKey, subjectMovieId)}
          className="mt-2 text-sm text-theater-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theater-gold/60 rounded"
        >
          Show all comps
        </button>
      </section>
    );
  }

  return (
    <section className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div>
          <h2 id={headingId} className={SECTION_TITLE}>
            Versus Comps
          </h2>
          <p className="text-sm text-stone-400 text-left" aria-live="polite">
            {insight}
          </p>
        </div>
        <label className="inline-flex items-center gap-2 self-start rounded-lg border border-cinema-700 bg-cinema-900/60 px-3 py-1.5 text-xs uppercase tracking-wider text-stone-300 cursor-pointer select-none focus-within:ring-2 focus-within:ring-theater-gold/60">
          <input
            type="checkbox"
            checked={starredOnly}
            onChange={(e) => setStarredOnly(e.target.checked)}
            className="size-3.5 rounded border-cinema-600 bg-cinema-950 text-theater-gold focus:ring-theater-gold/50"
          />
          Starred only
        </label>
      </div>

      <div
        role="tablist"
        aria-label="Comp category"
        className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2 mt-6"
        onKeyDown={(e) =>
          handleTablistKeyDown(e, (i) => setGroupId(visibleGroups[i].id))
        }
      >
        {visibleGroups.map((group) => {
          const selected = group.id === (activeGroup?.id ?? "");
          const label = group.label?.trim() || "Comps";
          const alone = visibleGroups.length === 1;
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              id={`${categoryTabId}-${group.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setGroupId(group.id)}
              className={`text-sm font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theater-gold/60 rounded-sm ${
                alone
                  ? "text-stone-300 cursor-default"
                  : selected
                    ? "text-stone-100 border-b border-theater-gold/50 pb-0.5"
                    : "text-stone-500 hover:text-stone-300 border-b border-transparent pb-0.5"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        role="tablist"
        aria-label="Comparison metric"
        className="flex w-fit max-w-full flex-wrap rounded-lg border border-cinema-700 bg-cinema-900/60 p-0.5 mb-5"
        onKeyDown={(e) =>
          handleTablistKeyDown(e, (i) => setMetric(availableMetrics[i].key))
        }
      >
        {METRICS.map(({ key, short, label }) => {
          const available = availableMetrics.some((m) => m.key === key);
          const selected = key === activeMetric;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`${metricTabId}-${key}`}
              aria-selected={selected}
              aria-label={label}
              disabled={!available}
              tabIndex={selected ? 0 : -1}
              onClick={() => setMetric(key)}
              title={label}
              className={`min-h-8 px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theater-gold/60 ${
                selected
                  ? "bg-cinema-700 text-theater-gold font-semibold"
                  : "text-stone-400 hover:text-stone-200 disabled:opacity-35 disabled:hover:text-stone-400"
              }`}
            >
              {short}
            </button>
          );
        })}
      </div>

      {allRows.length === 0 || (guessVal == null && compRows.length === 0) ? (
        <p className="text-sm text-stone-500 py-6 text-center border border-dashed border-cinema-800 rounded-xl">
          {starredOnly
            ? "No starred comps have this metric. Star comps above or turn off Starred only."
            : "No comps with this metric in this category."}
        </p>
      ) : (
        <>
          <ul
            className="space-y-2.5"
            aria-labelledby={headingId}
            aria-describedby={`${headingId}-legend`}
          >
            {allRows.map((row, i) => {
              const widthPct = Math.max((row.value / maxValue) * 100, 2);
              const delayMs = i * 45;
              return (
                <li key={row.id} className="group">
                  <div className="flex items-center gap-2 mb-1 min-w-0">
                    <span
                      className={`text-xs font-medium truncate min-w-0 ${
                        row.kind === "you"
                          ? "text-theater-gold"
                          : row.kind === "actual"
                            ? "text-stone-200"
                            : row.starred
                              ? "text-theater-gold/90"
                              : "text-stone-300"
                      }`}
                      title={row.title}
                    >
                      {row.kind === "comp" && row.starred && (
                        <Star
                          size={10}
                          aria-hidden
                          className="inline fill-theater-gold text-theater-gold mr-1 -mt-0.5"
                        />
                      )}
                      {row.label}
                    </span>
                    {row.kind === "comp" && row.compMovieId && (
                      <span className="flex shrink-0 items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleToggleStar(row.compMovieId!)}
                          disabled={atStarMax && !row.starred}
                          aria-pressed={Boolean(row.starred)}
                          aria-label={
                            row.starred
                              ? `Unstar ${row.title}`
                              : atStarMax
                                ? `Star limit reached (${STARRED_COMPS_MAX})`
                                : `Star ${row.title}`
                          }
                          className={`rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theater-gold/60 disabled:opacity-40 ${
                            row.starred
                              ? "text-theater-gold"
                              : "text-stone-500 hover:text-theater-gold"
                          }`}
                        >
                          <Star
                            size={13}
                            aria-hidden
                            className={row.starred ? "fill-theater-gold" : undefined}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleHide(row.compMovieId!)}
                          aria-label={`Hide ${row.title}`}
                          className="rounded-md p-1 text-stone-500 hover:text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theater-gold/60"
                        >
                          <EyeOff size={13} aria-hidden />
                        </button>
                      </span>
                    )}
                    <span className="ml-auto shrink-0 text-xs tabular-nums text-stone-400">
                      {formatMetricValue(row.value, activeMetric)}
                    </span>
                  </div>
                  <div
                    className="h-3 rounded-sm bg-cinema-900/80 overflow-hidden"
                    role="img"
                    aria-label={`${row.title}: ${formatMetricValue(row.value, activeMetric)}`}
                  >
                    <div
                      className={`h-full rounded-sm ${barFillClass(row.kind, row.starred)} ${
                        row.kind === "you" ? "box-border" : ""
                      }`}
                      style={{
                        width: animateIn ? `${widthPct}%` : "0%",
                        transition: animateIn
                          ? `width 500ms cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms`
                          : undefined,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <p
            id={`${headingId}-legend`}
            className="mt-3 text-[11px] text-stone-500 flex flex-wrap gap-x-4 gap-y-1"
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-sm border border-dashed border-theater-gold"
                aria-hidden
              />
              You
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-stone-200" aria-hidden />
              Actual
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-cinema-300/80" aria-hidden />
              Comp
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star size={10} className="fill-theater-gold text-theater-gold" aria-hidden />
              Starred
            </span>
          </p>

          {truncated && (
            <button
              type="button"
              onClick={() => setShowAllRows(true)}
              className="mt-3 text-sm text-theater-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theater-gold/60 rounded"
            >
              Show all {sortedComps.length} comps
            </button>
          )}
          {showAllRows && sortedComps.length > COMP_ROW_CAP && (
            <button
              type="button"
              onClick={() => setShowAllRows(false)}
              className="mt-3 ml-3 text-sm text-stone-400 hover:text-stone-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theater-gold/60 rounded"
            >
              Show fewer
            </button>
          )}

          <div className="mt-4">
            <button
              type="button"
              aria-expanded={showTable}
              aria-controls={tableId}
              onClick={() => setShowTable((v) => !v)}
              className="text-xs uppercase tracking-wider text-stone-500 hover:text-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theater-gold/60 rounded"
            >
              {showTable ? "Hide data table" : "Show data table"}
            </button>
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-100 ease-out motion-reduce:transition-none ${
                showTable
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0 pointer-events-none"
              }`}
              aria-hidden={!showTable}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  id={tableId}
                  className="mt-2 overflow-x-auto rounded-lg border border-cinema-800"
                  {...(!showTable ? { inert: "" } : {})}
                >
                  <table className="w-full text-sm text-left">
                    <caption className="sr-only">
                      {METRICS.find((m) => m.key === activeMetric)?.label ??
                        "Metric"}{" "}
                      versus comps
                    </caption>
                    <thead className="bg-cinema-900/80 text-stone-400 text-xs uppercase tracking-wider">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-medium">
                          Title
                        </th>
                        <th scope="col" className="px-3 py-2 font-medium">
                          Role
                        </th>
                        <th scope="col" className="px-3 py-2 font-medium text-right">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRows.map((row) => {
                        // You = gold wash (Prediction Pool). Actual = stone.
                        // Starred comps stay neutral; ★ is the only star cue.
                        const rowClass =
                          row.kind === "actual"
                            ? "border-t border-cinema-800 bg-stone-200/10"
                            : row.kind === "you"
                              ? "border-t border-cinema-800 bg-theater-gold/5"
                              : "border-t border-cinema-800";
                        const titleClass =
                          row.kind === "actual"
                            ? "px-3 py-2 font-medium text-stone-100"
                            : row.kind === "you"
                              ? "px-3 py-2 font-medium text-theater-gold"
                              : "px-3 py-2 font-normal text-stone-200";
                        const valueClass =
                          row.kind === "actual"
                            ? "px-3 py-2 text-right tabular-nums text-stone-100"
                            : row.kind === "you"
                              ? "px-3 py-2 text-right tabular-nums text-theater-gold"
                              : "px-3 py-2 text-right tabular-nums text-stone-300";
                        return (
                          <tr key={`tbl-${row.id}`} className={rowClass}>
                            <th scope="row" className={titleClass}>
                              {row.title}
                              {row.starred ? (
                                <span className="text-theater-gold"> ★</span>
                              ) : null}
                            </th>
                            <td className="px-3 py-2 text-stone-400 capitalize">
                              {row.kind}
                            </td>
                            <td className={valueClass}>
                              {formatMetricValue(row.value, activeMetric)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
