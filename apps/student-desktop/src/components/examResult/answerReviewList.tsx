import type { ReviewItem } from "../../services/examService";

interface AnswerReviewListProps {
  items: ReviewItem[];
  keysRevealed: boolean;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}
function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
export function AnswerReviewList({ items, keysRevealed, isLoading, error, onRetry }: AnswerReviewListProps) {
  if (error) return <div role="alert" className="text-sm text-[#ef4444]"><p>{error}</p><button type="button" onClick={onRetry} className="underline">Retry review</button></div>;
  if (isLoading && items.length === 0) return <p role="status" className="text-sm text-[var(--text-secondary)]">Loading your answers...</p>;
  if (items.length === 0) return <p className="text-sm text-[var(--text-secondary)]">No answers to show.</p>;
  return <section className="flex flex-col gap-4">
    <h2 className="font-[var(--font-headline)] text-xl">Review Your Answers</h2>
    {items.map((item, index) => <div key={item.key} className="flex flex-col gap-3">
      {item.sectionTitle && item.sectionTitle !== items[index - 1]?.sectionTitle && <p className="font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">{item.sectionTitle}</p>}
      <article className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4"><h3 className="text-[var(--text-primary)] font-semibold">{index + 1}. {item.title}</h3><span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">{formatPoints(item.score)} / {formatPoints(item.maxPoints)} pts</span></div>
        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">{item.prompt}</p>
        <div className="text-sm"><p className="text-[var(--text-secondary)]">Your answer</p><pre className="whitespace-pre-wrap break-words bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg p-3 text-xs">{item.answerText?.trim() ? item.answerText : "No answer provided"}</pre></div>
        {keysRevealed && <div className="text-sm"><p className="text-[var(--accent-green)]">{item.type === "coding" ? "Reference solution" : "Correct answers"}</p>{item.correctAnswers.length === 0 ? <p className="text-[var(--text-secondary)]">No reference answer provided.</p> : item.correctAnswers.map((answer, answerIndex) => <pre key={answerIndex} className="whitespace-pre-wrap break-words text-xs">{answer}</pre>)}</div>}
      </article>
    </div>)}
  </section>;
}
