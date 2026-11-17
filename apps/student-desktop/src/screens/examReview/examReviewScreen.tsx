import { useState } from "react";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";
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
  const answerStyle = "rounded-lg border p-4 min-w-0";
  const textStyle = "mt-2 whitespace-pre-wrap wrap-break-word text-sm";
  const isFitb = item.type === "fitb";
  const correct = item.score > 0;
  return (
    <div className={`mt-6 grid gap-3 ${item.type === "coding" ? "lg:grid-cols-2" : ""}`}>
      <section className={`${answerStyle} ${isFitb ? correct ? "border-green-600 bg-green-50" : "border-red-500 bg-red-50" : "border-[var(--border-primary)] bg-white"}`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Your answer</h3>
          {isFitb && <span className={`flex items-center gap-1 text-sm font-semibold ${correct ? "text-green-700" : "text-red-700"}`}>{correct ? <Check size={16} /> : <X size={16} />}{correct ? "Correct" : "Wrong"}</span>}
        </div>
        <pre className={textStyle}>{item.answerText?.trim() ? item.answerText : "No answer provided"}</pre>
      </section>
      <section className={`${answerStyle} border-[var(--border-primary)] bg-white`}>
        <h3 className="text-sm font-semibold">{item.type === "coding" ? "Reference solution" : "Accepted answers"}</h3>
        {item.correctAnswers.length > 0
          ? item.correctAnswers.map((answer, index) => <pre key={index} className={textStyle}>{answer}</pre>)
          : <p className="mt-2 text-sm">No reference answer provided.</p>}
      </section>
    </div>
  );
}

function VisibleCodingTests({ item }: { item: ReviewItem }) {
  const review = item.codingReview;
  const tests = review?.tests ?? [];
  const recorded = tests.filter((test) => test.passed !== null);
  const passed = recorded.filter((test) => test.passed).length;
  return (
    <section className="mt-6" aria-label="Visible test case results">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Visible test cases</h3>
        {recorded.length > 0 && <p className="text-sm">{passed} / {recorded.length} passed</p>}
      </div>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Results for your final submitted code. Hidden test cases are excluded from this breakdown.</p>
      {review?.status === 'compile_error' && <p className="mt-3 text-sm text-red-700">Your submitted code did not compile. Test cases could not run.</p>}
      {review?.status === 'unanswered' && <p className="mt-3 text-sm">No code was submitted.</p>}
      {(!review || review.status === 'not_recorded') && <p className="mt-3 text-sm">Final test results were not recorded for this submission.</p>}
      {review && tests.length === 0 && <p className="mt-3 text-sm">No visible test cases are available.</p>}
      <div className="mt-3 grid gap-3">
        {tests.map((test, index) => (
          <article key={test.id} className={`rounded-lg border p-4 ${test.passed === true ? 'border-green-600 bg-green-50' : test.passed === false ? 'border-red-500 bg-red-50' : 'border-stone-200 bg-white'}`}>
            <div className="flex items-center justify-between gap-3 text-sm font-semibold">
              <h4>Test case {index + 1}</h4>
              <span className={`flex items-center gap-1 ${test.passed === true ? 'text-green-700' : test.passed === false ? 'text-red-700' : 'text-stone-600'}`}>
                {test.passed === true ? <Check size={16} /> : test.passed === false ? <X size={16} /> : null}
                {test.passed === true ? 'Passed' : test.passed === false ? test.timedOut ? 'Failed · Time limit exceeded' : 'Failed' : review?.status === 'compile_error' || review?.status === 'unanswered' ? 'Not run' : 'Not recorded'}
              </span>
            </div>
            <dl className="mt-4 grid gap-4 md:grid-cols-3 text-sm">
              {([['Input', test.input], ['Expected output', test.expectedOutput], ['Your output', test.actualOutput]] as const).map(([label, value]) => (
                <div key={label} className="min-w-0"><dt className="font-semibold">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words font-mono">{value === null ? 'Not recorded' : value === '' ? '(empty)' : value}</dd></div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
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
              {item.type === 'coding' && <VisibleCodingTests item={item} />}
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
          {index < items.length - 1 ? (
            <button type="button" disabled={index === 0} onClick={() => setQuestionIndex(index - 1)} className={`${navigationButton} border-[var(--border-primary)]`}><ChevronLeft size={16} /> Previous</button>
          ) : <span aria-hidden="true" />}
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-inverted-secondary)]" aria-live="polite">Question {index + 1} of {items.length}</span>
          {index === items.length - 1 ? (
            <button type="button" onClick={() => navigateTo("examResult")} className={`${navigationButton} border-[var(--border-subtle)]`}>View Result</button>
          ) : (
            <button type="button" onClick={() => setQuestionIndex(index + 1)} className={`${navigationButton} border-[var(--border-subtle)]`}>Next <ChevronRight size={16} /></button>
          )}
        </footer>
      )}
    </div>
  );
}
