import { useState } from 'react';
import Editor from '@monaco-editor/react';
import type { RunOutcome } from '../../services/codeExecutionService';

// Props for the code editor pane
interface CodeEditorProps {
  code: string;                          // current code text shown in editor
  language?: string;                     // language mode, defaults to c
  onChange?: (code: string) => void;     // fires when the student types
  onRunTests?: () => void;               // fires when Run Tests is clicked
  onRunCode?: () => void;                // fires when Run Code is clicked
  isRunning?: boolean;                   // NEW — true while a compile/run is in flight
  testsResult?: RunOutcome | null;       // NEW — result from the last Run Tests click
  codeResult?: RunOutcome | null;        // NEW — result from the last Run Code click
  runError?: string | null;              // NEW — network/DB error, separate from a compile error
}

// NEW — one row in the output panel showing a single test case's outcome
function TestCaseRow({
  index,
  passed,
  actualOutput,
  timedOut,
}: {
  index: number;
  passed: boolean;
  actualOutput: string;
  timedOut: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 rounded-md border text-[12px] font-mono ${
        passed
          ? 'border-[var(--accent-green)]/30 bg-[var(--accent-green)]/10'
          : 'border-[#ef4444]/30 bg-[rgba(239,68,68,0.08)]'
      }`}
    >
      <span
        className={`flex-shrink-0 font-bold ${
          passed ? 'text-[var(--accent-green)]' : 'text-[#ef4444]'
        }`}
      >
        {passed ? 'PASS' : 'FAIL'}
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-[var(--text-secondary)]">Test {index + 1}</span>
        {timedOut ? (
          <p className="text-[#ef4444] mt-0.5">Timed out</p>
        ) : (
          <p className="text-[var(--text-primary)] mt-0.5 break-words whitespace-pre-wrap">
            {actualOutput || '(no output)'}
          </p>
        )}
      </div>
    </div>
  );
}

// NEW — the output panel itself, shown below the editor. Collapsible, and
// switches its content based on whichever run happened most recently.
function OutputPanel({
  isOpen,
  onToggle,
  isRunning,
  testsResult,
  codeResult,
  runError,
}: {
  isOpen: boolean;
  onToggle: () => void;
  isRunning?: boolean;
  testsResult?: RunOutcome | null;
  codeResult?: RunOutcome | null;
  runError?: string | null;
}) {
  const activeResult = codeResult ?? testsResult; // whichever ran most recently
  const activeLabel = codeResult ? 'Run Code Result' : testsResult ? 'Run Tests Result' : null;

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-sidebar)] flex-shrink-0">
      {/* Toggle bar, always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 text-[12px] font-mono font-semibold text-[var(--text-inverted-secondary)] cursor-pointer"
      >
        <span>
          {isRunning
            ? 'Running...'
            : activeLabel ?? 'Output'}
        </span>
        <span>{isOpen ? '▾' : '▸'}</span>
      </button>

      {/* Panel body, only rendered when expanded */}
      {isOpen && (
        <div className="px-4 pb-4 max-h-[220px] overflow-y-auto flex flex-col gap-2">
          {isRunning && (
            <p className="text-[12px] font-mono text-[var(--text-inverted-secondary)]">
              Compiling and running...
            </p>
          )}

          {!isRunning && runError && (
            <p className="text-[12px] font-mono text-[#ef4444]">{runError}</p>
          )}

          {!isRunning && !runError && activeResult?.compileError && (
            <pre className="text-[12px] font-mono text-[#ef4444] whitespace-pre-wrap break-words">
              {activeResult.compileError}
            </pre>
          )}

          {!isRunning && !runError && activeResult && !activeResult.compileError && (
            <>
              {activeResult.results.length === 0 && (
                <p className="text-[12px] font-mono text-[var(--text-inverted-secondary)]">
                  No test cases to run.
                </p>
              )}
              {activeResult.results.map((r, i) => (
                <TestCaseRow
                  key={r.testCaseId}
                  index={i}
                  passed={r.passed}
                  actualOutput={r.actualOutput}
                  timedOut={r.timedOut}
                />
              ))}
            </>
          )}

          {!isRunning && !runError && !activeResult && (
            <p className="text-[12px] font-mono text-[var(--text-inverted-secondary)]">
              Run Tests or Run Code to see output here.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Renders the toolbar, the Monaco editor, and the output panel below it
export function CodeEditor({
  code,
  language = 'c',
  onChange,
  onRunTests,
  onRunCode,
  isRunning,
  testsResult,
  codeResult,
  runError,
}: CodeEditorProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(true); // panel starts expanded

  // Called every time Monaco detects a text change
  const handleChange = (value: string | undefined) => {
    onChange?.(value ?? '');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-app)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onRunTests}
            disabled={isRunning}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-primary)] bg-transparent text-[var(--text-secondary)] text-[12px] font-semibold font-mono cursor-pointer hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Run Tests
          </button>
          <button
            onClick={onRunCode}
            disabled={isRunning}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[12px] font-bold font-mono cursor-pointer transition-transform duration-150 hover:scale-[1.02] bg-[image:var(--button-gradient)] text-[var(--button-gradient-text)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Run Code
          </button>
        </div>
      </div>

      {/* Monaco editor fills remaining space */}
      <div className="flex-grow overflow-hidden min-h-0">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={handleChange}
          theme="light"
          options={{
            fontSize: 13,
            fontFamily: 'monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16 },
            tabSize: 4,
          }}
        />
      </div>

      {/* NEW — collapsible output panel, shows compile errors or per-test-case results */}
      <OutputPanel
        isOpen={isPanelOpen}
        onToggle={() => setIsPanelOpen((open) => !open)}
        isRunning={isRunning}
        testsResult={testsResult}
        codeResult={codeResult}
        runError={runError}
      />
    </div>
  );
}