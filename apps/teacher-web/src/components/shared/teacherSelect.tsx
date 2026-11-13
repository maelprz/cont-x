import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";

export function TeacherSelect<T extends string | null>({ options, value, onChange, label, id, placeholder = "Select an option", className = "", disabled = false }: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const listId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedLabel = options[selectedIndex]?.label ?? placeholder;

  useEffect(() => {
    const anchor = trigger.current;
    const popup = list.current;
    if (!open || disabled || !anchor || !popup) return;
    popup.showPopover();
    function position() {
      if (!anchor || !popup) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 240), 352, window.innerWidth - 16);
      const below = window.innerHeight - rect.bottom - 14;
      const above = rect.top - 14;
      const flip = below < Math.min(popup.scrollHeight, 180) && above > below;
      Object.assign(popup.style, {
        width: `${width}px`, left: `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`,
        maxHeight: `${Math.max(0, Math.min(288, flip ? above : below))}px`,
        top: flip ? "auto" : `${rect.bottom + 6}px`, bottom: flip ? `${window.innerHeight - rect.top + 6}px` : "auto",
      });
    }
    position();
    popup.querySelectorAll<HTMLElement>('[role="option"]')[Math.max(0, selectedIndex)]?.focus();
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !anchor?.contains(event.target) && !popup?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      popup.hidePopover();
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [disabled, open, selectedIndex]);

  function close(restoreFocus: boolean) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }

  function select(index: number) {
    onChange(options[index].value);
    close(true);
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
      case " ": event.preventDefault(); select(index); return;
      case "Tab": close(true); return;
      default: return;
    }
    event.preventDefault();
    list.current?.querySelectorAll<HTMLElement>('[role="option"]')[next]?.focus();
  }

  return (
    <div className={`min-w-0 ${className}`} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) close(false);
    }} onKeyDown={(event) => {
      if (open && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); }
    }}>
      <button ref={trigger} id={id} type="button" disabled={disabled || !options.length} title={selectedLabel}
        aria-label={`${label}: ${selectedLabel}`} aria-haspopup="listbox" aria-expanded={open && !disabled} aria-controls={listId}
        className="flex min-h-9 w-full items-center justify-between gap-2 rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-100)] px-3 py-2 text-left text-sm hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#465a3b] disabled:opacity-50"
        onClick={() => setOpen((current) => !current)} onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); }
        }}>
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-stone-500 ${open ? "rotate-180" : ""}`} />
      </button>
      <div ref={list} id={listId} popover="manual" role="listbox" aria-label={label}
        className="fixed inset-auto m-0 overflow-y-auto overscroll-contain rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-100)] p-1 text-sm text-[var(--color-base-content)] shadow-lg">
        {open && options.map((option, index) => (
          <div key={option.value} role="option" aria-selected={index === selectedIndex} tabIndex={-1} title={option.label}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 outline-none hover:bg-stone-100 focus:bg-stone-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#465a3b] aria-selected:bg-[#e9eee3] aria-selected:font-semibold"
            onClick={() => select(index)} onKeyDown={(event) => handleOptionKey(event, index)}>
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {index === selectedIndex && <Check size={16} aria-hidden="true" className="shrink-0 text-[#465a3b]" />}
          </div>
        ))}
      </div>
    </div>
  );
}
