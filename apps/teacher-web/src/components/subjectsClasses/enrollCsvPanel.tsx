import { useRef, useState, type ChangeEvent } from "react"; // state, a ref to open the hidden file input, and the input event type
import {
  parseEnrollmentCsv,
  type ParsedEnrollmentCsv,
} from "../../lib/parseEnrollmentCsv"; // the browser-side parser
import type {
  CsvEnrollResult,
  CsvRowOutcome,
} from "../../services/subjectsClassesService"; // shapes of the server report

const OUTCOME_LABELS: Record<CsvRowOutcome, string> = {
  // plain-language text for every outcome the server can return
  enrolled: "Enrolled", // added to the class
  already_enrolled: "Already in this class", // skipped, nothing to do
  not_found: "No account with this ID", // right format, no such user
  not_a_student: "Not a student account", // teacher or admin ID
  invalid_format: "Not a valid 10-digit ID", // failed the format rule
  duplicate_in_file: "Repeated in the file", // an earlier row had the same ID
};

export function EnrollCsvPanel({
  isSaving, // true while the upload request runs
  onSubmit, // sends the entries to the screen's handler and returns the report
  onClose, // closes the whole modal
}: {
  isSaving: boolean;
  onSubmit: (entries: string[]) => Promise<CsvEnrollResult>;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null); // points at the hidden file input so our button can open it
  const [fileName, setFileName] = useState<string | null>(null); // name of the chosen file
  const [parsed, setParsed] = useState<ParsedEnrollmentCsv | null>(null); // the preview; null until a file is read
  const [parseError, setParseError] = useState<string | null>(null); // whole-file problems like a missing header
  const [result, setResult] = useState<CsvEnrollResult | null>(null); // the server report; null until an upload finishes
  const [uploadError, setUploadError] = useState<string | null>(null); // the whole upload was refused

  function reset() {
    // clears everything so the admin can start over
    setFileName(null); // forget the file name
    setParsed(null); // forget the preview
    setParseError(null); // forget file problems
    setResult(null); // forget the report
    setUploadError(null); // forget upload problems
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; // the first file the admin picked
    e.target.value = ""; // lets the admin pick the same file again after fixing it
    if (!file) return; // the dialog was cancelled, so do nothing
    reset(); // a new file replaces any old preview, error or report
    setFileName(file.name); // show the name straight away
    try {
      setParsed(await parseEnrollmentCsv(file)); // read and check the file in the browser
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Could not read the file.",
      ); // helper messages are already safe to show
    }
  }

  async function handleUpload() {
    if (!parsed) return; // nothing to upload
    setUploadError(null); // clear an old error before retrying
    try {
      setResult(await onSubmit(parsed.entries)); // send every row, blanks included, so positions match the preview
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Could not upload the file.",
      ); // the server's safe message
    }
  }

  const c = parsed?.counts; // shorthand for the preview totals
  const flagged =
    parsed?.rows.filter(
      (r) => r.status === "invalid_format" || r.status === "duplicate_in_file",
    ) ?? []; // preview rows that need attention
  const canUpload = parsed !== null && (c?.ok ?? 0) > 0 && !isSaving; // needs at least one plausible row and no request running

  if (result) {
    // after an upload, the report replaces the preview
    const n = (o: CsvRowOutcome) => result.counts[o] ?? 0; // count for one outcome, 0 if missing
    const skipped = result.results.filter((r) => r.outcome !== "enrolled"); // every row that was not enrolled
    const breakdown = (Object.keys(OUTCOME_LABELS) as CsvRowOutcome[])
      .filter((o) => o !== "enrolled" && n(o) > 0) // only outcomes that actually happened
      .map((o) => `${OUTCOME_LABELS[o]}: ${n(o)}`) // for example "No account with this ID: 1"
      .join(" · "); // one readable line
    return (
      <div>
        <p
          className="text-[14px] font-semibold mb-1"
          style={{ color: "var(--color-base-content)" }}
        >
          {n("enrolled")} enrolled, {skipped.length} skipped.
        </p>
        {breakdown && ( // only show the breakdown if something was skipped
          <p
            className="text-[12px] opacity-70 mb-3"
            style={{ color: "var(--color-base-content)" }}
          >
            {breakdown}
          </p>
        )}
        {skipped.length > 0 && ( // list each skipped row with its reason
          <div
            className="max-h-44 overflow-y-auto rounded-lg border"
            style={{ borderColor: "var(--color-base-300)" }}
          >
            {skipped.map((r) => (
              <p
                key={r.position}
                className="text-[12px] px-3 py-2"
                style={{ color: "var(--color-base-content)" }}
              >
                Row {r.position}:{" "}
                <span className="font-mono">{r.idNumber.slice(0, 24)}</span>{" "}
                {OUTCOME_LABELS[r.outcome]}
              </p> // the ID is cut to 24 characters so a huge cell can't break the layout
            ))}
          </div>
        )}
        <div className="flex gap-2 mt-5">
          <button
            type="button" // not a form button
            onClick={reset} // back to the file picker
            className="flex-1 px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
            style={{
              borderColor: "var(--color-base-300)",
              color: "var(--color-base-content)",
              backgroundColor: "transparent",
            }}
          >
            Upload another file
          </button>
          <button
            type="button" // not a form button
            onClick={onClose} // closes the modal
            className="flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-primary-content)",
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p
        className="text-[12px] opacity-70 mb-3"
        style={{ color: "var(--color-base-content)" }}
      >
        Upload a .csv with an <span className="font-semibold">id_number</span>{" "}
        column (10 digits, max 500).
      </p>
      <div className="flex items-center gap-3 mb-3">
        <input
          ref={inputRef} // connects the input to our ref
          type="file" // the real file picker, now invisible
          accept=".csv,text/csv" // only suggests CSV files, the helper checks again
          onChange={handleFile} // runs when a file is chosen
          className="hidden" // hides the browser's default control
        />
        <button
          type="button" // not a form button
          onClick={() => inputRef.current?.click()} // opens the file dialog through the hidden input
          disabled={isSaving} // cannot swap files mid-upload
          className="px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70 disabled:opacity-40"
          style={{
            borderColor: "var(--color-base-300)",
            color: "var(--color-base-content)",
            backgroundColor: "transparent",
          }}
        >
          {fileName ? "Choose another file" : "Choose file"}
        </button>
        <span
          className="text-[13px] opacity-60 truncate"
          style={{ color: "var(--color-base-content)" }}
        >
          {fileName ?? "No file chosen"}
        </span>
      </div>
      {parseError && ( // the file could not be used at all
        <p className="text-[12px] mb-3" style={{ color: "var(--color-error)" }}>
          {parseError}
        </p>
      )}
      {parsed &&
        c && ( // a file was read, so show the preview
          <div>
            <p
              className="text-[13px] mb-2"
              style={{ color: "var(--color-base-content)" }}
            >
              {parsed.rows.length} rows: {c.ok} look valid, {c.invalid_format}{" "}
              invalid, {c.duplicate_in_file} repeated, {c.blank} blank
              (skipped).
            </p>
            <div
              className="max-h-44 overflow-y-auto rounded-lg border"
              style={{ borderColor: "var(--color-base-300)" }}
            >
              {flagged.length === 0 ? ( // nothing wrong that the browser can see
                <p
                  className="text-[13px] opacity-60 p-3"
                  style={{ color: "var(--color-base-content)" }}
                >
                  No format problems found. Accounts are checked when you
                  upload.
                </p>
              ) : (
                flagged.map((r) => (
                  <p
                    key={r.position}
                    className="text-[12px] px-3 py-2"
                    style={{ color: "var(--color-base-content)" }}
                  >
                    Row {r.position}:{" "}
                    <span className="font-mono">{r.value.slice(0, 24)}</span>{" "}
                    {r.hint}
                  </p> // the value is cut to 24 characters so a huge cell can't break the layout
                ))
              )}
            </div>
          </div>
        )}
      {uploadError && ( // the whole upload was refused, for example an active exam
        <p className="text-[12px] mt-3" style={{ color: "var(--color-error)" }}>
          {uploadError} If you're not sure whether it went through, upload the
          same file again. Students already enrolled are skipped.
        </p>
      )}
      <div className="flex gap-2 mt-5">
        <button
          type="button" // not a form button
          onClick={onClose} // closes the whole modal
          disabled={isSaving} // cannot cancel mid-upload
          className="flex-1 px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70 disabled:opacity-40"
          style={{
            borderColor: "var(--color-base-300)",
            color: "var(--color-base-content)",
            backgroundColor: "transparent",
          }}
        >
          Cancel
        </button>
        <button
          type="button" // not a form button
          onClick={handleUpload} // sends the file to the database function
          disabled={!canUpload} // needs a valid preview and no request running
          className="flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-primary-content)",
          }}
        >
          {isSaving ? "Enrolling..." : "Enroll students"}
        </button>
      </div>
    </div>
  );
}
