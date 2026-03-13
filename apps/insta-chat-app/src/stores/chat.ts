import { create } from "zustand";

export interface ChatSession {
    chatName: string;
    token: string;
    participantId: string;
    participantName: string;
}

interface ChatStore {
    session: ChatSession | null;
    setSession: (session: ChatSession) => void;
    clearSession: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
    session: null,
    setSession: (session) => set({ session }),
    clearSession: () => set({ session: null }),
}));
