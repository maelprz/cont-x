import { useEffect } from "react";
import { logout } from "../services/authService";
import type { ComponentType } from "react";
import type { ScreenName } from "./route";
import { useAuthStore } from "../store/useAuthStore";
import { useRouterLogic } from "./routerLogic";
import { LoginScreen } from "../screens/login/loginScreen";
import { UserManagementScreen } from "../screens/userManagement/userManagementScreen";
import { DashboardScreen } from "../screens/dashboard/dashboardScreen";
import { ExamLibraryScreen } from "../screens/examLibrary/examLibraryScreen";

const screenComponents: Record<ScreenName, ComponentType> = {
  login: LoginScreen,
  userManagement: UserManagementScreen,
  auditLogs: UserManagementScreen, // TEMP placeholder until auditLogs screen exists
  dashboard: DashboardScreen,
  exams: DashboardScreen, // TEMP placeholder until exams screen is built
  examLibrary: ExamLibraryScreen,
  examBuilder: DashboardScreen, // TEMP placeholder until examBuilder screen is built
};

export function AppRouter() {
  const currentScreen = useRouterLogic((state) => state.currentScreen);
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const ScreenComponent = screenComponents[currentScreen];
  const { user, isLoading, setUser, setIsLoading } = useAuthStore();

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
        if (user.role === "admin") {
          navigateTo("userManagement");
        } else {
          navigateTo("dashboard");
        }
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

  return <ScreenComponent />;
}
