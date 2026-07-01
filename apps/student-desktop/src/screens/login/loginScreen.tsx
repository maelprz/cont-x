import { useState } from "react";
import { useAuth } from "../../hooks/useAuth"; // real auth, not just navigateTo
import { AppHeader } from "../../components/layout/appHeader";

// ── Icons — unchanged from your original ────────────────────

function PersonIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#424754"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#424754"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  ) : (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}

function FieldLabel({ text, icon }: { text: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <label className="font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-[var(--text-secondary)]">
        {text}
      </label>
      {icon}
    </div>
  );
}

// ── Main screen ──────────────────────────────────────────────

export function LoginScreen() {
  const [idNumber, setIdNumber] = useState(""); // what the student types as their ID
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null); // shown below the form on failure
  const [isSubmitting, setIsSubmitting] = useState(false); // disables the button while the request is in flight

  const { login } = useAuth(); // real auth — AppRouter handles the redirect after login succeeds

  // Runs when the student clicks the Login button.
  async function handleLogin() {
    if (!idNumber.trim() || !password.trim()) {
      setError("Please enter your student ID and password.");
      return;
    }

    setIsSubmitting(true); // disables the button so they can't double-submit
    setError(null); // clears any previous error

    try {
      await login(idNumber.trim(), password);
      // No navigateTo call here — AppRouter's useEffect watches the auth
      // state and redirects to Dashboard automatically once login succeeds.
    } catch (err) {
      // Shows the error from authService (e.g. "Invalid student ID or password.")
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false); // re-enables the button whether it succeeded or failed
    }
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]">
      {/* ── Header ── */}
      <AppHeader />

      {/* ── Main canvas ── */}
      <main className="flex-grow flex items-center justify-center px-6 py-4 relative overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            transform: "translate(-50%, -50%)",
            background: "rgba(173,198,255,0.05)",
            filter: "blur(100px)",
          }}
        />

        <div className="relative z-10 w-full max-w-[400px] bg-[var(--bg-card)] rounded-xl p-9 shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
          <h1 className="text-[26px] font-semibold text-[var(--text-primary)] leading-tight mb-1.5">
            Access Portal
          </h1>
          <p className="text-[var(--text-secondary)] text-[13px] leading-relaxed mb-7">
            Enter your institutional credentials to begin the session.
          </p>

          {/* Student ID field — now controlled and wired to state */}
          <div className="mb-4">
            <FieldLabel text="Student ID" icon={<PersonIcon />} />
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)} // updates state on every keystroke
              placeholder="e.g. 2021000123"
              className="w-full bg-[var(--bg-card)] border border-[var(--bg-sidebar)] rounded-lg px-3.5 py-[11px] text-[13px] text-[var(--text-primary)] outline-none box-border font-[var(--font-body)]"
            />
          </div>

          {/* Password field — now controlled and wired to state */}
          <div className="mb-3">  
            <FieldLabel text="Password" icon={<LockIcon />} />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()} // lets student press Enter to submit
                placeholder="Enter Password"
                className="w-full border rounded-lg px-3.5 py-[11px] text-[13px] outline-none box-border font-['Inter', sans-serif] bg-[var(--color-primary-content)] border-[var(--color-base-content)] text-[var(--color-primary)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[var(--text-secondary)] flex items-center p-0"
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
          </div>

          <div className="flex justify-end mb-6">
            <button
              type="button"
              className="bg-transparent border-none cursor-pointer font-mono text-[9px] font-semibold tracking-[0.15em] uppercase text-[var(--text-secondary)] p-0"
            >
              Request Password Reset
            </button>
          </div>

          {/* Error message — only renders if login failed */}
          {error && (
            <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-[12px] font-mono">{error}</p>
            </div>
          )}

          <div className="border-t border-[var(--text-primary)] mb-5" />

          {/* Login button — now calls handleLogin, disabled while submitting */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={isSubmitting} // prevents double-submit
            className="w-full inline-flex items-center justify-center gap-2.5 py-3 px-7 rounded-lg border-none text-[14px] font-bold cursor-pointer box-border disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--bg-sidebar)] text-[var(--text-inverted)] font-[var(--font-body)] shadow-[var(--shadow)]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
                clipRule="evenodd"
              />
            </svg>
            {isSubmitting ? "VERIFYING..." : "Login"}{" "}
            {/* label changes while request is in flight */}
          </button>

          <p className="text-center mt-4 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase text-[var(--text-primary)]">
            Authorized personnel only
          </p>
        </div>
      </main>

      {/* ── Footer — unchanged ── */}
      <footer className="h-11 flex-shrink-0 flex items-center px-12 border-t border-[#424754] backdrop-blur-sm bg-[var(--bg-footer)]">
        <div className="flex justify-end items-center w-full max-w-[1280px] mx-auto">
          <span className="font-mono text-[10px] text-[var(--text-fine-print)]">
            SYSTEM VER: 4.2.0-ACADEMIC
          </span>
        </div>
      </footer>
    </div>
  );
}
