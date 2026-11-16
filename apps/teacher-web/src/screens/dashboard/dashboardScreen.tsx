import { useId, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Radio, ClipboardList, type LucideIcon, Clock } from "lucide-react";
import { examPrimary, examSecondary } from "../../components/examLibrary/examDialog";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { useExamLibrary } from "../../hooks/useExamLibrary";
import { getClassExamNavigation } from "../../router/examCardNavigation";
import { useRouterLogic } from "../../router/routerLogic";
import { useExamBuilderStore } from "../../store/useExamBuilderStore";
import { useExamLibraryStore } from "../../store/useExamLibraryStore";
import { useExamResultsStore } from "../../store/useExamResultsStore";
import { useViolationMonitoringStore } from "../../store/useViolationMonitoringStore";
import type { ClassExamSummary, ExamCard } from "../examLibrary/examLibraryScreen.types";

type ClassExam = { exam: ExamCard; attachment: ClassExamSummary };

const classExamDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const panel = "min-w-0 rounded-xl border border-[var(--color-base-300)] bg-[var(--color-base-100)]";

function ClassExamRow({ entry, managingDisabled, onOpen }: {
  entry: ClassExam;
  managingDisabled: boolean;
  onOpen: (entry: ClassExam) => void;
}) {
  const { exam, attachment } = entry;
  const isLive = attachment.status === "active";
  const isScheduled = attachment.status === "scheduled";
  const date = isLive ? null : isScheduled ? attachment.startsAt : attachment.endedAt;
  const label = getClassExamNavigation(attachment.status)?.ctaLabel ?? "Manage classes";

  return (
    <li className="grid min-w-0 items-center gap-2 px-4 py-2.5 @min-[25rem]:grid-cols-[minmax(0,1fr)_auto] @min-[25rem]:gap-3">
      <div className="min-w-0">
        <h3 className={isLive ? "text-base font-semibold wrap-anywhere" : "text-sm font-semibold wrap-anywhere"}>
          {exam.title}
          {isLive && attachment.classId && (
            <span className="ms-2 inline-block whitespace-nowrap text-xs font-normal text-stone-600 tabular-nums">
              {" "}{attachment.studentCount} enrolled
            </span>
          )}
        </h3>
        <p className="mt-1 text-sm text-stone-600 wrap-anywhere">
          {attachment.className}{exam.subjectName && <> · {exam.subjectName}</>}
        </p>
        {date && (
          <p className="mt-1 text-xs text-stone-600">
            {isScheduled ? "Starts " : "Ended "}<time dateTime={date}>{classExamDate.format(new Date(date))}</time>
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 @min-[25rem]:justify-end">
        <button
          type="button"
          className={isLive ? examPrimary : examSecondary}
          aria-label={label + " for " + exam.title + ", " + attachment.className}
          disabled={isScheduled && managingDisabled}
          onClick={() => onOpen(entry)}
        >
          {label}
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

function ClassExamPanel({ icon, title, emptyMessage, entries, pageSize, pendingExamId, onOpen, isLive = false }: {
  icon: LucideIcon;
  title: string;
  emptyMessage: string;
  entries: ClassExam[];
  pageSize: number;
  pendingExamId: string | undefined;
  onOpen: (entry: ClassExam) => void;
  isLive?: boolean;
}) {
  
  const Icon = icon;
  const id = useId();
  const [requestedPage, setRequestedPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, entries.length);

  return (
    <section
      className={panel + " @container w-full"}
      style={isLive && entries.length ? { borderColor: "#c5d5bd" } : undefined}
      aria-labelledby={id}
    >
      <h2 id={id} className="flex items-center gap-2 border-b border-[var(--color-base-300)] px-4 py-3 text-sm font-semibold">
        <Icon size={16} aria-hidden="true" />
        {title}
      </h2>
      {entries.length > 0 ? (
        <ul id={id + "-list"}
          className="grid divide-y divide-[var(--color-base-300)] [--exam-row-min:6rem] @min-[25rem]:[--exam-row-min:4.75rem]"
          style={{ gridTemplateRows: `repeat(${pageSize}, minmax(var(--exam-row-min), auto))` }}>
          {entries.slice(start, end).map((entry) => (
            <ClassExamRow
              key={entry.attachment.classExamId}
              entry={entry}
              managingDisabled={entry.exam.id === pendingExamId}
              onOpen={onOpen}
            />
          ))}
        </ul>
      ) : <p className="px-4 py-4 text-sm text-stone-600">{emptyMessage}</p>}
      {pageCount > 1 && (
        <nav aria-label={title + " pages"} className="flex min-h-[53px] flex-wrap items-center justify-between gap-2 border-t border-[var(--color-base-300)] px-4 py-2">
          <p role="status" className="text-xs text-stone-600 tabular-nums">Page {page} of {pageCount}</p>
          <div className="flex gap-1.5">
            <button className={examSecondary} type="button" aria-label="Previous page" aria-controls={id + "-list"} disabled={page <= 1} onClick={() => setRequestedPage(page - 1)}>
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <button className={examSecondary} type="button" aria-label="Next page" aria-controls={id + "-list"} disabled={page >= pageCount} onClick={() => setRequestedPage(page + 1)}>
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}
    </section>
  );
}

export function DashboardScreen() {
  const { exams, isLoading, error, refetch } = useExamLibrary();
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const setLibrarySubject = useExamLibraryStore((state) => state.setSelectedSubjectId);
  const requestClassManagement = useExamLibraryStore((state) => state.requestClassManagement);
  const setProgressClass = useViolationMonitoringStore((state) => state.setCurrentClassExamId);
  const setResultsClass = useExamResultsStore((state) => state.setCurrentClassExamId);
  const pendingExamId = useExamBuilderStore((state) => state.backgroundSave?.examId);

  const deliveries = exams.flatMap((exam) => exam.classAttachments.map((attachment) => ({ exam, attachment })));
  const live = deliveries.filter(({ attachment }) => attachment.status === "active");
  const scheduled = deliveries.filter(({ attachment }) => attachment.status === "scheduled")
    .sort((a, b) => (a.attachment.startsAt ? Date.parse(a.attachment.startsAt) : Number.MAX_SAFE_INTEGER) -
      (b.attachment.startsAt ? Date.parse(b.attachment.startsAt) : Number.MAX_SAFE_INTEGER));
  const ended = deliveries.filter(({ attachment }) => attachment.status === "ended")
    .sort((a, b) => (b.attachment.endedAt ? Date.parse(b.attachment.endedAt) : Number.MIN_SAFE_INTEGER) -
      (a.attachment.endedAt ? Date.parse(a.attachment.endedAt) : Number.MIN_SAFE_INTEGER));

  function openClassExam({ exam, attachment }: ClassExam) {
    const navigation = getClassExamNavigation(attachment.status);
    if (navigation?.targetScreen === "studentMonitoring") {
      setProgressClass(attachment.classExamId);
      navigateTo(navigation.targetScreen);
    } else if (navigation?.targetScreen === "examResults") {
      setResultsClass(attachment.classExamId);
      navigateTo(navigation.targetScreen);
    } else if (pendingExamId !== exam.id) {
      setLibrarySubject(exam.subjectId);
      requestClassManagement(exam.id);
      navigateTo("examLibrary");
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-base-200)] text-[var(--color-base-content)]">
      <TeacherSidebar activeItem="dashboard" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TeacherHeader title="Dashboard" />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Exam sessions</h2>
            </div>

            {isLoading && <p role="status" className="text-sm text-stone-600">Loading exam sessions…</p>}
            {error && (
              <div className={panel + " flex flex-wrap items-center gap-3 p-4"}>
                <p role="alert" className="text-sm text-red-700">Could not load exam sessions.</p>
                <button type="button" className={examSecondary} onClick={refetch}>Retry</button>
              </div>
            )}
            {!isLoading && !error && (
              <>
                <div className="grid items-start gap-4 xl:grid-cols-2">
                  <ClassExamPanel icon={Radio} title="Live now" emptyMessage="No live class exams." entries={live} pageSize={2}
                    pendingExamId={pendingExamId} onOpen={openClassExam} isLive />
                  <ClassExamPanel icon={ClipboardList} title="Scheduled" emptyMessage="No scheduled class exams." entries={scheduled} pageSize={2}
                    pendingExamId={pendingExamId} onOpen={openClassExam} />
                </div>
                <ClassExamPanel icon={Clock} title="Recently ended" emptyMessage="No ended class exams." entries={ended} pageSize={3}
                  pendingExamId={pendingExamId} onOpen={openClassExam} />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
