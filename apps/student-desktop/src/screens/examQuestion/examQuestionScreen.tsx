import { useState, useMemo, useEffect } from 'react'; // added useMemo for reshaping fetched data
import { useRouterLogic } from '../../router/routerLogic';
import { useExamSessionStore } from '../../stores/useExamSessionStore'; // real examId/sessionId from Confirmation
import { useExamQuestions } from '../../hooks/useExamQuestions'; // real question fetch
import { useExamTimer } from '../../hooks/useExamTimer'; // real countdown, based on real start time + duration
import { CodeEditor } from '../../components/examQuestion/codeEditor';
import { submitExamSession } from '../../services/examService';

import type {
  ExamQuestionScreenProps,
  QuestionMapItem,
  CodingQuestion,
  MCQQuestion,
  Question,
} from './examQuestionScreen.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function statusStyle(status: 'unanswered' | 'answered' | 'flagged', isCurrent: boolean): string {
  if (isCurrent) return 'bg-[#adc6ff] text-[#00285d] border-[#adc6ff]';
  if (status === 'answered') return 'bg-[#1c2b3c] text-[#d4e4fa] border-[#424754]';
  if (status === 'flagged')  return 'bg-transparent text-[#c2c6d6] border-[#424754]';
  return 'bg-transparent text-[#8c909f] border-[#424754]';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function QuestionMapGrid({
  items,
  currentNumber,
  onNavigate,
}: {
  items: QuestionMapItem[];
  currentNumber: number;
  onNavigate?: (n: number) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(({ number, status }) => (
        <button
          key={number}
          onClick={() => onNavigate?.(number)}
          className={`
            h-9 w-full rounded-lg border text-[12px] font-semibold font-mono
            transition-colors duration-150 cursor-pointer relative
            ${statusStyle(status, number === currentNumber)}
            ${status === 'flagged' && number !== currentNumber ? 'border-dashed' : ''}
          `}
        >
          {number}
          {status === 'flagged' && number !== currentNumber && (
            <span
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--warning-icon)]"
            />
          )}
        </button>
      ))}
    </div>
  );
}

