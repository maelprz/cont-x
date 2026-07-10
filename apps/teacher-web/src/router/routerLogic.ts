import { create } from "zustand";
import type { ScreenName } from "./route";

interface AppRouterState {
  currentScreen: ScreenName;
  navigateTo: (screen: ScreenName) => void;
  // when set, navigateTo pauses and calls this before actually switching screens —
  // the guard decides whether navigation proceeds (called by whichever screen has unsaved changes)
  navigationGuard: ((nextScreen: ScreenName) => void) | null;
  setNavigationGuard: (guard: ((nextScreen: ScreenName) => void) | null) => void;
  // used by the guard itself once it's decided navigation should actually happen
  forceNavigateTo: (screen: ScreenName) => void;
}

export const useRouterLogic = create<AppRouterState>((set, get) => ({
  currentScreen: "login",
  navigationGuard: null,
  setNavigationGuard: (guard) => set({ navigationGuard: guard }),
  // real, unconditional screen switch — bypasses any guard, only called
  // after a guard has already made its decision (or when there's no guard)
  forceNavigateTo: (screen) => set({ currentScreen: screen }),
  navigateTo: (screen) => {
    const { navigationGuard, currentScreen } = get();
    if (navigationGuard && screen !== currentScreen) {
      navigationGuard(screen); // guard now owns deciding what happens next
      return;
    }
    set({ currentScreen: screen });
  },
}));