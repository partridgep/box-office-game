import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsRotate,
  faCircleCheck,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { library, IconProp } from "@fortawesome/fontawesome-svg-core";

import BoxOfficeHistoryAdmin from "./BoxOfficeHistoryAdmin";
import {
  getBorrowedCategories,
  getCompGroups,
  getMovieCategoryMemberships,
} from "../../services/categories.service";
import { getAllGuessesForMovie } from "../../services/guesses.service";
import {
  deleteMovie,
  getMovieDetails,
  saveMovieDetails,
  updateMovieDetails,
} from "../../services/movies.service";
import { useMovieStore } from "../../store/useMovieStore";
import {
  CompGroup,
  Guess,
  MovieCategoryLink,
  MovieData,
  SavedMovie,
} from "../../types";
import { generateAcronym } from "../../utils/acronym";
import { formatMillions } from "../../utils/formatMoney";

library.add({ faCircleCheck, faPlus, faArrowsRotate });

// @ts-ignore
const checkIcon: IconProp = "fa-solid fa-circle-check";
// @ts-ignore
const plusIcon: IconProp = "fa-solid fa-plus";
// @ts-ignore
const refreshIcon: IconProp = "fa-solid fa-arrows-rotate";

type TabId = "categories" | "guesses" | "boxoffice" | "raw";

const TABS: { id: TabId; label: string }[] = [
  { id: "categories", label: "Categories & comps" },
  { id: "guesses", label: "Guesses" },
  { id: "boxoffice", label: "Box office" },
  { id: "raw", label: "Raw" },
];

