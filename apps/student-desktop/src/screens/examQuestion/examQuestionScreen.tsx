import { useState } from 'react';
import { useRouterLogic } from '../../router/routerLogic';
import type {
  ExamQuestionScreenProps,
  QuestionMapItem,
  QuestionStatus,
  CodingQuestion,
  MCQQuestion,
  Question,
} from './examQuestionScreen.types';

// ---------------------------------------------------------------------------
// Mock data — replace with real store/hook values when wiring up
// ---------------------------------------------------------------------------

const MOCK_QUESTION_MAP: QuestionMapItem[] = [
  { number: 1,  status: 'answered' },
  { number: 2,  status: 'answered' },
  { number: 3,  status: 'answered' },
  { number: 4,  status: 'answered' },
  { number: 5,  status: 'answered' },
  { number: 6,  status: 'answered' },
  { number: 7,  status: 'unanswered' },
  { number: 8,  status: 'flagged'  },
  { number: 9,  status: 'unanswered' },
  { number: 10, status: 'unanswered' },
  { number: 11, status: 'unanswered' },
  { number: 12, status: 'unanswered' },
  { number: 13, status: 'unanswered' },
  { number: 14, status: 'unanswered' },
  { number: 15, status: 'unanswered' },
  { number: 16, status: 'unanswered' },
  { number: 17, status: 'unanswered' },
  { number: 18, status: 'unanswered' },
  { number: 19, status: 'unanswered' },
  { number: 20, status: 'unanswered' },
];

const MOCK_CODING_QUESTION: CodingQuestion = {
  number: 20,
  totalQuestions: 20,
  type: 'coding',
  title: 'Question 7',
  body: 'Implement a function that finds the longest palindromic substring in a given string. A palindrome is a sequence that reads the same backward as forward.',
  codeSnippet: `// Example\n\nInput: "babad"\nOutput: "bab"\n(Note: "aba" is also a valid answer)`,
  constraints: [
    '1 <= s.length <= 1000',
    's consists of only digits and English letters',
    'Time complexity: O(n²) preferred',
  ],
  starterCode: `function longestPalindrome(s) {\n  // Write your code here\n  let result = "";\n\n  return result;\n}`,
  isFlagged: false,
};

