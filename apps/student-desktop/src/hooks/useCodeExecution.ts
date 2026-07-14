import { useState } from 'react';
import { runVisibleTests, runAllTestsAndScore } from '../services/codeExecutionService';
import type { RunOutcome } from '../services/codeExecutionService';

// Everything the exam question screen needs to drive the code editor buttons
export function useCodeExecution() {
  const [isRunning, setIsRunning] = useState(false);
  const [testsResult, setTestsResult] = useState<RunOutcome | null>(null);
  const [codeResult, setCodeResult] = useState<RunOutcome | null>(null);
  const [runError, setRunError] = useState<string | null>(null); // NEW — network/DB errors, separate from compile errors

  // Run Tests button, visible test cases only, no scoring
  const handleRunTests = async (
    questionId: string,
    code: string,
    programType: 'function' | 'program',
    mainCode: string | undefined
  ) => {
    setIsRunning(true);
    setRunError(null);
    setCodeResult(null); // clear the other panel's result so only one shows at a time
    try {
      const result = await runVisibleTests(questionId, code, programType, mainCode);
      setTestsResult(result);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Could not run tests.');
    } finally {
      setIsRunning(false);
    }
  };

  // Run Code button, all test cases, real grading with penalty
  // CHANGED — first param is now sessionId, not a pre-existing answerId
  const handleRunCode = async (
    sessionId: string,
    questionId: string,
    code: string,
    programType: 'function' | 'program',
    mainCode: string | undefined,
    maxPoints: number,
    checkPenaltyPerAttempt: number
  ) => {
    setIsRunning(true);
    setRunError(null);
    setTestsResult(null); // clear the other panel's result so only one shows at a time
    try {
      const result = await runAllTestsAndScore(
        sessionId,
        questionId,
        code,
        programType,
        mainCode,
        maxPoints,
        checkPenaltyPerAttempt
      );
      setCodeResult(result);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Could not run code.');
    } finally {
      setIsRunning(false);
    }
  };

  // NEW — clears whatever's currently shown in the output panel, e.g. when
  // the student navigates to a different question.
  const clearResults = () => {
    setTestsResult(null);
    setCodeResult(null);
    setRunError(null);
  };

  return {
    isRunning,
    testsResult,
    codeResult,
    runError,
    handleRunTests,
    handleRunCode,
    clearResults,
  };
}