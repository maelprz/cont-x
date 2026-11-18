import { useRef, useState } from 'react';
import type { HTMLAttributes, PointerEvent as ReactPointerEvent } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/editor/editor.api.js';
import 'monaco-editor/languages/definitions/cpp/register.js';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker&inline';
import { CircleX, Terminal, LoaderCircle } from 'lucide-react';
import type { RunOutcome } from '../../services/codeExecutionService';

globalThis.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

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

function TestCaseRow({ index, passed, actualOutput, timedOut }: {
  index: number;
  passed: boolean;
  actualOutput: string;
  timedOut: boolean;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-stone-700">Test {index + 1}</span>
        <span className={`rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide ${passed ? 'bg-[#e9eee3] text-[#465a3b]' : 'bg-red-100 text-red-700'}`}>{passed ? 'PASS' : 'FAIL'}</span>
      </div>
      {timedOut ? <p className="mt-2 text-sm text-red-700">Timed out</p> : (
        <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border border-stone-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-stone-800">{actualOutput || '(no output)'}</pre>
      )}
    </div>
  );
}

// Always-visible results with a draggable divider.
function OutputPanel({
  onRunTests,
  onRunCode,
  isRunning,
  testsResult,
  codeResult,
  runError,
  height,
  resizeHandleProps,
  onResetHeight,
}: {
  onRunTests?: () => void;
  onRunCode?: () => void;
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
    <div className="bg-white flex-shrink-0">
      {/* Drag handle: drag up or down to resize the output panel, double-click to reset it */}
      <div
          {...resizeHandleProps}
          onDoubleClick={onResetHeight}
          title="Drag to resize"
          className="group relative z-10 h-2 w-full flex items-center justify-center cursor-row-resize select-none touch-none bg-stone-100"
        >
          <span className="h-[2px] w-8 rounded-full bg-stone-400 opacity-40 group-hover:opacity-100 transition-opacity duration-150" />
        </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-y border-stone-200 bg-[#f8f8f8] px-4 py-1.5">
        <button type="button" onClick={onRunTests} disabled={isRunning}
          className="cursor-pointer rounded-lg border border-[var(--border-primary)] bg-transparent px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[#465a3b] disabled:cursor-not-allowed disabled:opacity-50">
          Run Tests
        </button>
        <button type="button" onClick={onRunCode} disabled={isRunning}
          className="cursor-pointer rounded-lg border border-[var(--border-subtle)] bg-[image:var(--button-gradient)] px-2.5 py-1 text-xs font-semibold text-[var(--button-gradient-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#465a3b] disabled:cursor-not-allowed disabled:opacity-50">
          Run Code
        </button>
      </div>

      <div
          style={{ height }}
          aria-live="polite"
          aria-busy={isRunning ?? false}
          className="px-4 pb-4 pt-3 border-t border-stone-200 bg-white overflow-y-auto flex flex-col gap-2"
        >
          {isRunning && (
            <p className="flex items-center gap-2 text-sm text-stone-600">
              <LoaderCircle size={16} className="motion-safe:animate-spin" aria-hidden="true" />
              Compiling and running...
            </p>
          )}

          {!isRunning && runError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p className="mb-1 flex items-center gap-2 font-semibold"><CircleX size={16} aria-hidden="true" />Could not run code</p><p className="whitespace-pre-wrap break-words">{runError}</p></div>
          )}

          {!isRunning && !runError && activeResult?.compileError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-800"><CircleX size={16} aria-hidden="true" />Compilation failed</p><pre className="text-xs font-mono leading-relaxed text-red-800 whitespace-pre-wrap break-words">{activeResult.compileError}</pre></div>
          )}

          {!isRunning && !runError && activeResult && !activeResult.compileError && (
            <>
              {activeLabel && (
                <p className="flex items-center gap-2 text-sm font-semibold text-stone-800 mb-1">
                  <Terminal size={16} className="text-stone-500" aria-hidden="true" />
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
            <div className="flex items-start gap-3 rounded-lg border border-dashed border-stone-200 bg-stone-50 px-4 py-4"><Terminal size={18} className="mt-0.5 shrink-0 text-stone-400" aria-hidden="true" /><div><p className="text-sm font-medium text-stone-700">Ready to run</p><p className="mt-1 text-xs leading-relaxed text-stone-500">Run Tests or Run Code to see your output here.</p></div></div>
          )}
        </div>
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
    <div ref={containerRef} className="flex min-h-0 h-full flex-col bg-white text-stone-900">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-[#f8f8f8] px-4 py-3">
        <h3 className="text-sm font-semibold text-stone-900">Your answer</h3>
        <span className="rounded border border-stone-200 bg-white px-2 py-0.5 font-mono text-xs text-stone-600">{language}</span>
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
            links: false,
            dropIntoEditor: { enabled: false },
          }}
        />
      </div>

      <OutputPanel
        onRunTests={onRunTests}
        onRunCode={onRunCode}
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
