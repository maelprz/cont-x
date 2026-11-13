import { create } from "zustand";
import type { ScreenName } from "./route";

interface AppRouterState {
  reviewOrigin: "dashboard" | "archive";
  currentScreen: ScreenName; //Which screen is currently being displayed
  navigateTo: (screen: ScreenName) => void; //method nga icall to switch screens
}

export const useRouterLogic = create<AppRouterState>((set) => ({
  reviewOrigin: "dashboard",
  currentScreen: "login", //default screen is dashboard but i think ipoint pani sa Login screen, I AM TAKING OVER JOBERT THIS IS NOW LOGIN -dlkg
  navigateTo: (screen: ScreenName) => set((state) => ({
    currentScreen: screen,
    reviewOrigin: screen === "examReview" && state.currentScreen === "archive" ? "archive" : "dashboard",
  })), //method to switch screens
}));
