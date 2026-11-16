import { useEffect, useId, useRef } from "react";
import { Filter } from "lucide-react";
import type { ClassExamStatus, ExamStatus } from "../../screens/examLibrary/examLibraryScreen.types";
import { examSecondary } from "./examDialog";

export interface ExamStatusFilters {
  authoring: ExamStatus[];
  delivery: ClassExamStatus[];
}

const authoringOptions = [
  { value: "draft", label: "Draft" },
  { value: "saved", label: "Saved" },
] as const;

const deliveryOptions = [
  { value: "scheduled", label: "Scheduled" },
  { value: "active", label: "Live" },
  { value: "ended", label: "Ended" },
] as const;

function toggleStatus<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function ExamStatusFilter({ value, onChange }: {
  value: ExamStatusFilters;
  onChange: (value: ExamStatusFilters) => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const count = value.authoring.length + value.delivery.length;

  function positionPopover() {
    const button = trigger.current;
    const popup = popover.current;
    if (!button || !popup) return;
    const rect = button.getBoundingClientRect();
    const width = Math.min(480, window.innerWidth - 16);
    const below = window.innerHeight - rect.bottom - 14;
    const above = rect.top - 14;
    const flip = below < 192 && above > below;
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
    return () => window.removeEventListener("resize", positionPopover);
  }, []);

  return (
    <>
      <button ref={trigger} type="button" popoverTarget={id} aria-controls={id}
        aria-label={count ? `Filter by status (${count} selected)` : "Filter by status"}
        className={`${examSecondary} shrink-0 ${count ? "bg-[#e9eee3]" : ""}`}>
        <Filter size={16} aria-hidden="true" />
        {count > 0 && <span aria-hidden="true" className="tabular-nums">{count}</span>}
      </button>
      <div ref={popover} id={id} popover="auto" role="group" aria-label="Status filters" onBeforeToggle={positionPopover}
        className="fixed inset-auto m-0 max-w-[calc(100%-1rem)] overflow-y-auto rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-100)] p-3 text-sm text-[var(--color-base-content)] shadow-lg">
        <div className="grid gap-3 min-[30rem]:grid-cols-[auto_minmax(0,1fr)]">
          <fieldset className="min-w-0">
            <legend className="mb-1 font-semibold">Exam status</legend>
            <div className="flex flex-wrap gap-x-2">
              {authoringOptions.map(({ value: status, label }) => (
                <label key={status} className="flex min-h-9 items-center gap-2 rounded-md px-1 hover:bg-stone-100">
                  <input type="checkbox" className="size-4 accent-[#465a3b]" checked={value.authoring.includes(status)}
                    onChange={() => onChange({ ...value, authoring: toggleStatus(value.authoring, status) })} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="min-w-0 border-t border-[var(--color-base-300)] pt-2 min-[30rem]:border-s min-[30rem]:border-t-0 min-[30rem]:ps-3 min-[30rem]:pt-0">
            <fieldset className="min-w-0">
              <legend className="mb-1 font-semibold">Class status</legend>
              <div className="flex flex-wrap gap-x-2">
                {deliveryOptions.map(({ value: status, label }) => (
                  <label key={status} className="flex min-h-9 items-center gap-2 rounded-md px-1 hover:bg-stone-100">
                    <input type="checkbox" className="size-4 accent-[#465a3b]" checked={value.delivery.includes(status)}
                      onChange={() => onChange({ ...value, delivery: toggleStatus(value.delivery, status) })} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
        <div className="mt-2 flex justify-end border-t border-[var(--color-base-300)] pt-2">
          <button type="button" className={examSecondary} disabled={count === 0}
            onClick={() => onChange({ authoring: [], delivery: [] })}>Clear filters</button>
        </div>
      </div>
    </>
  );
}
