import { lazy } from "react";

export async function loadCodeEditor() {
  const { CodeEditor } = await import("./codeEditor");
  return { default: CodeEditor };
}

export const LazyCodeEditor = lazy(loadCodeEditor);
