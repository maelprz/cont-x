import { useEffect } from "react";
import { getCurrentUser } from "../services/authService"; 
import type { ComponentType } from "react";
import type { ScreenName } from "./route";
import { useAuthStore } from "../store/useAuthStore";
import { useRouterLogic } from "./routerLogic";
import { canUseAdminScreens, isTopAdmin } from "./permissions"; 
import { LoginScreen } from "../screens/login/loginScreen";
import { UserManagementScreen } from "../screens/userManagement/userManagementScreen";
import { AuditLogsScreen } from "../screens/auditLogs/auditLogsScreen";
import { DashboardScreen } from "../screens/dashboard/dashboardScreen";
import { ExamLibraryScreen } from "../screens/examLibrary/examLibraryScreen";
import { ExamBuilderScreen } from "../screens/examBuilder/examBuilderScreen";
import { QuestionBankScreen } from "../screens/questionBank/questionBankScreen";
import { ViolationMonitoringScreen } from "../screens/violationLogs/violationMonitoringScreen";
import { SubjectsClassesScreen } from "../screens/subjectsClasses/subjectsClassesScreen"; 

import { Toast } from "../components/shared/toast";
import { useToastStore } from "../store/useToastStore";
import { ExamResultsScreen } from "../screens/examResult/examResultsScreen";
import { ExamResultsListScreen } from "../screens/examResult/examResultListScreen";

const adminScreens: ScreenName[] = ["userManagement", "auditLogs", "subjectsClasses"]; 

const screenComponents: Record<ScreenName, ComponentType<any>> = {
  login: LoginScreen,
  userManagement: UserManagementScreen,
  auditLogs: AuditLogsScreen,
  dashboard: DashboardScreen,
  examLibrary: ExamLibraryScreen,
  examBuilder: ExamBuilderScreen,
  questionBank: QuestionBankScreen,
  examResultsList: ExamResultsListScreen,
  examResults: ExamResultsScreen,
  violationMonitoring: ViolationMonitoringScreen,
  subjectsClasses: SubjectsClassesScreen,
};

export function AppRouter() {
  const currentScreen = useRouterLogic((state) => state.currentScreen);
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const ScreenComponent = screenComponents[currentScreen];
  const { user, isLoading, setUser, setIsLoading } = useAuthStore();

  const toast = useToastStore((state) => state.toast);
  const dismissToast = useToastStore((state) => state.dismissToast);

  useEffect(() => {
    async function checkSession() { // changed: restores the saved session instead of ending it
      try {
        const current = await getCurrentUser(); // reads the saved session and loads the profile, or null
        setUser(current); // null means nobody is logged in
      } catch {
        setUser(null); // fall back to logged out
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
      // Session exists — if they're still on login, send them to their landing screen.
      if (currentScreen === "login") {
        navigateTo(isTopAdmin(user) ? "userManagement" : "dashboard"); // changed: the top-level account lands on the admin side
      }
    } else {
      // No session — send them to login regardless of which screen they're on.
      navigateTo("login");
    }
  }, [user, isLoading]); // re-runs when auth state resolves

  // new: the route guard, its own effect and not nested inside the one above
  useEffect(() => {
    if (isLoading) return; // wait until the session check is done
    if (!user) { // nobody is logged in
      if (currentScreen !== "login") navigateTo("login"); // any other screen sends them to login
      return; // nothing more to check
    }
    if (adminScreens.includes(currentScreen) && !canUseAdminScreens(user)) { // an admin screen without permission
      navigateTo("dashboard"); // send them back to the teacher dashboard
    }
  }, [user, isLoading, currentScreen]); // re-checks on every change

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

  return (
    <>
      <ScreenComponent />
      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  );
}