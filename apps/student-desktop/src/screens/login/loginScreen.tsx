// src/screens/login/loginScreen.tsx
// Purpose: Login UI shell — no auth logic yet.
//          Styling copied from examConfirmationScreen for visual consistency.

import { useState } from 'react'
import { useRouterLogic } from '../../router/routerLogic'

// ---------------------------------------------------------------------------
// Design tokens — identical to examConfirmationScreen
// ---------------------------------------------------------------------------
const C = {
  surface: '#051424',
  surfaceContainerLow: '#0d1c2d',
  surfaceContainer: '#122131',
  surfaceContainerHighest: '#273647',
  onSurface: '#d4e4fa',
  onSurfaceVariant: '#c2c6d6',
  outline: '#8c909f',
  outlineVariant: '#424754',
  primary: '#adc6ff',
  onPrimaryContainer: '#00285d',
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function LoginScreen() {
  // controls whether password characters are visible
  const [showPassword, setShowPassword] = useState<boolean>(false)

  // pulls navigate method from shared Zustand router
  const navigateTo = useRouterLogic((state) => state.navigateTo)

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: C.surface,
        
        backgroundImage:
          'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0)',
        backgroundSize: '32px 32px',
        color: C.onSurface,
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
      }}
    >

      {/* header */}
      <header
        style={{
          height: '56px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 48px',
          background: 'rgba(18, 33, 49, 0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${C.outlineVariant}`,
        }}
      >
        <span
          style={{
            color: C.primary,
            fontSize: '20px',
            fontWeight: 700,
            letterSpacing: '5px',
          }}
        >
          Cont/x
        </span>
      </header>

      {/* main: centers the card vertically and horizontally */}
      <main
        style={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >

        {/* atmospheric glow behind the card */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'rgba(173, 198, 255, 0.05)',
            filter: 'blur(100px)',
            pointerEvents: 'none',
          }}
        />

        {/* card  */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            maxWidth: '400px',
            background: C.surfaceContainer,
            borderTop: `4px solid ${C.primary}`,
            borderRadius: '12px',
            padding: '36px 40px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
          }}
        >

          {/* card heading */}
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 600,
              color: C.onSurface,
              margin: '0 0 6px 0',
              lineHeight: 1.2,
            }}
          >
            Access Portal
          </h1>

          {/* card subheading */}
          <p
            style={{
              fontSize: '13px',
              color: C.onSurfaceVariant,
              lineHeight: 1.55,
              margin: '0 0 28px 0',
            }}
          >
            Enter your institutional credentials to begin the session.
          </p>

          {/* Student ID field */}
          <div style={{ marginBottom: '16px' }}>

            {/* label row: text left, icon right */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <label
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: C.outline,
                }}
              >
                Student ID
              </label>
              {/* person icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.outlineVariant} strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>

            <input
              type="text"
              placeholder=""
              style={{
                width: '100%',
                backgroundColor: C.surfaceContainerLow,
                border: `1px solid ${C.outlineVariant}`,
                borderRadius: '8px',
                padding: '11px 14px',
                fontSize: '13px',
                color: C.onSurface,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: "'Inter', sans-serif",
              }}
            />
          </div>

          {/* Password field */}
          <div style={{ marginBottom: '12px' }}>

            {/* label row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <label
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: C.outline,
                }}
              >
                Password
              </label>
              {/* lock icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.outlineVariant} strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>

            {/* wrapper so the eye button sits inside the input */}
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder=""
                style={{
                  width: '100%',
                  backgroundColor: C.surfaceContainerLow,
                  border: `1px solid ${C.outlineVariant}`,
                  borderRadius: '8px',
                  padding: '11px 40px 11px 14px',
                  fontSize: '13px',
                  color: C.onSurface,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: "'Inter', sans-serif",
                }}
              />

              {/* toggles password visibility */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: C.outline,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? (
                  // eye-off icon
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  // eye icon
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* request password reset — right aligned */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: C.onSurface,
                padding: 0,
              }}
            >
              Request Password Reset
            </button>
          </div>

          {/* divider above button */}
          <div style={{ borderTop: `1px solid ${C.outlineVariant}`, marginBottom: '20px' }} />

          {/* Log In button */}
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '13px 28px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #4d8eff 0%, #adc6ff 100%)',
              color: C.onPrimaryContainer,
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              boxShadow: '0 0 24px rgba(173,198,255,0.3)',
              boxSizing: 'border-box',
            }}
          >
            {/* lock icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
            </svg>
            Login
          </button>

          {/* fine print at bottom */}
          <p
            style={{
              textAlign: 'center',
              marginTop: '16px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(194,198,214,0.4)',
            }}
          >
            Authorized personnel only
          </p>

        </div>
      </main>

      {/* footer */}
      <footer
        style={{
          height: '44px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 48px',
          background: 'rgba(1,15,31,0.6)',
          backdropFilter: 'blur(8px)',
          borderTop: `1px solid ${C.outlineVariant}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            maxWidth: '1280px',
            margin: '0 auto',
          }}
        >
          {/* encrypted indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.onSurfaceVariant} strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: C.onSurfaceVariant,
              }}
            >
              AUTH: RSA-2048 ENCRYPTED
            </span>
          </div>

          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              color: 'rgba(194,198,214,0.35)',
            }}
          >
            SYSTEM VER: 4.2.0-ACADEMIC
          </span>
        </div>
      </footer>

    </div>
  )
}