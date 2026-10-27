import { create } from "zustand";
import { getLobbySections } from "../services/categories.service";
import { LobbySection } from "../types";

interface LobbyStore {
  sections: LobbySection[];
  /** True after at least one successful fetch (including empty). */
  loaded: boolean;
  setSections: (sections: LobbySection[]) => void;
  /**
   * Warm cache: return sections immediately and refresh in the background.
   * Cold cache: await the network fetch.
   */
  ensureSections: () => Promise<LobbySection[]>;
}

let inflight: Promise<LobbySection[]> | null = null;

function fetchAndStore(
  set: (partial: Partial<LobbyStore>) => void,
  get: () => LobbyStore
): Promise<LobbySection[]> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const next = await getLobbySections();
      set({ sections: next, loaded: true });
      return next;
    } catch (error) {
      console.error("Error fetching lobby sections:", error);
      return get().sections;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export const useLobbyStore = create<LobbyStore>((set, get) => ({
  sections: [],
  loaded: false,

  setSections: (sections) => set({ sections, loaded: true }),

  ensureSections: async () => {
    const { sections, loaded } = get();
    if (loaded) {
      void fetchAndStore(set, get);
      return sections;
    }
    return fetchAndStore(set, get);
  },
}));
