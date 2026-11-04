import Papa from "papaparse";
import type {
  BulkAccountRow,
  BulkRole,
} from "../services/userManagementService";

const REQUIRED = ["first_name", "last_name", "id_number", "email"] as const;
type Column = (typeof REQUIRED)[number];
const REQUIRED_SET = new Set<string>(REQUIRED);

const MAX_FILE_BYTES = 1_000_000;
const MAX_RAW_ROWS = 1000; // must equal MAX_RAW_ROWS in the create-users-bulk Edge Function
const MAX_ACCOUNTS = 200; // must equal MAX_ACCOUNTS in the Edge Function
const NAME_MAX = 50;
const FORMULA_START = ["=", "+", "-", "@"]; // spreadsheets treat these as formulas
// control characters plus invisible format characters (zero-width, bidi overrides, BOM)
const CONTROL_CHARS =
  /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AccountPreviewStatus =
  "ok" | "invalid" | "duplicate_in_file" | "blank";

export interface AccountPreviewRow {
  position: number; // 1-based data row; the header is not counted. The server's index is position - 1
  sheetRow: number; // row number as Excel shows it (the header is row 1)
  account: BulkAccountRow; // exactly what will be sent: trimmed, email lower-cased
  status: AccountPreviewStatus;
  hint?: string; // why the row is invalid or a duplicate
}

export interface ParsedAccountsCsv {
  accounts: BulkAccountRow[]; // every data row in file order, blanks included, so positions match the server report
  rows: AccountPreviewRow[];
  counts: Record<AccountPreviewStatus, number>;
  ignoredColumns: string[]; // headers we do not use, such as role or password
}

// The two checks below must stay in sync with the Edge Function. The preview is only a preview;
// the server repeats every rule and is the authority.
function checkName(label: string, value: string): string | null {
  if (value === "") return `${label} is required`;
  if (value.length > NAME_MAX)
    return `${label} is longer than ${NAME_MAX} characters`;
  if (FORMULA_START.includes(value[0]))
    return `${label} cannot start with = + - or @`;
  if (CONTROL_CHARS.test(value)) return `${label} contains control characters`;
  return null;
}

function checkId(role: BulkRole, id: string): string | null {
  const digits = role === "student" ? 10 : 5;
  // Excel drops leading zeros from numeric cells, so a short all-digit ID is probably a damaged one
  if (/^\d+$/.test(id) && id.length < digits) {
    return `ID must be exactly ${digits} digits; a leading zero may have been lost, create this account manually`;
  }
  if (role === "teacher" && /^0\d{4}$/.test(id))
    return "Teacher ID starts with 0; create this account manually";
  if (!new RegExp(`^\\d{${digits}}$`).test(id))
    return `ID must be exactly ${digits} digits`;
  return null;
}

function checkAccount(a: BulkAccountRow, role: BulkRole): string | null {
  const problem =
    checkName("first_name", a.first_name) ??
    checkName("last_name", a.last_name) ??
    checkId(role, a.id_number);
  if (problem) return problem;
  if (
    a.email.length > 254 ||
    !EMAIL_SHAPE.test(a.email) ||
    CONTROL_CHARS.test(a.email)
  )
    return "email is not valid";
  if (FORMULA_START.includes(a.email[0]))
    return "email cannot start with = + - or @";
  return null;
}

