import { useEffect } from "react"; // runs the session check on mount
import type { ComponentType } from "react";
import type { ScreenName } from "./route";
import { useRouterLogic } from "./routerLogic";
import { useAuth } from "../hooks/useAuth"; // session check + auth state
import { LoginScreen } from "../screens/login/loginScreen";
import { DashboardScreen } from "../screens/dashboard/dashboardScreen";
import { ExamConfirmationScreen } from "../screens/examConfirmation/examConfirmationScreen";
import { ExamQuestionScreen } from "../screens/examQuestion/examQuestionScreen";
import { ExamResultScreen } from "../screens/examResult/examResultScreen";
import { ArchiveScreen } from "../screens/archive/archiveScreen";
import { AppSidebar } from "../components/layout/appSidebar";
import "./appRouter.css";

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
  const { user, isLoading } = useAuth(); // checks for existing session on mount

  // Runs whenever user or isLoading changes —
  // redirects to the right screen based on auth state.
  useEffect(() => {
    if (isLoading) return; // still checking session — don't redirect yet

    if (user) {
      // A real logged-in student exists — send them to Dashboard
      // if they're still on the login screen (e.g. after a page refresh
      // where the session was restored automatically).
      if (currentScreen === "login") {
        navigateTo("dashboard");
      }
    } else {
      // No session — send them to login regardless of which screen they're on.
      // This also catches the case where a session expires mid-use.
      navigateTo("login");
    }
  }, [user, isLoading]); // re-runs when auth state changes

  // Shows a blank screen while the session check is in flight —
  // prevents a flash of the login screen before the session is confirmed.
  if (isLoading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#051424", // matches the app's background color
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
