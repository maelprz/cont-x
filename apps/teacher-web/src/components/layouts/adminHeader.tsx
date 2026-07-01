import { Search } from "lucide-react"; // pre-made icon components
import type { AdminHeaderProps } from "./adminHeader.types";
import type { ChangeEvent } from "react";

// Single shared header bar - used across every admin screen (User Management, Audit Logs, etc).
export function AdminHeader({
  onSearchChange,
  searchValue = "",
}: AdminHeaderProps) {

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    onSearchChange?.(event.target.value); // bubbles the typed text up to whichever screen is listening
  }

  return (
    <header className="bg-[var(--color-base-100)] border-b border-[var(--color-base-300)] px-8 py-3 flex items-center gap-4">
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
    </header>
  );
}