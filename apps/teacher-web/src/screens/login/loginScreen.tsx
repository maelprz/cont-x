import { useState } from 'react'
import { useRouterLogic } from '../../router/routerLogic'

// ---------------------------------------------------------------------------
// Icons — kept as small named functions to avoid repeating SVG markup
// ---------------------------------------------------------------------------

function PersonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-base-content)" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-base-content)" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  )
}

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-base-content)" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-base-content)" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Sub-component — reused for the two input fields (same pattern as DetailCard)
// ---------------------------------------------------------------------------

function FieldLabel({ text, icon }: { text: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <label className="font-mono text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--color-base-content)' }}>
        {text}
      </label>
      {icon}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main screen — named export (not default)
// ---------------------------------------------------------------------------

export function LoginScreen() {
  // controls whether password characters are visible
  const [showPassword, setShowPassword] = useState<boolean>(false)

  // pulls navigate method from shared Zustand router
  const navigateTo = useRouterLogic((state) => state.navigateTo)

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--color-base-200)',
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0)',
        backgroundSize: '32px 32px',
        fontFamily: "'Inter', sans-serif",
        color: 'var(--color-base-content)',
      }}
    >

      {/* ── Header: kept as-is, not swapped for AppHeader ── */}
      <header
        className="h-14 flex-shrink-0 flex items-center px-12 border-b backdrop-blur-md"
        style={{
          backgroundColor: 'var(--color-primary)',
          borderColor: 'var(--color-base-content)',
        }}
      >
        <span className="text-[20px] font-bold tracking-[5px]" style={{ color: 'var(--color-primary-content)' }}>
          Cont/x
        </span>
      </header>

      {/* ── Main canvas: centers the card ── */}
      <main className="flex-grow flex items-center justify-center px-6 py-4 relative overflow-hidden">

        {/* atmospheric glow behind the card */}
        <div
          className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            transform: 'translate(-50%, -50%)',
            background: 'rgba(173,198,255,0.05)',
            filter: 'blur(100px)',
          }}
        />

        {/* card */}
        <div
          className="relative z-10 w-full max-w-[400px] rounded-xl p-9"
          style={{
            backgroundColor: 'var(--color-base-100)',
            borderTop: '4px solid var(--color-base)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
          }}
        >

          <h1 className="text-[26px] font-semibold leading-tight mb-1.5" style={{ color: 'var(--color-primary)' }}>
            Teacher Portal
          </h1>

          <p className="text-[13px] leading-relaxed mb-7" style={{ color: 'var(--color-base-content)' }}>
            Enter your institutional credentials to begin the session.
          </p>

          {/* User ID field */}
          <div className="mb-4">
            <FieldLabel text="User ID" icon={<PersonIcon />} />
            <input
              type="text"
              placeholder=""
              className="w-full border rounded-lg px-3.5 py-[11px] text-[13px] outline-none box-border"
              style={{
                fontFamily: "'Inter', sans-serif",
                backgroundColor: 'var(--color-primary-content)',
                borderColor: 'var(--color-base-content)',
                color: 'var(--color-primary)',
              }}
            />
          </div>

          {/* Password field */}
          <div className="mb-3">
            <FieldLabel text="Password" icon={<LockIcon />} />

            {/* relative wrapper so the eye button sits inside the input */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder=""
                className="w-full border rounded-lg px-3.5 py-[11px] pr-10 text-[13px] outline-none box-border"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  backgroundColor: 'var(--color-primary-content)',
                  borderColor: 'var(--color-base-content)',
                  color: 'var(--color-primary)',
                }}
              />

              {/* toggles password visibility */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer flex items-center p-0"
                style={{ color: 'var(--color-base-300)' }}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
          </div>

          {/* request password reset — right aligned */}
          <div className="flex justify-end mb-6">
            <button
              type="button"
              className="bg-transparent border-none cursor-pointer font-mono text-[9px] font-semibold tracking-[0.15em] uppercase p-0"
              style={{ color: 'var(--color-primary)' }}
            >
              Request Password Reset
            </button>
          </div>

          {/* divider above button */}
          <div className="border-t mb-5" style={{ borderColor: 'var(--color-base-content)' }} />

          {/* Log In button — navigates to dashboard */}
          <button
            type="button"
            onClick={() => navigateTo('userManagement')}
            className="w-full inline-flex items-center justify-center gap-2.5 py-3 px-7 rounded-lg border-none text-[14px] font-bold cursor-pointer box-border"
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-base-100)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
            </svg>
            Login
          </button>

          {/* fine print */}
          <p
            className="text-center mt-4 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase"
            style={{ color: 'color-mix(in oklab, var(--color-base-primary) 40%, transparent)' }}
          >
            Authorized personnel only
          </p>

        </div>
      </main>

      {/* ── Footer: kept as-is ── */}
      <footer
        className="h-11 flex-shrink-0 flex items-center px-12 border-t backdrop-blur-sm"
        style={{
          backgroundColor: 'var(--color-primary)',
          borderColor: 'var(--color-base-300)',
        }}
      >
        <div className="flex justify-between items-center w-full max-w-[1280px] mx-auto">
          <div className="flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-base-200)" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            <span className="font-mono text-[10px] font-semibold tracking-[0.1em]" style={{ color: 'var(--color-base-200)' }}>
              AUTH: RSA-2048 ENCRYPTED
            </span>
          </div>
          <span className="font-mono text-[10px]" style={{ color: 'color-mix(in oklab, var(--color-base-200) 35%, transparent)' }}>
            SYSTEM VER: 4.2.0-ACADEMIC
          </span>
        </div>
      </footer>

    </div>
  )
}