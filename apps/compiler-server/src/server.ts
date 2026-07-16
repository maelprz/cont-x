import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { validateTestCase, ValidateTestCaseRequest } from './validateTestCase';

const app = express(); // create the web server
const PORT = process.env.COMPILER_SERVER_PORT ?? 4500; // configurable port, with a default

app.use(cors()); // allow the teacher-web browser tab to call this server
app.use(express.json({ limit: '1mb' })); // parse JSON bodies, cap size to avoid abuse

// Validates one test case: compiles the assembled source, runs it,
// and reports whether the output matched what was expected.
app.post('/validate-test-case', async (req, res) => {
  const body = req.body as Partial<ValidateTestCaseRequest>; // what the browser sent

  // Basic shape check before doing any real work.
  if (
    !body.programType ||
    !body.referenceSolution ||
    typeof body.input !== 'string' ||
    typeof body.expectedOutput !== 'string' ||
    typeof body.timeLimitMs !== 'number'
  ) {
    res.status(400).json({ error: 'Missing or invalid fields in request body.' });
    return;
  }

  // cFunction questions must include the hidden main to call the function.
  if (body.programType === 'cFunction' && !body.mainCode) {
    res.status(400).json({ error: 'mainCode is required for cFunction questions.' });
    return;
  }

  try {
    const result = await validateTestCase(body as ValidateTestCaseRequest);
    res.json(result); // send back pass/fail and details
  } catch (err) {
    // Something unexpected broke, not a normal compile/run failure.
    res.status(500).json({ error: 'Validation failed unexpectedly.' });
  }
});

app.listen(PORT, () => {
  console.log(`Compiler server listening on port ${PORT}`); // confirms it started
});