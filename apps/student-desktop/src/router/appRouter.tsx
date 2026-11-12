import { useEffect } from "react";
import type { ComponentType } from "react";
import type { ScreenName } from "./route";
import { useRouterLogic } from "./routerLogic";
import { useAuthStore } from "../stores/useAuthStore";
import { logout } from "../services/authService";
import { LoginScreen } from "../screens/login/loginScreen";
import { DashboardScreen } from "../screens/dashboard/dashboardScreen";
import { ExamConfirmationScreen } from "../screens/examConfirmation/examConfirmationScreen";
import { ExamQuestionScreen } from "../screens/examQuestion/examQuestionScreen";
import { ExamResultScreen } from "../screens/examResult/examResultScreen";
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
  archive: ArchiveScreen,
};

const screensWithSidebar: ScreenName[] = ["dashboard", "archive"];

export function AppRouter() {
  const currentScreen = useRouterLogic((state) => state.currentScreen);
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const { user, isLoading, setUser, setIsLoading } = useAuthStore();
  const removed = useExamSessionStore((state) => state.removed); // true after a teacher removes the student
  // Runs once on mount — checks if a session already exists
  // (e.g. student reopens the app without logging out).
  // This is the ONLY place the session check happens.
  useEffect(() => {
    async function checkSession() {
      try {
        logout();
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false); // done — router can now decide which screen to show
      }
    }

    checkSession();
  }, []); // empty array — once on mount only

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