// Pure function on text so it can be re-run when the admin changes the role, without re-reading the file.
export function parseAccountsCsvText(
  rawText: string,
  role: BulkRole,
): ParsedAccountsCsv {
  const text = rawText.replace(/^\uFEFF/, "");
  // NUL characters mean a UTF-16 file without a BOM was decoded as UTF-8
  if (text.includes("\u0000"))
    throw new Error("The file could not be read. Save it again as CSV UTF-8.");

  const headerLine = text.split(/\r?\n/, 1)[0];
  const best = [",", ";", "\t"]
    .map((d) => ({ d, n: headerLine.split(d).length - 1 }))
    .sort((a, b) => b.n - a.n)[0];
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: false,
    delimiter: best.n > 0 ? best.d : ",",
  });
  if (result.errors.some((e) => e.type === "Quotes")) {
    throw new Error(
      "The file could not be read. Check for a stray quotation mark.",
    );
  }

  const table = result.data;
  while (
    table.length > 0 &&
    table[table.length - 1].every((c) => c.trim() === "")
  )
    table.pop(); // trailing blank lines
  if (table.length === 0) throw new Error("The file is empty.");

  const headers = table[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED.filter((c) => !headers.includes(c));
  if (missing.length > 0)
    throw new Error(
      `The first row must contain these columns: ${missing.join(", ")}.`,
    );
  const repeated = REQUIRED.find(
    (c) => headers.indexOf(c) !== headers.lastIndexOf(c),
  );
  if (repeated)
    throw new Error(`The column "${repeated}" appears more than once.`); // would make the data ambiguous

  const col = Object.fromEntries(
    REQUIRED.map((c) => [c, headers.indexOf(c)]),
  ) as Record<Column, number>;
  const ignoredColumns = table[0]
    .map((h) => h.trim())
    .filter((h, i) => h !== "" && !REQUIRED_SET.has(headers[i]));

  const dataRows = table.slice(1);
  if (dataRows.length === 0)
    throw new Error("The file has a header but no account rows.");
  if (dataRows.length > MAX_RAW_ROWS)
    throw new Error(`The file has too many rows (maximum ${MAX_RAW_ROWS}).`);

  const accounts: BulkAccountRow[] = [];
  const rows: AccountPreviewRow[] = [];
  const counts: Record<AccountPreviewStatus, number> = {
    ok: 0,
    invalid: 0,
    duplicate_in_file: 0,
    blank: 0,
  };
  const seenEmails = new Set<string>();
  const seenIds = new Set<string>();

  dataRows.forEach((cells, i) => {
    const cell = (c: Column) => (cells[col[c]] ?? "").trim();
    const account: BulkAccountRow = {
      first_name: cell("first_name"),
      last_name: cell("last_name"),
      id_number: cell("id_number"),
      email: cell("email").toLowerCase(),
    };
    accounts.push(account); // always sent, so positions stay aligned with the server report
    const row: AccountPreviewRow = {
      position: i + 1,
      sheetRow: i + 2,
      account,
      status: "ok",
    };

    if (REQUIRED.every((c) => account[c] === "")) {
      row.status = "blank";
    } else {
      const problem = checkAccount(account, role);
      if (problem) {
        row.status = "invalid";
        row.hint = problem;
      } else if (
        seenEmails.has(account.email) ||
        seenIds.has(account.id_number)
      ) {
        // Same order as the server: only valid rows count as "seen", and the first copy wins
        row.status = "duplicate_in_file";
        row.hint =
          "Repeats an earlier row in this file; only the first copy is used.";
      } else {
        seenEmails.add(account.email);
        seenIds.add(account.id_number);
      }
    }
    counts[row.status] += 1;
    rows.push(row);
  });

  const nonBlank = accounts.length - counts.blank;
  if (nonBlank === 0) throw new Error("The file has no account rows.");
  if (nonBlank > MAX_ACCOUNTS)
    throw new Error(
      `The file has ${nonBlank} rows; the maximum is ${MAX_ACCOUNTS} per upload.`,
    );
  return { accounts, rows, counts, ignoredColumns };
}

// Excel's "CSV UTF-8" is UTF-8 with a BOM, plain "CSV" is Windows-1252, and some tools write UTF-16.
// Wrong decoding turns names like "Muñoz" into garbage, so we detect it instead of assuming UTF-8.
export async function decodeCsvFile(file: File): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".csv"))
    throw new Error("Please choose a .csv file.");
  if (file.size > MAX_FILE_BYTES) throw new Error("The file is too large.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xfe)
    return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff)
    return new TextDecoder("utf-16be").decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes); // throws on invalid UTF-8 instead of guessing
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

// Convenience for the first load. The panel keeps the decoded text and calls
// parseAccountsCsvText again when the role changes.
export async function parseAccountsCsv(
  file: File,
  role: BulkRole,
): Promise<ParsedAccountsCsv> {
  return parseAccountsCsvText(await decodeCsvFile(file), role);
}
