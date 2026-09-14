import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../../services/categories.service";
import { Category } from "../../types";

export default function CategoryList() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lobbyLabel, setLobbyLabel] = useState("");
  const [compLabel, setCompLabel] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!lobbyLabel.trim() && !compLabel.trim()) {
      setError("Provide a lobby label and/or comp label");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createCategory({
        lobby_label: lobbyLabel.trim() || null,
        comp_label: compLabel.trim() || null,
        sort_order: sortOrder,
      });
      setLobbyLabel("");
      setCompLabel("");
      setSortOrder(0);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(category: Category) {
    try {
      await updateCategory(category.id, { is_active: !category.is_active });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category");
    }
  }

  async function handleDelete(category: Category) {
    if (!window.confirm(`Delete category "${category.slug}"?`)) return;
    try {
      await deleteCategory(category.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-left">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-sm text-stone-400 mt-1">
            Manage lobby sections and reusable comp labels.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-sm text-stone-400 hover:text-white transition-colors"
        >
          Back to lobby
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-cinema-800 bg-cinema-900/60 p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-300">
          New category
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">
            <span className="text-stone-400">Lobby label</span>
            <input
              value={lobbyLabel}
              onChange={(e) => setLobbyLabel(e.target.value)}
              placeholder="MCU movies"
              className="w-full rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2 text-stone-100 outline-none focus:border-cinema-500"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-stone-400">Comp label</span>
            <input
              value={compLabel}
              onChange={(e) => setCompLabel(e.target.value)}
              placeholder="Recent MCU movies"
              className="w-full rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2 text-stone-100 outline-none focus:border-cinema-500"
            />
          </label>
        </div>
        <label className="block space-y-1 text-sm max-w-40">
          <span className="text-stone-400">Sort order</span>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="w-full rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2 text-stone-100 outline-none focus:border-cinema-500"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-cinema-600 hover:bg-cinema-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2"
        >
          {saving ? "Creating..." : "Create category"}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-300">
          All categories
        </h2>
        {loading ? (
          <p className="text-stone-400 text-sm">Loading...</p>
        ) : categories.length === 0 ? (
          <p className="text-stone-400 text-sm">No categories yet.</p>
        ) : (
          <ul className="space-y-2">
            {categories.map((category) => (
              <li
                key={category.id}
                className="rounded-xl border border-cinema-800 bg-cinema-900/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
              >
                <div className="min-w-0">
                  <Link
                    to={`/admin/categories/${category.id}`}
                    className="font-semibold text-white hover:text-rose-400 transition-colors"
                  >
                    {category.lobby_label || category.comp_label || category.slug}
                  </Link>
                  <p className="text-xs text-stone-500 mt-0.5">
                    slug: {category.slug} · order: {category.sort_order} ·{" "}
                    {category.membershipCount ?? 0} movies
                    {!category.is_active && " · inactive"}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    Lobby: {category.lobby_label || "—"} · Comp:{" "}
                    {category.comp_label || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleActive(category)}
                    className="text-xs rounded-lg border border-cinema-700 px-3 py-1.5 text-stone-300 hover:text-white hover:border-cinema-500"
                  >
                    {category.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <Link
                    to={`/admin/categories/${category.id}`}
                    className="text-xs rounded-lg bg-cinema-700 hover:bg-cinema-600 px-3 py-1.5 text-white"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(category)}
                    className="text-xs rounded-lg border border-rose-500/40 px-3 py-1.5 text-rose-300 hover:bg-rose-500/10"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
