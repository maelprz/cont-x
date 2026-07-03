import { useState } from "react";
import { Trash2 } from "lucide-react";
import type {
  ExamBuilderScreenProps,
  BuilderQuestion,
  MCQBuilderQuestion,
  CodingBuilderQuestion,
  QuestionType,
} from "./examBuilderScreen.types";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { QuestionListPanel } from "../../components/examBuilder/questionListPanel";
import { MCQEditorPanel } from "../../components/examBuilder/mcqEditorPanel";
import { CodingEditorPanel } from "../../components/examBuilder/codingEditorPanel";

// ---------------------------------------------------------------------------
// Mock data — replace with real Supabase query when wiring up
// ---------------------------------------------------------------------------
const MOCK_QUESTIONS: BuilderQuestion[] = [
  {
    id: "q1",
    number: 1,
    title: "Data Types in Python",
    type: "multiple-choice",
    points: 5,
    description: "Which of the following data types in Python is **immutable**?",
    options: [
      { id: "o1", text: "Tuple",      isCorrect: true  },
      { id: "o2", text: "List",       isCorrect: false },
      { id: "o3", text: "Dictionary", isCorrect: false },
      { id: "o4", text: "Set",        isCorrect: false },
    ],
  },
  {
    id: "q2",
    number: 2,
    title: "Fibonacci Sequence Generator",
    type: "coding",
    points: 20,
    description:
      "Write a function `fibonacci(n)` that returns the n-th number in the Fibonacci sequence.\n\nConstraints:\n- 0 ≤ n ≤ 30\n- Sequence starts with 0, 1, 1, 2, 3...",
    starterCode: "def fibonacci(n):\n    # Your code here\n    pass",
    filename: "main.py",
    testCases: [{ id: "t1", input: "5", expectedOutput: "5", isHidden: false }],
    programType: "cProgram", // default to full program mode
    mainCode: "", // no teacher main code yet
    deductionPerAttempt: 0, // no penalty set yet
  },
  {
    id: "q3",
    number: 3,
    title: "Balanced Brackets Parser",
    type: "coding",
    points: 15,
    description: "Write a function that checks if brackets are balanced.",
    starterCode: "def is_balanced(s):\n    pass",
    filename: "main.py",
    testCases: [],
    programType: "cProgram", // default to full program mode
    mainCode: "", // no teacher main code yet
    deductionPerAttempt: 0, // no penalty set yet
  },
];

// ---------------------------------------------------------------------------
// Main screen — named export (not default)
// ---------------------------------------------------------------------------

