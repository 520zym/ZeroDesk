import { create } from "zustand";

interface AppState {
  sidebarCollapsed: boolean;
  globalPaused: boolean;

  toggleSidebar: () => void;
  setGlobalPaused: (paused: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  globalPaused: false,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setGlobalPaused: (paused) => set({ globalPaused: paused }),
}));