// MCQ answer options
function MCQOptions({
  options,
  selectedId,
  onSelect,
  onClear,
}: {
  options: (MCQQuestion['options'][number] & { displayLetter?: string })[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onClear?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 mt-6 w-full min-w-0">
      {options.map(({ id, text, displayLetter }) => {
        const isSelected = selectedId === id;
        return (
          <button
            key={id}
            onClick={() => onSelect?.(id)}
            style={{ outline: 'none', boxShadow: 'none' }}
            className={`
              flex items-start gap-4 w-full max-w-full text-left px-5 py-4 rounded-lg border
              cursor-pointer transition-all duration-150 box-border overflow-hidden
              ${isSelected
                ? 'border-[#00285d] bg-[var(--bg-app)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-sidebar)]'
              }
            `}
          >
            {/* Option letter badge, shows A/B/C/D, not the raw database id */}
            <span
              className={`
                flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                font-mono text-[13px] font-bold border transition-colors duration-150
                ${isSelected
                  ? 'bg-[var(--bg-sidebar)] text-[var(--text-inverted)] border-[var(--text-subtle)]'
                  : 'bg-[var(--bg-app)] text-[var(--text-primary)] border-[var(--border-primary)]'
                }
              `}
            >
              {displayLetter ?? id}
            </span>
            <span
              className={`text-[14px] leading-relaxed min-w-0 flex-1 break-words whitespace-normal ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-inverted)]'}`}
            >
              {text}
            </span>
          </button>
        );
      })}

      {/* Clears the current selection, only shown if something is picked. Plain clickable text, not a button, so it never gets a native focus ring. */}
      {selectedId && (
        <span
          onClick={() => onClear?.()}
          className="self-end mt-1 text-[13px] font-semibold cursor-pointer text-[#00285d] hover:underline"
        >
          Clear Choice
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen, named export (not default)
// ---------------------------------------------------------------------------

export function ExamQuestionScreen({
  onNavigate,
  onFlag,
  onAnswerSelect,
  onCodeChange,
  onRunTests,
  onRunCode,
  onPrevious,
  onNext,
  onSubmit,
}: ExamQuestionScreenProps) {
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const examId = useExamSessionStore((state) => state.examId); // real exam id from Confirmation
  const examTitle = useExamSessionStore((state) => state.examTitle) ?? ''; // real exam title
  const sessionId = useExamSessionStore((state) => state.sessionId); // real session id, needed for the timer
  const { questions: fetchedQuestions, isLoading, error } = useExamQuestions(examId); // real question list

  // When the real countdown hits zero, this fires exactly once and moves
  // the student to the Result screen, same as a manual submit would.
  const handleTimeExpired = async () => {
    if (sessionId) {
      try {
        await submitExamSession(sessionId, 'timed_out'); // real write, marks this session as timed out
      } catch (err) {
        console.error('Failed to mark session as timed out:', err); // don't block navigation on this failing
      }
    }
    navigateTo('examResult');
  };

  const timeLeftSeconds = useExamTimer(sessionId, handleTimeExpired); // real countdown, ticks every second

  // Tracks which question is currently shown, by position in the loaded list.
  const [currentIndex, setCurrentIndex] = useState(0);
  // Tracks flagged state per question id, kept in memory only for now.
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  // Tracks each question's chosen MCQ option id, kept in memory only for now.
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  // Tracks each coding question's current code text, kept in memory only for now.
  const [codeByQuestion, setCodeByQuestion] = useState<Record<string, string>>({});

  // Builds the question map (sidebar grid) from the real fetched list.
  const questionMap: QuestionMapItem[] = useMemo(
    () =>
      fetchedQuestions.map((q, i) => ({
        number: i + 1, // display position, not the database id
        status: flaggedIds.has(q.id)
          ? 'flagged'
          : selectedOptions[q.id] || codeByQuestion[q.id]
            ? 'answered'
            : 'unanswered',
      })),
    [fetchedQuestions, flaggedIds, selectedOptions, codeByQuestion],
  );

  // Converts the current fetched question into the shape the existing UI expects.
  const question: Question | null = useMemo(() => {
    const raw = fetchedQuestions[currentIndex]; // the question at the current position
    if (!raw) return null; // nothing loaded yet, or index out of range

    const shared = {
      number: currentIndex + 1, // 1-based display number
      totalQuestions: fetchedQuestions.length, // real count of loaded questions
      title: raw.title,
      body: raw.prompt,
      isFlagged: flaggedIds.has(raw.id),
    };

    if (raw.type === 'coding') {
      return {
        ...shared,
        type: 'coding',
        starterCode: raw.starterCode ?? '',
        language: raw.language ?? 'c',
      } as CodingQuestion;
    }

    return {
      ...shared,
      type: 'multiple-choice',
      options: (raw.options ?? []).map((opt, i) => ({
        id: opt.id, // real UUID, still used for selection/scoring
        text: opt.text,
        displayLetter: String.fromCharCode(65 + i), // A, B, C, D... based on position
      })),
      selectedOptionId: selectedOptions[raw.id],
    } as MCQQuestion;
  }, [fetchedQuestions, currentIndex, flaggedIds, selectedOptions]);

  // Local MCQ selection state, mirrors the current question's saved choice.
  const [localSelectedOption, setLocalSelectedOption] = useState<string | undefined>(undefined);

  // Local code text, mirrors the current question's saved code.
  const [localCode, setLocalCode] = useState<string>('');

  // Re-syncs local state every time the question changes, so switching
  // questions shows the real saved answer instead of the last one typed.
  useEffect(() => {
    if (!question) return; // nothing loaded yet
    setLocalSelectedOption(question.type === 'multiple-choice' ? question.selectedOptionId : undefined);
    setLocalCode(question.type === 'coding' ? question.starterCode ?? '' : '');
  }, [question]);

  const handleOptionSelect = (id: string) => {
    if (!question || !fetchedQuestions[currentIndex]) return; // guard against no question loaded
    setLocalSelectedOption(id);
    setSelectedOptions((prev) => ({ ...prev, [fetchedQuestions[currentIndex].id]: id })); // remember this choice
    onAnswerSelect?.(question.number, id);
  };

  const handleClearOption = () => {
    if (!fetchedQuestions[currentIndex]) return; // guard against no question loaded
    const id = fetchedQuestions[currentIndex].id;
    setLocalSelectedOption(undefined); // clear the visible selection
    setSelectedOptions((prev) => {
      const next = { ...prev }; // copy so we don't mutate state directly
      delete next[id]; // remove this question's saved choice
      return next;
    });
  };

  const handleCodeChange = (code: string) => {
    if (!question || !fetchedQuestions[currentIndex]) return; // guard against no question loaded
    setLocalCode(code);
    setCodeByQuestion((prev) => ({ ...prev, [fetchedQuestions[currentIndex].id]: code })); // remember this code
    onCodeChange?.(question.number, code);
  };

  const handleFlag = () => {
    if (!question || !fetchedQuestions[currentIndex]) return; // guard against no question loaded
    const id = fetchedQuestions[currentIndex].id;
    setFlaggedIds((prev) => {
      const next = new Set(prev); // copy so we don't mutate state directly
      next.has(id) ? next.delete(id) : next.add(id); // toggle this question's flag
      return next;
    });
    onFlag?.(question.number);
  };

  const handleNavigate = (n: number) => {
    setCurrentIndex(n - 1); // convert 1-based display number to array index
    onNavigate?.(n);
  };

  const handlePrevious = () => {
    setCurrentIndex((i) => Math.max(i - 1, 0)); // never go below the first question
    onPrevious?.();
  };

  const handleNext = () => {
    setCurrentIndex((i) => Math.min(i + 1, fetchedQuestions.length - 1)); // never go past the last question
    onNext?.();
  };

  const handleOnSubmit = async () => {
  if (sessionId) {
    try {
      await submitExamSession(sessionId, 'submitted'); // real write, marks this session done
    } catch (err) {
      console.error('Failed to submit exam session:', err); // don't block navigation on this failing
    }
  }
  onSubmit?.();
  navigateTo('examResult');
}

  // Show a simple loading state while questions are being fetched.
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-[var(--text-inverted)] bg-[var(--bg-sidebar)]">
        Loading exam questions...
      </div>
    );
  }

  // Show a simple error state if the fetch failed or nothing came back.
  if (error || !question) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-[var(--text-inverted)] bg-[var(--bg-sidebar)]">
        {error ?? 'No questions found for this exam.'}
      </div>
    );
  }

  const progressCurrent = Object.keys(selectedOptions).length + Object.keys(codeByQuestion).length; // rough answered count
  const progressTotal = fetchedQuestions.length; // real total question count

  const progressPct = Math.round((progressCurrent / progressTotal) * 100);
  const isCoding = question.type === 'coding';
  const isLastQuestion = question.number >= question.totalQuestions;
  const codingQ  = isCoding ? (question as CodingQuestion) : null;
  const mcqQ     = !isCoding ? (question as MCQQuestion) : null;

  return (
    <div
      className="h-screen w-full flex flex-col text-[var(--text-primary)] overflow-hidden bg-[var(--bg-sidebar)]"
    >
      {/* Top navigation bar */}
      <header
        className="h-14 flex-shrink-0 flex items-center px-6 border-b border-[var(--border-primary)] backdrop-blur-md z-10 bg-[var(--bg-sidebar)]"
      >
        <div className="flex items-center justify-between w-full gap-4">
          {/* Brand */}
          <div className="flex flex-row items-center gap-5 flex-shrink-0">
            <span className="text-[var(--text-inverted)] text-lg font-bold tracking-tight">
              Cont/x
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-inverted-secondary)]">
              {examTitle}
            </span>
          </div>
          {/* Progress */}
          <div className="flex flex-col items-center gap-1 flex-grow max-w-xs">
            <span className="font-mono text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--text-inverted-secondary)]">
              Assessment Progress
            </span>
            <div className="w-full h-1.5 bg-[var(--bg-app)] rounded-full overflow-hidden grid grid-cols-[repeat(100,minmax(0,1fr))]">
              {Array.from({ length: 100 }, (_, index) => (
                <span
                  key={index}
                  className={index < progressPct ? 'rounded-full bg-[var(--text-secondary)]' : 'rounded-full bg-transparent'}
                />
              ))}
            </div>
          </div>

          {/* Timer, height capped to fit header row. Shows real remaining time, or "--:--:--" while it's still loading. */}
          <div
            className="flex items-center gap-2 px-3 rounded-lg border border-[var(--border-subtle)] flex-shrink-0 h-9"
          >
            <div className="flex flex-col items-end justify-center leading-none">
              <span className="font-mono text-[8px] font-semibold tracking-[0.15em] uppercase text-[var(--text-inverted-secondary)]">
                Time Left
              </span>
              <span className="font-mono text-[15px] font-bold text-[var(--text-inverted)] leading-tight tracking-tight">
                {timeLeftSeconds !== null ? formatTime(timeLeftSeconds) : '--:--:--'}
              </span>
            </div>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#adc6ff" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
        </div>
      </header>

      {/* Body: sidebar and content */}
      <div className="flex flex-grow overflow-hidden">

        {/* Left pane: question pane */}
        <section
          className={`flex flex-col overflow-y-auto bg-[var(--bg-app)] border-r border-[var(--border-primary)] min-w-0 ${isCoding ? 'w-[420px] flex-shrink-0' : 'flex-1'}`}
        >
          {/* Question header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
            <h2 className="text-[22px] font-semibold text-[var(--text-primary)] leading-tight">
              {question.title}
            </h2>
            <button
              onClick={handleFlag}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer
                transition-colors duration-150 font-mono text-[10px] font-semibold tracking-[0.15em] uppercase bg-[var(--warning-primary)] hover:bg-[var(--warning-secondary)]
                ${question.isFlagged
                  ? 'border-[var(--warning-icon)] text-[var(--warning-icon)] bg-[color:var(--warning-accent)]'
                  : 'border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-secondary)]'
                }
              `}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke={question.isFlagged ? 'var(--warning-icon)' : 'var(--text-primary)'} strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
              </svg>
            </button>
          </div>
          {/* Question body */}
          <div className="px-6 pb-4 min-w-0">
            <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed mb-5">
              {question.body}
            </p>

            {/* Coding: code snippet example */}
            {isCoding && codingQ?.codeSnippet && (
              <div
                className="rounded-lg p-4 mb-5 font-mono text-[13px] leading-relaxed overflow-x-auto bg-[var(--bg-sidebar)] border border-[var(--border-primary)]"
              >
                {codingQ.codeSnippet.split('\n').map((line, i) => {
                  const isComment = line.trim().startsWith('//');
                  const isNote    = line.trim().startsWith('(');
                  return (
                    <div key={i}
                      className={
                        isComment ? 'text-[#8c909f]' :
                        isNote    ? 'text-[#8c909f] italic' :
                        'text-[#c2c6d6]'
                      }
                    >
                      {line || '\u00A0'}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Coding: constraints */}
            {isCoding && codingQ?.constraints && (
              <>
                <p className="font-mono text-[11px] font-semibold tracking-[0.15em] uppercase text-[var(--text-secondary)] mb-3">
                  Constraints
                </p>
                <ul className="flex flex-col gap-2">
                  {codingQ.constraints.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--border-primary)] flex-shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* MCQ: options */}
            {!isCoding && mcqQ && (
              <MCQOptions
                options={mcqQ.options}
                selectedId={localSelectedOption}
                onSelect={handleOptionSelect}
                onClear={handleClearOption}
              />
            )}
          </div>
        </section>

        {/* Center pane: code editor (coding only) */}
        {isCoding && codingQ && (
          <section className="flex-grow flex flex-col overflow-hidden bg-[var(--bg-app)] min-w-0">
            <CodeEditor
              code={localCode}
              language={codingQ.language ?? 'c'}
              onChange={handleCodeChange}
              onRunTests={onRunTests}
              onRunCode={onRunCode}
            />
          </section>
        )}
        {/* Right sidebar: question map */}
        <aside className="w-[220px] flex-shrink-0 flex flex-col border-l border-[var(--border-primary)] bg-[var(--bg-sidebar)] overflow-y-auto">
          <div className="p-4 flex-grow">
            <p className="font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-[var(--text-inverted-secondary)] mb-3">
              Question Map
            </p>
            <QuestionMapGrid
              items={questionMap}
              currentNumber={question.number}
              onNavigate={handleNavigate}
            />
          </div>

          {/* Legend */}
          <div className="px-4 pb-4 flex flex-col gap-2 border-t border-[var(--border-primary)] pt-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[var(--bg-card)] border border-[var(--border-primary)]" />
              <span className="font-mono text-[10px] text-[var(--text-inverted-secondary)]">Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-transparent border border-dashed border-[var(--border-primary)] relative">
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[var(--warning-icon)]" />
              </span>
              <span className="font-mono text-[10px] text-[var(--text-inverted-secondary)]">Flagged</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom action bar */}
      <footer
        className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-t border-[var(--border-primary)] backdrop-blur-sm bg-[var(--bg-sidebar)]"
      >
        {/* Previous */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevious}
            disabled={question.number <= 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border-primary)] bg-transparent text-[var(--text-inverted)] text-[13px] font-semibold cursor-pointer hover:text-[var(--text-inverted-secondary)] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Previous
          </button>

        </div>

        {/* Auto-save indicator */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
            <span className="font-mono text-[10px] font-semibold tracking-[0.15em] uppercase text-[#8c909f]">
              Auto-Save Active
            </span>
          </div>
          <span className="font-mono text-[10px] text-[var(--border-primary)]">
            T-STAMP: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        {/* Merged Next/Submit button, Submit only appears on the last question */}
          <button
            onClick={isLastQuestion ? handleOnSubmit : handleNext}
            className={
              isLastQuestion
                ? 'flex items-center gap-2 px-6 py-2.5 rounded-lg border-none text-[13px] font-bold cursor-pointer transition-transform duration-150 hover:scale-[1.02] [background:var(--button-gradient)] text-[var(--button-gradient-text)] shadow-[0_0_20px_rgba(173,198,255,0.25)]'
                : 'flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-transparent text-[var(--text-inverted)] text-[13px] font-semibold cursor-pointer hover:text-[var(--text-inverted-secondary)] transition-colors duration-150'
            }
          >
            {isLastQuestion ? (
              'Submit'
            ) : (
              <>
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </>
            )}
          </button>
      </footer>
    </div>
  );
}