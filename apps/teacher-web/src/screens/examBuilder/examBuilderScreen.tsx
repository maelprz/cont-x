import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import type {
  ExamBuilderScreenProps,
  BuilderQuestion,
  MCQBuilderQuestion,
  CodingBuilderQuestion,
  QuestionType,
} from "./examBuilderScreen.types";
import { useExamBuilder } from "../../hooks/useExamBuilder";
import { useSaveQuestion } from "../../hooks/useSaveQuestion";
import { useDeleteQuestion } from "../../hooks/useDeleteQuestion";
import { useUpdateExamStatus } from "../../hooks/useUpdateExamStatus";
import { useUpdateExamSettings } from "../../hooks/useUpdateExamSetting"; // saves duration + description + max attempts together
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { QuestionListPanel } from "../../components/examBuilder/questionListPanel";
import { MCQEditorPanel } from "../../components/examBuilder/mcqEditorPanel";
import { CodingEditorPanel } from "../../components/examBuilder/codingEditorPanel";
import { SaveExamOverlay } from "../../components/examBuilder/saveExamOverlay";
import { QuestionBankModal } from "../../components/examBuilder/questionBankModal";
import {
  createBlankMCQuestion,
  createBlankCodingQuestion,
  starterCodeFor,
  mainCodeFor,
} from "../../components/examBuilder/createBlankQuestion";

