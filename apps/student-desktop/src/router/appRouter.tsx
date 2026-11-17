import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import type { ScreenName } from "./route";
import { useRouterLogic } from "./routerLogic";
import { useAuthStore } from "../stores/useAuthStore";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { getCachedSessionOwner, supabase } from "../services/supabaseClient";
import { forgetOfflineAttempt, getOfflineResumeIdentity } from "../services/offlineExamService";
import { LoginScreen } from "../screens/login/loginScreen";
import { DashboardScreen } from "../screens/dashboard/dashboardScreen";
import { ExamConfirmationScreen } from "../screens/examConfirmation/examConfirmationScreen";
import { ExamQuestionScreen } from "../screens/examQuestion/examQuestionScreen";
import { ExamResultScreen } from "../screens/examResult/examResultScreen";
import { ExamReviewScreen } from "../screens/examReview/examReviewScreen";
import { ArchiveScreen } from "../screens/archive/archiveScreen";
import { AppSidebar } from "../components/layout/appSidebar";
import { useExamSessionStore } from "../stores/useExamSessionStore"; // holds the removed flag
import { RemovedFromExamModal } from "../components/modals/removedFromExamModal"; // the modal from step 4
import { ForcePasswordChangeModal } from "../components/modals/forcePasswordChangeModal"; // new: the first-login screen
import "./appRouter.css";

// useAuth is no longer imported here — AppRouter owns the session check directly,
// so there's only one place doing it, not two racing against each other.

const screenComponents: Record<ScreenName, ComponentType> = {
  login: LoginScreen,
  dashboard: DashboardScreen,
  examConfirmation: ExamConfirmationScreen,
  examQuestion: ExamQuestionScreen,
  examResult: ExamResultScreen,
  examReview: ExamReviewScreen,
  archive: ArchiveScreen,
};

const screensWithSidebar: ScreenName[] = ["dashboard", "archive"];

export function AppRouter() {
  const currentScreen = useRouterLogic((state) => state.currentScreen);
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const { user, isLoading, setUser, setIsLoading } = useAuthStore();
  const [resumeError, setResumeError] = useState(false);
  const [resumeRetry, setResumeRetry] = useState(0);
  const removed = useExamSessionStore((state) => state.removed); // true after a teacher removes the student
  // Resume a verified offline attempt before applying the normal login route.
  useEffect(() => {
    let active = true;
    async function checkSession() {
      try {
        const resume = getOfflineResumeIdentity();
        if (resume) {
          const matchingCachedOwner = getCachedSessionOwner() === resume.user.id;
          let ownsAttempt = matchingCachedOwner && !navigator.onLine;
          if (!ownsAttempt) {
            const { data, error } = await supabase.auth.getSession();
            ownsAttempt = data.session?.user.id === resume.user.id ||
              Boolean(matchingCachedOwner && !data.session && error && isAuthRetryableFetchError(error));
          }
          if (ownsAttempt) {
            const exam = await window.ipcRenderer.loadOfflineExam({
              studentId: resume.user.id, sessionId: resume.sessionId,
            });
            if (!active) return;
            if (exam) {
              useExamSessionStore.getState().restoreOfflineExam(exam);
              setUser(resume.user);
              navigateTo("examQuestion");
              return;
            }
          }
          if (active && ownsAttempt) forgetOfflineAttempt();
        }
        await supabase.auth.signOut({ scope: "local" });
        if (active) setUser(null);
      } catch {
        if (active) setResumeError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    checkSession();
    return () => { active = false; };
  }, [resumeRetry, navigateTo, setUser, setIsLoading]);

  // Runs whenever user or isLoading changes —
  // this is what actually does the redirect after checkSession finishes.
  useEffect(() => {
    if (isLoading) return; // still checking — don't redirect yet

    if (user) {
      // Session exists — if they're still on login, send them to Dashboard.
      if (currentScreen === "login") {
        navigateTo("dashboard");
      }
    } else {
      // No session — send them to login regardless of which screen they're on.
      navigateTo("login");
    }
  }, [user, isLoading]); // re-runs when auth state resolves

  // Blank loading screen while session check is in flight —
  // prevents a flash of the login screen before the session is confirmed.
  if (isLoading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#051424",
          color: "#adc6ff",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "12px",
          letterSpacing: "0.1em",
        }}
      >
        INITIALIZING...
      </div>
    );
  }

  if (resumeError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p role="alert">Could not reopen the saved exam. Check that local MySQL is running.</p>
        <button type="button" onClick={() => {
          setResumeError(false);
          setIsLoading(true);
          setResumeRetry((count) => count + 1);
        }}>Retry</button>
      </div>
    );
  }

  if (user?.mustChangePassword) { // this account still has the default or reset password
    return <ForcePasswordChangeModal />; // show only the modal, so no other screen loads or can be used
  } // end of the gate

  if (removed) {
    return <RemovedFromExamModal />;
  }

  const ScreenComponent = screenComponents[currentScreen];
  const showSidebar = screensWithSidebar.includes(currentScreen);

  if (showSidebar) {
    return (
      <div className="app-shell">
        <AppSidebar activeItem={currentScreen} />
        <div className="app-shell-content">
          <ScreenComponent />
        </div>
      </div>
    );
  }

  return <ScreenComponent />;
}
