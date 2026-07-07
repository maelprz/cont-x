import { useEffect, useRef, useState } from 'react';
import type { SessionVerificationModalProps, VerificationStatus } from './sessionVerificationModal.types';
import { verifySessionCode } from '../../services/examService';

export function SessionVerificationModal({
  isOpen,
  examId,
  codeLength = 6,
  dashAfterIndex = 3,
  onConfirm,
  onCancel,
}: SessionVerificationModalProps) {
  const [digits, setDigits] = useState<string[]>(Array(codeLength).fill(''));
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState(''); // real message from the server, if any
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    setDigits(Array(codeLength).fill(''));
    setStatus('idle');
    inputRefs.current[0]?.focus();
  }, [isOpen, codeLength]);

  if (!isOpen) return null;

  const handleChange = (index: number, value: string) => {
    const char = value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setStatus('idle');

    if (char && index < codeLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleConfirm = async () => {
    const code = digits.join(''); // combine the digit boxes into one string
    if (code.length < codeLength) {
      setErrorMessage('Please enter all digits.'); // incomplete code, don't call the server
      setStatus('error');
      return;
    }

    setStatus('verifying'); // show the spinner while the server checks the code

    try {
      const result = await verifySessionCode(examId, code); // real server-side check + session start
      onConfirm?.(result.sessionId); // hand the new session id up to the screen
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed.';
      setErrorMessage(message); // show the server's real reason (wrong code, exam not active, etc.)
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-[8px] bg-[var(--bg-app)/2]">
      {/* ── Modal card ──────────────────────────────────────────────── */}
      <div className="w-full max-w-md rounded-xl overflow-hidden relative border-[1px] border-[var(--border-primary)] bg-[var(--bg-sidebar)]">

        <div className="p-8 flex flex-col gap-7">
          {/* ── Header ────────────────────────────────────────────── */}
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-1 bg-[var(--icon-primary)] border-[1px] border-[var(--icon-border)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--icon-fill)">
                <path d="M12 1.5c2.9 0 5.25 2.35 5.25 5.25v3a3 3 0 0 1 3 3v6.75a3 3 0 0 1-3 3H6.75a3 3 0 0 1-3-3v-6.75a3 3 0 0 1 3-3v-3C6.75 3.85 9.1 1.5 12 1.5Zm0 1.5a3.75 3.75 0 0 0-3.75 3.75v3h7.5v-3A3.75 3.75 0 0 0 12 3Zm0 11.25a1.5 1.5 0 0 0-.75 2.8v1.7a.75.75 0 0 0 1.5 0v-1.7a1.5 1.5 0 0 0-.75-2.8Z" />
              </svg>
            </div>
            <h2 className="text-[26px] font-semibold text-[var(--text-inverted)] tracking-tight">
              Session Verification
            </h2>
            <p className="text-[14px] text-[var(--text-inverted-secondary)] opacity-80 leading-relaxed max-w-[340px]">
              Please enter the {codeLength}-digit access code provided by your invigilator to unlock the exam session.
            </p>
          </div>

          {/* ── Code input ────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center gap-2">
              {digits.map((digit, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    autoFocus={i === 0}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="w-12 h-16 md:w-14 md:h-20 rounded-lg text-center text-[36px] font-bold outline-none transition-all"
                    style={{
                      background: '#051424',
                      border: status === 'error'
                        ? '1px solid #ffb4ab'
                        : '1px solid #424754',
                      color: 'var(--text-inverted)',
                      fontFamily: "'Inter', sans-serif",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 15px rgba(77,142,255,0.25)';
                      e.currentTarget.style.borderColor = 'var(--icon-primary)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = status === 'error' ? '#ffb4ab' : '#424754';
                    }}
                  />
                  {i === dashAfterIndex - 1 && i < digits.length - 1 && (
                    <span className="w-2 h-0.5 rounded-full bg-[#424754] flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-1">
              <span
                className="font-mono text-[11px] font-semibold uppercase tracking-wide transition-opacity duration-300 text-[var(--warning-icon)]"
                style={{ opacity: status === 'error' ? 1 : 0 }}
              >
                {errorMessage}
              </span>
            </div>
          </div>

          {/* ── Actions ───────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleConfirm}
              disabled={status === 'verifying'}
              className="w-full py-3.5 rounded-lg font-bold text-[15px] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 bg-[image:var(--button-gradient)] text-[var(--button-gradient-text)] font-[var(--font-body)] border border-[var(--border-subtle)]"
            >
              {status === 'verifying' ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'svm-spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                    <path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying…
                </span>
              ) : (
                'Confirm and Enter Exam'
              )}
            </button>
            <button
              onClick={onCancel}
              className="px-6 py-2.5 rounded-lg border border-[var(--border-primary)] bg-transparent text-[var(--text-inverted)] text-[15px] font-semibold cursor-pointer transition-colors duration-200 hover:text-[var(--text-inverted-secondary)] font-[var(--font-body)]"
            >
              Cancel Request
            </button>
          </div>

          {/* ── Status footer ─────────────────────────────────────── */}
          <div className="pt-4 flex items-center justify-center gap-2 border-t border-[var(--border-subtle)]">
            <span
              className="w-2 h-2 rounded-full bg-[var(--accent-blue)]"
              style={{ animation: 'svm-pulse 2s infinite' }}
            />
            <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-fine-print)]">
              {status === 'verifying' ? 'Verifying Identity' : 'Awaiting Identity Verification'}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes svm-spin { to { transform: rotate(360deg); } }
        @keyframes svm-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}