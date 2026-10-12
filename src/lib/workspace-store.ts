import { create } from "zustand";

export type WorkspaceView = "chat" | "search" | "library" | "admin";

interface WorkspaceState {
  view: WorkspaceView;
  conversationId: number | null;
  titles: Record<number, string>;
  setView: (view: WorkspaceView) => void;
  openConversation: (id: number) => void;
  newChat: () => void;
  setTitle: (id: number, title: string) => void;
  reset: () => void;
}

export const useWorkspace = create<WorkspaceState>((set) => ({
  view: "chat",
  conversationId: null,
  titles: {},
  setView: (view) => set({ view, conversationId: null }),
  openConversation: (conversationId) => set({ view: "chat", conversationId }),
  newChat: () => set({ view: "chat", conversationId: null }),
  setTitle: (id, title) =>
    set((state) => ({ titles: { ...state.titles, [id]: title.slice(0, 60) } })),
  reset: () => set({ view: "chat", conversationId: null, titles: {} }),
}));
