import { Plus, Trash2, Eye, Settings } from "lucide-react";
import type { CodingBuilderQuestion, CodingProgramType, TestCase } from "../../screens/examBuilder/examBuilderScreen.types";

export function CodingEditorPanel({
  question,
  onChange,
  onPreviewRendered,
}: {
  question: CodingBuilderQuestion;
  onChange: (q: CodingBuilderQuestion) => void;
  onPreviewRendered?: () => void;
}) {
  // Updates the points awarded per test case.
  const setPoints = (v: string) => onChange({ ...question, points: Number(v) || 0 });
  // Updates the problem description text.
  const setDescription = (v: string) => onChange({ ...question, description: v });
  // Updates the starter code shown to students.
  const setStarterCode = (v: string) => onChange({ ...question, starterCode: v });
  // Switches between full program and single function mode.
  const setProgramType = (v: CodingProgramType) => onChange({ ...question, programType: v });
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
  
  // True when teacher wants students to implement just one function.
  const isFunctionMode = question.programType === "cFunction";

  return (
    <div className="flex flex-col gap-6">
      {/* Question format, points per test case, and deduction row */}
      <div className="flex items-end gap-6">
        {/* Dropdown to pick full program vs single function */}
        <div>
          <label className="block text-[13px] font-medium mb-2" style={{ color: "var(--color-base-content)" }}>
            Question Format
          </label>
          <select
            value={question.programType}
            onChange={(e) => setProgramType(e.target.value as CodingProgramType)}
            className="w-40 px-3 py-2 rounded-lg border text-[14px] outline-none"
            style={{ backgroundColor: "var(--color-base-100)", borderColor: "var(--color-base-300)", color: "var(--color-base-content)", fontFamily: "inherit" }}
          >
            <option value="cProgram">C Program</option>
            <option value="cFunction">C Function</option>
          </select>
        </div>

        {/* Points earned for each passing test case */}
        <div>
          <label className="block text-[13px] font-medium mb-2" style={{ color: "var(--color-base-content)" }}>
            Points per Test Case
          </label>
          <input
            type="number"
            value={question.points}
            onChange={(e) => setPoints(e.target.value)}
            className="w-36 px-3 py-2 rounded-lg border text-[14px] outline-none"
            style={{ backgroundColor: "var(--color-base-100)", borderColor: "var(--color-base-300)", color: "var(--color-base-content)", fontFamily: "inherit" }}
          />
        </div>

        {/* Points lost every time student checks their answer */}
        <div>
          <label className="block text-[13px] font-medium mb-2" style={{ color: "var(--color-base-content)" }}>
            Deduction per Attempt
          </label>
          <input
            type="number"
            value={question.deductionPerAttempt}
            onChange={(e) => setDeductionPerAttempt(e.target.value)}
            className="w-36 px-3 py-2 rounded-lg border text-[14px] outline-none"
            style={{ backgroundColor: "var(--color-base-100)", borderColor: "var(--color-base-300)", color: "var(--color-base-content)", fontFamily: "inherit" }}
          />
        </div>
      </div>

      {/* Problem description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-mono text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-base-content)", opacity: 0.6 }}>
            Problem Description (Markdown)
          </label>
          <button onClick={onPreviewRendered} className="font-mono text-[11px] font-semibold cursor-pointer border-none bg-transparent" style={{ color: "var(--color-secondary)" }}>
            Preview Rendered
          </button>
        </div>
        <textarea
          value={question.description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="w-full px-3 py-2.5 rounded-lg border text-[13px] resize-y outline-none leading-relaxed"
          style={{ backgroundColor: "var(--color-base-100)", borderColor: "var(--color-base-300)", color: "var(--color-base-content)", fontFamily: "'JetBrains Mono', monospace" }}
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
              <span className="font-mono text-[12px]" style={{ color: "var(--color-base-content)", opacity: 0.7 }}>
                main.c
              </span>
            </div>
            <textarea
              value={question.mainCode}
              onChange={(e) => setMainCode(e.target.value)}
              rows={7}
              spellCheck={false}
              className="w-full px-4 py-3 text-[13px] resize-none outline-none leading-6"
              style={{ backgroundColor: "#1a2332", color: "#c2c6d6", fontFamily: "'JetBrains Mono', monospace", border: "none" }}
            />
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
          <textarea
            value={question.starterCode}
            onChange={(e) => setStarterCode(e.target.value)}
            rows={7}
            spellCheck={false}
            className="w-full px-4 py-3 text-[13px] resize-none outline-none leading-6"
            style={{ backgroundColor: "#1a2332", color: "#c2c6d6", fontFamily: "'JetBrains Mono', monospace", border: "none" }}
          />
        </div>
      </div>

      {/* Test cases */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-base-content)", opacity: 0.6 }}>
            Test Case Configuration
          </p>
          <button onClick={addTestCase} className="flex items-center gap-1 font-mono text-[11px] font-semibold cursor-pointer border-none bg-transparent" style={{ color: "var(--color-secondary)" }}>
            <Plus size={13} />
            Add Case
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {question.testCases.map((tc) => (
            <div
              key={tc.id}
              className="flex items-center gap-3 p-4 rounded-xl border"
              style={{ backgroundColor: "var(--color-base-100)", borderColor: "var(--color-base-300)" }}
            >
              <div className="flex-1">
                <label className="block font-mono text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--color-base-content)", opacity: 0.5 }}>
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
                <label className="block font-mono text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--color-base-content)", opacity: 0.5 }}>
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
          ))}
        </div>
      </div>
    </div>
  );
}