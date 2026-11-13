import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MultipleChoiceOptions } from "../../components/examQuestion/multipleChoiceOptions";
import { QuestionMapGrid } from "../../components/examQuestion/questionMapGrid";
import { useExamResultDetails } from "../../hooks/useExamResultDetails";
import { useSessionReview } from "../../hooks/useSessionReview";
import { useRouterLogic } from "../../router/routerLogic";
import type { ReviewItem } from "../../services/examService";
import { useExamSessionStore } from "../../stores/useExamSessionStore";
import type { QuestionMapItem } from "../examQuestion/examQuestionScreen.types";

const navigationButton = "flex items-center gap-2 px-5 py-2.5 rounded-lg border bg-transparent text-[var(--text-inverted)] text-[13px] font-semibold cursor-pointer hover:text-[var(--text-inverted-secondary)] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed";

function WrittenAnswers({ item }: { item: ReviewItem }) {
  const answerStyle = "rounded-lg border border-[var(--border-primary)] bg-white p-4 min-w-0";
  const textStyle = "mt-2 whitespace-pre-wrap wrap-break-word text-sm";
  return (
    <div className={`mt-6 grid gap-3 ${item.type === "coding" ? "lg:grid-cols-2" : ""}`}>
      <section className={answerStyle}>
        <h3 className="text-sm font-semibold">Your answer</h3>
        <pre className={textStyle}>{item.answerText?.trim() ? item.answerText : "No answer provided"}</pre>
      </section>
      <section className={answerStyle}>
        <h3 className="text-sm font-semibold">{item.type === "coding" ? "Reference solution" : "Accepted answers"}</h3>
        {item.correctAnswers.length > 0
          ? item.correctAnswers.map((answer, index) => <pre key={index} className={textStyle}>{answer}</pre>)
          : <p className="mt-2 text-sm">No reference answer provided.</p>}
      </section>
    </div>
  );
}

export function ExamReviewScreen() {
  const sessionId = useExamSessionStore((state) => state.sessionId);
  const reviewOrigin = useRouterLogic((state) => state.reviewOrigin);
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const { details, isLoading: loadingDetails, error: detailsError } = useExamResultDetails(sessionId);
  const allowed = details?.allowReview === true;
  const { review, error: reviewError, retry } = useSessionReview(sessionId, allowed);
  const [questionIndex, setQuestionIndex] = useState(0);

  const items = allowed ? review?.items ?? [] : [];
  const index = Math.min(questionIndex, Math.max(0, items.length - 1));
  const item = items[index];
  const questionMap: QuestionMapItem[] = items.map((question, i) => ({
    number: i + 1,
    status: question.answerText?.trim() ? "answered" : "unanswered",
    sectionTitle: question.sectionTitle ?? undefined,
  }));

  let message = "No answers to show.";
  if (loadingDetails || (allowed && !review && !reviewError)) message = "Loading your answers...";
  else if (detailsError || reviewError) message = detailsError ?? reviewError ?? message;
  else if (!sessionId) message = "Choose an exam from Dashboard or Archive.";
  else if (!allowed) message = "Your teacher has not allowed answer review for this exam.";

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[var(--bg-sidebar)] text-[var(--text-primary)]">
      <header className="h-14 shrink-0 grid grid-cols-[1fr_minmax(0,20rem)_1fr] items-center gap-4 px-6 border-b border-[var(--border-primary)]">
        <div className="flex min-w-0 items-center gap-5">
          <span className="text-lg font-bold text-[var(--text-inverted)]">Cont/x</span>
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-inverted-secondary)]">{details?.examTitle}</span>
        </div>
        <div className="text-center font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-inverted-secondary)]">
          View Answers
          {items.length > 0 && (
            <div aria-hidden="true" className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--bg-app)]">
              <div className="h-full rounded-full bg-[var(--text-secondary)]" style={{ width: `${((index + 1) / items.length) * 100}%` }} />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigateTo(reviewOrigin)}
          className={`${navigationButton} justify-self-end border-[var(--border-subtle)] px-3 py-1.5`}
        >
          Return to {reviewOrigin === "archive" ? "Archive" : "Dashboard"}
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        <main className="flex-1 min-w-0 overflow-y-auto bg-[var(--bg-app)] p-6">
          {item ? (
            <>
              {item.sectionTitle && <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-secondary)]">{item.sectionTitle}</p>}
              <h2 className="text-[22px] font-semibold leading-tight">{item.title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap text-[var(--text-secondary)]">{item.prompt}</p>
              {item.type === "mcq" && item.options?.length ? (
                <>
                  <MultipleChoiceOptions options={item.options} selectedId={item.selectedOptionId} />
                  {!item.selectedOptionId && <p className="mt-3 text-sm text-[var(--text-secondary)]">No answer provided</p>}
                  {item.selectedOptionId && !item.options.some((option) => option.id === item.selectedOptionId) && (
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">Your answer: {item.answerText}</p>
                  )}
                </>
              ) : <WrittenAnswers item={item} />}
            </>
          ) : (
            <div role={detailsError || reviewError ? "alert" : "status"} className="text-sm text-[var(--text-secondary)]">
              <p>{message}</p>
              {reviewError && <button type="button" onClick={retry} className="mt-2 underline cursor-pointer">Retry review</button>}
            </div>
          )}
        </main>
        {items.length > 0 && (
          <aside aria-label="Question map" className="w-40 md:w-[220px] shrink-0 overflow-y-auto border-l border-[var(--border-primary)] p-4">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-inverted-secondary)]">Question map</p>
            <QuestionMapGrid items={questionMap} currentNumber={index + 1} onNavigate={(number) => setQuestionIndex(number - 1)} />
          </aside>
        )}
      </div>

      {items.length > 0 && (
        <footer className="h-16 shrink-0 flex items-center justify-between gap-3 px-6 border-t border-[var(--border-primary)]">
          <button type="button" disabled={index === 0} onClick={() => setQuestionIndex(index - 1)} className={`${navigationButton} border-[var(--border-primary)]`}><ChevronLeft size={16} /> Previous</button>
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-inverted-secondary)]" aria-live="polite">Question {index + 1} of {items.length}</span>
          <button type="button" disabled={index === items.length - 1} onClick={() => setQuestionIndex(index + 1)} className={`${navigationButton} border-[var(--border-subtle)]`}>Next <ChevronRight size={16} /></button>
        </footer>
      )}
    </div>
  );
}
