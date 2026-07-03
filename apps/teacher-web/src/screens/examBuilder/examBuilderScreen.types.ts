export type QuestionType = "multiple-choice" | "coding";

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

// Shared fields across both question types
interface BaseBuilderQuestion {
  id: string;
  number: number;
  title: string;
  type: QuestionType;
  points: number;
  description: string; // markdown
}

export interface MCQBuilderQuestion extends BaseBuilderQuestion {
  type: "multiple-choice";
  options: MCQOption[];
}

export type CodingProgramType = "cProgram" | "cFunction";

export interface CodingBuilderQuestion extends BaseBuilderQuestion {
  type: "coding";
  starterCode: string;
  filename: string;    // e.g. "main.py"
  testCases: TestCase[];
  programType: CodingProgramType;
  mainCode: string;
  deductionPerAttempt: number;
}

export type BuilderQuestion = MCQBuilderQuestion | CodingBuilderQuestion;

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