const MOCK_MCQ_QUESTION: MCQQuestion = {
  number: 20,
  totalQuestions: 20,
  type: 'multiple-choice',
  title: 'Question 3',
  body: 'Which of the following best describes the time complexity of binary search on a sorted array of n elements?',
  options: [
    { id: 'A', text: 'O(n) — Linear time, scanning each element once' },
    { id: 'B', text: 'O(log n) — Logarithmic time, halving the search space each step' },
    { id: 'C', text: 'O(n²) — Quadratic time, comparing all pairs' },
    { id: 'D', text: 'O(1) — Constant time, direct index access' },
  ],
  selectedOptionId: undefined,
  isFlagged: false,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function statusStyle(status: QuestionStatus, isCurrent: boolean): string {
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

// Coding pane: simple read-only code display with line numbers
// (swap for MonacoEditorPane when wiring up real editor)
function CodeEditor({
  code,
  onRunTests,
  onRunCode,
}: {
  code: string;
  onRunTests?: () => void;
  onRunCode?: () => void;
}) {
  const lines = code.split('\n');
  return (
    <div className="flex flex-col h-full">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-app)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onRunTests}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-primary)] bg-transparent text-[var(--text-secondary)] text-[12px] font-semibold font-mono cursor-pointer hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors duration-150"
          >
            Run Tests
          </button>
          <button
            onClick={onRunCode}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[12px] font-bold font-mono cursor-pointer transition-transform duration-150 hover:scale-[1.02] bg-[image:var(--button-gradient)] text-[var(--button-gradient-text)]"
          >
            Run Code
          </button>
        </div>
      </div>

      {/* Code area */}
      <div className="flex-grow overflow-auto bg-[var(--bg-app)] p-4">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="leading-6">
                <td className="pr-4 text-right text-[var(--text-secondary)] font-mono text-[13px] select-none w-8 align-top">
                  {i + 1}
                </td>
                <td className="font-mono text-[13px] text-[var(--text-primary)] whitespace-pre align-top">
                  {/* Very basic syntax highlight — function names in primary */}
                  {line.split(/(\bfunction\b|\breturn\b|\blet\b|\bconst\b|\bvar\b)/).map((part, j) =>
                    ['function', 'return', 'let', 'const', 'var'].includes(part)
                      ? <span key={j} className="text-[var(--warning-text)]">{part}</span>
                      : <span key={j}>{part}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// MCQ answer options
function MCQOptions({
  options,
  selectedId,
  onSelect,
}: {
  options: MCQQuestion['options'];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 mt-6 w-full min-w-0">
      {options.map(({ id, text }) => {
        const isSelected = selectedId === id;
        return (
          <button
            key={id}
            onClick={() => onSelect?.(id)}
            className={`
              flex items-start gap-4 w-full max-w-full text-left px-5 py-4 rounded-lg border
              cursor-pointer transition-all duration-150 box-border overflow-hidden
              ${isSelected
                ? 'border-[var(--text-primary)] bg-[var(--bg-app)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-sidebar)]'
              }
            `}
          >
            {/* Option letter badge */}
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
              {id}
            </span>
            <span
              className={`text-[14px] leading-relaxed min-w-0 flex-1 break-words whitespace-normal ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-inverted)]'}`}
            >
              {text}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen — named export (not default)
// ---------------------------------------------------------------------------

export function ExamQuestionScreen({
  examTitle        = 'Advanced Algorithms',
  timeLeftSeconds  = 6126,
  progressCurrent  = 6,
  progressTotal    = 20,
  questionMap      = MOCK_QUESTION_MAP,
  question         = MOCK_CODING_QUESTION as Question,
  onNavigate,
  onFlag,
  onAnswerSelect,
  onRunTests,
  onRunCode,
  onPrevious,
  onNext,
  onSubmit,
}: ExamQuestionScreenProps) {
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  // Local MCQ selection state — will be lifted via onAnswerSelect when wired up
  const [localSelectedOption, setLocalSelectedOption] = useState<string | undefined>(
    question.type === 'multiple-choice' ? question.selectedOptionId : undefined
  );
  
  const handleOptionSelect = (id: string) => {
    setLocalSelectedOption(id);
    onAnswerSelect?.(question.number, id);
  };

  const handleOnSubmit = () => {
    onSubmit?.();
    navigateTo('examResult');
  }

  const progressPct = Math.round((progressCurrent / progressTotal) * 100);
  const isCoding = question.type === 'coding';
  const isLastQuestion = question.number >= question.totalQuestions;
  const codingQ  = isCoding ? (question as CodingQuestion) : null;
  const mcqQ     = !isCoding ? (question as MCQQuestion) : null;
  
  return (
    <div
      className="h-screen w-full flex flex-col text-[var(--text-primary)] overflow-hidden bg-[var(--bg-sidebar)]"
    >
      {/* ── Top navigation bar ──────────────────────────────────────── */}
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

          {/* Timer — height capped to fit header row */}
          <div
            className="flex items-center gap-2 px-3 rounded-lg border border-[var(--border-subtle)] flex-shrink-0 h-9"
          >
            <div className="flex flex-col items-end justify-center leading-none">
              <span className="font-mono text-[8px] font-semibold tracking-[0.15em] uppercase text-[var(--text-inverted-secondary)]">
                Time Left
              </span>
              <span className="font-mono text-[15px] font-bold text-[var(--text-inverted)] leading-tight tracking-tight">
                {formatTime(timeLeftSeconds)}
              </span>
            </div>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#adc6ff" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
        </div>
      </header>

      {/* ── Body: sidebar + content ──────────────────────────────────── */}
      <div className="flex flex-grow overflow-hidden">

        {/* ── Left Pane: question pane ──────────────────────────────────── */}
        <section
          className={`flex flex-col overflow-y-auto bg-[var(--bg-app)] border-r border-[var(--border-primary)] min-w-0 ${isCoding ? 'w-[420px] flex-shrink-0' : 'flex-1'}`}
        >
          {/* Question header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
            <h2 className="text-[22px] font-semibold text-[var(--text-primary)] leading-tight">
              {question.title}
            </h2>
            <button
              onClick={() => onFlag?.(question.number)}
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
              />
            )}
          </div>
        </section>

        {/* ── Center Pane: Code editor (coding only) ─────────────────── */}
        {isCoding && codingQ && (
          <section className="flex-grow flex flex-col overflow-hidden bg-[var(--bg-app)] min-w-0">
            <CodeEditor
              code={codingQ.starterCode ?? ''}
              onRunTests={onRunTests}
              onRunCode={onRunCode}
            />
          </section>
        )}
        {/* ── Right sidebar: question map ─────────────────────────────── */}
        <aside className="w-[220px] flex-shrink-0 flex flex-col border-l border-[var(--border-primary)] bg-[var(--bg-sidebar)] overflow-y-auto">
          <div className="p-4 flex-grow">
            <p className="font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-[var(--text-inverted-secondary)] mb-3">
              Question Map
            </p>
            <QuestionMapGrid
              items={questionMap}
              currentNumber={question.number}
              onNavigate={onNavigate}
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

      {/* ── Bottom action bar ───────────────────────────────────────── */}
      <footer
        className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-t border-[var(--border-primary)] backdrop-blur-sm bg-[var(--bg-sidebar)]"
      >
        {/* Previous */}
        <div className="flex items-center gap-3">
          <button
            onClick={onPrevious}
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
        {/* Merged Next/Submit button — Submit only appears on the last question */}
          <button
            onClick={isLastQuestion ? handleOnSubmit : onNext}
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