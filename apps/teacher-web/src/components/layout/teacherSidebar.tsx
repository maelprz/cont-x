import {
  LayoutDashboard,
  Library,
  Vault,
  LogOut,
  Shield,
  FileText,
} from "lucide-react";
import type { TeacherSidebarProps } from "./teacherSidebar.types";
import { useRouterLogic } from "../../router/routerLogic";

// Single shared sidebar for all teacher web screens.
export function TeacherSidebar({ activeItem }: TeacherSidebarProps) {
  const navigateTo = useRouterLogic((state) => state.navigateTo);

  // shared base classes every nav item gets
  const navItemBase =
    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm cursor-pointer w-full text-left border-none bg-transparent";

  // active state classes
  const navItemActive =
    "bg-[var(--color-primary)] text-[var(--color-primary-content)] font-semibold";

  // inactive state classes
  const navItemInactive =
    "text-[rgba(248,248,248,0.7)] hover:text-[var(--color-neutral-content)] hover:bg-[rgba(248,248,248,0.08)]";

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

      {/* nav items */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        <p className="text-[var(--color-primary-content)]/60 text-[10px] uppercase tracking-wider px-2 mb-1">
          Main Menu
        </p>
        <button
          onClick={() => navigateTo("dashboard")}
          className={`${navItemBase} ${
            activeItem === "dashboard" ? navItemActive : navItemInactive
          }`}
        >
          <LayoutDashboard size={16} />
          {<span>Dashboard</span>}
        </button>

        <button
          onClick={() => navigateTo("examLibrary")}
          className={`${navItemBase} ${
            activeItem === "examLibrary" ? navItemActive : navItemInactive
          }`}
        >
          <Library size={16} />
          {<span>Exam Library</span>}
        </button>

        <button
          onClick={() => navigateTo("questionBank")}
          className={`${navItemBase} ${
            activeItem === "questionBank" ? navItemActive : navItemInactive
          }`}
        >
          <Vault size={16} />
          {<span>Question Bank</span>}
        </button>

        <button
          onClick={() => navigateTo("examResultsList")}
          className={`${navItemBase} ${
            activeItem === "examResultsList" ? navItemActive : navItemInactive
          }`}
        >
          <FileText size={16} />
          {<span>Exam Results</span>}
        </button>
      </nav>

      {/* logout pinned to the bottom */}
      <div className="border-t border-[rgba(248,248,248,0.1)]">
        <button
          type="button"
          onClick={() => navigateTo("login")}
          className={`${navItemBase} px-4 py-3 rounded-none`}
          style={{ color: "rgba(248,248,248,0.7)" }}
        >
          <LogOut size={16} />
          {<span>Log Out</span>}
        </button>
      </div>
    </aside>
  );
}
