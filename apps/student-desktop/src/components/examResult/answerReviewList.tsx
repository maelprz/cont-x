import { CheckCircle2, XCircle } from "lucide-react"; // markers for right and wrong options
import type { ReviewItem } from "../../services/examService"; // shape of one reviewed question

interface AnswerReviewListProps {
  items: ReviewItem[]; // questions with the student's answers
  keysRevealed: boolean; // false while the exam period may still be open
  isLoading: boolean; // true while fetching
  error: string | null; // message if loading failed
}

// Keeps whole numbers clean and decimals readable.
function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2); // 5 stays 5, 2.5 becomes 2.50
}

export function AnswerReviewList({
  items,
  keysRevealed,
  isLoading,
  error,
}: AnswerReviewListProps) {
  if (isLoading)
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        Loading your answers...
      </p>
    ); // simple loading state
  if (error) return <p className="text-sm text-[#ef4444]">{error}</p>; // shows the server's reason
  if (items.length === 0)
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        No answers to show.
      </p>
    ); // empty guard

  return (
    // wrapper that stacks the question cards
    <section className="flex flex-col gap-4">
      {/* heading for the whole review */}
      <h2 className="font-[var(--font-headline)] text-xl">
        Review Your Answers
      </h2>
      {/* explains why correct answers may be missing */}
      {!keysRevealed && (
        <p className="text-xs text-[var(--text-secondary)]">
          Correct answers will appear once the exam period has closed.
        </p>
      )}
      {items.map((item, index) => {
        const showSection =
          item.sectionTitle &&
          item.sectionTitle !== items[index - 1]?.sectionTitle; // only label a section once
        const answered =
          item.answerText !== null && item.answerText.trim() !== ""; // blank counts as unanswered
        return (
          // one question card, keyed by its real id
          <div key={item.key} className="flex flex-col gap-3">
            {/* section label above the first question of that section */}
            {showSection && (
              <p className="font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                {item.sectionTitle}
              </p>
            )}
            {/* the card itself */}
            <article className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 flex flex-col gap-3">
              {/* title row with the points earned */}
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-[var(--text-primary)] font-semibold">
                  {index + 1}. {item.title}
                </h3>
                <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
                  {formatPoints(item.score)} / {formatPoints(item.maxPoints)}{" "}
                  pts
                </span>
              </div>
              {/* the question text, keeping line breaks */}
              <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">
                {item.prompt}
              </p>

              {/* multiple choice: list every option and mark the student's pick */}
              {item.type === "mcq" && (
                <ul className="flex flex-col gap-2">
                  {(item.options ?? []).map((option) => {
                    const picked = option.id === item.answerText; // the saved answer is the option id
                    const tone =
                      option.isCorrect === true
                        ? "border-[var(--accent-green)] bg-[var(--accent-green)]/10" // the right answer
                        : picked && option.isCorrect === false
                          ? "border-[#ef4444] bg-[rgba(239,68,68,0.1)]" // picked and wrong
                          : picked
                            ? "border-[var(--accent-blue)]" // picked, keys still hidden
                            : "border-[var(--border-subtle)]"; // not picked
                    return (
                      // one option row
                      <li
                        key={option.id}
                        className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm ${tone}`}
                      >
                        {/* icon only when keys are revealed */}
                        {option.isCorrect === true && (
                          <CheckCircle2
                            size={14}
                            className="text-[var(--accent-green)]"
                          />
                        )}
                        {picked && option.isCorrect === false && (
                          <XCircle size={14} className="text-[#ef4444]" />
                        )}
                        {/* the option label */}
                        <span className="flex-1">{option.text}</span>
                        {/* tag the student's own choice */}
                        {picked && (
                          <span className="text-[11px] uppercase text-[var(--text-secondary)]">
                            Your answer
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* fill in the blank: show what was typed, and accepted answers once revealed */}
              {item.type === "fitb" && (
                <div className="text-sm flex flex-col gap-1">
                  <p>
                    <span className="text-[var(--text-secondary)]">
                      Your answer:{" "}
                    </span>
                    {answered ? item.answerText : <em>No answer</em>}
                  </p>
                  {item.acceptedAnswers && (
                    <p className="text-[var(--accent-green)]">
                      Accepted: {item.acceptedAnswers.join(", ")}
                    </p>
                  )}
                </div>
              )}

              {/* coding: show the submitted code only, never the reference solution */}
              {item.type === "coding" && (
                <pre className="bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg p-3 text-xs overflow-x-auto">
                  {answered ? item.answerText : "No code submitted"}
                </pre>
              )}

              {/* explain any lost points so the total adds up */}
              {item.pointDeduction > 0 && (
                <p className="text-xs text-[var(--text-secondary)]">
                  {formatPoints(item.pointDeduction)} pts deducted (check
                  attempts or answer changes).
                </p>
              )}
            </article>
          </div>
        );
      })}
    </section>
  );
}
