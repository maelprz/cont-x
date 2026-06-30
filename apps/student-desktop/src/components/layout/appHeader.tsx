import type { AppHeaderProps } from "./appHeader.types";

// Color tokens specific to this header's inline-style design — kept separate from our
// CSS variables in index.css since this header was built as a standalone visual block.
const C = {
  surfaceContainer: "#122131",
  surfaceContainerHighest: "#273647",
  onSurface: "#d4e4fa",
  onSurfaceVariant: "#c2c6d6",
  outline: "#8c909f",
  outlineVariant: "#424754",
  primary: "#adc6ff",
};

// Single shared header bar — used by Dashboard, Archive, and ExamConfirmation.
// Reversed from the earlier "duplicate it" decision now that there were 3 drifting copies.
export function AppHeader({
  studentName = "Alex",
  studentId = "2021-00001",
}: AppHeaderProps) {
  // Turns "Alex" into "A", or "Juan dela Cruz" into "JD".
  const initials = studentName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header
      style={{
        height: "56px",
        display: "flex",
        alignItems: "center",
        padding: "0 32px",
        background: "rgba(18, 33, 49, 0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.outlineVariant}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <span
          style={{
            color: C.primary,
            fontSize: "18px",
            fontWeight: 700,
            letterSpacing: "4px",
          }}
        >
          Cont/x
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            {/* Restored — this existed in the original ExamConfirmation header but got
                dropped when it was first duplicated into Dashboard/Archive. */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.outline}
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
              />
            </svg>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: C.onSurfaceVariant,
              }}
            >
              Secure Terminal Session
            </span>
          </div>

          <div
            style={{
              width: "1px",
              height: "20px",
              background: C.outlineVariant,
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: C.surfaceContainerHighest,
                border: `1px solid ${C.outlineVariant}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: C.primary,
                }}
              >
                {initials}
              </span>
            </div>
            <div>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: C.onSurface,
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {studentName}
              </p>
              <p
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  color: C.outline,
                  margin: "3px 0 0 0",
                }}
              >
                {studentId}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