export function ExamBuilderScreen({
  questions: externalQuestions,
  activeQuestionId: externalActiveId,
  onSelectQuestion,
  onAddQuestion,
  onReorderQuestions,
  onDiscardQuestion,
  onDeleteQuestion,
  onPreviewExam,
  onSaveExam,
  onPreviewRendered,
  onSaveAndContinue,
}: ExamBuilderScreenProps) {
  const [questions, setQuestions] = useState<BuilderQuestion[]>(
    externalQuestions ?? MOCK_QUESTIONS
  );
  const [activeId, setActiveId] = useState<string>(
    externalActiveId ?? MOCK_QUESTIONS[0].id
  );

  const activeQuestion = questions.find((q) => q.id === activeId) ?? questions[0];
  const [editorTab, setEditorTab] = useState<QuestionType>(activeQuestion?.type ?? "multiple-choice");

  const handleSelectQuestion = (id: string) => {
    setActiveId(id);
    const q = questions.find((q) => q.id === id);
    if (q) setEditorTab(q.type);
    onSelectQuestion?.(id);
  };

  const handleQuestionChange = (updated: BuilderQuestion) =>
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));

  const handleTabSwitch = (tab: QuestionType) => {
    setEditorTab(tab);
    if (!activeQuestion || activeQuestion.type === tab) return;

    const base = {
      id: activeQuestion.id,
      number: activeQuestion.number,
      title: activeQuestion.title,
      points: activeQuestion.points,
      description: activeQuestion.description,
    };

    const converted: BuilderQuestion =
      tab === "multiple-choice"
        ? { ...base, type: "multiple-choice", options: [{ id: "o1", text: "", isCorrect: true }, { id: "o2", text: "", isCorrect: false }] }
        : { ...base, type: "coding", starterCode: "", filename: "main.py", testCases: [] , programType: "cProgram", mainCode: "", deductionPerAttempt: 0 };

    setQuestions((prev) => prev.map((q) => (q.id === converted.id ? converted : q)));
  };

  const isMCQ = editorTab === "multiple-choice";

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-base-200)" }}>
      <TeacherSidebar activeItem="examBuilder" />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TeacherHeader />

        <div className="flex flex-1 overflow-hidden min-w-0">
          {/* Left: question list */}
          <QuestionListPanel
            questions={questions}
            activeId={activeId}
            onSelectQuestion={handleSelectQuestion}
            onAddQuestion={onAddQuestion}
            onReorderQuestions={onReorderQuestions}
          />

          {/* Right: editor */}
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Editor top bar */}
            <div
              className="flex items-start justify-between px-7 py-4 border-b flex-shrink-0"
              style={{ borderColor: "var(--color-base-300)" }}
            >
              <div>
                <h1 className="text-[24px] font-bold leading-tight mb-0.5" style={{ color: "var(--color-base-content)" }}>
                  Edit Question
                </h1>
                <p className="text-[13px]" style={{ color: "var(--color-base-content)", opacity: 0.6 }}>
                  {isMCQ
                    ? "Configure your multiple choice question and correct options."
                    : "Configure your coding challenge requirements and test cases."}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={onPreviewExam}
                  className="px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
                  style={{ borderColor: "var(--color-base-300)", color: "var(--color-base-content)", backgroundColor: "var(--color-base-100)" }}
                >
                  Preview Exam
                </button>
                <button
                  onClick={onSaveExam}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-opacity hover:opacity-90 border-none"
                  style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
                >
                  Save Question
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-7 py-5">
              {/* Type toggle */}
              <div className="inline-flex rounded-lg p-0.5 mb-6" style={{ backgroundColor: "var(--color-base-300)" }}>
                {(["multiple-choice", "coding"] as QuestionType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabSwitch(tab)}
                    className="px-4 py-1.5 rounded-md text-[13px] font-mono font-semibold cursor-pointer border-none transition-colors duration-150"
                    style={{
                      backgroundColor: editorTab === tab ? "var(--color-base-100)" : "transparent",
                      color: editorTab === tab ? "var(--color-secondary)" : "var(--color-base-content)",
                      opacity: editorTab === tab ? 1 : 0.6,
                    }}
                  >
                    {tab === "multiple-choice" ? "Multiple Choice" : "Coding Question"}
                  </button>
                ))}
              </div>

              {/* Editor panel */}
              {activeQuestion && (
                isMCQ ? (
                  <MCQEditorPanel
                    question={
                      activeQuestion.type === "multiple-choice"
                        ? (activeQuestion as MCQBuilderQuestion)
                        : { ...activeQuestion, type: "multiple-choice", options: [] } as MCQBuilderQuestion
                    }
                    onChange={handleQuestionChange}
                    onPreviewRendered={onPreviewRendered}
                  />
                ) : (
                  <CodingEditorPanel
                    question={
                      activeQuestion.type === "coding"
                        ? (activeQuestion as CodingBuilderQuestion)
                        : { ...activeQuestion, type: "coding", starterCode: "", filename: "main.py", testCases: [] , programType: "cProgram", mainCode: "", deductionPerAttempt: 0 } as CodingBuilderQuestion
                    }
                    onChange={handleQuestionChange}
                    onPreviewRendered={onPreviewRendered}
                  />
                )
              )}

              {/* Bottom action row */}
              <div
                className="flex items-center justify-between mt-8 pt-5 border-t"
                style={{ borderColor: "var(--color-base-300)" }}
              >
                <button
                  onClick={() => onDeleteQuestion?.(activeQuestion?.id ?? "")}
                  className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer border-none bg-transparent transition-opacity hover:opacity-70"
                  style={{ color: "var(--color-error)" }}
                >
                  <Trash2 size={14} />
                  Delete Question
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onDiscardQuestion}
                    className="px-5 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
                    style={{ borderColor: "var(--color-base-300)", color: "var(--color-base-content)", backgroundColor: "transparent" }}
                  >
                    Discard
                  </button>
                  <button
                    onClick={onSaveAndContinue}
                    className="px-5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
                  >
                    Save &amp; Continue
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}