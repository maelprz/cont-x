import { useState } from "react"; // remembers values across re-renders
import {
  LayoutDashboard,
  Archive as ArchiveIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"; // pre-made icon components
import type { AppSidebarProps } from "./appSidebar.types";
import { useRouterLogic } from "../../router/routerLogic"; // this component's expected props
import { useAuthStore } from "../../stores/useAuthStore"; // for logging out
import { logout } from "../../services/authService"; // for logging out

export function AppSidebar({ activeItem }: AppSidebarProps) {
  // Tracks whether the sidebar shows full labels or just icons. Local only.
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const setUser = useAuthStore((state) => state.setUser); // for logging out

  // Runs when the student clicks the collapse/expand arrow button.
  function handleToggleCollapse() {
    setIsCollapsed((current) => !current); // flips true/false, whatever it currently is
  }

  // TODO: wire this up once a real Login screen exists — Login is explicitly out of
  // scope right now, so this intentionally does nothing yet.
  async function handleLogout() {
    try {
      await logout(); // calls the authService logout function
    } catch {
    } finally {
      setUser(null); // clears the user from the store, which will redirect to login
      navigateTo("login");
      window.ipcRenderer.exitApp(); // redirect to login screen after logout
    }
  }

  // Shared classes every nav item gets, regardless of active state.
  const navItemBaseClasses =
    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm cursor-pointer";
  // Extra classes only the currently-active nav item gets.
  const navItemActiveClasses =
    "bg-[var(--bg-sidebar)] text-[var(--text-inverted)] font-semibold";
  // Extra classes every OTHER (inactive) nav item gets.
  const navItemInactiveClasses = "text-[var(--text-inverted-secondary)]";

  return (
    <aside
      // bug fix: this used to be wrapped in single quotes, so ${...} never actually
      // interpolated — it was literal text. Backticks are required for that syntax to work.
      className={`flex flex-col shrink-0 transition-[width] duration-200 bg-[var(--bg-sidebar)] border-r border-[var(--border-primary)] ${
        isCollapsed ? "w-16" : "w-70"
      }`}
    >
      <div className="flex items-center justify-between px-4 h-14">
        {!isCollapsed && ( // only render the brand text when there's room to show it
          <div className="flex flex-col">
            <span className="text-[var(--text-inverted)] text-[10px] uppercase tracking-wide mt-0.5">
              Exam Control · Secure Environment
            </span>
          </div>
        )}
        <button
          type="button" // not a form-submit button
          onClick={handleToggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} // screen-reader label, since this button has no visible text
          className="bg-transparent border hover:border-[var(--border-primary)] rounded-md text-[var(--text-inverted)] cursor-pointer p-1 flex items-center"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-4">
        {/* Dashboard nav item — now actually navigates, instead of doing nothing */}
        <div
          onClick={() => navigateTo("dashboard")} // fires when clicked; previously this item had no click behavior at all
          className={`${navItemBaseClasses} ${
            activeItem === "dashboard"
              ? navItemActiveClasses
              : navItemInactiveClasses
          }`}
        >
          <LayoutDashboard size={16} />
          {!isCollapsed && <span>Dashboard</span>}
        </div>

        {/* NEW — Archive nav item */}
        <div
          onClick={() => navigateTo("archive")}
          className={`${navItemBaseClasses} ${
            activeItem === "archive"
              ? navItemActiveClasses
              : navItemInactiveClasses
          }`}
        >
          <ArchiveIcon size={16} />
          {!isCollapsed && <span>Archive</span>}
        </div>
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        aria-label="Log out"
        className="mt-auto flex items-center gap-2.5 px-4 py-3 border-none text-[var(--text-inverted-secondary)] text-sm bg-transparent cursor-pointer hover:text-[var(--text-inverted)]"
      >
        <LogOut size={16} />
        {!isCollapsed && <span>Log Out</span>}
      </button>
    </aside>
  );
}
