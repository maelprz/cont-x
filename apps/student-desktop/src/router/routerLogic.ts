import { create } from "zustand";
import type { ScreenName } from "./route";

interface AppRouterState {
  currentScreen: ScreenName; //Which screen is currently being displayed
  navigateTo: (screen: ScreenName) => void; //method nga icall to switch screens
}

export const useRouterLogic = create<AppRouterState>((set) => ({
  currentScreen: "dashboard", //default screen is dashboard but i think ipoint pani sa Login screen
  navigateTo: (screen: ScreenName) => set({ currentScreen: screen }), //method to switch screens
}));
