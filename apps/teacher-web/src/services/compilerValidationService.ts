// Override with VITE_COMPILER_SERVER_URL in .env if it's not on the default port.
const COMPILER_SERVER_URL =
  import.meta.env.VITE_COMPILER_SERVER_URL ?? "http://localhost:4500";

// What we send for one test case validation.
export interface ValidateTestCaseRequest {
  programType: "cProgram" | "cFunction"; // which question format this is
  referenceSolution: string; // teacher's complete program, or completed function
  mainCode?: string; // hidden main, only needed for cFunction
  input: string; // this test case's input, piped to stdin
  expectedOutput: string; // what the output should match
  timeLimitMs: number; // how long to allow the program to run
}

// What the server sends back for one test case.
export interface ValidateTestCaseResponse {
  passed: boolean; // true only if it compiled, ran, and output matched
  actualOutput: string; // what the program actually printed
  compileError: string | null; // set only if compilation failed
  runtimeError: string | null; // set only if the program crashed or errored
  timedOut: boolean; // true if the program ran too long and was killed
}

// Sends one test case to the compiler-server and returns the result.
export async function validateTestCase(
  request: ValidateTestCaseRequest,
): Promise<ValidateTestCaseResponse> {
  const response = await fetch(`${COMPILER_SERVER_URL}/validate-test-case`, {
    method: "POST", // sending data, not just reading
    headers: { "Content-Type": "application/json" }, // tells the server it's JSON
    body: JSON.stringify(request), // the test case data as JSON text
  });

  if (!response.ok) {
    // Something about the request itself was rejected by the server.
    const body = await response.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error ?? "Could not reach the local compiler server.");
  }

  return response.json(); // the pass/fail result
}