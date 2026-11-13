import { create } from "zustand"; 
import { persist, createJSONStorage } from "zustand/middleware"; 
import type { ScreenName } from "./route"; 

// only these screens are safe to restore after a refresh, everything else falls back to login then dashboard
const RESTORABLE_SCREENS: ScreenName[] = ["examLibrary", "studentMonitoring", "violationMonitoring"];

interface AppRouterState {
  currentScreen: ScreenName;
  navigateTo: (screen: ScreenName) => void;
  navigationGuard: ((nextScreen: ScreenName) => void) | null;
  setNavigationGuard: (guard: ((nextScreen: ScreenName) => void) | null) => void;
  // used by the guard itself once it's decided navigation should actually happen
  forceNavigateTo: (screen: ScreenName) => void;
}

export const useRouterLogic = create<AppRouterState>()(
  persist(
    (set, get) => ({
      currentScreen: "login",
      navigationGuard: null,
      setNavigationGuard: (guard) => set({ navigationGuard: guard }),
      forceNavigateTo: (screen) => set({ currentScreen: screen }),
      navigateTo: (screen) => {
        const { navigationGuard, currentScreen } = get();
        if (navigationGuard && screen !== currentScreen) {
          navigationGuard(screen); // guard now owns deciding what happens next
          return;
        }
        set({ currentScreen: screen });
      },
    }),
    {
      name: "contx-router", // the key used inside sessionStorage
      storage: createJSONStorage(() => sessionStorage), // cleared when the tab closes, survives refresh
      partialize: (state) => ({ currentScreen: state.currentScreen }), // save only the screen name, never the guard function
      merge: (saved, current) => {
        const screen = (saved as Partial<AppRouterState> | undefined)?.currentScreen; // what was saved before the refresh
        return {
          ...current, // keep the default functions and fields
          currentScreen: screen && RESTORABLE_SCREENS.includes(screen) ? screen : current.currentScreen, // restore only allowed screens
        };
      },
    },
  ),
);