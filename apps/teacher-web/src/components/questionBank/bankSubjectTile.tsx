import { BookOpen, FileText } from "lucide-react";
import type { BankSubjectCard } from "../../hooks/useBankSubjects";

// One sub-question bank on the top level of the Question Bank — one per
// subject the teacher is assigned to. Clicking opens that subject's questions.
export function BankSubjectTile({
  subject,
  onClick,
}: {
  subject: BankSubjectCard;
  onClick: () => void;
}) {
  const sharedCount = subject.totalCount - subject.ownCount;

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-4 p-5 min-h-[180px] text-left rounded-2xl border cursor-pointer transition-shadow duration-200 hover:shadow-md bg-[var(--color-base-100)] border-[var(--color-base-300)]"
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[var(--color-base-300)]">
        <BookOpen size={20} style={{ color: "var(--color-base-content)", opacity: 0.7 }} />
      </div>

      <h3 className="text-[16px] font-bold leading-snug text-[var(--color-base-content)]">
        {subject.name}
      </h3>

      <div className="flex items-center gap-1.5 mt-auto">
        <FileText size={14} style={{ color: "var(--color-base-content)", opacity: 0.5 }} />
        <p className="text-[13px] text-[var(--color-base-content)]">
          <span className="font-bold">{subject.totalCount}</span>{" "}
          {subject.totalCount === 1 ? "question" : "questions"}
          {sharedCount > 0 && (
            <span className="opacity-60"> · {sharedCount} shared with you</span>
          )}
        </p>
      </div>
    </button>
  );
}