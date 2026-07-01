import type { AppHeaderProps } from "./appHeader.types";
import { useAuthStore } from "../../stores/useAuthStore"; // store controlling the user's auth state

// Single shared header bar — used by Dashboard, Archive, ExamConfirmation, and now Login.
export function AppHeader({
  variant = "full", // defaults to the full version, so no existing screen needs to change
}: AppHeaderProps) {
  const user = useAuthStore((state) => state.user);

  const studentName = user?.fullName ?? ""; // empty string if no session yet
  const studentId = user?.idNumber ?? "";

  return (
    <header className="h-14 flex items-center px-8 bg-[var(--bg-sidebar)]">
      <div className="flex justify-between items-center w-full">
        <span className="text-[var(--text-inverted)] text-lg font-bold tracking-[4px]">
          Cont/x
        </span>

        {/* Everything below only renders for the "full" variant — Login gets just the logo above */}
        {variant === "full" && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-inverted)"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                />
              </svg>
              <span className="font-[var(--font-label)] text-[10px] font-mono tracking-[0.18em] uppercase text-[var(--text-inverted)]">
                Secure Terminal Session
              </span>
            </div>

            <div className="w-px h-5 bg-[#424754]" />

            <div className="flex items-center gap-2.5">
              <div>
                <p className="text-[13px] font-semibold text-[var(--text-inverted)] leading-none m-0">
                  {studentName}
                </p>
                <p className="font-[var(--font-label)] text-[10px] text-[var(--text-inverted-secondary)] mt-0.5 m-0">
                  {studentId}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
