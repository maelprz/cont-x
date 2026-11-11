// ---------------------------------------------------------------------------
// Question types
// ---------------------------------------------------------------------------

export type QuestionType = 'coding' | 'multiple-choice' | 'fill-in-blank';

export type QuestionStatus = 'unanswered' | 'answered' | 'flagged';

// Question map entry — one per question in the exam
export interface QuestionMapItem {
  number: number;
  status: QuestionStatus;
  sectionTitle?: string; // the section this question is in, so the map can show headings
  locked?: boolean; // true while the exam must be answered in order and this question is not reachable yet
}

// Multiple-choice option
export interface MCQOption {
  id: string;       // e.g. 'A', 'B', 'C', 'D'
  text: string;
}

// Shared fields every question has
interface BaseQuestion {
  number: number;
  totalQuestions: number;
  title: string;
  body: string;
  type: QuestionType;
  isFlagged?: boolean;
  sectionTitle?: string; // shown above the question when the exam has sections
}

// Coding question extras
export interface CodingQuestion extends BaseQuestion {
  type: 'coding';
  codeSnippet?: string;          // example block shown in the problem pane
  constraints?: string[];        // bullet list under CONSTRAINTS
  starterCode?: string;          // pre-filled code in the editor
  filename?: string;             // e.g. 'solution.js'
  language?: string;             // Monaco language mode, e.g. 'c'
  programType?: 'cFunction' | 'cProgram'; // NEW — needed by the compiler IPC call
  mainCode?: string;                     // NEW — hidden main for "function" type
  checkPenaltyPerAttempt?: number;       // NEW — used by Run Code scoring
}

// Multiple-choice question extras
export interface MCQQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: MCQOption[];
  selectedOptionId?: string;     // currently selected answer
}

// Fill-in-the-blank extras: one text box
export interface FITBQuestion extends BaseQuestion {
  type: 'fill-in-blank';
  answerText?: string;           // what the student has typed so far
}

export type Question = CodingQuestion | MCQQuestion | FITBQuestion;

// ---------------------------------------------------------------------------
// Screen props
// ---------------------------------------------------------------------------

export interface ExamQuestionScreenProps {
  // Exam-level
  examTitle?: string;
  timeLeftSeconds?: number;
  progressCurrent?: number;      // how many questions answered
  progressTotal?: number;
  questionMap?: QuestionMapItem[];

  // Current question
  question?: Question;

  // Callbacks
  onNavigate?: (questionNumber: number) => void;
  onFlag?: (questionNumber: number) => void;
  onAnswerSelect?: (questionNumber: number, optionId: string) => void;
  onCodeChange?: (questionNumber: number, code: string) => void;
  onRunTests?: () => void;
  onRunCode?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
}