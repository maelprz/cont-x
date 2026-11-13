import { Plus, Trash2, Eye, Settings, PlayCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { CodingBuilderQuestion, CodingProgramType, TestCase } from "../../screens/examBuilder/examBuilderScreen.types";
import { CodeEditor } from "./codeEditor";
import { starterCodeFor, mainCodeFor } from "./createBlankQuestion";
import { useValidateTestCases } from "../../hooks/useValidateTestCases";

export function CodingEditorPanel({
  question,
  onChange,
  onPreviewRendered,
}: {
  question: CodingBuilderQuestion;
  onChange: (q: CodingBuilderQuestion) => void;
  onPreviewRendered?: () => void;
}) {
  
  const { results, isValidating, validateAll, clearResults } = useValidateTestCases();
  // Updates the question's title text.
  const setTitle = (v: string) => onChange({ ...question, title: v });
  // Updates the points awarded per test case.
  const setPoints = (v: string) => onChange({ ...question, points: Number(v) || 0 });
  // Updates the problem description text.
  const setDescription = (v: string) => onChange({ ...question, description: v });
  // Updates the starter code shown to students.
  const setStarterCode = (v: string) => onChange({ ...question, starterCode: v });
  // Switches between full program and single function mode.
  // Refreshes the code templates too, but only if they were never customized.
  const setProgramType = (v: CodingProgramType) => {
    const starterUntouched = question.starterCode === starterCodeFor(question.programType);
    const mainUntouched = question.mainCode === mainCodeFor(question.programType);

    onChange({
      ...question,
      programType: v,
      starterCode: starterUntouched ? starterCodeFor(v) : question.starterCode,
      mainCode: mainUntouched ? mainCodeFor(v) : question.mainCode,
    });
  };
  // Updates the teacher's main code used to call the student's function.
  const setMainCode = (v: string) => onChange({ ...question, mainCode: v });
  // Updates how many points are lost per check attempt.
  const setDeductionPerAttempt = (v: string) => onChange({ ...question, deductionPerAttempt: Number(v) || 0 });

  const setTestCaseField = (id: string, field: keyof TestCase, value: string | boolean) =>
    onChange({ ...question, testCases: question.testCases.map((t) => (t.id === id ? { ...t, [field]: value } : t)) });

  const removeTestCase = (id: string) =>
    onChange({ ...question, testCases: question.testCases.filter((t) => t.id !== id) });

  const addTestCase = () =>
    onChange({ ...question, testCases: [...question.testCases, { id: crypto.randomUUID(), input: "", expectedOutput: "", isHidden: false }] });
  
  const setReferenceSolution = (v: string) => {
    onChange({ ...question, referenceSolution: v });
    clearResults();
  };
  // True when teacher wants students to implement just one function.
  const isFunctionMode = question.programType === "cFunction";

  return (
    <div className="flex flex-col gap-6">
      {/* Title, question format, points per test case, and deduction row */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Editable question title */}
          <div className="min-w-0 flex-[1_1_12rem]">
            <label
              className="block text-[13px] font-medium mb-2"
              style={{ color: "var(--color-base-content)" }}
            >
              Question Title
            </label>
            <input
              type="text"
              value={question.title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-[14px] outline-none"
              style={{
                backgroundColor: "var(--color-base-100)",
                borderColor: "var(--color-base-300)",
                color: "var(--color-base-content)",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Dropdown to pick full program vs single function */}
          <div>
            <label
              className="block text-[13px] font-medium mb-2"
              style={{ color: "var(--color-base-content)" }}
            >
              Question Format
            </label>
            <select
              value={question.programType}
              onChange={(e) => setProgramType(e.target.value as CodingProgramType)}
              className="w-40 px-3 py-2 rounded-lg border text-[14px] outline-none"
              style={{
                backgroundColor: "var(--color-base-100)",
                borderColor: "var(--color-base-300)",
                color: "var(--color-base-content)",
                fontFamily: "inherit",
              }}
            >
              <option value="cProgram">C Program</option>
              <option value="cFunction">C Function</option>
            </select>
          </div>

          {/* Points earned for each passing test case */}
          <div>
            <label
              className="block text-[13px] font-medium mb-2"
              style={{ color: "var(--color-base-content)" }}
            >
              Points per Test Case
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

          {/* Points lost every time student checks their answer */}
          <div>
            <label
              className="block text-[13px] font-medium mb-2"
              style={{ color: "var(--color-base-content)" }}
            >
              Deduction per Attempt
            </label>
            <input
              type="number"
              value={question.deductionPerAttempt}
              onChange={(e) => setDeductionPerAttempt(e.target.value)}
              className="w-36 px-3 py-2 rounded-lg border text-[14px] outline-none"
              style={{
                backgroundColor: "var(--color-base-100)",
                borderColor: "var(--color-base-300)",
                color: "var(--color-base-content)",
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>

      {/* Problem description */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label className="text-[13px] font-medium">
            Problem Description (Markdown)
          </label>
          <button onClick={onPreviewRendered} className="text-xs font-semibold cursor-pointer border-none bg-transparent" style={{ color: "var(--color-secondary)" }}>
            Preview Rendered
          </button>
        </div>
        <textarea
          value={question.description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full px-3 py-2.5 rounded-lg border text-[13px] resize-y outline-none leading-relaxed"
          style={{ backgroundColor: "var(--color-base-100)", borderColor: "var(--color-base-300)", color: "var(--color-base-content)" }}
        />
      </div>

      {/* Main code, only shown when students implement a single function */}
      {isFunctionMode && (
        <div>
          <label className="block text-[13px] font-medium mb-2" style={{ color: "var(--color-base-content)" }}>
            Main Code (calls the student's function)
          </label>
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-base-300)" }}>
            <div
              className="flex items-center justify-between px-4 py-2 border-b"
              style={{ backgroundColor: "var(--color-base-200)", borderColor: "var(--color-base-300)" }}
            >
              <span className="text-xs" style={{ color: "var(--color-base-content)", opacity: 0.7 }}>
                main.c
              </span>
            </div>
            <CodeEditor value={question.mainCode} onChange={setMainCode} height={180} />
          </div>
        </div>
      )}

      {/* Starter code */}
      <div>
        <label className="block text-[13px] font-medium mb-2" style={{ color: "var(--color-base-content)" }}>
          {isFunctionMode ? "Starter Code (Function to Implement)" : "Starter Code (Full Program)"}
        </label>
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-base-300)" }}>
          <div
            className="flex flex-col items-end justify-between px-4 py-2 border-b"
            style={{ backgroundColor: "var(--color-base-200)", borderColor: "var(--color-base-300)" }}
          >
            <button className="cursor-pointer border-none bg-transparent transition-opacity hover:opacity-60" style={{ color: "var(--color-base-content)", opacity: 0.5 }}>
              <Settings size={14} />
            </button>
          </div>
          <CodeEditor value={question.starterCode} onChange={setStarterCode} height={180} />
        </div>
      </div>
      
      {/* Reference solution */}
      <div>
        <label className="block text-[13px] font-medium mb-2" style={{ color: "var(--color-base-content)" }}>
          {isFunctionMode ? "Reference Solution (Completed Function)" : "Reference Solution (Complete Program)"}
        </label>
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-base-300)" }}>
          <div
            className="flex items-center justify-between px-4 py-2 border-b"
            style={{ backgroundColor: "var(--color-base-200)", borderColor: "var(--color-base-300)" }}
          >
            <span className="text-xs" style={{ color: "var(--color-base-content)", opacity: 0.7 }}>
              Never shown to students — used only to check your test cases
            </span>
          </div>
          <CodeEditor value={question.referenceSolution} onChange={setReferenceSolution} height={180} />
        </div>
      </div>

      {/* Test cases */}
      <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-medium">
            Test Case Configuration
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => validateAll(question)}
              disabled={isValidating || question.testCases.length === 0 || !question.referenceSolution.trim()}
              className="flex items-center gap-1 text-xs font-semibold cursor-pointer border-none bg-transparent transition-opacity hover:opacity-70 disabled:opacity-30"
              style={{ color: "var(--color-secondary)" }}
              title={!question.referenceSolution.trim() ? "Add a reference solution first" : undefined}
            >
              {isValidating ? <Loader2 size={13} className="animate-spin" /> : <PlayCircle size={13} />}
              {isValidating ? "Validating..." : "Validate All Test Cases"}
            </button>
            <button onClick={addTestCase} className="flex items-center gap-1 text-xs font-semibold cursor-pointer border-none bg-transparent" style={{ color: "var(--color-secondary)" }}>
              <Plus size={13} />
              Add Case
            </button>
          </div>
        </div>
        
        {question.testCases.map((tc) => {
            const result = results[tc.id]; // this test case's current validation status, if any

            return (
              <div
                key={tc.id}
                className="flex flex-col gap-2 p-4 rounded-xl border"
                style={{
                  backgroundColor: "var(--color-base-100)",
                  borderColor:
                    result?.status === "passed" ? "var(--color-success, #22c55e)" :
                    result?.status === "failed" || result?.status === "error" ? "var(--color-error)" :
                    "var(--color-base-300)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-medium">
                      Input (n)
                    </label>
                    <input
                      type="text"
                      value={tc.input}
                      onChange={(e) => setTestCaseField(tc.id, "input", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none font-mono"
                      style={{ backgroundColor: "var(--color-base-200)", borderColor: "var(--color-base-300)", color: "var(--color-base-content)" }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-medium">
                      Expected Output
                    </label>
                    <input
                      type="text"
                      value={tc.expectedOutput}
                      onChange={(e) => setTestCaseField(tc.id, "expectedOutput", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none font-mono"
                      style={{ backgroundColor: "var(--color-base-200)", borderColor: "var(--color-base-300)", color: "var(--color-base-content)" }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-5">
                    {result?.status === "running" && <Loader2 size={16} className="animate-spin" style={{ opacity: 0.6 }} />}
                    {result?.status === "passed" && <CheckCircle2 size={16} style={{ color: "var(--color-success, #22c55e)" }} />}
                    {(result?.status === "failed" || result?.status === "error") && <XCircle size={16} style={{ color: "var(--color-error)" }} />}
                    <button onClick={() => removeTestCase(tc.id)} className="p-1.5 rounded-lg cursor-pointer border-none bg-transparent transition-opacity hover:opacity-60" style={{ color: "var(--color-error)" }}>
                      <Trash2 size={15} />
                    </button>
                    <button
                      onClick={() => setTestCaseField(tc.id, "isHidden", !tc.isHidden)}
                      className="p-1.5 rounded-lg cursor-pointer border-none bg-transparent transition-opacity hover:opacity-60"
                      style={{ color: tc.isHidden ? "var(--color-secondary)" : "var(--color-base-content)", opacity: tc.isHidden ? 1 : 0.4 }}
                      title={tc.isHidden ? "Hidden from student" : "Visible to student"}
                    >
                      <Eye size={15} />
                    </button>
                  </div>
                </div>

                {/* Shows why a test case failed, only when there's something to show */}
                {result && result.status !== "passed" && result.status !== "running" && (
                  <p className="pl-1 text-xs" style={{ color: "var(--color-error)" }}>
                    {result.status === "failed"
                      ? `Got: "${result.actualOutput}" — expected "${tc.expectedOutput}"`
                      : result.message}
                  </p>
                )}
              </div>
            );
          })}
    </div>
  );
}
