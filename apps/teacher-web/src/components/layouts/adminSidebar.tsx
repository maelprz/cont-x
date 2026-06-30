import { Shield, Users, FileClock } from "lucide-react"; // pre-made icon components
import type { AdminSidebarProps } from "./adminSidebar.types";
import { useRouterLogic } from "../../router/routerLogic"; // store controlling which screen is active

// Single shared sidebar — used across every admin screen.
export function AdminSidebar({ activeItem }: AdminSidebarProps) {
  const navigateTo = useRouterLogic((state) => state.navigateTo);

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

        {/* User Management nav item — navigates on click */}
        <button
          onClick={() => navigateTo("userManagement")}
          className={`${navItemBase} ${
            activeItem === "userManagement"
              ? "bg-[var(--color-primary-content)]/15 text-[var(--color-primary-content)]"
              : "text-[var(--color-primary-content)]/80 hover:bg-[var(--color-primary-content)]/10"
          }`}
        >
          <Users size={16} />
          User Management
        </button>

        <p className="text-[var(--color-primary-content)]/60 text-[10px] uppercase tracking-wider px-2 mt-4 mb-1">
          Configuration
        </p>

        {/* Audit Logs nav item — navigates on click */}
        <button
          onClick={() => navigateTo("auditLogs")}
          className={`${navItemBase} ${
            activeItem === "auditLogs"
              ? "bg-[var(--color-primary-content)]/15 text-[var(--color-primary-content)]"
              : "text-[var(--color-primary-content)]/80 hover:bg-[var(--color-primary-content)]/10"
          }`}
        >
          <FileClock size={16} />
          Audit Logs
        </button>
      </nav>
    </aside>
  );
}