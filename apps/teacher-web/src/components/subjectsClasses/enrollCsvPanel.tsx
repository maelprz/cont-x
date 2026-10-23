import { useRef, useState, type ChangeEvent } from "react"; // state for the chosen file, and the type of the file input's change event
import {
  parseEnrollmentCsv,
  type ParsedEnrollmentCsv,
} from "../../lib/parseEnrollmentCsv"; // the helper we just built

export function EnrollCsvPanel({ onClose }: { onClose: () => void }) {
  const [fileName, setFileName] = useState<string | null>(null); // name of the chosen file, shown to the admin
  const [parsed, setParsed] = useState<ParsedEnrollmentCsv | null>(null); // the preview; null until a file is read
  const [parseError, setParseError] = useState<string | null>(null); // whole-file problems like a missing header
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; // the first file the admin picked
    e.target.value = ""; // lets the admin pick the same file again after fixing it
    if (!file) return; // the dialog was cancelled, so do nothing
    setFileName(file.name); // show the name straight away
    setParsed(null); // clear any older preview
    setParseError(null); // clear any older error
    try {
      setParsed(await parseEnrollmentCsv(file)); // read and check the file in the browser
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Could not read the file.",
      ); // helper messages are already safe to show
    }
  }

  const flagged =
    parsed?.rows.filter(
      (r) => r.status === "invalid_format" || r.status === "duplicate_in_file",
    ) ?? []; // only rows that need attention
  const c = parsed?.counts; // shorthand for the totals

  return (
    <div>
      <p
        className="text-[12px] opacity-70 mb-3"
        style={{ color: "var(--color-base-content)" }}
      >
        Choose a CSV with a column named{" "}
        <span className="font-semibold">id_number</span> (10 digits per student,
        maximum 500). In Excel, export as "CSV (Comma delimited)".
      </p>
      <div className="flex items-center gap-3 mb-3">
        <input
          ref={inputRef} // connects the input to our ref
          type="file" // the real file picker, now invisible
          accept=".csv,text/csv" // only suggests CSV files, the helper checks again
          onChange={handleFile} // runs when a file is chosen, same as before
          className="hidden" // hides the browser's ugly default control
        />
        <button
          type="button" // not a form button
          onClick={() => inputRef.current?.click()} // opens the file dialog through the hidden input
          className="px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70" // same bordered look as your other buttons
          style={{
            borderColor: "var(--color-base-300)",
            color: "var(--color-base-content)",
            backgroundColor: "transparent",
          }}
        >
          {fileName ? "Choose another file" : "Choose file"}
        </button>
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
              <span className="font-semibold">{fileName}</span>:{" "}
              {parsed.rows.length} rows. {c.ok} look valid, {c.invalid_format}{" "}
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
                  // one line per problem row
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
      <div className="flex gap-2 mt-5">
        <button
          type="button" // not a form button
          onClick={onClose} // closes the whole modal
          className="flex-1 px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
          style={{
            borderColor: "var(--color-base-300)",
            color: "var(--color-base-content)",
            backgroundColor: "transparent",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
