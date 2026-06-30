import { Search, Bell } from "lucide-react"; // pre-made icon components
import type { AdminHeaderProps } from "./adminHeader.types";
import type { ChangeEvent } from "react";

// Single shared header bar — used across every admin screen (User Management, Audit Logs, etc).
export function AdminHeader({
  adminName = "Admin Root",
  adminRole = "Supervisor",
  onSearchChange,
  searchValue = "",
}: AdminHeaderProps) {
  const initials = adminName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    onSearchChange?.(event.target.value); // bubbles the typed text up to whichever screen is listening
  }

  return (
    <header className="bg-[var(--color-base-100)] border-b border-[var(--color-base-300)] px-8 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 border border-[var(--color-base-300)] rounded-lg px-3 py-2 w-full max-w-md">
        <Search size={15} className="opacity-50" />
        <input
          type="text"
          placeholder="Search accounts, roles, IDs..."
          className="flex-1 text-sm outline-none bg-transparent"
          value={searchValue}
          onChange={handleSearchChange}
        />
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <button className="rounded-full p-2 hover:bg-[var(--color-base-200)]">
          <Bell size={16} />
        </button>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-medium leading-tight">{adminName}</p>
            <p className="text-xs opacity-60 leading-tight">{adminRole}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[var(--color-neutral)] text-[var(--color-neutral-content)] flex items-center justify-center text-xs">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}