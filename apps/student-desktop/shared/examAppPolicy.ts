// When disabled, skip the pre-exam app check entirely. In-exam monitoring is independent.
export const autoCloseDisallowedApps = true;

export const temporarilyExemptApps: ReadonlySet<string> = new Set([
  "Copilot",
  "ChatGPT",
  "VS Code",
  "Opera",
]);
