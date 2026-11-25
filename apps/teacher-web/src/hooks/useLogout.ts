import { logout } from "../services/authService"; // really signs out of Supabase
import { useAuthStore } from "../store/useAuthStore"; // holds the logged-in user
import { useRouterLogic } from "../router/routerLogic"; // controls which screen is shown
import { useViolationMonitoringStore } from "../store/useViolationMonitoringStore"; // holds the monitored class exam id
import { useExamLibraryStore } from "../store/useExamLibraryStore"; // holds the opened subject id
import { useQuestionBankStore } from "../store/useQuestionBankStore";
import { useExamResultsStore } from "../store/useExamResultsStore";
import { useExamBuilderStore } from "../store/useExamBuilderStore";
import { useToast } from "./useToast";
import { useRef } from "react";

// returns a function that fully logs the person out
export function useLogout() { // used by both sidebars
  const setUser = useAuthStore((state) => state.setUser); // lets us clear the stored user
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const forceNavigateTo = useRouterLogic((state) => state.forceNavigateTo);
  const { showToast } = useToast();
  const signingOut = useRef(false);
  async function performLogout() {
    if (signingOut.current) return;
    signingOut.current = true;
    try { // sign out, but never get stuck if it fails
      await logout(); // ends the Supabase session
    } finally { // always runs, even after an error
      setUser(null); // forgets the user in the app
      useExamBuilderStore.getState().setBackgroundSave(null);
      useExamBuilderStore.getState().setCurrentExamId(null);
      useExamBuilderStore.getState().setOpenedFromEditExam(false);
      useExamResultsStore.getState().setCurrentClassExamId(null);
      useQuestionBankStore.getState().setEditingQuestionId(null);
      useQuestionBankStore.getState().setSelectedSubjectId(null);
      useViolationMonitoringStore.getState().setCurrentClassExamId(null); // forget which class exam was open
      useExamLibraryStore.getState().setSelectedSubjectId(null); // go back to the subject list next time
      forceNavigateTo("login"); // shows the login screen
      signingOut.current = false;
    } // end of the try/finally
  }
  return function handleLogout() {
    const save = useExamBuilderStore.getState().backgroundSave;
    if (save?.status === "saving") {
      showToast("Your exam is still saving. Wait for it to finish before logging out.", "error");
      return;
    }
    if (save?.status === "error" && useRouterLogic.getState().currentScreen !== "examBuilder") {
      navigateTo("examBuilder");
      showToast("Your exam could not be saved. Review your edits before logging out.", "error");
      return;
    }
    navigateTo("login", () => { void performLogout().catch(() => { /* local sign-out is completed in finally */ }); });
  };
} // end of useLogout
