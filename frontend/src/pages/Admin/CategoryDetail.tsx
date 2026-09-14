import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getCategory,
  setCategoryMovies,
  updateCategory,
} from "../../services/categories.service";
import { getSavedMovies } from "../../services/movies.service";
import { Category, MovieData } from "../../types";

export default function CategoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | null>(null);
  const [allMovies, setAllMovies] = useState<MovieData[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [lobbyLabel, setLobbyLabel] = useState("");
  const [compLabel, setCompLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [cat, movies] = await Promise.all([
          getCategory(id!),
          getSavedMovies(),
        ]);
        setCategory(cat);
        setAllMovies(movies);
        setLobbyLabel(cat.lobby_label || "");
        setCompLabel(cat.comp_label || "");
        setSlug(cat.slug);
        setSortOrder(cat.sort_order);
        setIsActive(cat.is_active);
        setMemberIds((cat.movies || []).map((m) => m.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load category");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const movieById = useMemo(() => {
    const map = new Map<string, MovieData>();
    for (const movie of allMovies) {
      if (movie.id) map.set(movie.id, movie);
    }
    return map;
  }, [allMovies]);

  const filteredMovies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allMovies
      .filter((m) => m.id)
      .filter((m) =>
        !q
          ? true
          : m.title.toLowerCase().includes(q) ||
            String(m.year).includes(q)
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [allMovies, search]);

  function toggleMember(movieId: string) {
    setMemberIds((prev) =>
      prev.includes(movieId)
        ? prev.filter((id) => id !== movieId)
        : [...prev, movieId]
    );
  }

  function moveMember(movieId: string, direction: -1 | 1) {
    setMemberIds((prev) => {
      const index = prev.indexOf(movieId);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateCategory(id, {
        slug,
        lobby_label: lobbyLabel.trim() || null,
        comp_label: compLabel.trim() || null,
        sort_order: sortOrder,
        is_active: isActive,
      });
      const withMovies = await setCategoryMovies(id, memberIds);
      setCategory(withMovies);
      setLobbyLabel(updated.lobby_label || "");
      setCompLabel(updated.comp_label || "");
      setSlug(updated.slug);
      setMessage("Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-stone-400 text-sm">Loading category...</p>;
  }

  if (!category) {
    return (
      <div className="space-y-3 text-left">
        <p className="text-rose-300">{error || "Category not found"}</p>
        <Link to="/admin/categories" className="text-sm text-cinema-400 hover:underline">
          Back to categories
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-left">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            to="/admin/categories"
            className="text-xs text-stone-400 hover:text-white"
          >
            ← Categories
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">{category.slug}</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-sm text-stone-400 hover:text-white"
        >
          Lobby
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

      <form onSubmit={handleSave} className="space-y-8">
        <section className="rounded-2xl border border-cinema-800 bg-cinema-900/60 p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-300">
            Labels
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 text-sm">
              <span className="text-stone-400">Slug</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2 text-stone-100 outline-none focus:border-cinema-500"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-stone-400">Sort order</span>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2 text-stone-100 outline-none focus:border-cinema-500"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-stone-400">Lobby label</span>
              <input
                value={lobbyLabel}
                onChange={(e) => setLobbyLabel(e.target.value)}
                className="w-full rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2 text-stone-100 outline-none focus:border-cinema-500"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-stone-400">Comp label</span>
              <input
                value={compLabel}
                onChange={(e) => setCompLabel(e.target.value)}
                className="w-full rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2 text-stone-100 outline-none focus:border-cinema-500"
              />
            </label>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-stone-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active
          </label>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-cinema-800 bg-cinema-900/60 p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-300">
              Members ({memberIds.length})
            </h2>
            {memberIds.length === 0 ? (
              <p className="text-sm text-stone-500">No movies selected.</p>
            ) : (
              <ul className="space-y-2">
                {memberIds.map((movieId, index) => {
                  const movie = movieById.get(movieId);
                  return (
                    <li
                      key={movieId}
                      className="flex items-center justify-between gap-2 rounded-lg border border-cinema-800 bg-cinema-950/60 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-stone-100 truncate">
                          {movie?.title || movieId}
                        </p>
                        <p className="text-xs text-stone-500">
                          {movie?.year} · #{index + 1}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveMember(movieId, -1)}
                          className="text-xs px-2 py-1 rounded border border-cinema-700 text-stone-300"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveMember(movieId, 1)}
                          className="text-xs px-2 py-1 rounded border border-cinema-700 text-stone-300"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleMember(movieId)}
                          className="text-xs px-2 py-1 rounded border border-rose-500/40 text-rose-300"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-cinema-800 bg-cinema-900/60 p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-300">
              Add from saved movies
            </h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or year..."
              className="w-full rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-cinema-500"
            />
            <ul className="max-h-96 overflow-y-auto space-y-1">
              {filteredMovies.map((movie) => {
                const selected = movie.id ? memberIds.includes(movie.id) : false;
                return (
                  <li key={movie.id || movie.imdbID}>
                    <button
                      type="button"
                      onClick={() => movie.id && toggleMember(movie.id)}
                      className={`w-full text-left rounded-lg px-3 py-2 text-sm border transition-colors ${
                        selected
                          ? "border-theater-gold/40 bg-theater-gold/10 text-theater-gold"
                          : "border-cinema-800 bg-cinema-950/40 text-stone-200 hover:border-cinema-600"
                      }`}
                    >
                      {movie.title}{" "}
                      <span className="text-stone-500">({movie.year})</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-cinema-600 hover:bg-cinema-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5"
        >
          {saving ? "Saving..." : "Save category"}
        </button>
      </form>
    </div>
  );
}
