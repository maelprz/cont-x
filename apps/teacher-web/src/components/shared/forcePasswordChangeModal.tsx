import { useState } from "react"; // holds the form values and messages
import { useAuth } from "../../hooks/useAuth"; // gives us changePassword and logout

const MIN_LENGTH = 6; // must match the minimum set in the complete-password-change function

// blocks the whole app until the user replaces the default password
export function ForcePasswordChangeModal() {
  const { changePassword, logout } = useAuth(); // changePassword calls the server, logout is the only other way out
  const [newPassword, setNewPassword] = useState(""); // what the user typed as the new password
  const [confirmPassword, setConfirmPassword] = useState(""); // the same password typed again
  const [showPassword, setShowPassword] = useState(false); // toggles between dots and readable text
  const [error, setError] = useState<string | null>(null); // message shown under the fields
  const [isSubmitting, setIsSubmitting] = useState(false); // true while the server call is running

  async function handleSubmit() { // runs when the user presses the button or Enter
    if (newPassword.length < MIN_LENGTH) { // too short, so no need to ask the server
      setError(`Password must be at least ${MIN_LENGTH} characters.`); // tell the user the rule
      return; // stop here
    } // end of the length check
    if (newPassword !== confirmPassword) { // the two entries must match
      setError("The two passwords do not match."); // tell the user what is wrong
      return; // stop here
    } // end of the match check

    setIsSubmitting(true); // disables the button so it cannot be pressed twice
    setError(null); // clears any old message
    try { // the server call can fail
      await changePassword(newPassword); // on success the store updates and the router lets the user in
    } catch (err) { // the server refused, for example the password is too weak or equals the default
      setError(err instanceof Error ? err.message : "Could not change the password."); // show the server's own message
    } finally { // runs in both cases
      setIsSubmitting(false); // re-enables the button
    } // end of the try/catch
  } // end of handleSubmit

  const inputClass = // one shared style so both fields look the same
    "w-full border rounded-lg px-3.5 py-[11px] text-[13px] outline-none box-border bg-[var(--color-primary-content)] border-[var(--color-base-content)] text-[var(--color-primary)]";

  return (
    // full screen backdrop; there is no click handler on it, so clicking outside does nothing
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-6"
      style={{ backgroundColor: "var(--color-base-200)" }}
    >
      {/* the card */}
      <div className="w-full max-w-[400px] rounded-xl p-9 bg-[var(--color-base-100)] shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
        <h1 className="text-[22px] font-semibold leading-tight mb-1.5 text-[var(--color-primary)]">
          Change your password
        </h1>
        <p className="text-[13px] leading-relaxed mb-6 text-[var(--color-base-content)]">
          This is your first login, or your password was reset. Choose a new password to continue.
        </p>

        {/* new password field */}
        <div className="mb-4">
          <label className="block mb-2 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-[var(--color-base-content)]">
            New password
          </label>
          <input
            type={showPassword ? "text" : "password"} // dots or readable text
            value={newPassword} // controlled by state
            onChange={(e) => setNewPassword(e.target.value)} // keeps state in sync with typing
            autoComplete="new-password" // tells the browser this is not a login field
            className={inputClass} // shared style
          />
        </div>

        {/* confirm password field */}
        <div className="mb-3">
          <label className="block mb-2 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-[var(--color-base-content)]">
            Confirm new password
          </label>
          <input
            type={showPassword ? "text" : "password"} // follows the same toggle
            value={confirmPassword} // controlled by state
            onChange={(e) => setConfirmPassword(e.target.value)} // keeps state in sync with typing
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} // Enter submits, like the login screen
            autoComplete="new-password" // tells the browser this is not a login field
            className={inputClass} // shared style
          />
        </div>

        {/* show or hide toggle */}
        <label className="flex items-center gap-2 mb-5 text-[12px] cursor-pointer text-[var(--color-base-content)]">
          <input
            type="checkbox" // simple on/off box
            checked={showPassword} // controlled by state
            onChange={(e) => setShowPassword(e.target.checked)} // flips the toggle
          />
          Show passwords
        </label>

        {/* error box, only rendered when there is a message */}
        {error && (
          <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-red-500 text-[12px] font-mono">{error}</p>
          </div>
        )}

        {/* main action */}
        <button
          type="button" // not inside a form, so it does not submit anything by itself
          onClick={handleSubmit} // runs the checks and the server call
          disabled={isSubmitting} // blocks double clicks
          className="w-full py-3 px-7 rounded-lg border-none text-[14px] font-bold cursor-pointer box-border bg-[var(--color-primary)] text-[var(--color-base-100)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "SAVING..." : "Save new password"}
        </button>

        {/* the only other way out, so nobody is trapped on this screen */}
        <div className="flex justify-center mt-4">
          <button
            type="button" // plain button
            onClick={() => logout()} // signs out and returns to the login screen
            className="bg-transparent border-none cursor-pointer font-mono text-[10px] font-semibold tracking-[0.15em] uppercase p-0 text-[var(--color-primary)]"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}