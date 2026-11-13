import { Trash2 } from "lucide-react";
import { examSecondary } from "../examLibrary/examDialog";
import type {
  BuilderQuestion,
  CodingBuilderQuestion,
  FITBBuilderQuestion,
  MCQBuilderQuestion,
  QuestionType,
} from "../../screens/examBuilder/examBuilderScreen.types";
import { MCQEditorPanel } from "./mcqEditorPanel";
import { FITBEditorPanel } from "./fitbEditorPanel";
import { CodingEditorPanel } from "./codingEditorPanel";
import { starterCodeFor, mainCodeFor, questionTypeLabels } from "./createBlankQuestion";
import { QuestionTopics } from "../questionBank/questionTopics";

interface ExamBuilderEditorPaneProps {
  subjectId: string | null;
  isLoading: boolean;
  error: string | null;
  activeQuestion?: BuilderQuestion;
  showQuestionNumber?: boolean;
  subjectName?: string;
  busy?: boolean;
  editorTab: QuestionType;
  saveAllError: string | null;
  deleteError: string | null;
  isDeleting: boolean;
  poolPanel?: React.ReactNode; // when set, replaces the question editor (a random pool is selected)
  onTabSwitch?: (tab: QuestionType) => void;
  onQuestionChange: (question: BuilderQuestion) => void;
  onPreviewRendered?: () => void;
  onDeleteQuestion?: () => void;
  onDiscard?: () => void;
}

export function ExamBuilderEditorPanel({
  subjectId,
  isLoading,
  error,
  activeQuestion,
  showQuestionNumber = true,
  subjectName,
  busy,
  editorTab,
  saveAllError,
  deleteError,
  isDeleting,
  poolPanel,
  onTabSwitch,
  onQuestionChange,
  onPreviewRendered,
  onDeleteQuestion,
  onDiscard,
}: ExamBuilderEditorPaneProps) {
  return (
    <main aria-label="Question editor" inert={busy} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--color-base-100)]">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-7 sm:py-5">
        {isLoading && (
          <p
            className="text-[13px]"
            style={{ color: "var(--color-base-content)", opacity: 0.6 }}
          >
            Loading exam...
          </p>
        )}
        {error && (
          <p className="text-[13px]" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        )}

        {!isLoading && !error && poolPanel && <div className="mx-auto max-w-4xl">{poolPanel}</div>}

        {!isLoading && !error && !poolPanel && !activeQuestion && (
          <p className="mx-auto max-w-4xl text-sm text-stone-600">Add a question or select one in the exam outline.</p>
        )}
        {!isLoading && !error && !poolPanel && activeQuestion && (
          <div className="mx-auto max-w-4xl">
            {subjectName && <p className="mb-1 wrap-anywhere text-sm text-stone-600">{subjectName}</p>}
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="min-w-0 wrap-anywhere text-lg font-semibold">{showQuestionNumber && `Q${activeQuestion.number} · `}{activeQuestion.title || "Untitled question"}</h2>
              {!onTabSwitch && <span className="text-xs text-stone-600">{questionTypeLabels[editorTab]}</span>}
            </div>
            {onTabSwitch && <div
              className="mb-4 flex w-fit max-w-full flex-wrap gap-1 rounded-lg p-1"
              style={{ backgroundColor: "var(--color-base-300)" }}
            >
              {(["multiple-choice", "coding", "fill-in-the-blank"] as QuestionType[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  aria-pressed={editorTab === tab}
                  onClick={() => onTabSwitch(tab)}
                  className="rounded-md px-3 py-1.5 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-[#465a3b]"
                  style={{
                    backgroundColor:
                      editorTab === tab ? "var(--color-base-100)" : "transparent",
                    color:
                      editorTab === tab ? "var(--color-secondary)" : "var(--color-base-content)",
                    opacity: editorTab === tab ? 1 : 0.6,
                  }}
                >
                  {tab === "multiple-choice" ? "Multiple Choice" : tab === "coding" ? "Coding Question" : "Fill in the Blank"}
                </button>
              ))}
            </div>}

            <QuestionTopics key={activeQuestion.id} compact subjectId={subjectId} selectedIds={activeQuestion.topicIds ?? []} onChange={(topicIds) => onQuestionChange({ ...activeQuestion, topicIds })} />

            {activeQuestion &&
              (editorTab === "multiple-choice" ? (
                <MCQEditorPanel
                  question={
                    activeQuestion.type === "multiple-choice"
                      ? (activeQuestion as MCQBuilderQuestion)
                      : ({
                          ...activeQuestion,
                          type: "multiple-choice",
                          options: [],
                        } as MCQBuilderQuestion)
                  }
                  onChange={onQuestionChange}
                  onPreviewRendered={onPreviewRendered}
                />
              ) : editorTab === "fill-in-the-blank" ? (
                <FITBEditorPanel
                  question={
                    activeQuestion.type === "fill-in-the-blank"
                      ? (activeQuestion as FITBBuilderQuestion)
                      : ({
                          ...activeQuestion,
                          type: "fill-in-the-blank",
                          acceptedAnswers: [{ id: crypto.randomUUID(), text: "" }],
                          caseSensitive: false,
                          ignoreExtraSpaces: true,
                        } as FITBBuilderQuestion)
                  }
                  onChange={onQuestionChange}
                  onPreviewRendered={onPreviewRendered}
                />
              ) : (
                <CodingEditorPanel
                  question={
                    activeQuestion.type === "coding"
                      ? (activeQuestion as CodingBuilderQuestion)
                      : ({
                          ...activeQuestion,
                          type: "coding",
                          starterCode: starterCodeFor("cProgram"),
                          testCases: [],
                          programType: "cProgram",
                          mainCode: mainCodeFor("cProgram"),
                          deductionPerAttempt: 0,
                          referenceSolution: "",
                        } as CodingBuilderQuestion)
                  }
                  onChange={onQuestionChange}
                  onPreviewRendered={onPreviewRendered}
                />
              ))}
          </div>
        )}

        {saveAllError && (
          <p role="alert" className="mx-auto mt-3 max-w-4xl text-sm text-red-700">
            {saveAllError}
          </p>
        )}

        {deleteError && (
          <p className="text-[13px] mb-2" style={{ color: "var(--color-error)" }}>
            {deleteError}
          </p>
        )}

        {!poolPanel && activeQuestion && !isLoading && !error && (onDeleteQuestion || onDiscard) && (
        <div
          className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-between gap-3 border-t pt-4"
          style={{ borderColor: "var(--color-base-300)" }}
        >
          {onDeleteQuestion && <button type="button"
            onClick={onDeleteQuestion}
            disabled={isDeleting}
            className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer border-none bg-transparent transition-opacity hover:opacity-70"
            style={{
              color: "var(--color-error)",
              opacity: isDeleting ? 0.6 : 1,
            }}
          >
            <Trash2 size={14} />
            {isDeleting ? "Deleting..." : "Delete Question"}
          </button>}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {onDiscard && <button type="button"
              onClick={onDiscard}
              className={examSecondary}
            >
              Discard Changes
            </button>}
          </div>
        </div>
        )}
      </div>
    </main>
  );
}
