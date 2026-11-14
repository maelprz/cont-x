// Confirmation step shown before a student's answers are sent for grading.
export interface SubmitConfirmationModalProps {
  isOpen: boolean; 
  totalCount: number; 
  answeredCount: number; 
  flaggedCount: number; 
  isSubmitting: boolean; 
  onConfirm: () => void;
  onCancel: () => void; 
}

export function SubmitConfirmationModal({
  isOpen,
  totalCount,
  answeredCount,
  flaggedCount,
  isSubmitting,
  onConfirm,
  onCancel,
}: SubmitConfirmationModalProps) {
  if (!isOpen) return null; 

  const unansweredCount = Math.max(totalCount - answeredCount, 0); 

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-[8px] bg-black/40">
      {/* Modal card */}
      <div className="w-full max-w-md rounded-xl overflow-hidden border border-[var(--border-primary)] bg-[var(--bg-sidebar)]">
        <div className="p-8 flex flex-col gap-6">
          {/* Header */}
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-1 bg-[var(--icon-primary)] border border-[var(--icon-border)]">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--icon-fill)"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <h2 className="text-[24px] font-semibold text-[var(--text-inverted)] tracking-tight">
              Submit your answers?
            </h2>
            <p className="text-[14px] text-[var(--text-inverted-secondary)] leading-relaxed max-w-[340px]">
              Once you submit, your answers are sent for grading and you cannot
              return to this exam.
            </p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-[var(--border-primary)] p-3 text-center">
              <p className="font-mono text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--text-inverted-secondary)] mb-1">
                Answered
              </p>
              <p className="text-[var(--text-inverted)] text-[20px] font-semibold">
                {answeredCount}/{totalCount}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] p-3 text-center">
              <p className="font-mono text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--text-inverted-secondary)] mb-1">
                Unanswered
              </p>
              <p className="text-[var(--text-inverted)] text-[20px] font-semibold">
                {unansweredCount}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] p-3 text-center">
              <p className="font-mono text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--text-inverted-secondary)] mb-1">
                Flagged
              </p>
              <p className="text-[var(--text-inverted)] text-[20px] font-semibold">
                {flaggedCount}
              </p>
            </div>
          </div>

          {/* Warning, only shown when something is left blank */}
          {unansweredCount > 0 && (
            <p className="text-center text-[13px] font-semibold text-[var(--warning-icon)]">
              You still have {unansweredCount} unanswered{" "}
              {unansweredCount === 1 ? "question" : "questions"}.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 px-5 py-3 rounded-lg border border-[#adc6ff]/60 bg-transparent text-[#adc6ff] text-[14px] font-semibold cursor-pointer hover:bg-[#adc6ff]/10 hover:border-[#adc6ff] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Review Answers
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="flex-1 px-5 py-3 rounded-lg border border-[#adc6ff] bg-[#adc6ff] text-[#00285d] text-[14px] font-bold cursor-pointer hover:bg-[#c5d7ff] hover:border-[#c5d7ff] transition-colors duration-150 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="animate-spin"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      opacity="0.25"
                    />
                    <path
                      fill="currentColor"
                      opacity="0.75"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit Exam"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}