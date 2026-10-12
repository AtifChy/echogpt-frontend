import { create } from "zustand";

export type WorkspaceView = "chat" | "search" | "library" | "admin";

interface WorkspaceState {
  view: WorkspaceView;
  conversationId: number | null;
  setView: (view: WorkspaceView) => void;
  openConversation: (id: number) => void;
  newChat: () => void;
  reset: () => void;
}

export const useWorkspace = create<WorkspaceState>((set) => ({
  view: "chat",
  conversationId: null,
  setView: (view) => set({ view, conversationId: null }),
  openConversation: (conversationId) => set({ view: "chat", conversationId }),
  newChat: () => set({ view: "chat", conversationId: null }),
  reset: () => set({ view: "chat", conversationId: null }),
}));
