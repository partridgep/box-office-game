import { create } from "zustand";

const STORAGE_KEY = "hiddenComps";

/** Persisted map: userId → subjectMovieId → hidden CompMovie ids */
type HiddenByUser = Record<string, Record<string, string[]>>;

function load(): HiddenByUser {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as HiddenByUser;
  } catch {
    return {};
  }
}

function save(byUser: HiddenByUser) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(byUser));
  } catch {
    // Quota / private mode — ignore; in-memory state still works for the session.
  }
}

interface HiddenCompsState {
  byUser: HiddenByUser;
  hide: (userId: string, subjectMovieId: string, compMovieId: string) => void;
  /** Hide many comps in one write (e.g. hide a whole category). */
  hideMany: (
    userId: string,
    subjectMovieId: string,
    compMovieIds: ReadonlyArray<string>
  ) => void;
  showAll: (userId: string, subjectMovieId: string) => void;
}

export const useHiddenCompsStore = create<HiddenCompsState>((set, get) => ({
  byUser: load(),

  hide: (userId, subjectMovieId, compMovieId) => {
    get().hideMany(userId, subjectMovieId, [compMovieId]);
  },

  hideMany: (userId, subjectMovieId, compMovieIds) => {
    if (compMovieIds.length === 0) return;
    const byUser = { ...get().byUser };
    const forUser = { ...(byUser[userId] ?? {}) };
    const current = forUser[subjectMovieId] ?? [];
    const seen = new Set(current);
    let changed = false;
    const next = [...current];
    for (const id of compMovieIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      next.push(id);
      changed = true;
    }
    if (!changed) return;
    forUser[subjectMovieId] = next;
    byUser[userId] = forUser;
    save(byUser);
    set({ byUser });
  },

  showAll: (userId, subjectMovieId) => {
    const byUser = { ...get().byUser };
    const forUser = { ...(byUser[userId] ?? {}) };
    if (!(subjectMovieId in forUser)) return;
    delete forUser[subjectMovieId];
    if (Object.keys(forUser).length === 0) {
      delete byUser[userId];
    } else {
      byUser[userId] = forUser;
    }
    save(byUser);
    set({ byUser });
  },
}));

export function selectHiddenCompIds(
  byUser: HiddenByUser,
  userId: string,
  subjectMovieId: string
): string[] {
  return byUser[userId]?.[subjectMovieId] ?? EMPTY_HIDDEN;
}

/** Stable empty array so Zustand selectors don't thrash. */
export const EMPTY_HIDDEN: string[] = [];

/** Prefer a real user id; fall back so anonymous sessions can still hide locally. */
export function hiddenCompsUserKey(userId: string | null | undefined): string {
  return userId || "anonymous";
}
