import { useState } from "react";
import {
  Plus,
  X,
  Radio,
  Code2,
  Trash2,
  Eye,
  CircleDot,
  Circle,
  Settings,
  LifeBuoy,
  LogOut,
  Bell,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import type {
  ExamBuilderScreenProps,
  BuilderQuestion,
  MCQBuilderQuestion,
  CodingBuilderQuestion,
  MCQOption,
  TestCase,
  QuestionType,
} from "./examBuilderScreen.types";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";

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
    testCases: [
      { id: "t1", input: "5", expectedOutput: "5", isHidden: false },
    ],
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
  },
];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function typeLabel(type: QuestionType) {
  return type === "multiple-choice" ? "Multiple Choice" : "Coding";
}

function QuestionListItem({
  question,
  isActive,
  onClick,
}: {
  question: BuilderQuestion;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3.5 border rounded-xl cursor-pointer transition-colors duration-150"
      style={{
        backgroundColor: isActive ? "var(--color-base-100)" : "transparent",
        borderColor: isActive ? "var(--color-secondary)" : "var(--color-base-300)",
        outline: "none",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <p
          className="font-mono text-[10px] font-semibold uppercase tracking-widest"
          style={{
            color: isActive ? "var(--color-secondary)" : "var(--color-base-content)",
            opacity: isActive ? 1 : 0.5,
          }}
        >
          Question {question.number}
        </p>
        {question.type === "coding" ? (
          <Code2
            size={14}
            style={{ color: isActive ? "var(--color-secondary)" : "var(--color-base-content)", opacity: isActive ? 1 : 0.4 }}
          />
        ) : (
          <CircleDot
            size={14}
            style={{ color: isActive ? "var(--color-secondary)" : "var(--color-base-content)", opacity: isActive ? 1 : 0.4 }}
          />
        )}
      </div>
      <p
        className="text-[14px] font-semibold leading-snug mb-0.5"
        style={{ color: "var(--color-base-content)" }}
      >
        {question.title}
      </p>
      <p
        className="text-[12px]"
        style={{
          color: isActive ? "var(--color-secondary)" : "var(--color-base-content)",
          opacity: isActive ? 1 : 0.5,
        }}
      >
        {typeLabel(question.type)} • {question.points} pts
      </p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// MCQ editor panel
// ---------------------------------------------------------------------------

function MCQEditor({
  question,
  onChange,
  onPreviewRendered,
}: {
  question: MCQBuilderQuestion;
  onChange: (q: MCQBuilderQuestion) => void;
  onPreviewRendered?: () => void;
}) {
  const setPoints = (v: string) =>
    onChange({ ...question, points: Number(v) || 0 });

  const setDescription = (v: string) =>
    onChange({ ...question, description: v });

  const setCorrect = (id: string) =>
    onChange({
      ...question,
      options: question.options.map((o) => ({ ...o, isCorrect: o.id === id })),
    });

  const setOptionText = (id: string, text: string) =>
    onChange({
      ...question,
      options: question.options.map((o) => (o.id === id ? { ...o, text } : o)),
    });

  const removeOption = (id: string) =>
    onChange({
      ...question,
      options: question.options.filter((o) => o.id !== id),
    });

  const addOption = () =>
    onChange({
      ...question,
      options: [
        ...question.options,
        { id: `o${Date.now()}`, text: "", isCorrect: false },
      ],
    });

  return (
    <div className="flex flex-col gap-6">
      {/* Points */}
      <div>
        <label
          className="block text-[13px] font-medium mb-2"
          style={{ color: "var(--color-base-content)" }}
        >
          Points
        </label>
        <input
          type="number"
          value={question.points}
          onChange={(e) => setPoints(e.target.value)}
          className="w-36 px-3 py-2 rounded-lg border text-[14px] outline-none"
          style={{
            backgroundColor: "var(--color-base-100)",
            borderColor: "var(--color-base-300)",
            color: "var(--color-base-content)",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Problem description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            className="font-mono text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-base-content)", opacity: 0.6 }}
          >
            Problem Description (Markdown)
          </label>
          <button
            onClick={onPreviewRendered}
            className="font-mono text-[11px] font-semibold cursor-pointer border-none bg-transparent"
            style={{ color: "var(--color-secondary)" }}
          >
            Preview Rendered
          </button>
        </div>
        <textarea
          value={question.description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="w-full px-3 py-2.5 rounded-lg border text-[13px] resize-y outline-none font-mono leading-relaxed"
          style={{
            backgroundColor: "var(--color-base-100)",
            borderColor: "var(--color-base-300)",
            color: "var(--color-base-content)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        />
      </div>

      {/* Question options */}
      <div>
        <p
          className="font-mono text-[11px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--color-base-content)", opacity: 0.6 }}
        >
          Question Options
        </p>
        <div className="flex flex-col gap-2.5">
          {question.options.map((opt) => (
            <div
              key={opt.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: opt.isCorrect
                  ? "var(--color-base-200)"
                  : "var(--color-base-100)",
                borderColor: opt.isCorrect
                  ? "var(--color-secondary)"
                  : "var(--color-base-300)",
              }}
            >
              {/* Radio select correct */}
              <button
                onClick={() => setCorrect(opt.id)}
                className="flex-shrink-0 cursor-pointer border-none bg-transparent p-0"
              >
                {opt.isCorrect ? (
                  <CircleDot
                    size={20}
                    style={{ color: "var(--color-secondary)" }}
                  />
                ) : (
                  <Circle
                    size={20}
                    style={{ color: "var(--color-base-content)", opacity: 0.35 }}
                  />
                )}
              </button>

              {/* Option text */}
              <input
                type="text"
                value={opt.text}
                onChange={(e) => setOptionText(opt.id, e.target.value)}
                className="flex-grow text-[14px] border-none outline-none bg-transparent"
                style={{ color: "var(--color-base-content)", fontFamily: "inherit" }}
              />

              {/* Correct label */}
              {opt.isCorrect && (
                <span
                  className="font-mono text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--color-secondary)" }}
                >
                  Correct
                </span>
              )}

              {/* Remove */}
              <button
                onClick={() => removeOption(opt.id)}
                className="flex-shrink-0 cursor-pointer border-none bg-transparent p-0 transition-opacity hover:opacity-60"
                style={{ color: "var(--color-base-content)", opacity: 0.4 }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Add option */}
        <button
          onClick={addOption}
          className="flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
          style={{
            borderColor: "var(--color-secondary)",
            color: "var(--color-secondary)",
            backgroundColor: "transparent",
          }}
        >
          <Plus size={14} />
          Add Option
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coding editor panel
// ---------------------------------------------------------------------------

function CodingEditor({
  question,
  onChange,
  onPreviewRendered,
  onAddTestCase,
}: {
  question: CodingBuilderQuestion;
  onChange: (q: CodingBuilderQuestion) => void;
  onPreviewRendered?: () => void;
  onAddTestCase?: () => void;
}) {
  const setPoints = (v: string) =>
    onChange({ ...question, points: Number(v) || 0 });

  const setDescription = (v: string) =>
    onChange({ ...question, description: v });

  const setStarterCode = (v: string) =>
    onChange({ ...question, starterCode: v });

  const setTestCaseField = (
    id: string,
    field: keyof TestCase,
    value: string | boolean
  ) =>
    onChange({
      ...question,
      testCases: question.testCases.map((t) =>
        t.id === id ? { ...t, [field]: value } : t
      ),
    });

  const removeTestCase = (id: string) =>
    onChange({
      ...question,
      testCases: question.testCases.filter((t) => t.id !== id),
    });

  const addTestCase = () => {
    onChange({
      ...question,
      testCases: [
        ...question.testCases,
        { id: `t${Date.now()}`, input: "", expectedOutput: "", isHidden: false },
      ],
    });
    onAddTestCase?.();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Points */}
      <div>
        <label
          className="block text-[13px] font-medium mb-2"
          style={{ color: "var(--color-base-content)" }}
        >
          Points
        </label>
        <input
          type="number"
          value={question.points}
          onChange={(e) => setPoints(e.target.value)}
          className="w-36 px-3 py-2 rounded-lg border text-[14px] outline-none"
          style={{
            backgroundColor: "var(--color-base-100)",
            borderColor: "var(--color-base-300)",
            color: "var(--color-base-content)",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Problem description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            className="font-mono text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-base-content)", opacity: 0.6 }}
          >
            Problem Description (Markdown)
          </label>
          <button
            onClick={onPreviewRendered}
            className="font-mono text-[11px] font-semibold cursor-pointer border-none bg-transparent"
            style={{ color: "var(--color-secondary)" }}
          >
            Preview Rendered
          </button>
        </div>
        <textarea
          value={question.description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="w-full px-3 py-2.5 rounded-lg border text-[13px] resize-y outline-none leading-relaxed"
          style={{
            backgroundColor: "var(--color-base-100)",
            borderColor: "var(--color-base-300)",
            color: "var(--color-base-content)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        />
      </div>

      {/* Starter code */}
      <div>
        <label
          className="block text-[13px] font-medium mb-2"
          style={{ color: "var(--color-base-content)" }}
        >
          Starter Code (Python 3)
        </label>
        <div
          className="rounded-xl overflow-hidden border"
          style={{ borderColor: "var(--color-base-300)" }}
        >
          {/* File toolbar */}
          <div
            className="flex items-center justify-between px-4 py-2 border-b"
            style={{
              backgroundColor: "var(--color-base-200)",
              borderColor: "var(--color-base-300)",
            }}
          >
            <span
              className="font-mono text-[12px]"
              style={{ color: "var(--color-base-content)", opacity: 0.7 }}
            >
              {question.filename}
            </span>
            <button
              className="cursor-pointer border-none bg-transparent transition-opacity hover:opacity-60"
              style={{ color: "var(--color-base-content)", opacity: 0.5 }}
            >
              <Settings size={14} />
            </button>
          </div>
          {/* Code textarea */}
          <textarea
            value={question.starterCode}
            onChange={(e) => setStarterCode(e.target.value)}
            rows={7}
            spellCheck={false}
            className="w-full px-4 py-3 text-[13px] resize-none outline-none leading-6"
            style={{
              backgroundColor: "#1a2332",
              color: "#c2c6d6",
              fontFamily: "'JetBrains Mono', monospace",
              border: "none",
            }}
          />
        </div>
      </div>

      {/* Test cases */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p
            className="font-mono text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-base-content)", opacity: 0.6 }}
          >
            Test Case Configuration
          </p>
          <button
            onClick={addTestCase}
            className="flex items-center gap-1 font-mono text-[11px] font-semibold cursor-pointer border-none bg-transparent"
            style={{ color: "var(--color-secondary)" }}
          >
            <Plus size={13} />
            Add Case
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {question.testCases.map((tc) => (
            <div
              key={tc.id}
              className="flex items-center gap-3 p-4 rounded-xl border"
              style={{
                backgroundColor: "var(--color-base-100)",
                borderColor: "var(--color-base-300)",
              }}
            >
              {/* Input */}
              <div className="flex-1">
                <label
                  className="block font-mono text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: "var(--color-base-content)", opacity: 0.5 }}
                >
                  Input (n)
                </label>
                <input
                  type="text"
                  value={tc.input}
                  onChange={(e) =>
                    setTestCaseField(tc.id, "input", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none font-mono"
                  style={{
                    backgroundColor: "var(--color-base-200)",
                    borderColor: "var(--color-base-300)",
                    color: "var(--color-base-content)",
                  }}
                />
              </div>

              {/* Expected output */}
              <div className="flex-1">
                <label
                  className="block font-mono text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: "var(--color-base-content)", opacity: 0.5 }}
                >
                  Expected Output
                </label>
                <input
                  type="text"
                  value={tc.expectedOutput}
                  onChange={(e) =>
                    setTestCaseField(tc.id, "expectedOutput", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none font-mono"
                  style={{
                    backgroundColor: "var(--color-base-200)",
                    borderColor: "var(--color-base-300)",
                    color: "var(--color-base-content)",
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-5">
                <button
                  onClick={() => removeTestCase(tc.id)}
                  className="p-1.5 rounded-lg cursor-pointer border-none bg-transparent transition-opacity hover:opacity-60"
                  style={{ color: "var(--color-error)" }}
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={() => setTestCaseField(tc.id, "isHidden", !tc.isHidden)}
                  className="p-1.5 rounded-lg cursor-pointer border-none bg-transparent transition-opacity hover:opacity-60"
                  style={{
                    color: tc.isHidden
                      ? "var(--color-secondary)"
                      : "var(--color-base-content)",
                    opacity: tc.isHidden ? 1 : 0.4,
                  }}
                  title={tc.isHidden ? "Hidden from student" : "Visible to student"}
                >
                  <Eye size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen — named export (not default)
// ---------------------------------------------------------------------------

export function ExamBuilderScreen({
  examCode = "CS101",
  questions: externalQuestions,
  activeQuestionId: externalActiveId,
  onSelectQuestion,
  onAddQuestion,
  onReorderQuestions,
  onSaveQuestion,
  onDiscardQuestion,
  onDeleteQuestion,
  onPreviewExam,
  onSaveExam,
  onPreviewRendered,
  onSaveAndContinue,
}: ExamBuilderScreenProps) {
  // Local state so the editor works standalone without wiring
  const [questions, setQuestions] = useState<BuilderQuestion[]>(
    externalQuestions ?? MOCK_QUESTIONS
  );
  const [activeId, setActiveId] = useState<string>(
    externalActiveId ?? MOCK_QUESTIONS[0].id
  );

  const activeQuestion = questions.find((q) => q.id === activeId) ?? questions[0];

  // Which tab is showing in the editor panel
  const [editorTab, setEditorTab] = useState<QuestionType>(
    activeQuestion?.type ?? "multiple-choice"
  );

  const handleSelectQuestion = (id: string) => {
    setActiveId(id);
    const q = questions.find((q) => q.id === id);
    if (q) setEditorTab(q.type);
    onSelectQuestion?.(id);
  };

  const handleQuestionChange = (updated: BuilderQuestion) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updated.id ? updated : q))
    );
  };

  // When user switches the editor tab, morph the active question's type
  const handleTabSwitch = (tab: QuestionType) => {
    setEditorTab(tab);
    if (!activeQuestion) return;
    if (activeQuestion.type === tab) return;

    // Convert to the other type carrying over shared fields
    const base = {
      id: activeQuestion.id,
      number: activeQuestion.number,
      title: activeQuestion.title,
      points: activeQuestion.points,
      description: activeQuestion.description,
    };

    const converted: BuilderQuestion =
      tab === "multiple-choice"
        ? {
            ...base,
            type: "multiple-choice",
            options: [
              { id: "o1", text: "", isCorrect: true  },
              { id: "o2", text: "", isCorrect: false },
            ],
          }
        : {
            ...base,
            type: "coding",
            starterCode: "",
            filename: "main.py",
            testCases: [],
          };

    setQuestions((prev) =>
      prev.map((q) => (q.id === converted.id ? converted : q))
    );
  };

  const isMCQ = editorTab === "multiple-choice";

  const descriptionHint = isMCQ
    ? "Configure your multiple choice question and correct options."
    : "Configure your coding challenge requirements and test cases.";

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-base-200)" }}
    >
      <TeacherSidebar activeItem="examBuilder" />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TeacherHeader />

        {/* Three-column body */}
        <div className="flex flex-1 overflow-hidden min-w-0">

          {/* ── Col 1: Question list ───────────────────────────────── */}
          <aside
            className="w-[260px] flex-shrink-0 flex flex-col border-r overflow-hidden"
            style={{
              backgroundColor: "var(--color-base-200)",
              borderColor: "var(--color-base-300)",
            }}
          >
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-4 py-3.5 border-b flex-shrink-0"
              style={{ borderColor: "var(--color-base-300)" }}
            >
              <h2
                className="text-[15px] font-bold"
                style={{ color: "var(--color-base-content)" }}
              >
                Questions
              </h2>
              <button
                onClick={onAddQuestion}
                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border-none transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "var(--color-primary-content)",
                }}
              >
                <Plus size={15} />
              </button>
            </div>

            {/* Question list */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {questions.map((q) => (
                <QuestionListItem
                  key={q.id}
                  question={q}
                  isActive={q.id === activeId}
                  onClick={() => handleSelectQuestion(q.id)}
                />
              ))}
            </div>

            {/* Reorder button */}
            <div
              className="p-3 border-t flex-shrink-0"
              style={{ borderColor: "var(--color-base-300)" }}
            >
              <button
                onClick={onReorderQuestions}
                className="w-full py-2.5 rounded-xl border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
                style={{
                  borderColor: "var(--color-base-300)",
                  color: "var(--color-base-content)",
                  backgroundColor: "transparent",
                  opacity: 0.7,
                }}
              >
                Reorder Questions
              </button>
            </div>
          </aside>

          {/* ── Col 2+3: Editor panel ──────────────────────────────── */}
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Editor top bar */}
            <div
              className="flex items-start justify-between px-7 py-4 border-b flex-shrink-0"
              style={{ borderColor: "var(--color-base-300)" }}
            >
              <div>
                <h1
                  className="text-[24px] font-bold leading-tight mb-0.5"
                  style={{ color: "var(--color-base-content)" }}
                >
                  Edit Question
                </h1>
                <p
                  className="text-[13px]"
                  style={{ color: "var(--color-base-content)", opacity: 0.6 }}
                >
                  {descriptionHint}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={onPreviewExam}
                  className="px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
                  style={{
                    borderColor: "var(--color-base-300)",
                    color: "var(--color-base-content)",
                    backgroundColor: "var(--color-base-100)",
                  }}
                >
                  Preview{"\n"}Exam
                </button>
                <button
                  onClick={onSaveExam}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-opacity hover:opacity-90 border-none"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-primary-content)",
                  }}
                >
                  Save{"\n"}Question
                </button>
              </div>
            </div>

            {/* Scrollable editor body */}
            <div className="flex-1 overflow-y-auto px-7 py-5">
              {/* Type toggle tabs */}
              <div
                className="inline-flex rounded-lg p-0.5 mb-6"
                style={{ backgroundColor: "var(--color-base-300)" }}
              >
                {(["multiple-choice", "coding"] as QuestionType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabSwitch(tab)}
                    className="px-4 py-1.5 rounded-md text-[13px] font-mono font-semibold cursor-pointer border-none transition-colors duration-150"
                    style={{
                      backgroundColor:
                        editorTab === tab
                          ? "var(--color-base-100)"
                          : "transparent",
                      color:
                        editorTab === tab
                          ? "var(--color-secondary)"
                          : "var(--color-base-content)",
                      opacity: editorTab === tab ? 1 : 0.6,
                    }}
                  >
                    {tab === "multiple-choice" ? "Multiple Choice" : "Coding Question"}
                  </button>
                ))}
              </div>

              {/* Render the correct editor */}
              {activeQuestion &&
                (isMCQ ? (
                  <MCQEditor
                    question={
                      activeQuestion.type === "multiple-choice"
                        ? (activeQuestion as MCQBuilderQuestion)
                        : ({
                            ...activeQuestion,
                            type: "multiple-choice",
                            options: [],
                          } as MCQBuilderQuestion)
                    }
                    onChange={handleQuestionChange}
                    onPreviewRendered={onPreviewRendered}
                  />
                ) : (
                  <CodingEditor
                    question={
                      activeQuestion.type === "coding"
                        ? (activeQuestion as CodingBuilderQuestion)
                        : ({
                            ...activeQuestion,
                            type: "coding",
                            starterCode: "",
                            filename: "main.py",
                            testCases: [],
                          } as CodingBuilderQuestion)
                    }
                    onChange={handleQuestionChange}
                    onPreviewRendered={onPreviewRendered}
                  />
                ))}

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
                    style={{
                      borderColor: "var(--color-base-300)",
                      color: "var(--color-base-content)",
                      backgroundColor: "transparent",
                    }}
                  >
                    Discard
                  </button>
                  <button
                    onClick={onSaveAndContinue}
                    className="px-5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: "var(--color-primary)",
                      color: "var(--color-primary-content)",
                    }}
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