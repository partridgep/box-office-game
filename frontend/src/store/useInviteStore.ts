import { create } from "zustand";

interface InviteState {
  inviterId: string | null
  setInviterId: (id: string | null) => void
  clearInvite: () => void
}

export const useInviteStore = create<InviteState>((set) => ({
  inviterId: null,

  setInviterId: (id) => set({ inviterId: id }),

  clearInvite: () => set({ inviterId: null })
}));

export const useInviterId = () =>
  useInviteStore((state) => state.inviterId);

export const useSetInviterId = () =>
  useInviteStore((state) => state.setInviterId);