import { useState } from "react";
import {
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { AppSidebarProps } from "./appSidebar.types";
import "./appSidebar.css";

export function AppSidebar({ activeItem }: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  function handleToggleCollapse() {
    setIsCollapsed((current) => !current); //flips true of false ra
  }

  return (
    <aside
      className={'app-sidevar ${isCollapsed ? "app-sidebar-collapsed" : ""}'}
    >
      <div className="app-sidebar-header">
        {!isCollapsed && (
          <div className="app-sidebar-brand">
            <span className="app-sidebar-logo">Cont/x</span>
            <span className="app-sidebar-tagline">
              Exam Control · Secure Environment
            </span>
          </div>
        )}

        <button
          type="button"
          className="app-sidebar-collapse-button"
          onClick={handleToggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="app-sidebar-nav">
        <div
          className={`app-sidebar-nav-item ${activeItem === "dashboard" ? "active" : ""}`}
        >
          <LayoutDashboard size={16} />
          {!isCollapsed && <span>Dashboard</span>}
        </div>
      </nav>

      <div className="app-sidebar-footer">
        <div className="app-sidebar-avatar">G</div>{" "}
        {/* "G" for Guest — replace once real auth exists */}
        {!isCollapsed && (
          <div className="app-sidebar-user-info">
            <span className="app-sidebar-user-name">Guest Student</span>{" "}
            {/* placeholder name */}
            <span className="app-sidebar-user-session">
              No active session
            </span>{" "}
            {/* placeholder status */}
          </div>
        )}
      </div>
    </aside>
  );
}
