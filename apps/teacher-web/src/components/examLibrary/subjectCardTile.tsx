import { BookOpen, FileText, Users } from "lucide-react";
import type { SubjectCard } from "../../screens/examLibrary/examLibraryScreen.types";

export function SubjectCardTile({
  subject,
  onClick,
}: {
  subject: SubjectCard;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-4 p-5 min-h-[200px] text-left rounded-2xl border cursor-pointer transition-shadow duration-200 hover:shadow-md bg-[var(--color-base-100)] border-[var(--color-base-300)]"
    >
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[var(--color-base-300)]">
          <BookOpen size={20} style={{ color: "var(--color-base-content)", opacity: 0.7 }} />
        </div>

        {subject.liveClassCount > 0 && (
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: "var(--color-secondary)",
              color: "var(--color-secondary-content)",
            }}
          >
            Live in {subject.liveClassCount} {subject.liveClassCount === 1 ? "class" : "classes"}
          </span>
        )}
      </div>

      <div>
        <h3 className="text-[16px] font-bold leading-snug text-[var(--color-base-content)]">
          {subject.name}
        </h3>
        {!subject.isAssigned && (
          <p className="text-[12px] mt-1 text-[var(--color-base-content)] opacity-55">
            You're no longer assigned to this subject.
          </p>
        )}
      </div>

      <div className="flex items-start gap-6 mt-auto">
        <div className="flex items-center gap-1.5">
          <FileText size={14} style={{ color: "var(--color-base-content)", opacity: 0.5 }} />
          <div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-widest mb-0.5 text-[var(--color-base-content)] opacity-50">
              Exams
            </p>
            <p className="text-[14px] font-bold text-[var(--color-base-content)]">
              {subject.examCount}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Users size={14} style={{ color: "var(--color-base-content)", opacity: 0.5 }} />
          <div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-widest mb-0.5 text-[var(--color-base-content)] opacity-50">
              Your classes
            </p>
            <p className="text-[14px] font-bold text-[var(--color-base-content)]">
              {subject.classCount}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}