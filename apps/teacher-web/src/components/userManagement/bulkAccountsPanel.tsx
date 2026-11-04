import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  decodeCsvFile,
  parseAccountsCsvText,
  type ParsedAccountsCsv,
} from "../../lib/parseAccountsCsv";
import type {
  BulkAccountRow,
  BulkCreateResult,
  BulkRole,
  BulkRoleOutcome,
} from "../../services/userManagementService";

const OUTCOME_LABELS: Record<BulkRoleOutcome, string> = {
  created: "Created",
  email_taken: "Email already registered",
  id_taken: "ID number already registered",
  invalid: "Invalid",
  duplicate_in_file: "Repeated in the file",
  error: "Failed",
};

const OUTLINE_BTN =
  "border border-[var(--color-base-300)] rounded-lg px-4 py-2 text-sm hover:bg-[var(--color-base-200)] disabled:opacity-40";
const PRIMARY_BTN =
  "bg-[var(--color-primary)] text-[var(--color-primary-content)] rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40";

// A huge cell must not break the layout, so every displayed value is cut
const clip = (value: string, max = 40) =>
  value.length > max ? `${value.slice(0, max)}…` : value;

export function BulkAccountsPanel({
  onSubmit,
  onClose,
}: {
  onSubmit: (
    role: BulkRole,
    accounts: BulkAccountRow[],
  ) => Promise<BulkCreateResult>;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false); // blocks a second click that lands before React re-renders
  const [role, setRole] = useState<BulkRole>("student");
  const [fileName, setFileName] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null); // decoded file, kept so a role change can re-parse without re-reading
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<BulkCreateResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Re-parses whenever the file or the role changes, because the ID rules depend on the role
  const preview = useMemo<{
    parsed?: ParsedAccountsCsv;
    error?: string;
  } | null>(() => {
    if (text === null) return null;
    try {
      return { parsed: parseAccountsCsvText(text, role) };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Could not read the file.",
      };
    }
  }, [text, role]);
  const parsed = preview?.parsed;

  function reset() {
    setFileName(null);
    setText(null);
    setFileError(null);
    setResult(null);
    setUploadError(null);
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the admin pick the same file again after fixing it
    if (!file) return;
    reset();
    setFileName(file.name);
    try {
      setText(await decodeCsvFile(file));
    } catch (err) {
      setFileError(
        err instanceof Error ? err.message : "Could not read the file.",
      );
    }
  }

  async function handleUpload() {
    if (!parsed || uploadingRef.current) return;
    uploadingRef.current = true;
    setIsUploading(true);
    setUploadError(null);
    try {
      setResult(await onSubmit(role, parsed.accounts)); // every row, blanks included, so positions match the report
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Could not upload the file.",
      );
    } finally {
      uploadingRef.current = false;
      setIsUploading(false);
    }
  }

  // ---------- result report ----------
  if (result) {
    const n = (o: BulkRoleOutcome) => result.summary[o] ?? 0;
    const skipped = result.results.filter((r) => r.outcome !== "created");
    const breakdown = (Object.keys(OUTCOME_LABELS) as BulkRoleOutcome[])
      .filter((o) => o !== "created" && n(o) > 0)
      .map((o) => `${OUTCOME_LABELS[o]}: ${n(o)}`)
      .join(" · ");
    return (
      <div>
        <p className="text-sm font-semibold mb-1">
          {n("created")} {result.role} account(s) created, {skipped.length}{" "}
          skipped.
        </p>
        {breakdown && <p className="text-xs opacity-70 mb-3">{breakdown}</p>}
        {result.stopped_early && (
          <p className="text-xs mb-3 text-[var(--color-error)]">
            The upload stopped early (time limit or rate limit). Upload the same
            file again to finish. Accounts created in this run will show as
            "Email already registered", which is expected.
          </p>
        )}
        {n("created") > 0 && !result.audit_logged && (
          <p className="text-xs mb-3 text-[var(--color-error)]">
            The accounts were created, but the audit log entry could not be
            saved. Tell a developer.
          </p>
        )}
        {skipped.length > 0 && (
          <div className="max-h-44 overflow-y-auto rounded-lg border border-[var(--color-base-300)]">
            {skipped.map((r) => {
              const a = parsed?.accounts[r.index]; // r.index is the position in the array we sent
              return (
                <p key={r.index} className="text-xs px-3 py-2">
                  Row {r.index + 2}:{" "}
                  {a ? clip(`${a.first_name} ${a.last_name}`) : ""} –{" "}
                  {clip(r.reason ?? OUTCOME_LABELS[r.outcome], 120)}
                </p>
              );
            })}
          </div>
        )}
        <div className="flex gap-3 mt-5">
          <button type="button" onClick={reset} className={OUTLINE_BTN}>
            Upload another file
          </button>
          <button type="button" onClick={onClose} className={PRIMARY_BTN}>
            Done
          </button>
        </div>
      </div>
    );
  }

  // ---------- file picker + preview ----------
  const c = parsed?.counts;
  const shown = parsed?.rows.filter((r) => r.status !== "blank") ?? [];
  const canUpload = !!parsed && (c?.ok ?? 0) > 0 && !isUploading;

  return (
    <div>
      <div className="flex flex-col gap-1 mb-4 max-w-xs">
        <label
          htmlFor="bulk-role"
          className="text-xs opacity-60 uppercase tracking-wide"
        >
          Role for every account in this file
        </label>
        <select
          id="bulk-role"
          value={role}
          onChange={(e) => setRole(e.target.value as BulkRole)}
          disabled={isUploading}
          className="border border-[var(--color-base-300)] rounded-lg px-3 py-2 text-sm outline-none bg-[var(--color-base-200)]"
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        <p className="text-xs opacity-60">
          {role === "student"
            ? "Student IDs are exactly 10 digits."
            : "Teacher IDs are exactly 5 digits and cannot start with 0."}
        </p>
      </div>

      <p className="text-xs opacity-70 mb-3">
        Upload a .csv with the columns{" "}
        <span className="font-semibold">
          first_name, last_name, id_number, email
        </span>{" "}
        (max 200 rows).
      </p>
      <div className="flex items-center gap-3 mb-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className={OUTLINE_BTN}
        >
          {fileName ? "Choose another file" : "Choose file"}
        </button>
        <span className="text-sm opacity-60 truncate">
          {fileName ?? "No file chosen"}
        </span>
      </div>

      {(fileError || preview?.error) && (
        <p className="text-xs mb-3 text-[var(--color-error)]">
          {fileError ?? preview?.error}
        </p>
      )}

      {parsed && c && (
        <div>
          {parsed.ignoredColumns.length > 0 && (
            <p className="text-xs mb-2 opacity-80">
              Ignored columns:{" "}
              {parsed.ignoredColumns.map((h) => clip(h, 20)).join(", ")}. Every
              account gets the role chosen above.
            </p>
          )}
          <p className="text-sm mb-2">
            {shown.length} rows: {c.ok} look valid, {c.invalid} invalid,{" "}
            {c.duplicate_in_file} repeated
            {c.blank > 0 ? `, ${c.blank} blank (skipped)` : ""}.
          </p>
          <div className="max-h-56 overflow-auto rounded-lg border border-[var(--color-base-300)]">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-[var(--color-base-200)] text-left opacity-80">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Check</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr
                    key={r.position}
                    className={
                      r.status === "ok" ? "" : "bg-[var(--color-error)]/10"
                    }
                  >
                    <td className="px-3 py-1.5">{r.sheetRow}</td>
                    <td className="px-3 py-1.5">
                      {clip(`${r.account.first_name} ${r.account.last_name}`)}
                    </td>
                    <td className="px-3 py-1.5 font-mono">
                      {clip(r.account.id_number, 14)}
                    </td>
                    <td className="px-3 py-1.5">{clip(r.account.email, 50)}</td>
                    <td className="px-3 py-1.5">
                      {r.status === "ok" ? "OK" : clip(r.hint ?? "", 90)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs opacity-60 mt-2">
            Emails and IDs already in the system are only detected when you
            upload. New accounts start with the system's default password, so
            tell each person to change it after their first login.
          </p>
        </div>
      )}

      {uploadError && (
        <p className="text-xs mt-3 text-[var(--color-error)]">
          {uploadError} If you're not sure whether it went through, upload the
          same file again. Accounts already created are reported as "Email
          already registered".
        </p>
      )}

      <div className="flex gap-3 mt-5">
        <button
          type="button"
          onClick={handleUpload}
          disabled={!canUpload}
          className={PRIMARY_BTN}
        >
          {isUploading
            ? "Creating accounts… this can take a minute"
            : `Create ${c?.ok ?? 0} ${role} account(s)`}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isUploading}
          className={OUTLINE_BTN}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
