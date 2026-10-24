import Papa from "papaparse"; // reads CSV text into rows and columns

const ID_PATTERN = /^[0-9]{10}$/; // exactly 10 digits, same rule as the database function
const SHORT_DIGITS = /^[0-9]{1,9}$/; // digits only but too short, probably lost leading zeros
const MAX_FILE_BYTES = 1_000_000; // refuse files over about 1 MB before reading them
const MAX_ROWS = 2000; // total data rows allowed, matches the server's raw-array guard
const MAX_STUDENTS = 500; // non-blank IDs allowed per upload, matches the server cap

export type PreviewStatus =
  "ok" | "invalid_format" | "duplicate_in_file" | "blank"; // what the preview can say about a row

export interface PreviewRow {
  position: number; // 1-based data row number, the header is not counted
  value: string; // the trimmed ID as it will be sent
  status: PreviewStatus; // the light check result
  hint?: string; // short explanation shown next to problem rows
}

export interface ParsedEnrollmentCsv {
  entries: string[]; // what to send to the RPC: every data row in file order, blanks included
  rows: PreviewRow[]; // one preview row per entry, for the preview table
  counts: Record<PreviewStatus, number>; // totals per status, for the summary line
}

export function parseEnrollmentCsvText(rawText: string): ParsedEnrollmentCsv {
  // pure function on text, so it is easy to test without a File object
  const text = rawText.replace(/^\uFEFF/, ""); // strip the Excel BOM before the parser sees it
  const headerLine = text.split(/\r?\n/, 1)[0]; // only the first line, to detect the delimiter
  const best = [",", ";", "\t"] // delimiters Excel commonly uses
    .map((d) => ({ d, n: headerLine.split(d).length - 1 })) // count each one in the header
    .sort((a, b) => b.n - a.n)[0]; // the most frequent wins
  const delimiter = best.n > 0 ? best.d : ","; // single-column files have none, so default to comma
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: false,
    delimiter,
  }); // keep blank lines so row numbers match the file
  if (result.errors.some((e) => e.type === "Quotes")) {
    // a broken quotation mark means the rows can't be trusted
    throw new Error(
      "The file could not be read. Check for a stray quotation mark.",
    ); // safe message for the modal
  }

  const table = result.data; // all rows as arrays of cells
  while (
    table.length > 0 &&
    table[table.length - 1].every((c) => c.trim() === "")
  )
    table.pop(); // drop trailing blank rows left by the final newline
  if (table.length === 0) throw new Error("The file is empty."); // nothing to work with

  const column = table[0]
    .map((h) => h.trim().toLowerCase())
    .indexOf("id_number"); // find the header, ignoring case and spaces
  if (column === -1)
    throw new Error('The first row must contain a column named "id_number".'); // header missing

  const dataRows = table.slice(1); // everything below the header
  if (dataRows.length === 0)
    throw new Error("The file has a header but no student rows."); // header only
  if (dataRows.length > MAX_ROWS)
    throw new Error(`The file has too many rows (maximum ${MAX_ROWS}).`); // protects the server

  const entries: string[] = []; // will hold the values to send
  const rows: PreviewRow[] = []; // will hold the preview rows
  const counts: Record<PreviewStatus, number> = {
    ok: 0,
    invalid_format: 0,
    duplicate_in_file: 0,
    blank: 0,
  }; // running totals
  const seen = new Set<string>(); // IDs already seen, to spot repeats

  dataRows.forEach((cells, index) => {
    const value = (cells[column] ?? "").trim(); // missing cell becomes empty; trim also removes nbsp
    const position = index + 1; // human-friendly row number
    entries.push(value); // always send it, so positions stay aligned with the server report
    let row: PreviewRow; // the preview row we are about to build
    if (value === "")
      row = { position, value, status: "blank" }; // blank rows are skipped silently by the server
    else if (seen.has(value))
      row = {
        position,
        value,
        status: "duplicate_in_file",
        hint: "Repeated in this file; counted once.",
      }; // checked before format, like the server
    else if (!ID_PATTERN.test(value)) {
      // not exactly 10 digits
      row = {
        position,
        value,
        status: "invalid_format",
        hint: SHORT_DIGITS.test(value)
          ? `Only ${value.length} digits. Excel may have removed leading zeros.` // likely a spreadsheet side effect
          : "Must be exactly 10 digits.", // letters, dashes, too long, and so on
      };
    } else row = { position, value, status: "ok" }; // looks fine, the server decides the rest
    if (value !== "") seen.add(value); // remember it so later copies are flagged
    counts[row.status] += 1; // update the totals
    rows.push(row); // add to the preview
  });

  const nonBlank = entries.length - counts.blank; // how many real IDs the file contains
  if (nonBlank > MAX_STUDENTS)
    throw new Error(
      `The file has ${nonBlank} IDs; the maximum is ${MAX_STUDENTS} per upload.`,
    ); // friendly early stop, server enforces it too
  return { entries, rows, counts }; // everything the modal needs
}

export async function parseEnrollmentCsv(
  file: File,
): Promise<ParsedEnrollmentCsv> {
  // the entry point the modal calls with the chosen file
  if (!file.name.toLowerCase().endsWith(".csv"))
    throw new Error("Please choose a .csv file."); // quick type check, not a security boundary
  if (file.size > MAX_FILE_BYTES) throw new Error("The file is too large."); // stops huge files from freezing the tab
  return parseEnrollmentCsvText(await file.text()); // read as text, then reuse the pure parser
}
