import { useEffect, useState } from "react";
import type { StudentOption } from "../../services/subjectsClassesService";
import { EnrollCsvPanel } from "./enrollCsvPanel";
import type { CsvEnrollResult } from "../../services/subjectsClassesService";

export function EnrollStudentModal({
  isOpen,
  classTitle,
  classCode,
  isSaving,
  error,
  onClose,
  onSearch,
  onSubmit,
  onSubmitCsv,
}: {
  isOpen: boolean;
  classTitle: string;
  classCode: string;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSearch: (term: string) => Promise<StudentOption[]>;
  onSubmit: (student: StudentOption) => void;
  onSubmitCsv: (entries: string[]) => Promise<CsvEnrollResult>;
}) {
  const [search, setSearch] = useState(""); //what admin typed
  const [results, setResults] = useState<StudentOption[]>([]); //students returned from the search
  const [isSearching, setIsSearching] = useState(false); // true while the search is in progress
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<StudentOption | null>(null); // the student the admin clicked on
  const [mode, setMode] = useState<"manual" | "csv">("manual");

  useEffect(() => {
    if (isOpen) {
      setMode("manual");
      setSearch("");
      setResults([]);
      setSearchError(null);
      setSelected(null);
    }
  }, [isOpen]);

  useEffect(() => {
    //runs each time the search text changes
    const term = search.trim();
    if (term.length < 2) // too short to search
    {
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false; // if the user types again, we want to ignore the old search
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await onSearch(term); // ask the service to search
        if (!cancelled) {
          setResults(found); // show the results
          setSearchError(null);
        }
      } catch (err) {
        if (!cancelled)
          setSearchError(err instanceof Error ? err.message : "Search Failed"); // show the safe message
      } finally {
        if (!cancelled) setIsSearching(false); // search is over either way
      }
    }, 300); // wait a bit before searching, to avoid too many calls
    return () => {
      cancelled = true; // ignore the results of this search
      clearTimeout(timer); // cancel the timer if the user types again
    };
  }, [search, onSearch]);

  if (!isOpen) return null;

  const canSubmit = selected !== null && !isSaving; // only allow submit if a student is selected and not saving

  return (
    <div
      onClick={isSaving ? undefined : onClose} // clicking the background closes the modal, unless saving
      className="fixed inset-0 flex items-center justify-center z-[60]"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()} // clicking inside the modal does not close it
        className={`${mode === "csv" ? "w-[560px]" : "w-[460px]"} p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)]`}
      >
        <h2
          className="text-[17px] font-bold mb-1"
          style={{ color: "var(--color-base-content)" }}
        >
          Enroll Student
        </h2>
        <p
          className="text-[13px] mb-5 opacity-60"
          style={{ color: "var(--color-base-content)" }}
        >
          Adding to {classTitle} ({classCode}).
        </p>

        <div
          role="tablist"
          className="flex gap-1 mb-4 p-1 rounded-lg"
          style={{ backgroundColor: "var(--color-base-200)" }}
        >
          {(["manual", "csv"] as const).map((m) => (
            // one button per mode
            <button
              key={m} // unique key for React
              type="button" // not a form button
              role="tab" // tells screen readers this is a tab
              aria-selected={mode === m} // marks the active tab
              disabled={isSaving} // cannot switch while a save is running
              onClick={() => setMode(m)} // switch to this mode
              className="flex-1 px-3 py-1.5 rounded-md border text-[13px] font-medium cursor-pointer disabled:opacity-40" // "border" is always on now, "border-none" is gone
              style={{
                borderColor:
                  mode === m ? "var(--color-primary)" : "var(--color-base-300)", // visible outline on both tabs, accent colour on the active one
                backgroundColor:
                  mode === m ? "var(--color-primary)" : "transparent", // highlight the active tab
                color:
                  mode === m
                    ? "var(--color-primary-content)"
                    : "var(--color-base-content)", // readable text on the highlight
              }}
            >
              {m === "manual" ? "Single student" : "Upload CSV"}
            </button>
          ))}
        </div>

        {mode === "csv" ? (
          <EnrollCsvPanel
            isSaving={isSaving}
            onSubmit={onSubmitCsv}
            onClose={onClose}
          /> // the CSV tab
        ) : (
          <>
            <label
              className="text-[12px] font-medium opacity-70 block mb-1.5"
              style={{ color: "var(--color-base-content)" }}
            >
              Find student
            </label>
            <input
              autoFocus // put the cursor in the box straight away
              type="text"
              value={search} // shows what has been typed
              onChange={(e) => setSearch(e.target.value)} // keeps the typed text in state
              onKeyDown={(e) =>
                e.key === "Enter" && canSubmit && selected && onSubmit(selected)
              } // Enter confirms when a student is chosen
              placeholder="Type a name or ID number (2+ characters)"
              className="w-full px-3 py-2.5 rounded-lg border text-[14px] outline-none mb-2"
              style={{
                borderColor: "var(--color-base-300)",
                backgroundColor: "var(--color-base-200)",
                color: "var(--color-base-content)",
              }}
            />
            <div
              className="max-h-44 overflow-y-auto rounded-lg border"
              style={{ borderColor: "var(--color-base-300)" }}
            >
              {search.trim().length < 2 && ( // nothing searched yet
                <p
                  className="text-[13px] opacity-60 p-3"
                  style={{ color: "var(--color-base-content)" }}
                >
                  Start typing to search students.
                </p>
              )}
              {search.trim().length >= 2 &&
                isSearching && ( // a search is running
                  <p
                    className="text-[13px] opacity-60 p-3"
                    style={{ color: "var(--color-base-content)" }}
                  >
                    Searching...
                  </p>
                )}
              {search.trim().length >= 2 &&
                !isSearching &&
                !searchError &&
                results.length === 0 && ( // search finished with no matches
                  <p
                    className="text-[13px] opacity-60 p-3"
                    style={{ color: "var(--color-base-content)" }}
                  >
                    No students found.
                  </p>
                )}
              {results.map((s) => (
                // one row per matching student
                <button
                  type="button" // not a form button
                  key={s.id} // unique key for React
                  onClick={() => setSelected(s)} // choose this student
                  className="w-full text-left px-3 py-2 mb-1 last:mb-0 rounded-md border text-[13px] cursor-pointer flex items-center justify-between" // "border" replaces "border-none", mb-1 spaces the rows apart
                  style={{
                    borderColor:
                      selected?.id === s.id
                        ? "var(--color-primary)"
                        : "var(--color-base-300)", // every row has an outline, the chosen one uses the accent colour
                    backgroundColor:
                      selected?.id === s.id
                        ? "var(--color-primary)"
                        : "transparent", // highlight the chosen student
                    color:
                      selected?.id === s.id
                        ? "var(--color-primary-content)"
                        : "var(--color-base-content)", // readable text on the highlight
                  }}
                >
                  <span className="font-medium">{s.fullName}</span>
                  <span className="text-[12px] opacity-70">{s.idNumber}</span>
                </button>
              ))}
            </div>
            {selected && (
              <p
                className="text-[12px] mt-3"
                style={{ color: "var(--color-base-content)" }}
              >
                Selected:{" "}
                <span className="font-semibold">{selected.fullName}</span> (
                {selected.idNumber})
              </p>
            )}
            {/* errors: search problems first, then enrollment problems */}
            {(searchError || error) && (
              <p
                className="text-[12px] mt-3"
                style={{ color: "var(--color-error)" }}
              >
                {searchError ?? error}
              </p>
            )}
            <div className="flex gap-2 mt-5">
              <button
                onClick={onClose} // cancel
                disabled={isSaving} // cannot cancel mid-save
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
                onClick={() => selected && onSubmit(selected)} // enroll the chosen student
                disabled={!canSubmit} // needs a chosen student and no save in progress
                className="flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "var(--color-primary-content)",
                }}
              >
                {isSaving ? "Enrolling..." : "Enroll Student"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
