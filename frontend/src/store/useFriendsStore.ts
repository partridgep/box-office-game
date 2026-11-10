import { create } from "zustand";
import {
  FollowBackUser,
  FollowedUser,
  followByCode,
  getMyFollowing,
  unfollowByCode,
} from "../services/users.service";

function scoredRecord(f: FollowedUser) {
  const r = f.record ?? { you: 0, them: 0, ties: 0 };
  return r.you + r.them + r.ties;
}

function sortFollowingByRivalry(list: FollowedUser[]) {
  return [...list].sort((a, b) => {
    const scoreDiff = scoredRecord(b) - scoredRecord(a);
    if (scoreDiff !== 0) return scoreDiff;
    const sharedDiff = (b.shared_count ?? 0) - (a.shared_count ?? 0);
    if (sharedDiff !== 0) return sharedDiff;
    const at = a.last_guess_at ? new Date(a.last_guess_at).getTime() : 0;
    const bt = b.last_guess_at ? new Date(b.last_guess_at).getTime() : 0;
    if (bt !== at) return bt - at;
    return a.name.localeCompare(b.name);
  });
}

function sortFollowBack(list: FollowBackUser[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

interface FriendsState {
  following: FollowedUser[];
  followBack: FollowBackUser[];
  loaded: boolean;
  /** Bumped on every follow/unfollow so views that depend on who's a friend can refetch. */
  version: number;
  loadFollowing: () => Promise<void>;
  follow: (code: string, mutual?: boolean) => Promise<FollowedUser>;
  unfollow: (code: string) => Promise<void>;
  reset: () => void;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  following: [],
  followBack: [],
  loaded: false,
  version: 0,

  loadFollowing: async () => {
    const { following, follow_back } = await getMyFollowing();
    set({
      following: sortFollowingByRivalry(following),
      followBack: sortFollowBack(follow_back ?? []),
      loaded: true,
    });
  },

  follow: async (code, mutual = false) => {
    const user = await followByCode(code, mutual);
    const normalized = code.trim().toUpperCase();
    const rest = get().following.filter((f) => f.short_id !== user.short_id);
    const wasFollowBack = get().followBack.some(
      (f) => f.short_id === normalized || f.short_id === user.short_id
    );
    set({
      following: sortFollowingByRivalry([
        ...rest,
        {
          ...user,
          follows_you: user.follows_you || wasFollowBack,
        },
      ]),
      followBack: get().followBack.filter(
        (f) => f.short_id !== user.short_id && f.short_id !== normalized
      ),
      version: get().version + 1,
    });
    return user;
  },

  unfollow: async (code) => {
    const normalized = code.trim().toUpperCase();
    const existing = get().following.find(
      (f) => f.short_id === normalized || f.short_id === code
    );
    await unfollowByCode(code);
    set({
      following: get().following.filter(
        (f) => f.short_id !== normalized && f.short_id !== code
      ),
      followBack:
        existing?.follows_you
          ? sortFollowBack([
              ...get().followBack.filter(
                (f) => f.short_id !== existing.short_id
              ),
              { name: existing.name, short_id: existing.short_id },
            ])
          : get().followBack,
      version: get().version + 1,
    });
  },

  reset: () =>
    set({
      following: [],
      followBack: [],
      loaded: false,
      version: get().version + 1,
    }),
}));
