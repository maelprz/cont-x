import Editor from '@monaco-editor/react';

// Props for the code editor pane
interface CodeEditorProps {
  code: string;                          // current code text shown in editor
  language?: string;                     // language mode, defaults to c
  onChange?: (code: string) => void;     // fires when the student types
  onRunTests?: () => void;               // fires when Run Tests is clicked
  onRunCode?: () => void;                // fires when Run Code is clicked
}

// Renders the toolbar and the Monaco editor below it
export function CodeEditor({
  code,
  language = 'c',
  onChange,
  onRunTests,
  onRunCode,
}: CodeEditorProps) {
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
            className="px-3 py-1.5 rounded-lg border border-[var(--border-primary)] bg-transparent text-[var(--text-secondary)] text-[12px] font-semibold font-mono cursor-pointer hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors duration-150"
          >
            Run Tests
          </button>
          <button
            onClick={onRunCode}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[12px] font-bold font-mono cursor-pointer transition-transform duration-150 hover:scale-[1.02] bg-[image:var(--button-gradient)] text-[var(--button-gradient-text)]"
          >
            Run Code
          </button>
        </div>
      </div>

      {/* Monaco editor fills remaining space */}
      <div className="flex-grow overflow-hidden">
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
    </div>
  );
}