import { useState } from 'react';
import { runVisibleTests, runAllTestsAndScore } from '../services/codeExecutionService';
import type { RunOutcome } from '../services/codeExecutionService';

// Everything the exam question screen needs to drive the code editor buttons
export function useCodeExecution() {
  const [isRunning, setIsRunning] = useState(false);
  const [testsResult, setTestsResult] = useState<RunOutcome | null>(null);
  const [codeResult, setCodeResult] = useState<RunOutcome | null>(null);

  // Run Tests button, visible test cases only, no scoring
  const handleRunTests = async (
    questionId: string,
    code: string,
    programType: 'function' | 'program',
    mainCode: string | undefined
  ) => {
    setIsRunning(true);
    try {
      const result = await runVisibleTests(questionId, code, programType, mainCode);
      setTestsResult(result);
    } finally {
      setIsRunning(false);
    }
  };

  // Run Code button, all test cases, real grading with penalty
  const handleRunCode = async (
    answerId: string,
    questionId: string,
    code: string,
    programType: 'function' | 'program',
    mainCode: string | undefined,
    maxPoints: number,
    checkPenaltyPerAttempt: number
  ) => {
    setIsRunning(true);
    try {
      const result = await runAllTestsAndScore(
        answerId,
        questionId,
        code,
        programType,
        mainCode,
        maxPoints,
        checkPenaltyPerAttempt
      );
      setCodeResult(result);
    } finally {
      setIsRunning(false);
    }
  };

  return {
    isRunning,
    testsResult,
    codeResult,
    handleRunTests,
    handleRunCode,
  };
}