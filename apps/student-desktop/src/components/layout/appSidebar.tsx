import { useState } from "react"; // remembers values across re-renders
import {
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"; // pre-made icon components
import type { AppSidebarProps } from "./appSidebar.types"; // this component's expected props
// no CSS import — every style now lives as Tailwind classes below

export function AppSidebar({ activeItem }: AppSidebarProps) {
  // Tracks whether the sidebar shows full labels or just icons. Local only.
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Runs when the student clicks the collapse/expand arrow button.
  function handleToggleCollapse() {
    setIsCollapsed((current) => !current); // flips true/false, whatever it currently is
  }

  // TODO: wire this up once a real Login screen exists — Login is explicitly out of
  // scope right now, so this intentionally does nothing yet.
  function handleLogout() {
    console.log("Logout clicked — Login screen not built yet, no-op for now.");
  }

  // Shared classes every nav item gets, regardless of active state.
  const navItemBaseClasses =
    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm cursor-pointer";
  // Extra classes only the currently-active nav item gets.
  const navItemActiveClasses =
    "bg-[var(--accent-blue)]/15 text-[var(--accent-blue)]";
  // Extra classes every OTHER (inactive) nav item gets.
  const navItemInactiveClasses = "text-[var(--text-secondary)]";

  return (
    <aside
      // bug fix: this used to be wrapped in single quotes, so ${...} never actually
      // interpolated — it was literal text. Backticks are required for that syntax to work.
      className={`flex flex-col shrink-0 transition-[width] duration-200 bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] ${
        isCollapsed ? "w-16" : "w-56"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-5 border-b border-[var(--border-subtle)]">
        {!isCollapsed && ( // only render the brand text when there's room to show it
          <div className="flex flex-col">
            <span className="text-[var(--text-primary)] font-bold text-lg">
              Cont/x
            </span>
            <span className="text-[var(--text-secondary)] text-[10px] uppercase tracking-wide mt-0.5">
              Exam Control · Secure Environment
            </span>
          </div>
        )}
        <button
          type="button" // not a form-submit button
          onClick={handleToggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} // screen-reader label, since this button has no visible text
          className="bg-transparent border border-[var(--border-subtle)] rounded-md text-[var(--text-secondary)] cursor-pointer p-1 flex items-center"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-4">
        {/* Dashboard nav item */}
        <div
          className={`${navItemBaseClasses} ${
            // bug fix: this checked for a class called "active", but the design never had
            // one called that — it's purely a styling decision now, made via the variables above.
            activeItem === "dashboard"
              ? navItemActiveClasses
              : navItemInactiveClasses
          }`}
        >
          <LayoutDashboard size={16} />
          {!isCollapsed && <span>Dashboard</span>}
        </div>
      </nav>

      {/* mt-auto pushes this footer block to the bottom of the sidebar, regardless of nav item count */}
      <div className="mt-auto flex items-center gap-2.5 p-4 border-t border-[var(--border-subtle)]">
        <div className="w-8 h-8 rounded-full bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] flex items-center justify-center font-semibold shrink-0">
          G {/* "G" for Guest — replace once real auth exists */}
        </div>
        {!isCollapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-[var(--text-primary)] text-[13px] font-medium">
              Guest Student
            </span>
            <span className="text-[var(--text-secondary)] text-[11px]">
              No active session
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        aria-label="Log out"
        className="flex items-center gap-2.5 px-4 py-3 border-t border-[var(--border-subtle)] text-[var(--text-secondary)] text-sm bg-transparent cursor-pointer hover:text-[var(--text-primary)] w-full text-left"
      >
        <LogOut size={16} />
        {!isCollapsed && <span>Log Out</span>}
      </button>
    </aside>
  );
}
