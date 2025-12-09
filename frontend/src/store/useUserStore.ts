import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { encryptText, saveEncrypted, decryptText, loadEncrypted } from '../utils/crypto/cryptoStorage';
import { saveUser } from '../services/users.service';

interface User {
  id: string;
  short_id: string;
  name: string;
  access_key?: string;
}

interface UserStore {
  user: User | null;
  createUser: (name: string) => Promise<void>;
  loadUser: () => Promise<void>;
  logout: () => void; 
  setUser: (user: User) => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  
  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem("user");
    set({ user: null });
  },

  createUser: async (name) => {
    const id = uuidv4();
    const short_id = name.toUpperCase().replace(/\s/g, "") + Math.floor(Math.random() * 1000);
    // const access_key = Math.random().toString(36).substr(2, 8).toUpperCase();
    const access_key = Array.from(
      crypto.getRandomValues(new Uint8Array(6))
    )
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

    const newUser: User = { id, short_id, name, access_key };

    localStorage.setItem('user', JSON.stringify(newUser));
    await saveEncrypted('access_key', await encryptText(access_key));

    try {
        await saveUser(newUser);
        console.log('User saved to backend successfully');
        set({ user: newUser });
    } catch (err) {
        console.error('Failed to save user to backend:', err);
        throw new Error("Error creating user: " + err);
    }
  },

  loadUser: async () => {
    const stored = localStorage.getItem('user');
    if (!stored) return;

    const parsed: User = JSON.parse(stored);

    const enc = await loadEncrypted('access_key');
    if (enc) {
      parsed.access_key = await decryptText(enc);
      console.log("loading parsed user: ", parsed)
      set({ user: parsed });
    }
  }
}));
