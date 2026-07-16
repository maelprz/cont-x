import { useState } from "react";
import { validateTestCase } from "../services/compilerValidationService";
import type { CodingBuilderQuestion } from "../screens/examBuilder/examBuilderScreen.types";

// Default time limit for validation runs, matches the database
// column's own default until per-test-case limits are wired into the UI.
const DEFAULT_TIME_LIMIT_MS = 5000;

// One test case's validation status, keyed by the test case's id.
export interface TestCaseValidationResult {
  status: "running" | "passed" | "failed" | "error"; // where this test case is right now
  actualOutput?: string; // what the program printed, shown on failure
  message?: string; // compile error, runtime error, or a generic failure reason
}

// Runs every test case for one coding question through the compiler-server,
// one at a time, and tracks each test case's pass/fail state.
export function useValidateTestCases() {
  const [results, setResults] = useState<Record<string, TestCaseValidationResult>>({});
  const [isValidating, setIsValidating] = useState(false);

  // Updates just one test case's result, keeping the others untouched.
  const setOneResult = (testCaseId: string, result: TestCaseValidationResult) => {
    setResults((prev) => ({ ...prev, [testCaseId]: result }));
  };

  // Validates every test case on the given question, in order.
  async function validateAll(question: CodingBuilderQuestion): Promise<void> {
    setIsValidating(true);

    // Run one at a time so we never spawn multiple compiles together.
    for (const testCase of question.testCases) {
      setOneResult(testCase.id, { status: "running" });

      try {
        const response = await validateTestCase({
          programType: question.programType,
          referenceSolution: question.referenceSolution,
          mainCode: question.programType === "cFunction" ? question.mainCode : undefined,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          timeLimitMs: DEFAULT_TIME_LIMIT_MS,
        });

        if (response.compileError !== null) {
          setOneResult(testCase.id, {
            status: "error",
            message: response.compileError || "Compilation failed — check that GCC_PATH is set correctly on the compiler-server.",
          });
        } else if (response.timedOut) {
          setOneResult(testCase.id, { status: "error", message: "Timed out — check for an infinite loop." });
        } else if (response.passed) {
          setOneResult(testCase.id, { status: "passed", actualOutput: response.actualOutput });
        } else {
          setOneResult(testCase.id, {
            status: "failed",
            actualOutput: response.actualOutput,
            message: response.runtimeError ?? undefined,
          });
        }
      } catch (err) {
        // Server unreachable, or some other network-level failure.
        setOneResult(testCase.id, {
          status: "error",
          message: err instanceof Error ? err.message : "Validation failed unexpectedly.",
        });
      }
    }

    setIsValidating(false);
  }

  // Clears every result, e.g. after the teacher edits the reference solution.
  const clearResults = () => setResults({});

  return { results, isValidating, validateAll, clearResults };
}