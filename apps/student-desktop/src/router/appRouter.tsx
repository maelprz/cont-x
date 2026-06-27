import type { ComponentType } from "react";
import { useRouterLogic } from "./routerLogic";

import { DashboardScreen } from "../screens/dashboard/dashboardScreen";
import type { ScreenName } from "./route";

import { ExamConfirmationScreen } from "../screens/examConfirmation/examConfirmationScreen";

const screenComponents: Record<ScreenName, ComponentType> = {
  dashboard: DashboardScreen,
  examConfirmation: ExamConfirmationScreen,
};

export function AppRouter() {
  const currentScreen = useRouterLogic((state) => state.currentScreen);

  const ScreenComponent = screenComponents[currentScreen];

  return <ScreenComponent />;
}
