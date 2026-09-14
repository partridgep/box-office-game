import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getCategories,
  getCompGroups,
  replaceCompGroups,
} from "../../services/categories.service";
import { getSavedMovies } from "../../services/movies.service";
import {
  Category,
  CompGroupInput,
  MovieData,
} from "../../types";

type DraftItem = {
  movieId: string;
  reason: string;
};

type DraftGroup = {
  key: string;
  categoryId: string;
  label: string;
  items: DraftItem[];
};

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function MovieCompsAdmin() {
  const { tmdbID } = useParams<{ tmdbID: string }>();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<MovieData | null>(null);
  const [allMovies, setAllMovies] = useState<MovieData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<DraftGroup[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!tmdbID) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [movies, cats] = await Promise.all([
          getSavedMovies(),
          getCategories(),
        ]);
        setAllMovies(movies);
        setCategories(cats);

        const found =
          movies.find((m) => String(m.tmdbID) === String(tmdbID)) || null;
        setSubject(found);

        if (found?.id) {
          const existing = await getCompGroups(found.id, { manualOnly: true });
          setGroups(
            existing.map((group) => ({
              key: group.id || newKey(),
              categoryId: group.categoryId || "",
              label: group.label || "",
              items: group.movies.map((movie) => ({
                movieId: movie.id,
                reason: movie.reason || "",
              })),
            }))
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load comps");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tmdbID]);

  const movieById = useMemo(() => {
    const map = new Map<string, MovieData>();
    for (const movie of allMovies) {
      if (movie.id) map.set(movie.id, movie);
    }
    return map;
  }, [allMovies]);

  const searchableMovies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allMovies
      .filter((m) => m.id && m.id !== subject?.id)
      .filter((m) =>
        !q
          ? true
          : m.title.toLowerCase().includes(q) || String(m.year).includes(q)
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [allMovies, search, subject?.id]);

  function addGroup() {
    setGroups((prev) => [
      ...prev,
      { key: newKey(), categoryId: "", label: "", items: [] },
    ]);
  }

  function updateGroup(key: string, patch: Partial<DraftGroup>) {
    setGroups((prev) =>
      prev.map((group) => (group.key === key ? { ...group, ...patch } : group))
    );
  }

  function removeGroup(key: string) {
    setGroups((prev) => prev.filter((group) => group.key !== key));
  }

  function addItem(groupKey: string, movieId: string) {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.key !== groupKey) return group;
        if (group.items.some((item) => item.movieId === movieId)) return group;
        return {
          ...group,
          items: [...group.items, { movieId, reason: "" }],
        };
      })
    );
  }

  function updateItemReason(groupKey: string, movieId: string, reason: string) {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.key !== groupKey) return group;
        return {
          ...group,
          items: group.items.map((item) =>
            item.movieId === movieId ? { ...item, reason } : item
          ),
        };
      })
    );
  }

  function removeItem(groupKey: string, movieId: string) {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.key !== groupKey) return group;
        return {
          ...group,
          items: group.items.filter((item) => item.movieId !== movieId),
        };
      })
    );
  }

  function moveItem(groupKey: string, movieId: string, direction: -1 | 1) {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.key !== groupKey) return group;
        const index = group.items.findIndex((item) => item.movieId === movieId);
        if (index < 0) return group;
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= group.items.length) return group;
        const items = [...group.items];
        const [item] = items.splice(index, 1);
        items.splice(nextIndex, 0, item);
        return { ...group, items };
      })
    );
  }

  async function handleSave() {
    if (!subject?.id) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload: CompGroupInput[] = groups.map((group, index) => ({
        categoryId: group.categoryId || null,
        label: group.label.trim() || null,
        sortOrder: index,
        items: group.items.map((item, itemIndex) => ({
          movieId: item.movieId,
          sortOrder: itemIndex,
          reason: item.reason.trim() || null,
        })),
      }));
      const saved = await replaceCompGroups(subject.id, payload);
      setGroups(
        saved.map((group) => ({
          key: group.id || newKey(),
          categoryId: group.categoryId || "",
          label: group.label || "",
          items: group.movies.map((movie) => ({
            movieId: movie.id,
            reason: movie.reason || "",
          })),
        }))
      );
      setMessage("Comp groups saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save comps");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-stone-400 text-sm">Loading comps...</p>;
  }

  if (!subject?.id) {
    return (
      <div className="space-y-3 text-left">
        <p className="text-rose-300">
          Movie with TMDB id {tmdbID} is not in the database.
        </p>
        <Link to="/old" className="text-sm text-cinema-400 hover:underline">
          Back to old search
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-left">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to={`/old/movie/${tmdbID}`}
            className="text-xs text-stone-400 hover:text-white"
          >
            ← Movie admin
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">
            Comps · {subject.title}
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Curate extra comps here. Movies that share a category with this title
            already appear automatically on the movie page (using the category&apos;s
            comp label).
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin/categories")}
          className="text-sm text-stone-400 hover:text-white"
        >
          Categories
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={addGroup}
          className="rounded-xl border border-cinema-700 px-4 py-2 text-sm text-stone-200 hover:border-cinema-500"
        >
          Add group
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-cinema-600 hover:bg-cinema-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white"
        >
          {saving ? "Saving..." : "Save comps"}
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-stone-500">
          No comp groups yet. Add a group to get started.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((group, groupIndex) => (
            <section
              key={group.key}
              className="rounded-2xl border border-cinema-800 bg-cinema-900/60 p-5 space-y-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-300">
                  Group {groupIndex + 1}
                </h2>
                <button
                  type="button"
                  onClick={() => removeGroup(group.key)}
                  className="text-xs text-rose-300 hover:text-rose-200"
                >
                  Remove group
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1 text-sm">
                  <span className="text-stone-400">Category (optional)</span>
                  <select
                    value={group.categoryId}
                    onChange={(e) => {
                      const categoryId = e.target.value;
                      const cat = categories.find((c) => c.id === categoryId);
                      updateGroup(group.key, {
                        categoryId,
                        label:
                          group.label ||
                          cat?.comp_label ||
                          cat?.lobby_label ||
                          "",
                      });
                    }}
                    className="w-full rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2 text-stone-100 outline-none focus:border-cinema-500"
                  >
                    <option value="">None</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.comp_label || cat.lobby_label || cat.slug}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-stone-400">Label override</span>
                  <input
                    value={group.label}
                    onChange={(e) =>
                      updateGroup(group.key, { label: e.target.value })
                    }
                    placeholder="Previous Avengers Movies"
                    className="w-full rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2 text-stone-100 outline-none focus:border-cinema-500"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs uppercase tracking-wider text-stone-500">
                  Comp movies
                </h3>
                {group.items.length === 0 ? (
                  <p className="text-sm text-stone-500">No comps in this group.</p>
                ) : (
                  <ul className="space-y-2">
                    {group.items.map((item) => {
                      const movie = movieById.get(item.movieId);
                      return (
                        <li
                          key={item.movieId}
                          className="rounded-lg border border-cinema-800 bg-cinema-950/50 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-stone-100">
                              {movie?.title || item.movieId}{" "}
                              <span className="text-stone-500">
                                ({movie?.year})
                              </span>
                            </p>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  moveItem(group.key, item.movieId, -1)
                                }
                                className="text-xs px-2 py-1 rounded border border-cinema-700"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  moveItem(group.key, item.movieId, 1)
                                }
                                className="text-xs px-2 py-1 rounded border border-cinema-700"
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  removeItem(group.key, item.movieId)
                                }
                                className="text-xs px-2 py-1 rounded border border-rose-500/40 text-rose-300"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <input
                            value={item.reason}
                            onChange={(e) =>
                              updateItemReason(
                                group.key,
                                item.movieId,
                                e.target.value
                              )
                            }
                            placeholder="Optional reason"
                            className="w-full rounded-lg bg-cinema-950 border border-cinema-800 px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-cinema-500"
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-2 border-t border-cinema-800 pt-4">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search movies to add..."
                  className="w-full rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-cinema-500"
                />
                <ul className="max-h-40 overflow-y-auto space-y-1">
                  {searchableMovies.slice(0, 20).map((movie) => (
                    <li key={movie.id}>
                      <button
                        type="button"
                        onClick={() => movie.id && addItem(group.key, movie.id)}
                        className="w-full text-left rounded-lg px-3 py-1.5 text-sm border border-cinema-800 text-stone-300 hover:border-cinema-600"
                      >
                        {movie.title} ({movie.year})
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
