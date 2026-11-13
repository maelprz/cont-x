export type QuestionType = "multiple-choice" | "coding" | "fill-in-the-blank";

export interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

// Shared fields across all question types
interface BaseBuilderQuestion {
  id: string;
  number: number;
  title: string;
  type: QuestionType;
  points: number;
  description: string; // markdown
  sectionId?: string | null; // the exam section this question sits in; null/absent = no sections used
  topicIds?: string[]; // legacy questions may need classification before their next save/publish
  sourceBankQuestionId?: string; // authorizes the original topics on a new independent exam copy
}

export interface MCQBuilderQuestion extends BaseBuilderQuestion {
  type: "multiple-choice";
  options: MCQOption[];
}

export type CodingProgramType = "cProgram" | "cFunction";

export interface CodingBuilderQuestion extends BaseBuilderQuestion {
  type: "coding";
  starterCode: string;
  testCases: TestCase[];
  programType: CodingProgramType;
  mainCode: string;
  deductionPerAttempt: number;
  referenceSolution: string;
}

// One answer a fill-in-the-blank question accepts, e.g. "PPT" and "PowerPoint" are two of them.
export interface FITBAnswer {
  id: string;
  text: string;
}

// An identification question: the student types an answer, and it is correct if it
// matches ANY of the accepted answers.
export interface FITBBuilderQuestion extends BaseBuilderQuestion {
  type: "fill-in-the-blank";
  acceptedAnswers: FITBAnswer[];
  caseSensitive: boolean; // false: "Stack" and "stack" both count
  ignoreExtraSpaces: boolean; // true: leading, trailing and repeated spaces are ignored
}

export type BuilderQuestion = MCQBuilderQuestion | CodingBuilderQuestion | FITBBuilderQuestion;

// One bank question sitting inside a random pool. Only enough to show it in
// the builder — the full question stays in the bank and is what gets served.
export interface PoolItem {
  bankQuestionId: string;
  title: string;
  type: QuestionType;
  points: number;
  topics?: { id: string; name: string }[]; // display metadata; associations remain on the bank question
}

// A "pick N of M" group: students get pickCount questions drawn from items.
export interface BuilderPool {
  id: string;
  title: string;
  pickCount: number;
  // null = every question keeps its own points; a number forces them all to that value
  pointsPerQuestion: number | null;
  items: PoolItem[];
  sectionId?: string | null; // the exam section this pool sits in; null/absent = no sections used
}

// A titled part of an exam, e.g. "Part 1 - Multiple choice". The array order is the section order.
export interface BuilderSection {
  id: string;
  title: string;
}

export interface ExamBuilderScreenProps {
  examCode?: string;
  questions?: BuilderQuestion[];
  activeQuestionId?: string;
  onSelectQuestion?: (id: string) => void;
  onAddQuestion?: () => void;
  onReorderQuestions?: () => void;
  onSaveQuestion?: (question: BuilderQuestion) => void;
  onDiscardQuestion?: () => void;
  onDeleteQuestion?: (id: string) => void;
  onPreviewExam?: () => void;
  onSaveExam?: () => void;
  onPreviewRendered?: () => void;
  onSaveAndContinue?: () => void;
}
