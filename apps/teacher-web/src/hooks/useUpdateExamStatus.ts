import { updateExamStatus } from "../services/examBuilderService";

// Save/Publish transitions. Each call resolves to null on success, or to the reason it failed,
// so the caller can show that exact reason right away (state set here would not be visible yet).
export function useUpdateExamStatus() {
  async function changeStatus(
    examId: string,
    status: "draft" | "saved",
  ): Promise<string | null> {
    try {
      await updateExamStatus(examId, status);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Could not save exam. Try again.";
    }
  }

  // marks the exam as draft, not yet attachable to a class
  const saveDraft = (examId: string) => changeStatus(examId, "draft");

  // marks the exam as saved, ready to attach to a class
  const saveExam = (examId: string) => changeStatus(examId, "saved");

  return { saveDraft, saveExam };
}