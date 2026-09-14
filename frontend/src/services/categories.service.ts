import {
  Category,
  CompGroup,
  CompGroupInput,
  LobbySection,
} from "../types";

export const getCategories = async (): Promise<Category[]> => {
  const response = await fetch("/api/categories");
  if (!response.ok) throw new Error("Failed to fetch categories");
  return response.json();
};

export const getCategory = async (id: string): Promise<Category> => {
  const response = await fetch(`/api/categories/${id}`);
  if (!response.ok) throw new Error("Failed to fetch category");
  return response.json();
};

export const createCategory = async (data: {
  slug?: string;
  lobby_label?: string | null;
  comp_label?: string | null;
  sort_order?: number;
  is_active?: boolean;
}): Promise<Category> => {
  const response = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create category");
  }
  return response.json();
};

export const updateCategory = async (
  id: string,
  data: Partial<{
    slug: string;
    lobby_label: string | null;
    comp_label: string | null;
    sort_order: number;
    is_active: boolean;
  }>
): Promise<Category> => {
  const response = await fetch(`/api/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update category");
  }
  return response.json();
};

export const deleteCategory = async (id: string): Promise<void> => {
  const response = await fetch(`/api/categories/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete category");
};

export const setCategoryMovies = async (
  id: string,
  movieIds: string[]
): Promise<Category> => {
  const response = await fetch(`/api/categories/${id}/movies`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ movieIds }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update category movies");
  }
  return response.json();
};

export const getLobbySections = async (): Promise<LobbySection[]> => {
  const response = await fetch("/api/lobby");
  if (!response.ok) throw new Error("Failed to fetch lobby sections");
  return response.json();
};

export const getCompGroups = async (
  movieId: string,
  opts?: { manualOnly?: boolean }
): Promise<CompGroup[]> => {
  const params = opts?.manualOnly ? "?manualOnly=1" : "";
  const response = await fetch(`/api/movies/${movieId}/comp-groups${params}`);
  if (!response.ok) throw new Error("Failed to fetch comp groups");
  return response.json();
};

export const replaceCompGroups = async (
  movieId: string,
  groups: CompGroupInput[]
): Promise<CompGroup[]> => {
  const response = await fetch(`/api/movies/${movieId}/comp-groups`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(groups),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update comp groups");
  }
  return response.json();
};
