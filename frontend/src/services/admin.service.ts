import { AdminEngagementStats } from "../types";

export const getAdminStats = async (): Promise<AdminEngagementStats> => {
  const response = await fetch("/api/admin/stats");
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load admin stats");
  }
  return response.json();
};
