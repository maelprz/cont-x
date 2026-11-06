// ---------------------------------------------------------------------------
// Question types
// ---------------------------------------------------------------------------

export type QuestionType = 'coding' | 'multiple-choice' | 'fill-in-the-blank';

export type QuestionStatus = 'unanswered' | 'answered' | 'flagged';

// Question map entry — one per question in the exam
export interface QuestionMapItem {
  number: number;
  status: QuestionStatus;
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

// Fill-in-the-blank: the prompt is the body text, the student types one short answer.
// The accepted answers never reach the client, grading happens on the server.
export interface FITBQuestion extends BaseQuestion {
  type: 'fill-in-the-blank';
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