import { create } from "zustand";

const STORAGE_KEY = "starredComps";

/** Max starred comps per subject movie — keeps the slider readable. */
export const STARRED_COMPS_MAX = 6;

/** Persisted map: userId → subjectMovieId → starred CompMovie ids */
type StarredByUser = Record<string, Record<string, string[]>>;

function load(): StarredByUser {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as StarredByUser;
  } catch {
    return {};
  }
}

function save(byUser: StarredByUser) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(byUser));
  } catch {
    // Quota / private mode — ignore; in-memory state still works for the session.
  }
}

interface StarredCompsState {
  byUser: StarredByUser;
  /** Toggle star. Returns false if starring was blocked (at max). */
  toggle: (
    userId: string,
    subjectMovieId: string,
    compMovieId: string
  ) => boolean;
  unstar: (userId: string, subjectMovieId: string, compMovieId: string) => void;
  unstarMany: (
    userId: string,
    subjectMovieId: string,
    compMovieIds: ReadonlyArray<string>
  ) => void;
  /**
   * Star comps until the max. Returns how many were newly starred.
   * Skips ids already starred; stops when at STARRED_COMPS_MAX.
   */
  starMany: (
    userId: string,
    subjectMovieId: string,
    compMovieIds: ReadonlyArray<string>
  ) => number;
  clearAll: (userId: string, subjectMovieId: string) => void;
}

function writeStarred(
  byUser: StarredByUser,
  userId: string,
  forUser: Record<string, string[]>
): StarredByUser {
  const next = { ...byUser };
  if (Object.keys(forUser).length === 0) {
    delete next[userId];
  } else {
    next[userId] = forUser;
  }
  return next;
}

export const useStarredCompsStore = create<StarredCompsState>((set, get) => ({
  byUser: load(),

  toggle: (userId, subjectMovieId, compMovieId) => {
    const byUser = { ...get().byUser };
    const forUser = { ...(byUser[userId] ?? {}) };
    const current = forUser[subjectMovieId] ?? [];
    const idx = current.indexOf(compMovieId);

    if (idx >= 0) {
      const next = current.filter((id) => id !== compMovieId);
      if (next.length === 0) {
        delete forUser[subjectMovieId];
      } else {
        forUser[subjectMovieId] = next;
      }
    } else {
      if (current.length >= STARRED_COMPS_MAX) return false;
      forUser[subjectMovieId] = [...current, compMovieId];
    }

    const updated = writeStarred(byUser, userId, forUser);
    save(updated);
    set({ byUser: updated });
    return true;
  },

  unstar: (userId, subjectMovieId, compMovieId) => {
    get().unstarMany(userId, subjectMovieId, [compMovieId]);
  },

  unstarMany: (userId, subjectMovieId, compMovieIds) => {
    if (compMovieIds.length === 0) return;
    const remove = new Set(compMovieIds);
    const byUser = { ...get().byUser };
    const forUser = { ...(byUser[userId] ?? {}) };
    const current = forUser[subjectMovieId] ?? [];
    const next = current.filter((id) => !remove.has(id));
    if (next.length === current.length) return;
    if (next.length === 0) {
      delete forUser[subjectMovieId];
    } else {
      forUser[subjectMovieId] = next;
    }
    const updated = writeStarred(byUser, userId, forUser);
    save(updated);
    set({ byUser: updated });
  },

  starMany: (userId, subjectMovieId, compMovieIds) => {
    if (compMovieIds.length === 0) return 0;
    const byUser = { ...get().byUser };
    const forUser = { ...(byUser[userId] ?? {}) };
    const current = forUser[subjectMovieId] ?? [];
    const seen = new Set(current);
    let added = 0;
    const next = [...current];
    for (const id of compMovieIds) {
      if (seen.has(id)) continue;
      if (next.length >= STARRED_COMPS_MAX) break;
      seen.add(id);
      next.push(id);
      added += 1;
    }
    if (added === 0) return 0;
    forUser[subjectMovieId] = next;
    const updated = writeStarred(byUser, userId, forUser);
    save(updated);
    set({ byUser: updated });
    return added;
  },

  clearAll: (userId, subjectMovieId) => {
    const byUser = { ...get().byUser };
    const forUser = { ...(byUser[userId] ?? {}) };
    if (!(subjectMovieId in forUser)) return;
    delete forUser[subjectMovieId];
    const updated = writeStarred(byUser, userId, forUser);
    save(updated);
    set({ byUser: updated });
  },
}));

export function selectStarredCompIds(
  byUser: StarredByUser,
  userId: string,
  subjectMovieId: string
): string[] {
  return byUser[userId]?.[subjectMovieId] ?? EMPTY_STARRED;
}

/** Stable empty array so Zustand selectors don't thrash. */
export const EMPTY_STARRED: string[] = [];
