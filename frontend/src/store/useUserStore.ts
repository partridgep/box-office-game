import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { encryptText, saveEncrypted, decryptText, loadEncrypted } from '../utils/crypto/cryptoStorage';

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
  setUser: (user: User) => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  
  setUser: (user) => set({ user }),

  createUser: async (name) => {
    const id = uuidv4();
    const short_id = name.toUpperCase().replace(/\s/g, "") + Math.floor(Math.random() * 1000);
    const access_key = Math.random().toString(36).substr(2, 8).toUpperCase();

    const newUser: User = { id, short_id, name, access_key };

    localStorage.setItem('user', JSON.stringify(newUser));
    await saveEncrypted('access_key', await encryptText(access_key));

    set({ user: newUser });
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
