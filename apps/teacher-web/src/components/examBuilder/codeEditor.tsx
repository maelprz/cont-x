import Editor from "@monaco-editor/react";

// Props for the reusable code editor box
interface CodeEditorProps {
  value: string;                     // current code text
  onChange: (value: string) => void; // fires when the teacher types
  height?: number;                   // editor height in pixels
}

// Renders a Monaco editor styled to match the dark code boxes already used here
export function CodeEditor({ value, onChange, height = 200 }: CodeEditorProps) {
  // Called every time Monaco detects a text change
  const handleChange = (newValue: string | undefined) => {
    onChange(newValue ?? "");
  };

  return (
    <Editor
      height={height}
      language="c"
      value={value}
      onChange={handleChange}
      theme="vs-dark"
      options={{
        fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 12 },
        tabSize: 4,
      }}
    />
  );
}