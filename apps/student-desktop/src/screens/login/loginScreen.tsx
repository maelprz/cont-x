// src/screens/login/loginScreen.tsx
// Purpose: Login UI shell — no auth logic yet.
//          Button navigates to Dashboard via Zustand router.

import { useState } from 'react'
import { Eye, EyeOff, Lock, UserCircle, ArrowRight, Monitor } from 'lucide-react'
import { useRouterLogic } from '../../router/routerLogic'

export function LoginScreen() {
  // controls whether password text is visible or masked
  const [showPassword, setShowPassword] = useState<boolean>(false)

  // pulls navigate method from shared Zustand router
  const navigateTo = useRouterLogic((state) => state.navigateTo)

  return (
    // fills the entire Electron window; relative so children can use absolute positioning
    <div className="h-screen w-screen bg-[#080d16] relative overflow-hidden">

      {/* ── Top bar: pinned to top-left ── */}
      <header className="absolute top-0 left-0 flex items-center px-8 py-5">
        <div className="flex items-center gap-2">
          <Monitor size={18} strokeWidth={2} className="text-blue-400" />
          <span
            className="font-bold text-[17px] tracking-tight"
            style={{ color: 'rgba(212, 228, 250)' }}
          >
            Cont/x
          </span>
        </div>
      </header>

      {/* ── Card: absolutely centered in the window ── */}
      {/* inset-0 + m-auto is the most reliable centering method in Electron */}
      <div
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          className="w-full rounded-2xl p-8 shadow-[0_8px_48px_rgba(0,0,0,0.6)]"
          style={{
            maxWidth: '400px',
            backgroundColor: '#0d1b2e',
            border: '1px solid #1a3557',
          }}
        >

          {/* heading */}
          <h1
            className="text-[28px] font-bold tracking-tight mb-1"
            style={{ color: 'rgba(212, 228, 250)' }}
          >
            Access Portal
          </h1>

          {/* subheading */}
          <p
            className="text-[13px] leading-relaxed mb-8"
            style={{ color: 'rgba(212, 228, 250, 0.55)' }}
          >
            Enter your institutional credentials to begin the session.
          </p>

          {/* ── Student ID field ── */}
          <div className="mb-5">

            {/* label row: text left, icon right */}
            <div className="flex items-center justify-between mb-[8px]">
              <label
                className="text-[10px] uppercase tracking-[0.18em] font-semibold"
                style={{ color: 'rgba(212, 228, 250, 0.6)' }}
              >
                Student ID
              </label>
              <UserCircle size={13} style={{ color: 'rgba(212, 228, 250, 0.35)' }} />
            </div>

            <input
              type="text"
              placeholder=""
              className="
                w-full text-sm rounded-lg
                px-4 py-[12px]
                outline-none
                transition-colors duration-150
              "
              style={{
                backgroundColor: '#070c17',
                border: '1px solid #1a3557',
                color: 'rgba(212, 228, 250)',
              }}
              // placeholder color set via onFocus trick — handled below with a style tag
            />
          </div>

          {/* ── Password field ── */}
          <div className="mb-4">

            {/* label row */}
            <div className="flex items-center justify-between mb-[8px]">
              <label
                className="text-[10px] uppercase tracking-[0.18em] font-semibold"
                style={{ color: 'rgba(212, 228, 250, 0.6)' }}
              >
                Password
              </label>
              <Lock size={13} style={{ color: 'rgba(212, 228, 250, 0.35)' }} />
            </div>

            {/* wrapper so the eye icon can sit inside */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder=""  // blank as requested
                className="
                  w-full text-sm rounded-lg
                  px-4 py-[12px] pr-11
                  outline-none
                  transition-colors duration-150
                "
                style={{
                  backgroundColor: '#070c17',
                  border: '1px solid #1a3557',
                  color: 'rgba(212, 228, 250)',
                }}
              />

              {/* toggles password visibility */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150"
                style={{ color: 'rgba(212, 228, 250, 0.45)' }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* ── Password reset link ── */}
          <div className="flex justify-end mb-7">
            <button
              type="button"
              className="text-[9px] uppercase tracking-[0.15em] transition-colors duration-150 hover:opacity-80"
              style={{ color: 'rgba(212, 228, 250)' }} // as requested
            >
              Request Password Reset
            </button>
          </div>

          {/* ── Log In button ── */}
          {/* navigates to dashboard; real auth wired in later */}
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className="
              w-full flex items-center justify-center gap-2
              font-semibold text-[14px] tracking-wide
              py-[12px] rounded-lg
              transition-opacity duration-150 hover:opacity-90
              cursor-pointer
            "
            style={{
              backgroundColor: 'rgba(77, 142, 255)', // as requested
              color: 'rgba(212, 228, 250)',
            }}
          >
            Login
            <ArrowRight size={15} strokeWidth={2.5} />
          </button>

          {/* decorative bottom divider */}
          <div
            className="mt-7"
            style={{ borderTop: '1px solid #1a3557' }}
          />

        </div>
      </div>

    </div>
  )
}