export function ExamBuilderScreen({
  questions: externalQuestions,
  activeQuestionId: externalActiveId,
  onSelectQuestion,
  onAddQuestion,
  onReorderQuestions,
  onDiscardQuestion,
  onDeleteQuestion,
  onPreviewExam,
  onPreviewRendered,
  onSaveAndContinue,
}: ExamBuilderScreenProps) {
  const { examData, isLoading, error } = useExamBuilder();

  const [questions, setQuestions] = useState<BuilderQuestion[]>(
    externalQuestions ?? [],
  );

  const [activeId, setActiveId] = useState<string>(externalActiveId ?? "");

  // mirrors what's actually persisted, so Discard has something to revert to
  const [savedQuestions, setSavedQuestions] = useState<BuilderQuestion[]>(
    externalQuestions ?? [],
  );

  const [showQuestionBankModal, setShowQuestionBankModal] = useState(false); // true when the "+" modal is open
  const [showSettings, setShowSettings] = useState(false); // true when the Exam Settings panel is active
  const [durationHours, setDurationHours] = useState(0); // teacher's typed hours value
  const [durationMinutesInput, setDurationMinutesInput] = useState(0); // teacher's typed minutes value
  const [description, setDescription] = useState(""); // teacher's typed exam description, optional
  const [maxAttempts, setMaxAttempts] = useState(1); // teacher's chosen attempt limit, default 1

  // fills the builder with real questions once the exam finishes loading
  // replace the load effect to also capture the saved snapshot:
  useEffect(() => {
    if (externalQuestions) return; // parent controls questions directly, skip
    if (!examData) return; // still loading, or no exam selected

    const firstQuestion = examData.questions[0];
    setQuestions(examData.questions);
    setSavedQuestions(examData.questions); // snapshot of what's actually persisted
    setActiveId(firstQuestion?.id ?? "");
    setEditorTab(firstQuestion?.type ?? "multiple-choice");

    // splits the stored total minutes into separate hours/minutes for display
    setDurationHours(Math.floor(examData.durationMinutes / 60));
    setDurationMinutesInput(examData.durationMinutes % 60);
    setDescription(examData.description); // real saved description, or "" if never set
    setMaxAttempts(examData.maxAttempts); // real saved attempt limit
  }, [examData, externalQuestions]);

  const activeQuestion =
    questions.find((q) => q.id === activeId) ?? questions[0];
  const [editorTab, setEditorTab] = useState<QuestionType>(
    activeQuestion?.type ?? "multiple-choice",
  );

  // opens the Question Bank modal instead of creating a blank question directly
  const handleAddQuestion = () => {
    setShowQuestionBankModal(true);
    onAddQuestion?.(); // still notify parent in case it needs to know
  };

  // runs once the modal finishes adding one or more questions to this exam
  const handleQuestionsAddedFromBank = (newQuestions: BuilderQuestion[]) => {
    setQuestions((prev) => [...prev, ...newQuestions]);
    setSavedQuestions((prev) => [...prev, ...newQuestions]); // already persisted by the modal itself
    if (newQuestions.length > 0) {
      setActiveId(newQuestions[0].id);
      setEditorTab(newQuestions[0].type);
    }
    setShowSettings(false);
  };

  // add the discard handler
  const handleDiscard = () => {
    if (!activeQuestion) return; // nothing selected, nothing to discard

    const savedVersion = savedQuestions.find((q) => q.id === activeQuestion.id);

    // reverts to last save, or a blank template if this question was never saved
    const revertedQuestion: BuilderQuestion =
      savedVersion ??
      (activeQuestion.type === "multiple-choice"
        ? createBlankMCQuestion(activeQuestion.id, activeQuestion.number)
        : createBlankCodingQuestion(activeQuestion.id, activeQuestion.number));

    setQuestions((prev) =>
      prev.map((q) => (q.id === revertedQuestion.id ? revertedQuestion : q)),
    );
    setEditorTab(revertedQuestion.type); // matches the reverted question's actual type
    onDiscardQuestion?.();
  };

  const {
    deleteQuestion,
    isDeleting,
    error: deleteError,
  } = useDeleteQuestion();

  const handleDeleteQuestion = async (id: string) => {
    if (!id) return; // nothing selected, nothing to delete

    const didDelete = await deleteQuestion(id);
    if (!didDelete) return;

    const deletedIndex = questions.findIndex((q) => q.id === id);
    const remaining = questions.filter((q) => q.id !== id);

    setQuestions(remaining);
    setSavedQuestions((prev) => prev.filter((q) => q.id !== id));

    const nextActive = remaining[deletedIndex] ?? null; // item that shifted into the deleted slot
    setActiveId(nextActive?.id ?? "");
    setEditorTab(nextActive?.type ?? "multiple-choice");

    onDeleteQuestion?.(id);
  };

  const handleSelectQuestion = (id: string) => {
    setActiveId(id);
    const q = questions.find((q) => q.id === id);
    if (q) setEditorTab(q.type);
    setShowSettings(false); // picking a question should leave the settings view
    onSelectQuestion?.(id);
  };

  const handleQuestionChange = (updated: BuilderQuestion) =>
    setQuestions((prev) =>
      prev.map((q) => (q.id === updated.id ? updated : q)),
    );

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

    // default coding format used when switching from MCQ into coding
    const defaultProgramType = "cProgram" as const;

    const converted: BuilderQuestion =
      tab === "multiple-choice"
        ? {
            ...base,
            type: "multiple-choice",
            options: [
              { id: crypto.randomUUID(), text: "", isCorrect: true },
              { id: crypto.randomUUID(), text: "", isCorrect: false },
            ],
          }
        : {
            ...base,
            type: "coding",
            starterCode: starterCodeFor(defaultProgramType),
            testCases: [],
            programType: defaultProgramType,
            mainCode: mainCodeFor(defaultProgramType),
            deductionPerAttempt: 0,
          };

    setQuestions((prev) =>
      prev.map((q) => (q.id === converted.id ? converted : q)),
    );
  };

  const { saveQuestion, isSaving, error: saveError } = useSaveQuestion();

  // saves the active question, then runs whatever the parent wants on continue
  const handleSaveAndContinue = async () => {
    if (!activeQuestion) return; // nothing selected, nothing to save
    const didSave = await saveQuestion(activeQuestion);
    if (didSave) {
      // this question is now the "last saved" version, for future Discards
      setSavedQuestions((prev) =>
        prev.some((q) => q.id === activeQuestion.id)
          ? prev.map((q) => (q.id === activeQuestion.id ? activeQuestion : q))
          : [...prev, activeQuestion],
      );
      onSaveAndContinue?.();
    }
  };

  const {
    saveOnly,
    publish,
    isUpdating,
    error: statusError,
  } = useUpdateExamStatus();
  const [showSaveOverlay, setShowSaveOverlay] = useState(false);

  // marks the exam as saved but not yet visible to students
  const handleSaveOnly = async (): Promise<boolean> => {
    if (!examData?.id) return false; // no exam loaded, nothing to update
    return saveOnly(examData.id);
  };

  // makes the exam live so students can join with the exam code
  const handlePublish = async (verificationCode: string): Promise<boolean> => {
    if (!examData?.id) return false; // no exam loaded, nothing to update
    return publish(examData.id, verificationCode);
  };

  const {
    saveSettings,
    isSaving: isSavingSettings,
    error: settingsError,
  } = useUpdateExamSettings();

  // combines hours + minutes, then saves duration + description + max attempts together
  const handleSaveSettings = async () => {
    if (!examData?.id) return; // no exam loaded, nothing to save
    const totalMinutes = durationHours * 60 + durationMinutesInput; // single source of truth stored in db
    await saveSettings(examData.id, description, maxAttempts, totalMinutes);
  };

  const isMCQ = editorTab === "multiple-choice";

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-base-200)" }}
    >
      <TeacherSidebar activeItem="examBuilder" />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TeacherHeader />

        <div className="flex flex-1 overflow-hidden min-w-0">
          {/* Left: question list */}
          <QuestionListPanel
            questions={questions}
            activeId={activeId}
            onSelectQuestion={handleSelectQuestion}
            onAddQuestion={handleAddQuestion}
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
                <h1
                  className="text-[24px] font-bold leading-tight mb-0.5"
                  style={{ color: "var(--color-base-content)" }}
                >
                  {showSettings ? "Exam Settings" : "Edit Question"}
                </h1>
                <p
                  className="text-[13px]"
                  style={{ color: "var(--color-base-content)", opacity: 0.6 }}
                >
                  {showSettings
                    ? "Set the duration, description, and allowed attempts for this exam."
                    : isMCQ
                      ? "Configure your multiple choice question and correct options."
                      : "Configure your coding challenge requirements and test cases."}
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
                  Preview Exam
                </button>
                <button
                  onClick={() => setShowSaveOverlay(true)}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-opacity hover:opacity-90 border-none"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-primary-content)",
                  }}
                >
                  Save Exam
                </button>
              </div>
            </div>

            {/* Scrollable body */}
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
                <p
                  className="text-[13px]"
                  style={{ color: "var(--color-error)" }}
                >
                  {error}
                </p>
              )}

              {!isLoading && !error && (
                <>
                  {/* Type toggle + settings pill */}
                  <div
                    className="inline-flex rounded-lg p-0.5 mb-6"
                    style={{ backgroundColor: "var(--color-base-300)" }}
                  >
                    {(["multiple-choice", "coding"] as QuestionType[]).map(
                      (tab) => (
                        <button
                          key={tab}
                          onClick={() => {
                            setShowSettings(false); // leaving settings, back to a question type
                            handleTabSwitch(tab);
                          }}
                          className="px-4 py-1.5 rounded-md text-[13px] font-mono font-semibold cursor-pointer border-none transition-colors duration-150"
                          style={{
                            backgroundColor:
                              !showSettings && editorTab === tab
                                ? "var(--color-base-100)"
                                : "transparent",
                            color:
                              !showSettings && editorTab === tab
                                ? "var(--color-secondary)"
                                : "var(--color-base-content)",
                            opacity:
                              !showSettings && editorTab === tab ? 1 : 0.6,
                          }}
                        >
                          {tab === "multiple-choice"
                            ? "Multiple Choice"
                            : "Coding Question"}
                        </button>
                      ),
                    )}
                    <button
                      onClick={() => setShowSettings(true)} // switches the panel to exam-level settings
                      className="px-4 py-1.5 rounded-md text-[13px] font-mono font-semibold cursor-pointer border-none transition-colors duration-150"
                      style={{
                        backgroundColor: showSettings
                          ? "var(--color-base-100)"
                          : "transparent",
                        color: showSettings
                          ? "var(--color-secondary)"
                          : "var(--color-base-content)",
                        opacity: showSettings ? 1 : 0.6,
                      }}
                    >
                      Exam Settings
                    </button>
                  </div>

                  {showSettings ? (
                    <div className="max-w-sm">
                      {/* Duration */}
                      <label
                        className="block text-[13px] font-semibold mb-2"
                        style={{ color: "var(--color-base-content)" }}
                      >
                        Exam Duration
                      </label>
                      <p
                        className="text-[12px] mb-3"
                        style={{
                          color: "var(--color-base-content)",
                          opacity: 0.6,
                        }}
                      >
                        Total time students get for the whole exam, once
                        started.
                      </p>
                      <div className="flex items-end gap-3 mb-6">
                        <div>
                          <label
                            className="block text-[11px] mb-1"
                            style={{
                              color: "var(--color-base-content)",
                              opacity: 0.6,
                            }}
                          >
                            Hours
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={durationHours}
                            onChange={
                              (e) =>
                                setDurationHours(
                                  Math.max(0, Number(e.target.value)),
                                ) // block negative values
                            }
                            className="w-24 px-3 py-2 rounded-lg border text-[13px]"
                            style={{
                              borderColor: "var(--color-base-300)",
                              color: "var(--color-base-content)",
                              backgroundColor: "var(--color-base-100)",
                            }}
                          />
                        </div>
                        <div>
                          <label
                            className="block text-[11px] mb-1"
                            style={{
                              color: "var(--color-base-content)",
                              opacity: 0.6,
                            }}
                          >
                            Minutes
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={59}
                            value={durationMinutesInput}
                            onChange={(e) =>
                              // clamps typed minutes to a valid 0–59 range
                              setDurationMinutesInput(
                                Math.min(
                                  59,
                                  Math.max(0, Number(e.target.value)),
                                ),
                              )
                            }
                            className="w-24 px-3 py-2 rounded-lg border text-[13px]"
                            style={{
                              borderColor: "var(--color-base-300)",
                              color: "var(--color-base-content)",
                              backgroundColor: "var(--color-base-100)",
                            }}
                          />
                        </div>
                        <span
                          className="text-[12px] pb-2"
                          style={{
                            color: "var(--color-base-content)",
                            opacity: 0.6,
                          }}
                        >
                          = {durationHours * 60 + durationMinutesInput} minutes
                          total
                        </span>
                      </div>

                      {/* Description */}
                      <label
                        className="block text-[13px] font-semibold mb-2"
                        style={{ color: "var(--color-base-content)" }}
                      >
                        Description{" "}
                        <span style={{ opacity: 0.5, fontWeight: 400 }}>
                          (optional)
                        </span>
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Briefly describe what this exam covers"
                        className="w-full px-3 py-2 rounded-lg border text-[13px] resize-none mb-6"
                        style={{
                          borderColor: "var(--color-base-300)",
                          color: "var(--color-base-content)",
                          backgroundColor: "var(--color-base-100)",
                        }}
                      />

                      {/* Max attempts */}
                      <label
                        className="block text-[13px] font-semibold mb-2"
                        style={{ color: "var(--color-base-content)" }}
                      >
                        Allowed Attempts
                      </label>
                      <p
                        className="text-[12px] mb-3"
                        style={{
                          color: "var(--color-base-content)",
                          opacity: 0.6,
                        }}
                      >
                        How many times a student may attempt this exam.
                      </p>
                      <input
                        type="number"
                        min={1}
                        value={maxAttempts}
                        onChange={
                          (e) =>
                            setMaxAttempts(Math.max(1, Number(e.target.value))) // never below 1
                        }
                        className="w-24 px-3 py-2 rounded-lg border text-[13px] mb-4"
                        style={{
                          borderColor: "var(--color-base-300)",
                          color: "var(--color-base-content)",
                          backgroundColor: "var(--color-base-100)",
                        }}
                      />

                      {settingsError && (
                        <p
                          className="text-[13px] mb-3"
                          style={{ color: "var(--color-error)" }}
                        >
                          {settingsError}
                        </p>
                      )}

                      <button
                        onClick={handleSaveSettings}
                        disabled={isSavingSettings}
                        className="px-5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
                        style={{
                          backgroundColor: "var(--color-primary)",
                          color: "var(--color-primary-content)",
                          opacity: isSavingSettings ? 0.6 : 1,
                        }}
                      >
                        {isSavingSettings ? "Saving..." : "Save Exam Settings"}
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Editor panel */}
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
                            onChange={handleQuestionChange}
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
                                  } as CodingBuilderQuestion)
                            }
                            onChange={handleQuestionChange}
                            onPreviewRendered={onPreviewRendered}
                          />
                        ))}
                    </>
                  )}
                </>
              )}

              {saveError && (
                <p
                  className="text-[13px] mb-2"
                  style={{ color: "var(--color-error)" }}
                >
                  {saveError}
                </p>
              )}

              {deleteError && (
                <p
                  className="text-[13px] mb-2"
                  style={{ color: "var(--color-error)" }}
                >
                  {deleteError}
                </p>
              )}

              {/* Bottom action row — hidden while viewing Exam Settings, since there's no question to act on */}
              {!showSettings && (
                <div
                  className="flex items-center justify-between mt-8 pt-5 border-t"
                  style={{ borderColor: "var(--color-base-300)" }}
                >
                  <button
                    onClick={() =>
                      handleDeleteQuestion(activeQuestion?.id ?? "")
                    }
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
                      onClick={handleDiscard}
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
                      onClick={handleSaveAndContinue}
                      disabled={isSaving}
                      className="px-5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
                      style={{
                        backgroundColor: "var(--color-primary)",
                        color: "var(--color-primary-content)",
                        opacity: isSaving ? 0.6 : 1,
                      }}
                    >
                      {isSaving ? "Saving..." : "Save & Continue"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      
      {/* Overlays */}
      <QuestionBankModal
        isOpen={showQuestionBankModal}
        examId={examData?.id ?? ""}
        startingNumber={questions.length}
        onClose={() => setShowQuestionBankModal(false)}
        onQuestionsAdded={handleQuestionsAddedFromBank}
      />

      <SaveExamOverlay
        isOpen={showSaveOverlay}
        examCode={examData?.examCode ?? null}
        isSaving={isUpdating}
        error={statusError}
        onClose={() => setShowSaveOverlay(false)}
        onSaveOnly={handleSaveOnly}
        onPublish={handlePublish}
      />
    </div>
  );
}
