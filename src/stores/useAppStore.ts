import { create } from "zustand";

interface AppState {
  currentWorkspaceId: string | null;
  sidebarCollapsed: boolean;
  globalPaused: boolean;

  setCurrentWorkspaceId: (id: string | null) => void;
  toggleSidebar: () => void;
  setGlobalPaused: (paused: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentWorkspaceId: null,
  sidebarCollapsed: false,
  globalPaused: false,

  setCurrentWorkspaceId: (id) => set({ currentWorkspaceId: id }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setGlobalPaused: (paused) => set({ globalPaused: paused }),
}));
