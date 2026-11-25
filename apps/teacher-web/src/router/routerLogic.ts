import { create } from "zustand"; 
import { persist, createJSONStorage } from "zustand/middleware"; 
import type { ScreenName } from "./route"; 

// only these screens are safe to restore after a refresh, everything else falls back to login then dashboard
const RESTORABLE_SCREENS: ScreenName[] = [
  "myClasses",
  "examLibrary",
  "examBuilder",
  "examResults",
  "studentMonitoring",
  "violationMonitoring",
  "questionBank",
  "examResultsList",
  "userManagement",
  "subjectsClasses",
  "auditLogs",
];

interface AppRouterState {
  currentScreen: ScreenName;
  navigateTo: (screen: ScreenName, onProceed?: () => void) => void;
  navigationGuard: ((nextScreen: ScreenName, proceed: () => void) => void) | null;
  setNavigationGuard: (guard: ((nextScreen: ScreenName, proceed: () => void) => void) | null) => void;
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
      navigateTo: (screen, onProceed) => {
        const { navigationGuard, currentScreen } = get();
        const proceed = onProceed ?? (() => set({ currentScreen: screen }));
        if (navigationGuard && screen !== currentScreen) {
          navigationGuard(screen, proceed); // sign-out also waits for the editor's decision
          return;
        }
        proceed();
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
