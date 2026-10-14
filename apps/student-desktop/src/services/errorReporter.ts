export function reportError(where: string, error: unknown): void { // the one place every service reports real errors
  console.error(`[${where}]`, error); // for now: print the real details in the developer console only
  // TODO: also send this to the superadmin technical log once that table exists (audit revamp)
}