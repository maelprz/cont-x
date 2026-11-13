import { logout } from "../services/authService"; // really signs out of Supabase
import { useAuthStore } from "../store/useAuthStore"; // holds the logged-in user
import { useRouterLogic } from "../router/routerLogic"; // controls which screen is shown
import { useViolationMonitoringStore } from "../store/useViolationMonitoringStore"; // holds the monitored class exam id
import { useExamLibraryStore } from "../store/useExamLibraryStore"; // holds the opened subject id

// returns a function that fully logs the person out
export function useLogout() { // used by both sidebars
  const setUser = useAuthStore((state) => state.setUser); // lets us clear the stored user
  const forceNavigateTo = useRouterLogic((state) => state.forceNavigateTo); // goes to a screen without asking a guard first
  return async function handleLogout() { // the function the Log Out buttons call
    try { // sign out, but never get stuck if it fails
      await logout(); // ends the Supabase session
    } finally { // always runs, even after an error
      setUser(null); // forgets the user in the app
      useViolationMonitoringStore.getState().setCurrentClassExamId(null); // forget which class exam was open
      useExamLibraryStore.getState().setSelectedSubjectId(null); // go back to the subject list next time
      forceNavigateTo("login"); // shows the login screen
    } // end of the try/finally
  }; // end of handleLogout
} // end of useLogout