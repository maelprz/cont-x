import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { ExamCardTile } from "../../components/examLibrary/examCardTile";
import { useExamLibrary } from "../../hooks/useExamLibrary";
import { useRouterLogic } from "../../router/routerLogic";
import { useExamResultsStore } from "../../store/useExamResultsStore";

export function ExamResultsListScreen() {
  // reuses the same fetch-all-exams hook Exam Library already uses
  const { exams, isLoading, error } = useExamLibrary();

  const setCurrentClassExamId = useExamResultsStore(
    (state) => state.setCurrentClassExamId,
  );
  const navigateTo = useRouterLogic((state) => state.navigateTo);

  // one entry per class the exam has ended in, so results are never mixed across classes
  const endedEntries = exams.flatMap((exam) =>
    exam.classAttachments
      .filter((attachment) => attachment.status === "ended")
      .map((attachment) => ({ exam, attachment })),
  );

  // saves which class's attempt was picked, then opens its results detail screen
  const openResultsFor = (classExamId: string) => {
    setCurrentClassExamId(classExamId);
    navigateTo("examResults");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-base-200)]">
      <TeacherSidebar activeItem="examResultsList" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TeacherHeader />

        <main
          className="flex-1 overflow-y-auto px-8 py-6"
          style={{ color: "var(--color-base-content)" }}
        >
          <p className="text-xs opacity-60 mb-2">
            Teacher Portal &gt; Exam Results
          </p>

          <div className="mb-7">
            <h1 className="text-2xl font-bold mb-1">Exam Results</h1>
            <p className="text-sm opacity-70 max-w-md leading-relaxed">
              Review outcomes for each class an exam has ended in.
            </p>
          </div>

          {/* shows while the exam list is still loading */}
          {isLoading && (
            <p className="text-sm opacity-60">Loading ended exams...</p>
          )}

          {/* shows if the fetch failed */}
          {error && (
            <p
              className="text-[13px] mb-4"
              style={{ color: "var(--color-error)" }}
            >
              {error}
            </p>
          )}

          {/* shows if there are no ended exams yet */}
          {!isLoading && !error && endedEntries.length === 0 && (
            <p className="text-sm opacity-60">No exams have ended yet.</p>
          )}

          <div className="grid grid-cols-3 gap-5">
            {endedEntries.map(({ exam, attachment }) => (
              <ExamCardTile
                key={attachment.classExamId}
                exam={{
                  ...exam, // keeps description, question count, etc.
                  title: `${exam.title} · ${attachment.className}`,
                  classAttachments: [attachment], // so the footer counts only this class
                  ctaLabel: "View Results",
                  onCta: () => openResultsFor(attachment.classExamId),
                }}
                onClick={() => openResultsFor(attachment.classExamId)} // card body click does the same
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}