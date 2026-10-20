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

  // These two screens have a subject level and an inside-a-subject level.
  // Coming in from the sidebar should always start at the subject list, not
  // wherever the teacher last was. (Going back from the builder, or from a
  // dashboard link, doesn't use the sidebar, so it still lands inside the subject.)
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
          onClick={openExamLibrary}
          className={`${navItemBase} ${
            activeItem === "examLibrary" ? navItemActive : navItemInactive
          }`}
        >
          <Library size={16} />
          {<span>Exam Library</span>}
        </button>

        <button
          onClick={openQuestionBank}
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

        {user?.hasAdminGrant && ( // only teachers who hold the admin grant see this section
          <>
            <p className="text-[var(--color-primary-content)]/60 text-[10px] uppercase tracking-wider px-2 mt-4 mb-1">
              Administration
            </p>
            <button
              onClick={() => navigateTo("userManagement")}
              className={`${navItemBase} ${
                activeItem === "userManagement" ? navItemActive : navItemInactive
              }`}
            >
              <Users size={16} />
              <span>User Management</span>
            </button>
                        <button
              onClick={() => navigateTo("subjectsClasses")} // opens the new Subjects & Classes screen
              className={`${navItemBase} ${activeItem === "subjectsClasses" ? navItemActive : navItemInactive}`} // highlighted when active
            >
              <BookOpen size={16} />
              <span>Subjects &amp; Classes</span>
            </button>
            <button
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