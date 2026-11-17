import { ChevronDown, ArrowRight } from "lucide-react";
import { examSecondary } from "../../components/examLibrary/examDialog";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { Pagination } from "../../components/shared/pagination";
import { useExamLibrary } from "../../hooks/useExamLibrary";
import { usePagination } from "../../hooks/usePagination";
import { useRouterLogic } from "../../router/routerLogic";
import { useExamResultsStore } from "../../store/useExamResultsStore";
import type { ClassExamSummary, ExamCard } from "../examLibrary/examLibraryScreen.types";

const updatedTime = (attachment: ClassExamSummary) =>
  attachment.resultsUpdatedAt ? Date.parse(attachment.resultsUpdatedAt) : Number.MIN_SAFE_INTEGER;

const dateTime = new Intl.DateTimeFormat(undefined, {
  month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
});

function ResultsGroup({ exam, attachments, initiallyOpen, onOpen }: {
  exam: ExamCard;
  attachments: ClassExamSummary[];
  initiallyOpen: boolean;
  onOpen: (id: string) => void;
}) {
  const page = usePagination(attachments, 8);

  return (
    <details open={initiallyOpen} className="group min-w-0 rounded-xl border border-[var(--color-base-300)] bg-[var(--color-base-100)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl bg-[#e9eee3] px-4 py-3 group-open:rounded-b-none hover:bg-[#dfe8d8] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#465a3b] [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-sm font-semibold wrap-anywhere">{exam.title}</span>
          <span className="mt-0.5 block text-xs text-stone-600 wrap-anywhere">
            {[exam.subjectName, exam.code].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-stone-600">
          {attachments.length} {attachments.length === 1 ? "class" : "classes"}
          <ChevronDown size={15} aria-hidden="true" className="group-open:rotate-180" />
        </span>
      </summary>
      <ul className="divide-y divide-[var(--color-base-300)] border-t border-[var(--color-base-300)]">
        {page.items.map((attachment) => (
          <li key={attachment.classExamId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium wrap-anywhere">{attachment.className}</p>
              {attachment.resultsUpdatedAt && (
                <p className="mt-0.5 text-xs text-stone-600">
                  Updated <time dateTime={attachment.resultsUpdatedAt}>{dateTime.format(new Date(attachment.resultsUpdatedAt))}</time>
                </p>
              )}
            </div>
            <button type="button" className={examSecondary} onClick={() => onOpen(attachment.classExamId)}
              aria-label={"View results for " + exam.title + ", " + attachment.className}>
              View results <ArrowRight size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <Pagination label={exam.title + " class pages"} {...page} />
    </details>
  );
}

export function ExamResultsListScreen() {
  const { exams, isLoading, error, refetch } = useExamLibrary(true);
  const setClassExam = useExamResultsStore((state) => state.setCurrentClassExamId);
  const navigateTo = useRouterLogic((state) => state.navigateTo);

  const groups = exams
    .map((exam) => ({
      exam,
      attachments: exam.classAttachments.filter((attachment) => attachment.status === "ended")
        .sort((a, b) => updatedTime(b) - updatedTime(a)),
    }))
    .filter((group) => group.attachments.length > 0)
    .sort((a, b) => updatedTime(b.attachments[0]) - updatedTime(a.attachments[0]));
  const page = usePagination(groups, 8);

  function openResults(classExamId: string) {
    setClassExam(classExamId);
    navigateTo("examResults");
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-base-200)] text-[var(--color-base-content)]">
      <TeacherSidebar activeItem="examResultsList" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TeacherHeader title="Exam Results" />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-8 sm:py-6">
            <h2 className="text-lg font-semibold">Ended class exams</h2>
            {isLoading ? <p role="status" className="text-sm text-stone-600">Loading ended class exams…</p>
              : error ? <div className="flex flex-wrap items-center gap-3">
                <p role="alert" className="text-sm text-red-700">{error}</p>
                <button type="button" className={examSecondary} onClick={refetch}>Retry</button>
              </div>
              : groups.length === 0 ? <p role="status" className="text-sm text-stone-600">No class exams have ended yet.</p>
              : <>
                <div className="grid gap-2">
                  {page.items.map(({ exam, attachments }, index) => (
                    <ResultsGroup key={exam.id} exam={exam} attachments={attachments} initiallyOpen={index === 0} onOpen={openResults} />
                  ))}
                </div>
                <Pagination label="Exam results pages" {...page} />
              </>}
          </div>
        </main>
      </div>
    </div>
  );
}
