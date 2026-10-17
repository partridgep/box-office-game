import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { decryptText, loadEncrypted } from "../utils/crypto/cryptoStorage";
import { persistUser } from "../utils/userPersistence";
import { saveUser } from "../services/users.service";
import {
  configureAuthSession,
  ensureFreshToken,
} from "../services/authSession";
import { useFriendsStore } from "./useFriendsStore";

export const SESSION_EXPIRED_MESSAGE =
  "Session expired — enter your access key.";

interface User {
  id: string;
  short_id: string;
  name: string;
  access_key?: string;
}

/** booting: restoring local user / refreshing JWT. ready: safe to show as logged in. anonymous: logged out. */
export type SessionStatus = "booting" | "ready" | "anonymous";

interface UserStore {
  user: User | null;
  sessionStatus: SessionStatus;
  /** Shown in Restore Access when silent recover failed. */
  sessionMessage: string | null;
  /** Layout opens the recover dialog when this is true. */
  restoreAccessOpen: boolean;
  createUser: (name: string) => Promise<void>;
  loadUser: () => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  expireSession: () => void;
  openRestoreAccess: (message?: string | null) => void;
  closeRestoreAccess: () => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  sessionStatus: "booting",
  sessionMessage: null,
  restoreAccessOpen: false,

  setUser: (user) =>
    set({
      user,
      sessionStatus: "ready",
      sessionMessage: null,
      restoreAccessOpen: false,
    }),

  openRestoreAccess: (message = null) =>
    set({ restoreAccessOpen: true, sessionMessage: message }),

  closeRestoreAccess: () =>
    set({ restoreAccessOpen: false, sessionMessage: null }),

  logout: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("access_key");
    localStorage.removeItem("jwt");
    useFriendsStore.getState().reset();
    set({
      user: null,
      sessionStatus: "anonymous",
      sessionMessage: null,
      restoreAccessOpen: false,
    });
  },

  expireSession: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("access_key");
    localStorage.removeItem("jwt");
    useFriendsStore.getState().reset();
    set({
      user: null,
      sessionStatus: "anonymous",
      sessionMessage: SESSION_EXPIRED_MESSAGE,
      restoreAccessOpen: true,
    });
  },

  createUser: async (name) => {
    const id = uuidv4();
    const short_id =
      name.toUpperCase().replace(/\s/g, "") +
      Math.floor(Math.random() * 1000);
    const access_key = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();

    const newUser: User = { id, short_id, name, access_key };

    try {
      await saveUser(newUser);
      await persistUser(newUser);
      set({
        user: newUser,
        sessionStatus: "ready",
        sessionMessage: null,
        restoreAccessOpen: false,
      });
    } catch (err) {
      console.error("Failed to save user to backend:", err);
      throw new Error("Error creating user: " + err);
    }
  },

  loadUser: async () => {
    set({ sessionStatus: "booting" });

    const stored = localStorage.getItem("user");
    if (!stored) {
      set({ user: null, sessionStatus: "anonymous" });
      return;
    }

    let parsed: User;
    try {
      parsed = JSON.parse(stored);
    } catch {
      get().expireSession();
      return;
    }

    const enc = await loadEncrypted("access_key");
    if (!enc) {
      get().expireSession();
      return;
    }

    try {
      parsed.access_key = await decryptText(enc);
    } catch {
      get().expireSession();
      return;
    }

    if (!parsed.access_key) {
      get().expireSession();
      return;
    }

    try {
      await ensureFreshToken({
        name: parsed.name,
        access_key: parsed.access_key,
      });
      set({
        user: parsed,
        sessionStatus: "ready",
        sessionMessage: null,
        restoreAccessOpen: false,
      });
    } catch (err) {
      console.error("Silent session refresh failed:", err);
      get().expireSession();
    }
  },
}));

configureAuthSession({
  getCredentials: () => {
    const user = useUserStore.getState().user;
    if (!user?.access_key) return null;
    return { name: user.name, access_key: user.access_key };
  },
  onSessionExpired: () => {
    useUserStore.getState().expireSession();
  },
});
