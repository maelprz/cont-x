import type { ComponentType } from "react";
import type { ScreenName } from "./route";
import { useRouterLogic } from "./routerLogic";
import { LoginScreen } from "../screens/login/loginScreen";
import { UserManagementScreen } from "../screens/userManagement/userManagementScreen";

const screenComponents: Record<ScreenName, ComponentType> = {
  login : LoginScreen,
  userManagement: UserManagementScreen,
  auditLogs: UserManagementScreen, // TEMP placeholder until auditLogs screen exists
};

export function AppRouter() {
  const currentScreen = useRouterLogic((state) => state.currentScreen);
  const ScreenComponent = screenComponents[currentScreen];
  return <ScreenComponent />;
}