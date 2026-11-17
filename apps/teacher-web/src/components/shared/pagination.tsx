import { ChevronLeft, ChevronRight } from "lucide-react";
import { examSecondary } from "../examLibrary/examDialog";

export function Pagination({ label, page, pageCount, onPageChange }: {
  label: string;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-base-300)] px-3 py-2">
      <p role="status" className="text-xs text-stone-600 tabular-nums">Page {page} of {pageCount}</p>
      <div className="flex gap-2">
        <button type="button" className={examSecondary} aria-label="Previous page" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={14} aria-hidden="true" />
        </button>
        <button type="button" className={examSecondary} aria-label="Next page" disabled={page === pageCount} onClick={() => onPageChange(page + 1)}>
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