function posterSrc(poster: string | null | undefined) {
  if (!poster) return null;
  if (poster.startsWith("http")) return poster;
  return `https://image.tmdb.org/t/p/w185${poster}`;
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

function parseMoney(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number(String(value).replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(n) ? n : null;
}

function displayMoney(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "—";
  return String(value);
}

function categoryLinkLabel(link: MovieCategoryLink) {
  const cat = link.category;
  if (!cat) return link.categoryId;
  return cat.comp_label || cat.lobby_label || cat.slug;
}

function guesserLabel(guess: Guess) {
  if (guess.guess_user?.name) return guess.guess_user.name;
  if (guess.guess_user?.short_id) return `#${guess.guess_user.short_id}`;
  if (guess.user_id) return guess.user_id.slice(0, 8);
  return "Anonymous";
}

function formatGuessDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function MoneyCell({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  const empty = value == null || String(value).trim() === "";
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        empty
          ? "border-rose-500/30 bg-rose-500/5"
          : "border-cinema-800 bg-cinema-950/50"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wider text-stone-500">
        {label}
      </p>
      <p
        className={`text-sm font-medium tabular-nums ${
          empty ? "text-rose-300/80" : "text-stone-100"
        }`}
      >
        {displayMoney(value)}
      </p>
    </div>
  );
}

const MovieDetailsAdmin = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { movies, addMovie, removeMovie } = useMovieStore();
  const [movie, setMovie] = useState<MovieData | SavedMovie | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingAcronym, setIsSavingAcronym] = useState(false);
  const [acronymDraft, setAcronymDraft] = useState("");
  const [tab, setTab] = useState<TabId>("categories");
  const [plotOpen, setPlotOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [memberships, setMemberships] = useState<MovieCategoryLink[]>([]);
  const [borrowed, setBorrowed] = useState<MovieCategoryLink[]>([]);
  const [compGroups, setCompGroups] = useState<CompGroup[]>([]);
  const [compsLoading, setCompsLoading] = useState(false);
  const [compsError, setCompsError] = useState<string | null>(null);

  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [guessesLoading, setGuessesLoading] = useState(false);
  const [guessesError, setGuessesError] = useState<string | null>(null);

  const isInDatabase = useMemo(
    () => (id ? Boolean(movies[id]) : false),
    [id, movies]
  );

  useEffect(() => {
    if (!id) return;

    if (movies[id]) {
      setMovie(movies[id]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const result: MovieData = await getMovieDetails(id);
        if (cancelled) return;
        const fromStore = useMovieStore.getState().movies[id];
        setMovie(fromStore ?? result);
      } catch (error) {
        console.error("Error fetching movie details:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, movies]);

  useEffect(() => {
    if (!movie) return;
    setAcronymDraft(
      movie.acronym?.trim() || generateAcronym(movie.title) || ""
    );
  }, [movie?.id, movie?.acronym, movie?.title]);

  useEffect(() => {
    if (!isInDatabase || !movie?.id) {
      setMemberships([]);
      setBorrowed([]);
      setCompGroups([]);
      setGuesses([]);
      return;
    }

    let cancelled = false;
    setCompsLoading(true);
    setCompsError(null);
    setGuessesLoading(true);
    setGuessesError(null);

    Promise.all([
      getMovieCategoryMemberships(movie.id),
      getBorrowedCategories(movie.id),
      getCompGroups(movie.id),
    ])
      .then(([members, borrowedLinks, groups]) => {
        if (cancelled) return;
        setMemberships(members);
        setBorrowed(borrowedLinks);
        setCompGroups(groups);
      })
      .catch((err) => {
        if (cancelled) return;
        setCompsError(
          err instanceof Error ? err.message : "Failed to load comps"
        );
      })
      .finally(() => {
        if (!cancelled) setCompsLoading(false);
      });

    getAllGuessesForMovie(movie.id, { full: true })
      .then((guessesRes) => {
        if (cancelled) return;
        setGuesses(guessesRes.data ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setGuessesError(
          err instanceof Error ? err.message : "Failed to load guesses"
        );
      })
      .finally(() => {
        if (!cancelled) setGuessesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isInDatabase, movie?.id]);

  const worldwideOpening = useMemo(() => {
    if (!movie) return null;
    const domestic = parseMoney(movie.domesticOpening);
    const international = parseMoney(movie.internationalOpening);
    if (domestic == null || international == null) return null;
    return `$${(domestic + international).toLocaleString()}`;
  }, [movie]);

  const fetchMovieDetails = async () => {
    try {
      const result: MovieData = await getMovieDetails(id!);
      setMovie(result);
      return result;
    } catch (error) {
      console.error("Error fetching movie details:", error);
      setActionError("Failed to fetch movie details");
    }
  };

  const handleMovieExistence = async () => {
    if (!movie) return;
    if (isInDatabase) {
      if (
        !window.confirm(
          `Remove "${movie.title}" from the database? This deletes stored data for this title.`
        )
      ) {
        return;
      }
    }
    setIsSaving(true);
    setActionError(null);
    try {
      if (isInDatabase) {
        await deleteMovie(movie.imdbID);
        removeMovie(String(movie.tmdbID));
        navigate("/admin");
      } else {
        const savedMovie: SavedMovie = (await saveMovieDetails(movie))?.movie;
        addMovie(savedMovie);
        setMovie(savedMovie);
      }
    } catch (error) {
      console.error("Error updating movie:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to update movie"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleMovieUpdate = async () => {
    setIsUpdating(true);
    setActionError(null);
    try {
      const updatedMovieDetails = await fetchMovieDetails();
      if (updatedMovieDetails) {
        const updatedSavedMovie = await updateMovieDetails(updatedMovieDetails);
        addMovie(updatedSavedMovie.movie);
        setMovie(updatedSavedMovie.movie);
      }
    } catch (error) {
      console.error("Error updating movie:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to update data"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveAcronym = async () => {
    if (!movie?.tmdbID || !isInDatabase) return;
    setIsSavingAcronym(true);
    setActionError(null);
    try {
      const next =
        acronymDraft.trim() || generateAcronym(movie.title) || movie.title;
      const result = await updateMovieDetails({
        tmdbID: movie.tmdbID,
        acronym: next,
      });
      const updated = result.movie ?? { ...movie, acronym: next };
      addMovie(updated);
      setMovie(updated);
    } catch (error) {
      console.error("Error saving acronym:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to save acronym"
      );
    } finally {
      setIsSavingAcronym(false);
    }
  };

  if (!movie) {
    return (
      <p className="text-sm text-stone-400 text-left max-w-6xl mx-auto">
        Loading…
      </p>
    );
  }

  const thumb = posterSrc(movie.poster);
  const updatedAt =
    "updatedAt" in movie && movie.updatedAt
      ? new Date(movie.updatedAt).toLocaleString()
      : null;

  return (
    <div className="max-w-6xl mx-auto space-y-5 text-left pb-10">
      <header className="sticky top-0 z-10 -mx-1 px-1 py-3 bg-cinema-950/95 backdrop-blur border-b border-cinema-800/80">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="text-xs text-stone-400 hover:text-white"
            >
              ← Admin
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                {movie.title}
              </h1>
              <span className="text-sm text-stone-500">({movie.year})</span>
              {isInDatabase ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                  <FontAwesomeIcon icon={checkIcon} />
                  In DB
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200">
                  Not in DB
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {id && (
              <Link
                to={`/movie/${id}`}
                className="rounded-lg border border-cinema-700 px-3 py-1.5 text-xs text-stone-200 hover:border-cinema-500"
              >
                Player view
              </Link>
            )}
            {isInDatabase && id && (
              <Link
                to={`/admin/movies/${id}/comps`}
                className="rounded-lg border border-cinema-700 px-3 py-1.5 text-xs text-stone-200 hover:border-cinema-500"
              >
                Manage comps
              </Link>
            )}
          </div>
        </div>
      </header>

      {actionError && (
        <div
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          role="alert"
        >
          {actionError}
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-[120px_minmax(0,1fr)] gap-5">
        <div className="space-y-3">
          {thumb ? (
            <img
              src={thumb}
              alt=""
              className="w-30 rounded-lg border border-cinema-800 bg-cinema-900 object-cover"
            />
          ) : (
            <div
              className="w-30 aspect-2/3 rounded-lg border border-cinema-800 bg-cinema-900"
              aria-hidden
            />
          )}
          <div className="flex flex-col gap-2 w-30">
            {isInDatabase ? (
              <button
                type="button"
                onClick={() => void handleMovieUpdate()}
                disabled={isUpdating}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-cinema-600 hover:bg-cinema-500 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-white"
              >
                <FontAwesomeIcon icon={refreshIcon} spin={isUpdating} />
                {isUpdating ? "Updating…" : "Update data"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleMovieExistence()}
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-cinema-600 hover:bg-cinema-500 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-white"
              >
                <FontAwesomeIcon icon={plusIcon} />
                {isSaving ? "Saving…" : "Add to DB"}
              </button>
            )}
            {isInDatabase && (
              <button
                type="button"
                onClick={() => void handleMovieExistence()}
                disabled={isSaving}
                className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
              >
                {isSaving ? "Removing…" : "Remove from DB"}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          <div className="text-sm text-stone-400 space-y-1">
            <p>
              <span className="text-stone-500">Released</span>{" "}
              {formatReleased(movie.released)}
              {movie.rated ? (
                <>
                  {" · "}
                  <span className="text-stone-500">Rated</span> {movie.rated}
                </>
              ) : null}
            </p>
            <p className="truncate">
              <span className="text-stone-500">Genre</span>{" "}
              {movie.genre || "—"}
            </p>
            <p className="truncate">
              <span className="text-stone-500">Director</span>{" "}
              {movie.director || "—"}
            </p>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
              <a
                href={`https://www.themoviedb.org/movie/${movie.tmdbID}`}
                target="_blank"
                rel="noreferrer"
                className="text-cinema-400 hover:text-cinema-300 hover:underline underline-offset-2"
              >
                TMDB {movie.tmdbID}
              </a>
              <a
                href={`https://www.imdb.com/title/${movie.imdbID}/`}
                target="_blank"
                rel="noreferrer"
                className="text-cinema-400 hover:text-cinema-300 hover:underline underline-offset-2"
              >
                IMDb {movie.imdbID}
              </a>
              {movie.bomReleaseId ? (
                <a
                  href={`https://www.boxofficemojo.com/release/${movie.bomReleaseId}/weekly/`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cinema-400 hover:text-cinema-300 hover:underline underline-offset-2"
                >
                  BOM {movie.bomReleaseId}
                </a>
              ) : null}
              {updatedAt ? <span>Updated {updatedAt}</span> : null}
            </p>
          </div>

          {movie.plot && (
            <div>
              <button
                type="button"
                onClick={() => setPlotOpen((o) => !o)}
                aria-expanded={plotOpen}
                className="text-xs text-cinema-400 hover:text-cinema-300"
              >
                {plotOpen ? "Hide plot" : "Show plot"}
              </button>
              {plotOpen && (
                <p className="mt-2 text-sm text-stone-300 leading-relaxed">
                  {movie.plot}
                </p>
              )}
            </div>
          )}

          {isInDatabase && (
            <div className="rounded-xl border border-cinema-800 bg-cinema-900/50 p-3 flex flex-wrap items-end gap-2">
              <label className="space-y-1 text-sm flex-1 min-w-40">
                <span className="text-stone-400 text-xs uppercase tracking-wider">
                  Acronym
                </span>
                <input
                  id="movie-acronym"
                  type="text"
                  value={acronymDraft}
                  onChange={(e) => setAcronymDraft(e.target.value)}
                  placeholder={generateAcronym(movie.title) || movie.title}
                  className="w-full rounded-lg bg-cinema-950 border border-cinema-800 px-3 py-1.5 text-stone-100 outline-none focus:border-cinema-500"
                />
              </label>
              <button
                type="button"
                onClick={() => void handleSaveAcronym()}
                disabled={isSavingAcronym}
                className="rounded-lg bg-cinema-600 hover:bg-cinema-500 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white"
              >
                {isSavingAcronym ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setAcronymDraft(generateAcronym(movie.title) || movie.title)
                }
                className="rounded-lg border border-cinema-700 px-3 py-1.5 text-xs text-stone-300 hover:border-cinema-500"
              >
                Reset
              </button>
            </div>
          )}

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Money & scores
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              <MoneyCell label="Domestic opening" value={movie.domesticOpening} />
              <MoneyCell
                label="International opening"
                value={movie.internationalOpening}
              />
              <MoneyCell label="Worldwide opening" value={worldwideOpening} />
              <MoneyCell label="Domestic gross" value={movie.domesticGross} />
              <MoneyCell
                label="International gross"
                value={movie.internationalGross}
              />
              <MoneyCell label="Worldwide gross" value={movie.worldwideGross} />
              <MoneyCell label="Budget" value={movie.budget} />
              <MoneyCell
                label="Rotten Tomatoes"
                value={movie.rottenTomatoesScore}
              />
              <MoneyCell
                label="IMDb"
                value={
                  movie.imdbRating != null ? String(movie.imdbRating) : null
                }
              />
            </div>
          </div>
        </div>
      </section>

      <div
        role="tablist"
        aria-label="Movie admin sections"
        className="flex flex-wrap gap-1 border-b border-cinema-800 pb-px"
      >
        {TABS.map((item) => {
          const disabled =
            (item.id === "boxoffice" ||
              item.id === "categories" ||
              item.id === "guesses") &&
            !isInDatabase;
          const selected = tab === item.id;
          const label =
            item.id === "guesses" && isInDatabase && !guessesLoading
              ? `Guesses (${guesses.length})`
              : item.label;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={disabled}
              onClick={() => setTab(item.id)}
              className={`rounded-t-lg px-3 py-2 text-xs font-medium transition-colors ${
                selected
                  ? "bg-cinema-900 text-white border border-b-transparent border-cinema-800 -mb-px"
                  : "text-stone-400 hover:text-stone-200"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="min-h-48">
        {tab === "categories" && (
          <div className="space-y-5">
            {!isInDatabase ? (
              <p className="text-sm text-stone-500">
                Add this movie to the database to manage categories and comps.
              </p>
            ) : compsLoading ? (
              <p className="text-sm text-stone-500">Loading…</p>
            ) : compsError ? (
              <p className="text-sm text-rose-300">{compsError}</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-stone-400">
                    {compGroups.length} comp group
                    {compGroups.length === 1 ? "" : "s"} on the player page
                  </p>
                  {id && (
                    <Link
                      to={`/admin/movies/${id}/comps`}
                      className="rounded-lg bg-cinema-600 hover:bg-cinema-500 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Edit comps →
                    </Link>
                  )}
                </div>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Memberships
                  </h3>
                  {memberships.length === 0 ? (
                    <p className="text-sm text-stone-500">None</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {memberships.map((link) => (
                        <li key={link.id}>
                          <Link
                            to={`/admin/categories/${link.categoryId}`}
                            className="inline-flex items-center rounded-lg border border-cinema-700 bg-cinema-900/60 px-2.5 py-1 text-xs text-stone-200 hover:border-cinema-500"
                          >
                            {categoryLinkLabel(link)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Borrowed
                  </h3>
                  {borrowed.length === 0 ? (
                    <p className="text-sm text-stone-500">None</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {borrowed.map((link) => (
                        <li key={link.id}>
                          <Link
                            to={`/admin/categories/${link.categoryId}`}
                            className="inline-flex items-center rounded-lg border border-dashed border-cinema-700 bg-cinema-950/40 px-2.5 py-1 text-xs text-stone-300 hover:border-cinema-500"
                          >
                            {categoryLinkLabel(link)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Comp groups
                  </h3>
                  {compGroups.length === 0 ? (
                    <p className="text-sm text-stone-500">No groups yet</p>
                  ) : (
                    <ul className="rounded-xl border border-cinema-800 divide-y divide-cinema-800/80 overflow-hidden">
                      {compGroups.map((group) => (
                        <li
                          key={group.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 bg-cinema-950/40"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-stone-100 truncate">
                              {group.label || "Untitled"}
                            </p>
                            <p className="text-xs text-stone-500">
                              {group.movies.length} movie
                              {group.movies.length === 1 ? "" : "s"}
                              {group.source ? ` · ${group.source}` : ""}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        )}

        {tab === "guesses" && (
          <div className="space-y-3">
            {!isInDatabase ? (
              <p className="text-sm text-stone-500">
                Add this movie to the database to see guesses.
              </p>
            ) : guessesLoading ? (
              <p className="text-sm text-stone-500">Loading guesses…</p>
            ) : guessesError ? (
              <p className="text-sm text-rose-300">{guessesError}</p>
            ) : guesses.length === 0 ? (
              <p className="text-sm text-stone-500">No guesses yet.</p>
            ) : (
              <>
                <p className="text-sm text-stone-400">
                  {guesses.length} guess{guesses.length === 1 ? "" : "es"} ·
                  newest first
                </p>
                <div className="overflow-x-auto rounded-xl border border-cinema-800">
                  <table className="w-full min-w-180 border-collapse text-left text-xs tabular-nums">
                    <thead>
                      <tr className="border-b border-cinema-800 bg-cinema-900/80 text-stone-400">
                        <th className="px-3 py-2 font-medium">Player</th>
                        <th className="px-3 py-2 font-medium text-right">
                          Dom open
                        </th>
                        <th className="px-3 py-2 font-medium text-right">
                          Int open
                        </th>
                        <th className="px-3 py-2 font-medium text-right">
                          Dom final
                        </th>
                        <th className="px-3 py-2 font-medium text-right">
                          Int final
                        </th>
                        <th className="px-3 py-2 font-medium text-right">RT</th>
                        <th className="px-3 py-2 font-medium">Submitted</th>
                        <th className="px-3 py-2 font-medium">Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guesses.map((guess) => (
                        <tr
                          key={guess.id}
                          className="border-b border-cinema-800/70 last:border-0 hover:bg-cinema-900/40"
                        >
                          <td className="px-3 py-2 text-stone-100">
                            {guesserLabel(guess)}
                            {guess.guess_user?.short_id ? (
                              <span className="ml-1.5 text-stone-500">
                                · {guess.guess_user.short_id}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-right text-stone-200">
                            {formatMillions(guess.domestic_opening)}
                          </td>
                          <td className="px-3 py-2 text-right text-stone-200">
                            {formatMillions(guess.international_opening)}
                          </td>
                          <td className="px-3 py-2 text-right text-stone-200">
                            {formatMillions(guess.final_domestic)}
                          </td>
                          <td className="px-3 py-2 text-right text-stone-200">
                            {formatMillions(guess.final_international)}
                          </td>
                          <td className="px-3 py-2 text-right text-stone-200">
                            {guess.rotten_tomatoes_score != null
                              ? `${guess.rotten_tomatoes_score}%`
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-stone-400 whitespace-nowrap">
                            {formatGuessDate(guess.createdAt)}
                          </td>
                          <td className="px-3 py-2 text-stone-500 font-mono">
                            {guess.id.slice(0, 8)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "boxoffice" && (
          <div>
            {isInDatabase && movie.id ? (
              <BoxOfficeHistoryAdmin
                movieId={movie.id}
                bomReleaseId={movie.bomReleaseId}
              />
            ) : (
              <p className="text-sm text-stone-500">
                Add this movie to the database to load box office history.
              </p>
            )}
          </div>
        )}

        {tab === "raw" && (
          <div className="rounded-xl border border-cinema-800 bg-cinema-950 overflow-x-auto">
            <pre className="p-4 text-xs text-stone-300 whitespace-pre-wrap wrap-break-word">
              {JSON.stringify(movie, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDetailsAdmin;
