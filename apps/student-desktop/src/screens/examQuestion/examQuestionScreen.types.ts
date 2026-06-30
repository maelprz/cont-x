// ---------------------------------------------------------------------------
// Question types
// ---------------------------------------------------------------------------

export type QuestionType = 'coding' | 'multiple-choice';

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
}

// Multiple-choice question extras
export interface MCQQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: MCQOption[];
  selectedOptionId?: string;     // currently selected answer
}

export type Question = CodingQuestion | MCQQuestion;

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
  onFinalSubmit?: () => void;
}