import { Shield, Users, FileClock, LogOut, BookOpen } from "lucide-react";
import type { AdminSidebarProps } from "./adminSidebar.types";
import { useRouterLogic } from "../../router/routerLogic";
import { useLogout } from "../../hooks/useLogout";

// Single shared sidebar -- used across every admin screen.
export function AdminSidebar({ activeItem }: AdminSidebarProps) {
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const handleLogout = useLogout(); // the function that really signs out, then returns to the login screen

  // shared classes every nav item gets, regardless of active state
  const navItemBase =
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-left";

  return (
    <aside className="w-64 bg-[var(--color-primary)] flex flex-col shrink-0">
      <div className="px-6 py-6">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-[var(--color-primary-content)]" />
          <span className="text-[var(--color-primary-content)] font-bold text-lg">
            Cont/x
          </span>
        </div>
        <p className="text-[var(--color-primary-content)]/70 text-[10px] uppercase tracking-wide mt-1">
          Secure Ecosystem
        </p>
      </div>

            <nav className="px-4 flex flex-col gap-1">
        <p className="text-[var(--color-primary-content)]/60 text-[10px] uppercase tracking-wider px-2 mb-1">
          Main Menu
        </p>

        {/* User Management nav item */}
        <button
          onClick={() => navigateTo("userManagement")} // opens the User Management screen
          className={`${navItemBase} ${
            activeItem === "userManagement"
              ? "bg-[var(--color-primary-content)]/15 text-[var(--color-primary-content)]" // highlighted when active
              : "text-[var(--color-primary-content)]/80 hover:bg-[var(--color-primary-content)]/10" // normal otherwise
          }`}
        >
          <Users size={16} />
          User Management
        </button>

        {/* new: Subjects & Classes nav item */}
        <button
          onClick={() => navigateTo("subjectsClasses")} // opens the new Subjects & Classes screen
          className={`${navItemBase} ${
            activeItem === "subjectsClasses"
              ? "bg-[var(--color-primary-content)]/15 text-[var(--color-primary-content)]" // highlighted when active
              : "text-[var(--color-primary-content)]/80 hover:bg-[var(--color-primary-content)]/10" // normal otherwise
          }`}
        >
          <BookOpen size={16} />
          Subjects &amp; Classes
        </button>

        {/* Audit Logs nav item, now under Main Menu */}
        <button
          onClick={() => navigateTo("auditLogs")} // opens the Audit Logs screen
          className={`${navItemBase} ${
            activeItem === "auditLogs"
              ? "bg-[var(--color-primary-content)]/15 text-[var(--color-primary-content)]" // highlighted when active
              : "text-[var(--color-primary-content)]/80 hover:bg-[var(--color-primary-content)]/10" // normal otherwise
          }`}
        >
          <FileClock size={16} />
          Audit Logs
        </button>
      </nav>

      {/* mt-auto pushes logout to the very bottom of the sidebar */}
      <div className="mt-auto border-t border-[var(--color-primary-content)]/20">
        <button
          type="button"
          onClick={handleLogout} // changed: now signs out for real instead of only changing screen
          className="flex items-center gap-2.5 w-full px-6 py-4 text-sm font-medium text-[var(--color-primary-content)]/80 hover:bg-[var(--color-primary-content)]/10 hover:text-[var(--color-primary-content)] transition-colors duration-150"
        >
          <LogOut size={16} />
          Log Out
        </button>
      </div>
    </aside>
  );
}