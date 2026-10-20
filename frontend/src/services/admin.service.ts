import { AdminEngagementStats, JobRun } from "../types";

export const getAdminStats = async (): Promise<AdminEngagementStats> => {
  const response = await fetch("/api/admin/stats");
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load admin stats");
  }
  return response.json();
};

export const getAdminJobRuns = async (opts?: {
  job?: string;
  limit?: number;
}): Promise<JobRun[]> => {
  const params = new URLSearchParams();
  if (opts?.job) params.set("job", opts.job);
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const response = await fetch(
    `/api/admin/job-runs${qs ? `?${qs}` : ""}`
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load job runs");
  }
  const body = await response.json();
  return body.data ?? [];
};
