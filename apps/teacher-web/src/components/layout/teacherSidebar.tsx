import {
  LayoutDashboard,
  Library,
  Vault,
  LogOut,
  Shield,
  FileText,
  Users,
  FileClock,
  BookOpen,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useLogout } from "../../hooks/useLogout";
import type { TeacherSidebarProps } from "./teacherSidebar.types";
import { useRouterLogic } from "../../router/routerLogic";
import { useExamLibraryStore } from "../../store/useExamLibraryStore";
import { useQuestionBankStore } from "../../store/useQuestionBankStore";

// Single shared sidebar for all teacher web screens.
export function TeacherSidebar({ activeItem }: TeacherSidebarProps) {
  const user = useAuthStore((state) => state.user); // changed: moved inside the component, where hooks are allowed
  const handleLogout = useLogout(); // new: the logout function for the button below
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const currentScreen = useRouterLogic((state) => state.currentScreen);
  const setLibrarySubject = useExamLibraryStore((state) => state.setSelectedSubjectId);
  const setBankSubject = useQuestionBankStore((state) => state.setSelectedSubjectId);
  const bankResetHandler = useQuestionBankStore((state) => state.resetHandler);

  // The sidebar opens the full library. Returning from the builder can keep its subject filter.
  const openExamLibrary = () => {
    setLibrarySubject(null);
    navigateTo("examLibrary");
  };
  const openQuestionBank = () => {
    if (currentScreen === "questionBank" && bankResetHandler) {
      bankResetHandler(); // already here — the screen resets itself, since it may be mid-edit
    } else {
      setBankSubject(null);
      navigateTo("questionBank");
    }
  };

  // shared base classes every nav item gets
  const navItemBase = "flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg border-none px-3 py-2.5 text-left text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white lg:justify-start [&>span]:max-lg:sr-only [&>svg]:shrink-0";

  // active state classes
  const navItemActive =
    "bg-[#30476a] text-white font-semibold";

  // inactive state classes
  const navItemInactive =
    "text-[rgba(248,248,248,0.7)] hover:text-[var(--color-neutral-content)] hover:bg-[rgba(248,248,248,0.08)]";

  return (
    <aside className="flex w-12 shrink-0 flex-col bg-[var(--color-primary)] lg:w-64">
      <div className="px-3 py-5 lg:px-6 lg:py-6">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-[var(--color-primary-content)]" />
          <span className="text-lg font-bold text-[var(--color-primary-content)] max-lg:sr-only">
            Cont/x
          </span>
        </div>
        <p className="mt-1 hidden text-[10px] tracking-wide text-[var(--color-primary-content)]/70 uppercase lg:block">
          Secure Ecosystem
        </p>
      </div>

      {/* nav items */}
      <nav aria-label="Teacher navigation" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-1 py-4 lg:px-3">
        <p className="mb-1 hidden px-2 text-[10px] tracking-wider text-[var(--color-primary-content)]/60 uppercase lg:block">
          Main Menu
        </p>
        <button
          aria-current={activeItem === "dashboard" ? "page" : undefined}
          title="Dashboard"
          onClick={() => navigateTo("dashboard")}
          className={`${navItemBase} ${
            activeItem === "dashboard" ? navItemActive : navItemInactive
          }`}
        >
          <LayoutDashboard size={16} />
          {<span>Dashboard</span>}
        </button>

        <button
          aria-current={activeItem === "examLibrary" ? "page" : undefined}
          title="Exam Library"
          onClick={openExamLibrary}
          className={`${navItemBase} ${
            activeItem === "examLibrary" ? navItemActive : navItemInactive
          }`}
        >
          <Library size={16} />
          {<span>Exam Library</span>}
        </button>

        <button
          aria-current={activeItem === "questionBank" ? "page" : undefined}
          title="Question Bank"
          onClick={openQuestionBank}
          className={`${navItemBase} ${
            activeItem === "questionBank" ? navItemActive : navItemInactive
          }`}
        >
          <Vault size={16} />
          {<span>Question Bank</span>}
        </button>

        <button
          aria-current={activeItem === "examResultsList" ? "page" : undefined}
          title="Exam Results"
          onClick={() => navigateTo("examResultsList")}
          className={`${navItemBase} ${
            activeItem === "examResultsList" ? navItemActive : navItemInactive
          }`}
        >
          <FileText size={16} />
          {<span>Exam Results</span>}
        </button>

        {user?.hasAdminGrant && ( // only teachers who hold the admin grant see this section
          <>
            <p className="mt-4 mb-1 px-2 text-[10px] tracking-wider text-[var(--color-primary-content)]/60 uppercase max-lg:sr-only">
              Administration
            </p>
            <button
              aria-current={activeItem === "userManagement" ? "page" : undefined}
              title="User Management"
              onClick={() => navigateTo("userManagement")}
              className={`${navItemBase} ${
                activeItem === "userManagement" ? navItemActive : navItemInactive
              }`}
            >
              <Users size={16} />
              <span>User Management</span>
            </button>
            <button
              aria-current={activeItem === "subjectsClasses" ? "page" : undefined}
              title="Subjects & Classes"
              onClick={() => navigateTo("subjectsClasses")} // opens the new Subjects & Classes screen
              className={`${navItemBase} ${activeItem === "subjectsClasses" ? navItemActive : navItemInactive}`} // highlighted when active
            >
              <BookOpen size={16} />
              <span>Subjects &amp; Classes</span>
            </button>
            <button
              aria-current={activeItem === "auditLogs" ? "page" : undefined}
              title="Audit Logs"
              onClick={() => navigateTo("auditLogs")}
              className={`${navItemBase} ${activeItem === "auditLogs" ? navItemActive : navItemInactive}`}
            >
              <FileClock size={16} />
              <span>Audit Logs</span>
            </button>
          </>
        )}
      </nav>

      {/* logout pinned to the bottom */}
      <div className="border-t border-[rgba(248,248,248,0.1)]">
        <button
          type="button"
          title="Log Out"
          onClick={handleLogout}
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
