import { useEffect, useId, useRef, type ReactNode } from "react";
import { Filter } from "lucide-react";
import { examSecondary } from "../examLibrary/examDialog";

export function FilterColumns({ first, second }: { first: ReactNode; second: ReactNode }) {
  return (
    <div className="grid gap-3 min-[30rem]:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="min-w-0">{first}</div>
      <div className="min-w-0 border-t border-[var(--color-base-300)] pt-2 min-[30rem]:border-s min-[30rem]:border-t-0 min-[30rem]:ps-3 min-[30rem]:pt-0">
        {second}
      </div>
    </div>
  );
}

export function FilterPopover({ label, activeCount, onClear, disabled, children }: {
  label: string;
  activeCount: number;
  onClear: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);

  function positionPopover() {
    const button = trigger.current;
    const popup = popover.current;
    if (!button || !popup) return;
    const rect = button.getBoundingClientRect();
    const width = Math.min(480, window.innerWidth - 16);
    const below = window.innerHeight - rect.bottom - 14;
    const above = rect.top - 14;
    const flip = below < 224 && above > below;
    Object.assign(popup.style, {
      width: `${width}px`,
      left: `${Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))}px`,
      top: flip ? "auto" : `${rect.bottom + 6}px`,
      bottom: flip ? `${window.innerHeight - rect.top + 6}px` : "auto",
      maxHeight: `${Math.max(0, flip ? above : below)}px`,
    });
  }

  useEffect(() => {
    window.addEventListener("resize", positionPopover);
    window.addEventListener("scroll", positionPopover, true);
    return () => {
      window.removeEventListener("resize", positionPopover);
      window.removeEventListener("scroll", positionPopover, true);
    };
  }, []);

  return (
    <>
      <button ref={trigger} type="button" popoverTarget={id} aria-controls={id} disabled={disabled}
        aria-label={activeCount ? `${label} (${activeCount} selected)` : label}
        className={`${examSecondary} shrink-0 ${activeCount ? "bg-[#e9eee3]" : ""}`}>
        <Filter size={16} aria-hidden="true" />
        {activeCount > 0 && <span aria-hidden="true" className="tabular-nums">{activeCount}</span>}
      </button>
      <div ref={popover} id={id} popover="auto" role="group" aria-label={label} onBeforeToggle={positionPopover}
        className="fixed inset-auto m-0 max-w-[calc(100%-1rem)] overflow-y-auto rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-100)] p-3 text-sm text-[var(--color-base-content)] shadow-lg">
        {children}
        <div className="mt-2 flex justify-end border-t border-[var(--color-base-300)] pt-2">
          <button type="button" className={examSecondary} disabled={disabled || activeCount === 0}
            onClick={onClear}>Clear filters</button>
        </div>
      </div>
    </>
  );
}
