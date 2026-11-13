import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";

export function ExamSubjectFilter({ subjects, value, onChange }: {
  subjects: { id: string; name: string }[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listbox = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const options = [{ id: null, name: "All subjects" }, ...subjects];
  const selectedIndex = Math.max(0, options.findIndex((option) => option.id === value));

  useEffect(() => {
    if (!open) return;
    listbox.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();

    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [open]);

  function closeAndRestoreFocus() {
    setOpen(false);
    trigger.current?.focus();
  }

  function select(index: number) {
    onChange(options[index].id);
    closeAndRestoreFocus();
  }

  function handleOptionKey(event: KeyboardEvent<HTMLDivElement>, index: number) {
    const last = options.length - 1;
    let next: number;
    switch (event.key) {
      case "ArrowDown": next = Math.min(index + 1, last); break;
      case "ArrowUp": next = Math.max(index - 1, 0); break;
      case "Home": next = 0; break;
      case "End": next = last; break;
      case "Enter":
      case " ":
        event.preventDefault();
        select(index);
        return;
      default: return;
    }
    event.preventDefault();
    listbox.current?.querySelectorAll<HTMLElement>('[role="option"]')[next]?.focus();
  }

  return (
    <div ref={container} className="relative w-full min-w-0 sm:w-60" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }} onKeyDown={(event) => {
      if (open && event.key === "Escape") {
        event.preventDefault();
        closeAndRestoreFocus();
      }
    }}>
      <button ref={trigger} type="button" aria-label={`Filter by subject: ${options[selectedIndex].name}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
        className="flex min-h-9 w-full items-center justify-between gap-2 rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-100)] px-3 py-2 text-left text-sm hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#465a3b]"
        onClick={() => setOpen((current) => !current)} onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}>
        <span className="min-w-0 wrap-anywhere">{options[selectedIndex].name}</span>
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-stone-500 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div ref={listbox} id={id} role="listbox" aria-label="Filter by subject"
          className="absolute top-full left-0 z-20 mt-1.5 max-h-[min(45dvh,18rem)] w-full overflow-y-auto overscroll-contain rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-100)] p-1 text-sm shadow-lg sm:w-[22rem]">
          {options.map((option, index) => (
            <div key={option.id ?? "all"} role="option" aria-selected={index === selectedIndex} tabIndex={-1}
              className="flex cursor-pointer items-start gap-2 rounded-md px-2.5 py-2 outline-none hover:bg-stone-100 focus:bg-stone-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#465a3b] aria-selected:bg-[#e9eee3] aria-selected:font-semibold"
              onClick={() => select(index)} onKeyDown={(event) => handleOptionKey(event, index)}>
              <span className="min-w-0 flex-1 wrap-anywhere">{option.name}</span>
              {index === selectedIndex && <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[#465a3b]" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
