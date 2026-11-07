import { useRef, useState } from 'react';
import type { HTMLAttributes, PointerEvent as ReactPointerEvent } from 'react';
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
  panelHeight?: number;                  // output panel height in px, kept by the parent so it survives question changes
  onPanelHeightChange?: (height: number) => void; // fires while the student drags the resize handle
}

// Output panel size limits, in pixels.
const DEFAULT_PANEL_HEIGHT = 220; // the old fixed size, also what a double-click on the handle resets to
const MIN_PANEL_HEIGHT = 80; // never smaller than this, so results stay readable
const MAX_PANEL_RATIO = 0.7; // never taller than 70% of the editor column, so the code stays visible

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
          // CHANGED — was text-[var(--text-primary)], rendered as unreadable
          // dark blue against the dark output panel background. Switched to
          // a light near-white so actual output is always legible.
          <p className="text-black mt-0.5 break-words whitespace-pre-wrap">
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
  height,
  resizeHandleProps,
  onResetHeight,
}: {
  isOpen: boolean;
  onToggle: () => void;
  isRunning?: boolean;
  testsResult?: RunOutcome | null;
  codeResult?: RunOutcome | null;
  runError?: string | null;
  height: number; // height of the results area in px
  resizeHandleProps: HTMLAttributes<HTMLDivElement>; // pointer handlers that make the handle draggable
  onResetHeight: () => void; // double-click on the handle puts the height back to the default
}) {
  const activeResult = codeResult ?? testsResult;
  const activeLabel = codeResult ? 'Run Code Result' : testsResult ? 'Run Tests Result' : null;

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-sidebar)] flex-shrink-0">
      {/* Drag handle: drag up or down to resize the output panel, double-click to reset it */}
      {isOpen && (
        <div
          {...resizeHandleProps}
          onDoubleClick={onResetHeight}
          title="Drag to resize"
          className="group relative z-10 h-1 w-full flex items-center justify-center cursor-row-resize select-none touch-none bg-[var(--bg-sidebar)]"
        >
          {/* Invisible, taller grab area so the thin handle is still easy to hit */}
          <span className="absolute inset-x-0 -top-2 -bottom-0.5" />
          <span className="h-[2px] w-8 rounded-full bg-[var(--text-inverted-secondary)] opacity-40 group-hover:opacity-100 transition-opacity duration-150" />
        </div>
      )}
      {/* CHANGED — toggle bar no longer shows the label text, just the
          running state (if active) and the expand/collapse arrow */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-1 text-[11px] font-mono font-medium text-[var(--text-inverted)] cursor-pointer bg-[var(--bg-sidebar)] hover:bg-white/5 transition-colors duration-150"
      >
        <span className="text-[10px] ml-auto">{isOpen ? '▾' : '▸'}</span>
      </button>

      {isOpen && (
        <div
          style={{ height }}
          className="px-4 pb-4 pt-3 border-t border-[#d1d5db] bg-white overflow-y-auto flex flex-col gap-2"
        >
          {isRunning && (
            <p className="text-[12px] font-mono text-black">
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
              {/* NEW — label now shown here, above the results, instead of in the toggle bar */}
              {activeLabel && (
                <p className="text-[11px] font-mono font-semibold text-black mb-1">
                  {activeLabel}
                </p>
              )}
              {activeResult.results.length === 0 && (
                <p className="text-[12px] font-mono text-black">
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
            <p className="text-[12px] font-mono text-black">
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
  panelHeight,
  onPanelHeightChange,
}: CodeEditorProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(true); // panel starts expanded

  // Output panel height: the parent owns it when it passes panelHeight, otherwise it is kept here.
  const [localPanelHeight, setLocalPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const height = panelHeight ?? localPanelHeight; // the height actually used
  const setHeight = onPanelHeightChange ?? setLocalPanelHeight; // where a new height goes
  const containerRef = useRef<HTMLDivElement>(null); // the editor column, used to cap the panel height
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null); // only set while dragging

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault(); // no text selection while dragging
    e.currentTarget.setPointerCapture(e.pointerId); // keep getting moves even if the pointer leaves the handle
    dragRef.current = { startY: e.clientY, startHeight: height }; // remember where the drag began
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return; // not dragging
    const maxHeight = Math.max(
      Math.floor((containerRef.current?.clientHeight ?? 600) * MAX_PANEL_RATIO),
      MIN_PANEL_HEIGHT,
    ); // cap at 70% of the column, but never below the minimum
    const next = drag.startHeight + (drag.startY - e.clientY); // dragging up makes the panel taller
    setHeight(Math.min(Math.max(next, MIN_PANEL_HEIGHT), maxHeight)); // keep it between the limits
  };

  const handlePointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null; // drag is over
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId); // let go of the pointer
    }
  };

  // Called every time Monaco detects a text change
  const handleChange = (value: string | undefined) => {
    onChange?.(value ?? '');
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full">
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
        height={height}
        resizeHandleProps={{
          onPointerDown: handlePointerDown,
          onPointerMove: handlePointerMove,
          onPointerUp: handlePointerEnd,
          onPointerCancel: handlePointerEnd,
        }}
        onResetHeight={() => setHeight(DEFAULT_PANEL_HEIGHT)}
      />
    </div>
  );
}