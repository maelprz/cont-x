import { Trash2 } from "lucide-react";
import type {
  BuilderQuestion,
  CodingBuilderQuestion,
  MCQBuilderQuestion,
  QuestionType,
} from "../../screens/examBuilder/examBuilderScreen.types";
import { MCQEditorPanel } from "./mcqEditorPanel";
import { CodingEditorPanel } from "./codingEditorPanel";
import { starterCodeFor, mainCodeFor } from "./createBlankQuestion";

interface ExamBuilderEditorPaneProps {
  isLoading: boolean;
  error: string | null;
  activeQuestion?: BuilderQuestion;
  editorTab: QuestionType;
  isMCQ: boolean;
  isSavingDraft: boolean;
  isSavingExam: boolean;
  statusError: string | null;
  bankSaveError: string | null;
  saveAllError: string | null;
  deleteError: string | null;
  isDeleting: boolean;
  isSavingQuestion: boolean;
  pendingBankSaveIds: Set<string>;
  canSaveDraft?: boolean; // false for an already-saved exam: it can't go back to draft
  poolPanel?: React.ReactNode; // when set, replaces the question editor (a random pool is selected)
  onTabSwitch: (tab: QuestionType) => void;
  onQuestionChange: (question: BuilderQuestion) => void;
  onPreviewRendered?: () => void;
  onSaveDraft: () => void;
  onSaveExam: () => void;
  onDeleteQuestion: () => void;
  onDiscard: () => void;
  onSaveAndContinue: () => void;
}

export function ExamBuilderEditorPanel({
  isLoading,
  error,
  activeQuestion,
  editorTab,
  isMCQ,
  isSavingDraft,
  isSavingExam,
  statusError,
  bankSaveError,
  saveAllError,
  deleteError,
  isDeleting,
  isSavingQuestion,
  pendingBankSaveIds,
  canSaveDraft = true,
  poolPanel,
  onTabSwitch,
  onQuestionChange,
  onPreviewRendered,
  onSaveDraft,
  onSaveExam,
  onDeleteQuestion,
  onDiscard,
  onSaveAndContinue,
}: ExamBuilderEditorPaneProps) {
  return (
    <main className="flex-1 flex flex-col overflow-hidden min-w-0">
      <div
        className="relative flex items-start justify-between px-7 py-4 border-b flex-shrink-0"
        style={{ borderColor: "var(--color-base-300)" }}
      >
        <div>
          <h1
            className="text-[24px] font-bold leading-tight mb-0.5"
            style={{ color: "var(--color-base-content)" }}
          >
            {poolPanel ? "Edit Random Pool" : "Edit Question"}
          </h1>
          <p
            className="text-[13px]"
            style={{ color: "var(--color-base-content)", opacity: 0.6 }}
          >
            {poolPanel
              ? "Each student gets a random selection of the questions in this pool."
              : isMCQ
                ? "Configure your multiple choice question and correct options."
                : "Configure your coding challenge requirements and test cases."}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {canSaveDraft && (
          <button
            onClick={onSaveDraft}
            disabled={isSavingDraft}
            className="px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70 disabled:opacity-60"
            style={{
              borderColor: "var(--color-base-300)",
              color: "var(--color-base-content)",
              backgroundColor: "var(--color-base-100)",
            }}
          >
            {isSavingDraft ? "Saving..." : "Save Draft"}
          </button>
          )}
          <button
            onClick={onSaveExam}
            disabled={isSavingExam}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-opacity hover:opacity-90 border-none"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-primary-content)",
            }}
          >
            {isSavingExam ? "Saving..." : "Save Exam"}
          </button>
        </div>
        {statusError && (
          <p
            className="absolute top-full right-7 mt-2 text-[13px]"
            style={{ color: "var(--color-error)" }}
          >
            {statusError}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-5">
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

        {!isLoading && !error && poolPanel}

        {!isLoading && !error && !poolPanel && (
          <>
            <div
              className="inline-flex rounded-lg p-0.5 mb-6"
              style={{ backgroundColor: "var(--color-base-300)" }}
            >
              {(["multiple-choice", "coding"] as QuestionType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => onTabSwitch(tab)}
                  className="px-4 py-1.5 rounded-md text-[13px] font-mono font-semibold cursor-pointer border-none transition-colors duration-150"
                  style={{
                    backgroundColor:
                      editorTab === tab ? "var(--color-base-100)" : "transparent",
                    color:
                      editorTab === tab ? "var(--color-secondary)" : "var(--color-base-content)",
                    opacity: editorTab === tab ? 1 : 0.6,
                  }}
                >
                  {tab === "multiple-choice" ? "Multiple Choice" : "Coding Question"}
                </button>
              ))}
            </div>

            {activeQuestion &&
              (isMCQ ? (
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
              ) : (
                <CodingEditorPanel
                  question={
                    activeQuestion.type === "coding"
                      ? (activeQuestion as CodingBuilderQuestion)
                      : ({
                          ...activeQuestion,
                          type: "coding",
                          starterCode: starterCodeFor("cProgram"),
                          filename: "main.py",
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
          </>
        )}

        {bankSaveError && (
          <p className="text-[13px] mb-2" style={{ color: "var(--color-error)" }}>
            {bankSaveError}
          </p>
        )}

        {saveAllError && (
          <p className="text-[13px] mb-2" style={{ color: "var(--color-error)" }}>
            {saveAllError}
          </p>
        )}

        {deleteError && (
          <p className="text-[13px] mb-2" style={{ color: "var(--color-error)" }}>
            {deleteError}
          </p>
        )}

        {!poolPanel && (
        <div
          className="flex items-center justify-between mt-8 pt-5 border-t"
          style={{ borderColor: "var(--color-base-300)" }}
        >
          <button
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
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onDiscard}
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
              disabled={isSavingQuestion}
              className="px-5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-primary-content)",
                opacity: isSavingQuestion ? 0.6 : 1,
              }}
            >
              {isSavingQuestion
                ? "Saving..."
                : activeQuestion && pendingBankSaveIds.has(activeQuestion.id)
                  ? "Save to Question Bank"
                  : "Save Edits"}
            </button>
          </div>
        </div>
        )}
      </div>
    </main>
  );
}