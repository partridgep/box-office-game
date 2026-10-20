import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createCategory,
  getBorrowedCategories,
  getCategories,
  getCompGroups,
  getMovieCategoryMemberships,
  replaceCompGroups,
  setBorrowedCategories,
  setMovieCategoryMemberships,
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

function categoryLabel(cat: Category) {
  return cat.comp_label || cat.lobby_label || cat.slug;
}

export default function MovieCompsAdmin() {
  const { tmdbID } = useParams<{ tmdbID: string }>();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<MovieData | null>(null);
  const [allMovies, setAllMovies] = useState<MovieData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<DraftGroup[]>([]);
  const [memberCategoryIds, setMemberCategoryIds] = useState<string[]>([]);
  const [memberAddId, setMemberAddId] = useState("");
  const [borrowedCategoryIds, setBorrowedCategoryIds] = useState<string[]>([]);
  const [borrowAddId, setBorrowAddId] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newLobbyLabel, setNewLobbyLabel] = useState("");
  const [newCompLabel, setNewCompLabel] = useState("");
  const [newDisplayInLobby, setNewDisplayInLobby] = useState(true);
  const [creatingCategory, setCreatingCategory] = useState(false);
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
          movies.find((m: MovieData) => String(m.tmdbID) === String(tmdbID)) ||
          null;
        setSubject(found);

        if (found?.id) {
          const [existing, memberships, borrowed] = await Promise.all([
            getCompGroups(found.id, { manualOnly: true }),
            getMovieCategoryMemberships(found.id),
            getBorrowedCategories(found.id),
          ]);
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
          setMemberCategoryIds(memberships.map((link) => link.categoryId));
          setBorrowedCategoryIds(borrowed.map((link) => link.categoryId));
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

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const cat of categories) map.set(cat.id, cat);
    return map;
  }, [categories]);

  const joinableCategories = useMemo(
    () =>
      categories
        .filter((cat) => !memberCategoryIds.includes(cat.id))
        .sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b))),
    [categories, memberCategoryIds]
  );

  const borrowableCategories = useMemo(
    () =>
      categories
        .filter(
          (cat) =>
            !borrowedCategoryIds.includes(cat.id) &&
            !memberCategoryIds.includes(cat.id)
        )
        .sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b))),
    [categories, borrowedCategoryIds, memberCategoryIds]
  );

  function addMemberCategory() {
    if (!memberAddId) return;
    setMemberCategoryIds((prev) =>
      prev.includes(memberAddId) ? prev : [...prev, memberAddId]
    );
    // Membership supersedes borrow for the same category.
    setBorrowedCategoryIds((prev) => prev.filter((id) => id !== memberAddId));
    setMemberAddId("");
  }

  function removeMemberCategory(categoryId: string) {
    setMemberCategoryIds((prev) => prev.filter((id) => id !== categoryId));
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newLobbyLabel.trim() && !newCompLabel.trim()) {
      setError("Provide a lobby label and/or comp label");
      return;
    }
    setCreatingCategory(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createCategory({
        lobby_label: newLobbyLabel.trim() || null,
        comp_label: newCompLabel.trim() || null,
        display_in_lobby: newDisplayInLobby,
      });
      setCategories((prev) =>
        [...prev, created].sort(
          (a, b) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
            categoryLabel(a).localeCompare(categoryLabel(b))
        )
      );
      setMemberCategoryIds((prev) =>
        prev.includes(created.id) ? prev : [...prev, created.id]
      );
      setBorrowedCategoryIds((prev) =>
        prev.filter((id) => id !== created.id)
      );
      setNewLobbyLabel("");
      setNewCompLabel("");
      setNewDisplayInLobby(true);
      setShowNewCategory(false);
      setMessage(
        `Created "${categoryLabel(created)}" and added this movie as a member (save to persist membership)`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create category"
      );
    } finally {
      setCreatingCategory(false);
    }
  }

  function addBorrowedCategory() {
    if (!borrowAddId) return;
    if (memberCategoryIds.includes(borrowAddId)) {
      setBorrowAddId("");
      return;
    }
    setBorrowedCategoryIds((prev) =>
      prev.includes(borrowAddId) ? prev : [...prev, borrowAddId]
    );
    setBorrowAddId("");
  }

  function removeBorrowedCategory(categoryId: string) {
    setBorrowedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
  }

  function moveBorrowedCategory(categoryId: string, direction: -1 | 1) {
    setBorrowedCategoryIds((prev) => {
      const index = prev.indexOf(categoryId);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

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
      // Memberships first so borrowed save can drop overlapping category ids.
      const memberships = await setMovieCategoryMemberships(
        subject.id,
        memberCategoryIds
      );
      setMemberCategoryIds(memberships.map((link) => link.categoryId));

      const [saved, borrowed] = await Promise.all([
        replaceCompGroups(subject.id, payload),
        setBorrowedCategories(subject.id, borrowedCategoryIds),
      ]);
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
      setBorrowedCategoryIds(borrowed.map((link) => link.categoryId));
      setMessage("Comps saved");
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
        <Link to="/admin" className="text-sm text-cinema-400 hover:underline">
          Back to admin
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-left">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to={`/admin/movie/${tmdbID}`}
            className="text-xs text-stone-400 hover:text-white"
          >
            ← Movie admin
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">
            Comps · {subject.title}
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Join categories for lobby + peer comps, borrow categories for comps
            only, or curate manual groups below.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="text-sm text-stone-400 hover:text-white"
        >
          Admin
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

      <section
        className="rounded-2xl border border-cinema-800 bg-cinema-900/60 p-5 space-y-4"
        aria-labelledby="member-categories-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="member-categories-heading"
              className="text-sm font-semibold uppercase tracking-wider text-stone-300"
            >
              Category memberships
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              Add this movie to a category. It appears in that lobby section (when
              enabled) and other members show as comps here. Order within a
              category is edited on the category admin page.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewCategory((open) => !open)}
            aria-expanded={showNewCategory}
            className="rounded-xl border border-cinema-700 px-4 py-2 text-sm text-stone-200 hover:border-cinema-500"
          >
            {showNewCategory ? "Cancel" : "New Category"}
          </button>
        </div>

        {showNewCategory && (
          <form
            onSubmit={handleCreateCategory}
            className="rounded-xl border border-cinema-800 bg-cinema-950/50 p-4 space-y-3"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Create category
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 text-sm">
                <span className="text-stone-400">Lobby label</span>
                <input
                  value={newLobbyLabel}
                  onChange={(e) => setNewLobbyLabel(e.target.value)}
                  placeholder="MCU movies"
                  className="w-full rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2 text-stone-100 outline-none focus:border-cinema-500"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-stone-400">Comp label</span>
                <input
                  value={newCompLabel}
                  onChange={(e) => setNewCompLabel(e.target.value)}
                  placeholder="Recent MCU movies"
                  className="w-full rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2 text-stone-100 outline-none focus:border-cinema-500"
                />
              </label>
            </div>
            <label className="inline-flex items-start gap-2 text-sm text-stone-300">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={newDisplayInLobby}
                onChange={(e) => setNewDisplayInLobby(e.target.checked)}
              />
              <span>
                Display in Lobby
                <span className="block text-xs text-stone-500 font-normal">
                  Off hides this section in the lobby; comps stay active.
                </span>
              </span>
            </label>
            <button
              type="submit"
              disabled={creatingCategory}
              className="rounded-xl bg-cinema-600 hover:bg-cinema-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white"
            >
              {creatingCategory ? "Creating..." : "Create & add membership"}
            </button>
          </form>
        )}

        {memberCategoryIds.length === 0 ? (
          <p className="text-sm text-stone-500">Not a member of any category.</p>
        ) : (
          <ul className="space-y-2">
            {memberCategoryIds.map((categoryId) => {
              const cat = categoryById.get(categoryId);
              const label = cat ? categoryLabel(cat) : categoryId;
              return (
                <li
                  key={categoryId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-cinema-800 bg-cinema-950/50 px-3 py-2"
                >
                  <p className="text-sm text-stone-100">
                    {label}
                    {cat?.slug ? (
                      <span className="text-stone-500"> · {cat.slug}</span>
                    ) : null}
                  </p>
                  <div className="flex gap-1">
                    <Link
                      to={`/admin/categories/${categoryId}`}
                      className="text-xs px-2 py-1 rounded border border-cinema-700 text-stone-200 hover:border-cinema-500"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeMemberCategory(categoryId)}
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

        <div className="flex flex-col sm:flex-row gap-2">
          <label className="flex-1 space-y-1 text-sm">
            <span className="sr-only">Category to join</span>
            <select
              value={memberAddId}
              onChange={(e) => setMemberAddId(e.target.value)}
              className="w-full rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2 text-stone-100 outline-none focus:border-cinema-500"
            >
              <option value="">Select a category…</option>
              {joinableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {categoryLabel(cat)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={addMemberCategory}
            disabled={!memberAddId}
            className="rounded-xl border border-cinema-700 px-4 py-2 text-sm text-stone-200 hover:border-cinema-500 disabled:opacity-50"
          >
            Add to category
          </button>
        </div>
      </section>

      <section
        className="rounded-2xl border border-cinema-800 bg-cinema-900/60 p-5 space-y-4"
        aria-labelledby="borrowed-categories-heading"
      >
        <div>
          <h2
            id="borrowed-categories-heading"
            className="text-sm font-semibold uppercase tracking-wider text-stone-300"
          >
            Borrowed categories
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Show another category&apos;s members as comps on this movie without
            joining that category (so it stays out of their lobby section and
            peer lists).
          </p>
        </div>

        {borrowedCategoryIds.length === 0 ? (
          <p className="text-sm text-stone-500">No borrowed categories yet.</p>
        ) : (
          <ul className="space-y-2">
            {borrowedCategoryIds.map((categoryId) => {
              const cat = categoryById.get(categoryId);
              const label = cat ? categoryLabel(cat) : categoryId;
              return (
                <li
                  key={categoryId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-cinema-800 bg-cinema-950/50 px-3 py-2"
                >
                  <p className="text-sm text-stone-100">
                    {label}
                    {cat?.slug ? (
                      <span className="text-stone-500"> · {cat.slug}</span>
                    ) : null}
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveBorrowedCategory(categoryId, -1)}
                      className="text-xs px-2 py-1 rounded border border-cinema-700"
                      aria-label={`Move ${label} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBorrowedCategory(categoryId, 1)}
                      className="text-xs px-2 py-1 rounded border border-cinema-700"
                      aria-label={`Move ${label} down`}
                    >
                      ↓
                    </button>
                    <Link
                      to={`/admin/categories/${categoryId}`}
                      className="text-xs px-2 py-1 rounded border border-cinema-700 text-stone-200 hover:border-cinema-500"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeBorrowedCategory(categoryId)}
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

        <div className="flex flex-col sm:flex-row gap-2">
          <label className="flex-1 space-y-1 text-sm">
            <span className="sr-only">Category to borrow</span>
            <select
              value={borrowAddId}
              onChange={(e) => setBorrowAddId(e.target.value)}
              className="w-full rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2 text-stone-100 outline-none focus:border-cinema-500"
            >
              <option value="">Select a category…</option>
              {borrowableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {categoryLabel(cat)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={addBorrowedCategory}
            disabled={!borrowAddId}
            className="rounded-xl border border-cinema-700 px-4 py-2 text-sm text-stone-200 hover:border-cinema-500 disabled:opacity-50"
          >
            Add borrowed category
          </button>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-cinema-600 hover:bg-cinema-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white"
        >
          {saving ? "Saving..." : "Save comps"}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-300">
          Manual groups
        </h2>
        <button
          type="button"
          onClick={addGroup}
          className="rounded-xl border border-cinema-700 px-4 py-2 text-sm text-stone-200 hover:border-cinema-500"
        >
          Add group
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
