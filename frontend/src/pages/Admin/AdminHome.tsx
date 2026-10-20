import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowsRotate } from "@fortawesome/free-solid-svg-icons";
import { library, IconProp } from "@fortawesome/fontawesome-svg-core";

import { getAdminStats } from "../../services/admin.service";
import {
  getCategories,
  createCategory,
} from "../../services/categories.service";
import {
  getSavedMovies,
  searchMovies,
  updateAllMovies,
} from "../../services/movies.service";
import { useMovieStore } from "../../store/useMovieStore";
import { AdminEngagementStats, Category, MovieData } from "../../types";

library.add({ faArrowsRotate });

// @ts-ignore
const refreshIcon: IconProp = "fa-solid fa-arrows-rotate";

const RECENT_LIMIT = 40;

type TmdbResult = {
  Title: string;
  Year: string;
  Poster: string;
  tmdbID: string;
};

type FocusRow =
  | { kind: "db"; key: string; movie: MovieData }
  | { kind: "tmdb"; key: string; result: TmdbResult };

function categoryLabel(cat: Category) {
  return cat.lobby_label || cat.comp_label || cat.slug;
}

function posterSrc(poster: string | null | undefined) {
  if (!poster) return null;
  if (poster.startsWith("http")) return poster;
  return `https://image.tmdb.org/t/p/w92${poster}`;
}

function formatReleased(released: MovieData["released"]) {
  if (!released) return "—";
  const d = new Date(released);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-cinema-800 bg-cinema-900/50 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wider text-stone-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-stone-100">
        {value}
      </p>
      {detail ? (
        <p className="mt-0.5 text-xs text-stone-500">{detail}</p>
      ) : null}
    </div>
  );
}

