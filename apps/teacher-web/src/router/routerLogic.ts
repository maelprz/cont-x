import { create } from "zustand";
import type { ScreenName } from "./route";

interface AppRouterState {
  currentScreen: ScreenName;
  navigateTo: (screen: ScreenName) => void;
}

export const useRouterLogic = create<AppRouterState>((set) => ({
  currentScreen: "login", // default landing screen for teacher-web
  navigateTo: (screen: ScreenName) => set({ currentScreen: screen }),
}));