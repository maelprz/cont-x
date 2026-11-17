import { useState } from "react"; // remembers values across re-renders
import {
  Shield,
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

  const navClass = "flex w-full items-center gap-2.5 rounded-lg border-none px-3 py-2.5 text-left text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ";
  return (
    <aside className={"flex shrink-0 flex-col bg-[#101828] text-[#f8f8f8] transition-[width] duration-200 " + (isCollapsed ? "w-12" : "w-12 lg:w-64")}>
      <div className="flex items-center justify-between gap-2 px-3 py-5 lg:px-4 lg:py-6">
        <div className={isCollapsed ? "hidden" : "hidden lg:block"}>
          <div className="flex items-center gap-2"><Shield size={20} /><span className="text-lg font-bold">Cont/x</span></div>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-white/70">Secure Ecosystem</p>
        </div>
        <button type="button" onClick={handleToggleCollapse} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden cursor-pointer items-center rounded-md border-none bg-transparent p-1 text-white/70 hover:bg-white/10 hover:text-white lg:flex">
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <Shield size={20} className="lg:hidden" aria-label="Cont/x" />
      </div>
      <nav aria-label="Student navigation" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-1 py-4 lg:px-3">
        {!isCollapsed && <p className="mb-1 hidden px-2 text-[10px] uppercase tracking-wider text-white/60 lg:block">Main Menu</p>}
        {([{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }, { id: "archive", label: "Archive", icon: ArchiveIcon }] as const).map(({id, label, icon: Icon}) => (
          <button key={id} type="button" title={label} aria-label={label} aria-current={activeItem === id ? "page" : undefined}
            onClick={() => navigateTo(id)} className={navClass + (activeItem === id ? "bg-[#30476a] font-semibold text-white" : "bg-transparent text-white/70 hover:bg-white/10 hover:text-white")}>
            <Icon size={16} className="shrink-0" aria-hidden="true" />
            {!isCollapsed && <span className="max-lg:sr-only">{label}</span>}
          </button>
        ))}
      </nav>
      <div className="border-t border-white/10">
        <button type="button" onClick={handleLogout} aria-label="Log out" title="Log out" className={navClass + "rounded-none bg-transparent py-4 text-white/70 hover:bg-white/10 hover:text-white"}>
          <LogOut size={16} className="shrink-0" aria-hidden="true" />{!isCollapsed && <span className="max-lg:sr-only">Log Out</span>}
        </button>
      </div>
    </aside>
  );
}
