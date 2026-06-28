import type { ComponentType } from "react";
import type { ScreenName } from "./route";
import { useRouterLogic } from "./routerLogic";
import { LoginScreen } from "../screens/login/loginScreen";
import { DashboardScreen } from "../screens/dashboard/dashboardScreen";
import { ExamConfirmationScreen } from "../screens/examConfirmation/examConfirmationScreen";
import { AppSidebar } from "../components/layout/appSidebar";
import "./appRouter.css";

const screenComponents: Record<ScreenName, ComponentType> = {
  login: LoginScreen,
  dashboard: DashboardScreen,
  examConfirmation: ExamConfirmationScreen,
};

const screensWithSidebar: ScreenName[] = ["dashboard"];

export function AppRouter() {
  const currentScreen = useRouterLogic((state) => state.currentScreen);
  const ScreenComponent = screenComponents[currentScreen];
  const showSidebar = screensWithSidebar.includes(currentScreen);

  if (showSidebar) {
    return (
      <div className="app-shell">
        {" "}
        {/* sidebar + content side-by-side */}
        {/* TODO: activeItem is hardcoded to "dashboard" for now — fine since only one real nav item exists yet */}
        <AppSidebar activeItem="dashboard" />
        <div className="app-shell-content">
          <ScreenComponent />{" "}
          {/* renders whichever screen is currently active */}
        </div>
      </div>
    );
  }

  return <ScreenComponent />;
}
