import type { ComponentType } from "react";
import type { ScreenName } from "./route";
import { useRouterLogic } from "./routerLogic";
import { LoginScreen } from "../screens/login/loginScreen";
import { UserManagementScreen } from "../screens/userManagement/userManagementScreen";
import { DashboardScreen } from "../screens/dashboard/dashboardScreen";

const screenComponents: Record<ScreenName, ComponentType> = {
  login: LoginScreen,
  userManagement: UserManagementScreen,
  auditLogs: UserManagementScreen, // TEMP placeholder until auditLogs screen exists
  dashboard: DashboardScreen,
  exams: DashboardScreen,          // TEMP placeholder until exams screen is built
  examBuilder: DashboardScreen,       // TEMP placeholder until examBuilder screen is built
};

export function AppRouter() {
  const currentScreen = useRouterLogic((state) => state.currentScreen);
  const ScreenComponent = screenComponents[currentScreen];
  return <ScreenComponent />;
}