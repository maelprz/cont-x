import type { ComponentType } from "react";

import type { ScreenName } from "./route";
import { useRouterLogic } from "./routerLogic";

import { LoginScreen } from "../screens/login/loginScreen";
import { DashboardScreen } from "../screens/dashboard/dashboardScreen";
import { ExamConfirmationScreen } from "../screens/examConfirmation/examConfirmationScreen";

const screenComponents: Record<ScreenName, ComponentType> = {
  login: LoginScreen,
  dashboard: DashboardScreen,
  examConfirmation: ExamConfirmationScreen,
};

export function AppRouter() {
  const currentScreen = useRouterLogic((state) => state.currentScreen);

  const ScreenComponent = screenComponents[currentScreen];

  return <ScreenComponent />;
}
