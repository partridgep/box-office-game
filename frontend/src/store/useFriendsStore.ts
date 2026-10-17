import { create } from "zustand";
import {
  FollowedUser,
  followByCode,
  getMyFollowing,
  unfollowByCode,
} from "../services/users.service";

interface FriendsState {
  following: FollowedUser[];
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
  loaded: false,
  version: 0,

  loadFollowing: async () => {
    const following = await getMyFollowing();
    set({ following, loaded: true });
  },

  follow: async (code, mutual = false) => {
    const user = await followByCode(code, mutual);
    const rest = get().following.filter((f) => f.short_id !== user.short_id);
    set({
      following: [...rest, user].sort((a, b) => a.name.localeCompare(b.name)),
      version: get().version + 1,
    });
    return user;
  },

  unfollow: async (code) => {
    await unfollowByCode(code);
    set({
      following: get().following.filter((f) => f.short_id !== code),
      version: get().version + 1,
    });
  },

  reset: () => set({ following: [], loaded: false, version: get().version + 1 }),
}));
