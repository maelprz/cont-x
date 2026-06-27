import type { ExamConfirmationScreenProps, ExamDetail } from './examConfirmationScreen.types';

// ---------------------------------------------------------------------------
// Mock data — replace with real store/hook values when wiring up
// ---------------------------------------------------------------------------
const MOCK_EXAM_TITLE = 'Advanced Algorithms';
const MOCK_COURSE_CODE = 'CS302';
const MOCK_STUDENT_NAME = 'Juan dela Cruz';
const MOCK_STUDENT_ID = '2021-00123';

const MOCK_EXAM_DETAILS: ExamDetail[] = [
  { label: 'Duration', value: '120 Minutes', subtext: 'Non-stop session' },
  { label: 'Total Questions', value: '4 Coding Tasks', subtext: 'Live evaluation' },
  { label: 'Pass Mark', value: '70% Threshold', subtext: 'Academy standard' },
  { label: 'Attempts Left', value: '1 of 1', subtext: 'No retakes allowed' },
];

// ---------------------------------------------------------------------------
// Design tokens
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
  error: '#ffb4ab',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DetailCard({ label, value, subtext }: ExamDetail) {
  return (
    <div
      style={{
        background: C.surfaceContainerLow,
        border: `1px solid ${C.outlineVariant}`,
        borderRadius: '8px',
        padding: '14px 16px',
      }}
    >
      <p
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: C.outline,
          margin: '0 0 8px 0',
        }}
      >
        {label}
      </p>
      <p style={{ color: C.onSurface, fontSize: '20px', fontWeight: 600, lineHeight: '1.2', margin: 0 }}>
        {value}
      </p>
      <p style={{ color: C.onSurfaceVariant, fontSize: '11px', marginTop: '4px', margin: '4px 0 0 0' }}>
        {subtext}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function ExamConfirmationScreen({
  examTitle = MOCK_EXAM_TITLE,
  courseCode = MOCK_COURSE_CODE,
  studentName = MOCK_STUDENT_NAME,
  studentId = MOCK_STUDENT_ID,
  examDetails = MOCK_EXAM_DETAILS,
  onStartExam,
  onCancel,
}: ExamConfirmationScreenProps) {
  const initials = studentName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // TODO: wire onCancel to navigate('/dashboard') via your router
  const handleCancel = () => onCancel?.();

  // TODO: replace with real IPC call via useIpcBridge
  const handleStart = () => onStartExam?.();

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
      {/* ── Header ──────────────────────────────────────────────────── */}
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
          <span style={{ color: C.primary, fontSize: '20px', fontWeight: 700, letterSpacing: '5px' }}>
            Cont/x
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.outline} strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.onSurfaceVariant }}>
                Secure Terminal Session
              </span>
            </div>

            <div style={{ width: '1px', height: '20px', background: C.outlineVariant }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: C.surfaceContainerHighest,
                  border: `1px solid ${C.outlineVariant}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 600, color: C.primary }}>
                  {initials}
                </span>
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: C.onSurface, margin: 0, lineHeight: 1 }}>
                  {studentName}
                </p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: C.outline, margin: '3px 0 0 0' }}>
                  {studentId}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main canvas ─────────────────────────────────────────────── */}
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
        {/* Atmospheric glow */}
        <div
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px', height: '600px', borderRadius: '50%',
            background: 'rgba(173, 198, 255, 0.05)', filter: 'blur(100px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '860px' }}>
          {/* ── Card ────────────────────────────────────────────────── */}
          <div
            style={{
              background: C.surfaceContainer,
              borderTop: `4px solid ${C.primary}`,
              borderRadius: '12px',
              padding: '32px 40px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
            }}
          >
            {/* ── Card header ─────────────────────────────────────── */}
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 600, color: C.onSurface, margin: '0 0 4px 0', lineHeight: 1.2 }}>
                {examTitle}
              </h1>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: C.outline, textTransform: 'uppercase', letterSpacing: '0.14em', margin: '0 0 12px 0' }}>
                {courseCode} Module
              </p>
              <p style={{ color: C.onSurfaceVariant, fontSize: '14px', lineHeight: 1.55, maxWidth: '580px', margin: 0 }}>
                Please confirm the details below. Once you start, the system will enter a restricted
                state to ensure academic integrity. Make sure your environment is quiet and free of
                unauthorized materials.
              </p>
            </div>

            {/* ── Detail grid ─────────────────────────────────────── */}
            <div
              style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px', marginBottom: '20px',
              }}
            >
              {examDetails.map((detail) => (
                <DetailCard key={detail.label} {...detail} />
              ))}
            </div>

            {/* ── Lockdown warning ────────────────────────────────── */}
            <div
              style={{
                display: 'flex', gap: '14px', alignItems: 'flex-start',
                padding: '16px 18px', marginBottom: '20px',
                background: 'rgba(147,0,10,0.18)', border: '1px solid rgba(255,180,171,0.28)',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  flexShrink: 0, width: '36px', height: '36px', borderRadius: '8px',
                  background: 'rgba(255,180,171,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={C.error}>
                  <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 style={{ color: C.error, fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0' }}>
                  Lockdown Protocol Active
                </h3>
                <p style={{ color: 'rgba(255,218,214,0.8)', fontSize: '13px', lineHeight: 1.55, margin: 0 }}>
                  Clicking the button below will terminate all unauthorized applications and lock your screen to
                  this window. Any attempt to exit, switch tabs, or use screen-sharing software will be logged
                  as a violation and may result in immediate disqualification.
                </p>
              </div>
            </div>

            {/* ── Action row ──────────────────────────────────────── */}
            <div
              style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                justifyContent: 'space-between', gap: '12px',
                paddingTop: '20px', borderTop: `1px solid ${C.outlineVariant}`,
              }}
            >
              <button
                onClick={handleCancel}
                style={{
                  padding: '11px 22px', borderRadius: '8px',
                  border: `1px solid ${C.outlineVariant}`, background: 'transparent',
                  color: C.onSurfaceVariant, fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.outline;
                  e.currentTarget.style.color = C.onSurface;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.outlineVariant;
                  e.currentTarget.style.color = C.onSurfaceVariant;
                }}
              >
                Cancel &amp; Return to Dashboard
              </button>

              <button
                onClick={handleStart}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '10px',
                  padding: '13px 28px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #4d8eff 0%, #adc6ff 100%)',
                  color: C.onPrimaryContainer, fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  boxShadow: '0 0 24px rgba(173,198,255,0.3)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
                </svg>
                Enter Exam
              </button>
            </div>

            <p
              style={{
                textAlign: 'center', marginTop: '16px',
                fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
                fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'rgba(194,198,214,0.4)',
              }}
            >
              By starting, you agree to the Academic Integrity Policy of CodeLit.
            </p>
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer
        style={{
          height: '44px', flexShrink: 0,
          display: 'flex', alignItems: 'center', padding: '0 48px',
          background: 'rgba(1,15,31,0.6)', backdropFilter: 'blur(8px)',
          borderTop: `1px solid ${C.outlineVariant}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bec6e0" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', color: C.onSurfaceVariant }}>
              SYNC: 12ms LATENCY
            </span>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(194,198,214,0.35)' }}>
            SYSTEM VER: 4.2.0-ACADEMIC
          </span>
        </div>
      </footer>
    </div>
  );
}