function formatSparkDay(day: string) {
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function GuessesSparkline({
  days,
}: {
  days: AdminEngagementStats["guesses"]["byDay"];
}) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const max = Math.max(0, ...days.map((d) => d.count));
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const hovered = days.find((d) => d.day === hoveredDay) ?? null;

  if (days.length === 0) {
    return (
      <p className="text-xs text-stone-500">No guesses in the last 14 days.</p>
    );
  }

  const first = days[0];
  const last = days[days.length - 1];
  const chartMax = Math.max(1, max);

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-stone-500 leading-snug">
        Each bar is one UTC day. Height = number of guesses submitted that day.
        Hover a bar for the exact count.
      </p>
      <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums text-stone-400">
        <span>
          {hovered
            ? `${formatSparkDay(hovered.day)} · ${hovered.count} guess${
                hovered.count === 1 ? "" : "es"
              }`
            : `${total} total in range`}
        </span>
        <span>Peak {max}/day</span>
      </div>
      <div className="flex gap-2">
        <div
          className="flex w-6 shrink-0 flex-col justify-between py-0.5 text-[10px] tabular-nums text-stone-500"
          aria-hidden
        >
          <span>{max}</span>
          <span>0</span>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div
            className="flex h-14 items-end gap-0.5 border-b border-l border-cinema-800/80 pl-0.5"
            role="img"
            aria-label={`Guesses per day from ${formatSparkDay(first.day)} to ${formatSparkDay(last.day)}. Peak ${max} per day.`}
          >
            {days.map((d) => {
              const height =
                d.count === 0
                  ? 2
                  : Math.max(6, Math.round((d.count / chartMax) * 52));
              const isActive = hoveredDay === d.day;
              return (
                <button
                  key={d.day}
                  type="button"
                  className={`flex-1 min-w-0 rounded-t-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cinema-400 ${
                    d.count === 0
                      ? "bg-cinema-800/50"
                      : isActive
                        ? "bg-cinema-400"
                        : "bg-cinema-600/80 hover:bg-cinema-500"
                  }`}
                  style={{ height }}
                  aria-label={`${formatSparkDay(d.day)}: ${d.count} guesses`}
                  onMouseEnter={() => setHoveredDay(d.day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onFocus={() => setHoveredDay(d.day)}
                  onBlur={() => setHoveredDay(null)}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-stone-500 pl-0.5">
            <span>{formatSparkDay(first.day)}</span>
            <span>{formatSparkDay(last.day)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminHome() {
  const navigate = useNavigate();
  const { movies, setMovies } = useMovieStore();
  const searchRef = useRef<HTMLInputElement>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [stats, setStats] = useState<AdminEngagementStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newLobbyLabel, setNewLobbyLabel] = useState("");
  const [newCompLabel, setNewCompLabel] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [showAllDb, setShowAllDb] = useState(false);
  const [tmdbResults, setTmdbResults] = useState<TmdbResult[]>([]);
  const [tmdbSearching, setTmdbSearching] = useState(false);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [tmdbSearched, setTmdbSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const totalMovieCount = Object.keys(movies).length;

  const matchedDb = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(movies)
      .filter((movie) => {
        if (!q) return true;
        return (
          movie.title.toLowerCase().includes(q) ||
          String(movie.year).includes(q) ||
          String(movie.tmdbID).includes(q) ||
          (movie.imdbID || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aTime = a.released ? new Date(a.released).getTime() : 0;
        const bTime = b.released ? new Date(b.released).getTime() : 0;
        return bTime - aTime;
      });
  }, [movies, query]);

  const visibleDb = useMemo(() => {
    if (query.trim() || showAllDb) return matchedDb;
    return matchedDb.slice(0, RECENT_LIMIT);
  }, [matchedDb, query, showAllDb]);

  const dbTmdbIds = useMemo(() => {
    const ids = new Set<string>();
    for (const movie of Object.values(movies)) {
      ids.add(String(movie.tmdbID));
    }
    return ids;
  }, [movies]);

  const focusRows: FocusRow[] = useMemo(() => {
    const rows: FocusRow[] = visibleDb.map((movie) => ({
      kind: "db",
      key: `db-${movie.id || movie.tmdbID}`,
      movie,
    }));
    for (const result of tmdbResults) {
      rows.push({
        kind: "tmdb",
        key: `tmdb-${result.tmdbID}`,
        result,
      });
    }
    return rows;
  }, [visibleDb, tmdbResults]);

  const filteredCategories = useMemo(() => {
    const q = categoryFilter.trim().toLowerCase();
    const list = [...categories].sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        categoryLabel(a).localeCompare(categoryLabel(b))
    );
    if (!q) return list;
    return list.filter((cat) => {
      const label = categoryLabel(cat).toLowerCase();
      return label.includes(q) || cat.slug.toLowerCase().includes(q);
    });
  }, [categories, categoryFilter]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        setCategoriesError(
          err instanceof Error ? err.message : "Failed to load categories"
        );
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    setStatsError(null);
    getAdminStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setStatsError(
            err instanceof Error ? err.message : "Failed to load stats"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, showAllDb, tmdbResults]);

  useEffect(() => {
    if (focusRows.length === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((i) => Math.min(i, focusRows.length - 1));
  }, [focusRows.length]);

  function openDbMovie(movie: MovieData) {
    navigate(`/admin/movie/${movie.tmdbID}`);
  }

  function openTmdbMovie(tmdbID: string) {
    navigate(`/admin/movie/${tmdbID}`);
  }

  async function runTmdbSearch() {
    if (!query.trim()) return;
    setTmdbSearching(true);
    setTmdbError(null);
    setTmdbSearched(true);
    try {
      const result = await searchMovies(query.trim(), year.trim() || undefined);
      setTmdbResults(result);
    } catch (err) {
      setTmdbError(err instanceof Error ? err.message : "Search failed");
      setTmdbResults([]);
    } finally {
      setTmdbSearching(false);
    }
  }

  function activateRow(row: FocusRow) {
    if (row.kind === "db") openDbMovie(row.movie);
    else openTmdbMovie(String(row.result.tmdbID));
  }

  useEffect(() => {
    function onGlobalKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, []);

  async function handleUpdateAllMovies() {
    if (
      !window.confirm(
        "Refresh box-office and metadata for every movie in the database? This can take a while."
      )
    ) {
      return;
    }
    setIsUpdating(true);
    try {
      await updateAllMovies();
      const updatedMovies = await getSavedMovies();
      setMovies(updatedMovies);
    } catch (error) {
      console.error("Error updating movies:", error);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newLobbyLabel.trim() && !newCompLabel.trim()) {
      setCategoriesError("Provide a lobby label and/or comp label");
      return;
    }
    setCreatingCategory(true);
    setCategoriesError(null);
    try {
      const created = await createCategory({
        lobby_label: newLobbyLabel.trim() || null,
        comp_label: newCompLabel.trim() || null,
      });
      setCategories((prev) => [...prev, created]);
      setNewLobbyLabel("");
      setNewCompLabel("");
      setShowNewCategory(false);
      navigate(`/admin/categories/${created.id}`);
    } catch (err) {
      setCategoriesError(
        err instanceof Error ? err.message : "Failed to create category"
      );
    } finally {
      setCreatingCategory(false);
    }
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (focusRows.length === 0) return;
      setActiveIndex((i) => Math.min(i + 1, focusRows.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (focusRows.length === 0) return;
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey || (query.trim() && focusRows.length === 0)) {
        void runTmdbSearch();
        return;
      }
      const row = focusRows[activeIndex];
      if (row) activateRow(row);
      else void runTmdbSearch();
    }
  }

  const hiddenRecentCount =
    !query.trim() && !showAllDb
      ? Math.max(0, matchedDb.length - RECENT_LIMIT)
      : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin</h1>
          <p className="text-sm text-stone-400 mt-1">
            Find a movie or jump into a category. Press{" "}
            <kbd className="rounded border border-cinema-700 bg-cinema-950 px-1.5 py-0.5 text-xs text-stone-300">
              /
            </kbd>{" "}
            to focus search.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleUpdateAllMovies}
            disabled={isUpdating}
            className="inline-flex items-center gap-2 rounded-lg border border-cinema-800 px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 hover:border-cinema-600 disabled:opacity-50"
          >
            <FontAwesomeIcon icon={refreshIcon} size="sm" spin={isUpdating} />
            {isUpdating ? "Updating…" : "Update all data"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-sm text-stone-400 hover:text-white transition-colors"
          >
            Lobby
          </button>
        </div>
      </div>

      <section
        className="space-y-3"
        aria-labelledby="engagement-heading"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2
            id="engagement-heading"
            className="text-sm font-semibold uppercase tracking-wider text-stone-300"
          >
            Engagement
          </h2>
          {stats?.generatedAt ? (
            <p className="text-[11px] text-stone-500">
              As of {new Date(stats.generatedAt).toLocaleString()}
            </p>
          ) : null}
        </div>

        {statsLoading ? (
          <p className="text-sm text-stone-500">Loading stats…</p>
        ) : statsError ? (
          <p className="text-sm text-rose-300" role="alert">
            {statsError}
          </p>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <StatCard
                label="Guesses today"
                value={stats.guesses.today}
                detail={`${stats.guesses.last7d} / 7d · ${stats.guesses.total} total`}
              />
              <StatCard
                label="Guesses · 7d"
                value={stats.guesses.last7d}
                detail={`${stats.guesses.last30d} in 30d`}
              />
              <StatCard
                label="New users today"
                value={stats.users.today}
                detail={`${stats.users.last7d} / 7d · ${stats.users.total} total`}
              />
              <StatCard
                label="New users · 7d"
                value={stats.users.last7d}
                detail={`${stats.users.last30d} in 30d`}
              />
              <StatCard
                label="Users"
                value={stats.users.total}
              />
              <StatCard
                label="Movies"
                value={stats.movies.total}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-xl border border-cinema-800 bg-cinema-900/40 p-3 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Guesses per day · last 14 days
                </h3>
                <GuessesSparkline days={stats.guesses.byDay} />
              </div>

              <div className="rounded-xl border border-cinema-800 bg-cinema-900/40 p-3 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Top movies by guesses
                </h3>
                <p className="text-[11px] text-stone-500">
                  Upcoming + released in the last 7 days
                </p>
                {stats.movies.topByGuesses.length === 0 ? (
                  <p className="text-xs text-stone-500">
                    No guesses on recent or upcoming titles.
                  </p>
                ) : (
                  <ol className="space-y-1">
                    {stats.movies.topByGuesses.map((movie, index) => (
                      <li key={movie.movieId}>
                        <button
                          type="button"
                          onClick={() => {
                            if (movie.tmdbID != null) {
                              navigate(`/admin/movie/${movie.tmdbID}`);
                            }
                          }}
                          className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-cinema-950/80"
                        >
                          <span className="min-w-0 truncate text-stone-200">
                            <span className="text-stone-500 mr-1.5 tabular-nums">
                              {index + 1}.
                            </span>
                            {movie.title}
                            {movie.year != null ? (
                              <span className="text-stone-500">
                                {" "}
                                ({movie.year})
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 tabular-nums text-xs text-stone-400">
                            {movie.guessCount}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </>
        ) : null}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-8">
        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-300">
              Categories
            </h2>
            <button
              type="button"
              onClick={() => setShowNewCategory((o) => !o)}
              aria-expanded={showNewCategory}
              className="text-xs text-cinema-400 hover:text-cinema-300"
            >
              {showNewCategory ? "Cancel" : "New"}
            </button>
          </div>

          {showNewCategory && (
            <form
              onSubmit={handleCreateCategory}
              className="rounded-xl border border-cinema-800 bg-cinema-900/50 p-3 space-y-2"
            >
              <label className="block space-y-1 text-xs">
                <span className="text-stone-400">Lobby label</span>
                <input
                  value={newLobbyLabel}
                  onChange={(e) => setNewLobbyLabel(e.target.value)}
                  className="w-full rounded-lg bg-cinema-950 border border-cinema-800 px-2 py-1.5 text-sm text-stone-100 outline-none focus:border-cinema-500"
                />
              </label>
              <label className="block space-y-1 text-xs">
                <span className="text-stone-400">Comp label</span>
                <input
                  value={newCompLabel}
                  onChange={(e) => setNewCompLabel(e.target.value)}
                  className="w-full rounded-lg bg-cinema-950 border border-cinema-800 px-2 py-1.5 text-sm text-stone-100 outline-none focus:border-cinema-500"
                />
              </label>
              <button
                type="submit"
                disabled={creatingCategory}
                className="w-full rounded-lg bg-cinema-600 hover:bg-cinema-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5"
              >
                {creatingCategory ? "Creating…" : "Create"}
              </button>
            </form>
          )}

          {categories.length > 6 && (
            <label className="block">
              <span className="sr-only">Filter categories</span>
              <input
                type="search"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                placeholder="Filter categories…"
                className="w-full rounded-lg bg-cinema-950 border border-cinema-800 px-2.5 py-1.5 text-xs text-stone-100 outline-none focus:border-cinema-500"
              />
            </label>
          )}

          {categoriesError && (
            <p className="text-xs text-rose-300">{categoriesError}</p>
          )}

          {filteredCategories.length === 0 && !categoriesError ? (
            <p className="text-xs text-stone-500">No categories yet.</p>
          ) : (
            <nav aria-label="Categories">
              <ul className="space-y-0.5 max-h-[50vh] overflow-y-auto">
                {filteredCategories.map((category) => (
                  <li key={category.id}>
                    <Link
                      to={`/admin/categories/${category.id}`}
                      className="flex items-baseline justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm text-stone-200 hover:bg-cinema-900/80 hover:text-white"
                    >
                      <span className="truncate">{categoryLabel(category)}</span>
                      <span className="shrink-0 text-xs text-stone-500">
                        {category.membershipCount ?? 0}
                        {!category.is_active ? " · off" : ""}
                        {category.display_in_lobby === false ? " · hide" : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <Link
            to="/admin/categories"
            className="inline-block text-xs text-stone-500 hover:text-stone-300"
          >
            Manage all categories →
          </Link>
        </aside>

        <main className="space-y-4 min-w-0">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-300">
              Find movie
            </h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex-1">
                <span className="sr-only">Search movies</span>
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setTmdbSearched(false);
                    setTmdbResults([]);
                    setTmdbError(null);
                  }}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Title, year, TMDB, or IMDb…"
                  className="w-full rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2.5 text-stone-100 outline-none focus:border-cinema-500"
                  autoComplete="off"
                />
              </label>
              <label className="sm:w-28">
                <span className="sr-only">Year for TMDB search</span>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Year"
                  className="w-full rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2.5 text-stone-100 outline-none focus:border-cinema-500"
                />
              </label>
              <button
                type="button"
                onClick={() => void runTmdbSearch()}
                disabled={tmdbSearching || !query.trim()}
                className="rounded-xl border border-cinema-700 px-4 py-2.5 text-sm text-stone-200 hover:border-cinema-500 disabled:opacity-50 shrink-0"
              >
                {tmdbSearching ? "Searching…" : "Search TMDB"}
              </button>
            </div>
            <p className="text-xs text-stone-500">
              Database filters as you type. ↑↓ then Enter opens a row. Shift+Enter
              or Search TMDB queries the API.
            </p>
          </div>

          {tmdbError && (
            <p className="text-sm text-rose-300" role="alert">
              {tmdbError}
            </p>
          )}

          <section aria-label="Movies in database" className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                In database
                {query.trim()
                  ? ` · ${matchedDb.length} of ${totalMovieCount}`
                  : showAllDb
                    ? ` · ${totalMovieCount}`
                    : ` · newest ${Math.min(RECENT_LIMIT, matchedDb.length)} of ${totalMovieCount}`}
              </h3>
            </div>

            {totalMovieCount === 0 ? (
              <p className="text-sm text-stone-500">
                No movies saved yet. Search TMDB to add one.
              </p>
            ) : visibleDb.length === 0 ? (
              <p className="text-sm text-stone-500">
                No database matches
                {query.trim() ? ` for “${query.trim()}”` : ""}. Try Search TMDB.
              </p>
            ) : (
              <ul className="rounded-xl border border-cinema-800 divide-y divide-cinema-800/80 overflow-hidden">
                {visibleDb.map((movie, index) => {
                  const isActive = focusRows[activeIndex]?.key === `db-${movie.id || movie.tmdbID}`;
                  const thumb = posterSrc(movie.poster);
                  return (
                    <li key={movie.id || movie.tmdbID}>
                      <div
                        className={`flex items-center gap-3 px-3 py-2 ${
                          isActive
                            ? "bg-cinema-800/70"
                            : "bg-cinema-950/40 hover:bg-cinema-900/60"
                        }`}
                        onMouseEnter={() => setActiveIndex(index)}
                      >
                        <button
                          type="button"
                          onClick={() => openDbMovie(movie)}
                          className="flex flex-1 items-center gap-3 min-w-0 text-left"
                        >
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              width={40}
                              height={60}
                            className="w-10 h-15 object-cover rounded shrink-0 bg-cinema-900"
                          />
                          ) : (
                            <div
                              className="w-10 h-15 rounded shrink-0 bg-cinema-900"
                              aria-hidden
                            />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-stone-100">
                              {movie.title}
                            </span>
                            <span className="block text-xs text-stone-500">
                              {movie.year}
                              {" · "}
                              {formatReleased(movie.released)}
                              {" · "}
                              TMDB {movie.tmdbID}
                            </span>
                          </span>
                        </button>
                        <div className="flex shrink-0 gap-1">
                          <Link
                            to={`/admin/movie/${movie.tmdbID}`}
                            className="text-xs px-2 py-1 rounded border border-cinema-700 text-stone-300 hover:border-cinema-500"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Edit
                          </Link>
                          <Link
                            to={`/admin/movies/${movie.tmdbID}/comps`}
                            className="text-xs px-2 py-1 rounded border border-cinema-700 text-stone-300 hover:border-cinema-500"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Comps
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {hiddenRecentCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllDb(true)}
                className="text-xs text-cinema-400 hover:text-cinema-300"
              >
                Show all {matchedDb.length} movies
              </button>
            )}
            {showAllDb && !query.trim() && matchedDb.length > RECENT_LIMIT && (
              <button
                type="button"
                onClick={() => setShowAllDb(false)}
                className="text-xs text-stone-500 hover:text-stone-300"
              >
                Show newest {RECENT_LIMIT} only
              </button>
            )}
          </section>

          {(tmdbSearched || tmdbResults.length > 0) && (
            <section aria-label="TMDB search results" className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                From TMDB
                {tmdbResults.length > 0 ? ` · ${tmdbResults.length}` : ""}
              </h3>
              {tmdbResults.length === 0 && !tmdbSearching ? (
                <p className="text-sm text-stone-500">No TMDB results.</p>
              ) : (
                <ul className="rounded-xl border border-cinema-800 divide-y divide-cinema-800/80 overflow-hidden">
                  {tmdbResults.map((result) => {
                    const inDb = dbTmdbIds.has(String(result.tmdbID));
                    const rowKey = `tmdb-${result.tmdbID}`;
                    const focusIdx = focusRows.findIndex((r) => r.key === rowKey);
                    const isActive =
                      focusIdx >= 0 && focusIdx === activeIndex;
                    const thumb = posterSrc(result.Poster);
                    return (
                      <li key={result.tmdbID}>
                        <div
                          className={`flex items-center gap-3 px-3 py-2 ${
                            isActive
                              ? "bg-cinema-800/70"
                              : "bg-cinema-950/40 hover:bg-cinema-900/60"
                          }`}
                          onMouseEnter={() => {
                            if (focusIdx >= 0) setActiveIndex(focusIdx);
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              openTmdbMovie(String(result.tmdbID))
                            }
                            className="flex flex-1 items-center gap-3 min-w-0 text-left"
                          >
                            {thumb ? (
                              <img
                                src={thumb}
                                alt=""
                                width={40}
                                height={60}
                                className="w-10 h-15 object-cover rounded shrink-0 bg-cinema-900"
                              />
                            ) : (
                              <div
                                className="w-10 h-15 rounded shrink-0 bg-cinema-900"
                                aria-hidden
                              />
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-stone-100">
                                {result.Title}
                              </span>
                              <span className="block text-xs text-stone-500">
                                {result.Year}
                                {" · "}
                                TMDB {result.tmdbID}
                                {inDb ? " · already in DB" : " · add / open"}
                              </span>
                            </span>
                          </button>
                          <Link
                            to={`/admin/movie/${result.tmdbID}`}
                            className="text-xs px-2 py-1 rounded border border-cinema-700 text-stone-300 hover:border-cinema-500 shrink-0"
                          >
                            {inDb ? "Edit" : "Open"}
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
