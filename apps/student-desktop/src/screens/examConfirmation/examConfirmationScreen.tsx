import type { ExamConfirmationScreenProps, ExamDetail } from './examConfirmationScreen.types';
import { useRouterLogic } from '../../router/routerLogic';

// ---------------------------------------------------------------------------
// Mock data — replace with real store/hook values when wiring up
// ---------------------------------------------------------------------------
const MOCK_EXAM_TITLE = 'Advanced Algorithms';
const MOCK_COURSE_CODE = 'CS302';
const MOCK_STUDENT_NAME = 'Juan dela Cruz';
const MOCK_STUDENT_ID = '2021-00123';

const MOCK_EXAM_DETAILS: ExamDetail[] = [
  { label: 'Duration',        value: '120 Minutes',    subtext: 'Non-stop session'   },
  { label: 'Total Questions', value: '4 Coding Tasks', subtext: 'Live evaluation'    },
  { label: 'Pass Mark',       value: '70% Threshold',  subtext: 'Academy standard'   },
  { label: 'Attempts Left',   value: '1 of 1',         subtext: 'No retakes allowed' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DetailCard({ label, value, subtext }: ExamDetail) {
  return (
    <div className="bg-[#0d1c2d] border border-[#424754] rounded-lg p-4">
      <p className="font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-[#8c909f] mb-2">
        {label}
      </p>
      <p className="text-[#d4e4fa] text-[20px] font-semibold leading-tight">
        {value}
      </p>
      <p className="text-[#c2c6d6] text-xs mt-1">
        {subtext}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen — named export (not default)
// ---------------------------------------------------------------------------

export function ExamConfirmationScreen({
  examTitle   = MOCK_EXAM_TITLE,
  courseCode  = MOCK_COURSE_CODE,
  studentName = MOCK_STUDENT_NAME,
  studentId   = MOCK_STUDENT_ID,
  examDetails = MOCK_EXAM_DETAILS,
  onStartExam,
  onCancel,
}: ExamConfirmationScreenProps) {
  const navigateTo = useRouterLogic((state) => state.navigateTo);

  const initials = studentName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleCancel = () => {
    onCancel?.();
    navigateTo('dashboard');
  };

  // TODO: replace with real IPC call via useIpcBridge
  const handleStart = () => onStartExam?.();

  return (
    <div
      className="h-screen w-full flex flex-col text-[#d4e4fa] overflow-hidden"
      style={{
        backgroundColor: '#051424',
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0)',
        backgroundSize: '32px 32px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <header
        className="h-14 flex-shrink-0 flex items-center px-12 border-b border-[#424754] backdrop-blur-md"
        style={{ background: 'rgba(18,33,49,0.9)' }}
      >
        <div className="flex justify-between items-center w-full max-w-[1280px] mx-auto">
          {/* Brand */}
          <span className="text-[#adc6ff] text-xl font-bold tracking-tight">
            Cont/x
          </span>

          {/* Right cluster */}
          <div className="flex items-center gap-5">
            {/* Session badge */}
            <div className="flex items-center gap-1.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8c909f" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              <span className="font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-[#c2c6d6]">
                Secure Terminal Session
              </span>
            </div>

            <div className="w-px h-5 bg-[#424754]" />

            {/* Student identity */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#273647] border border-[#424754] flex items-center justify-center flex-shrink-0">
                <span className="font-mono text-[10px] font-semibold text-[#adc6ff]">
                  {initials}
                </span>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#d4e4fa] leading-none m-0">
                  {studentName}
                </p>
                <p className="font-mono text-[10px] text-[#8c909f] mt-0.5 m-0">
                  {studentId}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main canvas ───────────────────────────────────────────── */}
      <main className="flex-grow flex items-center justify-center px-6 py-4 relative overflow-hidden">
        {/* Atmospheric glow */}
        <div
          className="absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            transform: 'translate(-50%, -50%)',
            background: 'rgba(173,198,255,0.05)',
            filter: 'blur(100px)',
          }}
        />

        <div className="relative z-10 w-full max-w-[860px]">
          {/* ── Card ──────────────────────────────────────────────── */}
          <div
            className="bg-[#122131] rounded-xl p-10 overflow-hidden"
            style={{
              borderTop: '4px solid #adc6ff',
              boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
            }}
          >
            {/* ── Card header ───────────────────────────────────── */}
            <div className="mb-6">
              <h1 className="text-[28px] font-semibold text-[#d4e4fa] leading-tight mb-1">
                {examTitle}
              </h1>
              <p className="font-mono text-[11px] font-semibold text-[#8c909f] uppercase tracking-[0.15em] mb-3">
                {courseCode} Module
              </p>
              <p className="text-[#c2c6d6] text-[14px] leading-relaxed max-w-[580px]">
                Please confirm the details below. Once you start, the system will enter a restricted
                state to ensure academic integrity. Make sure your environment is quiet and free of
                unauthorized materials.
              </p>
            </div>

            {/* ── Detail grid ───────────────────────────────────── */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {examDetails.map((detail) => (
                <DetailCard key={detail.label} {...detail} />
              ))}
            </div>

            {/* ── Lockdown warning ──────────────────────────────── */}
            <div
              className="flex gap-4 items-start p-4 mb-5 rounded-lg"
              style={{
                background: 'rgba(147,0,10,0.18)',
                border: '1px solid rgba(255,180,171,0.28)',
              }}
            >
              <div
                className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,180,171,0.12)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffb4ab">
                  <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-[#ffb4ab] text-[15px] font-semibold mb-1">
                  Lockdown Protocol Active
                </h3>
                <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,218,214,0.8)' }}>
                  Clicking the button below will terminate all unauthorized applications and lock your
                  screen to this window. Any attempt to exit, switch tabs, or use screen-sharing
                  software will be logged as a violation and may result in immediate disqualification.
                </p>
              </div>
            </div>

            {/* ── Action row ────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-[#424754]">
              {/* Cancel */}
              <button
                onClick={handleCancel}
                className="px-6 py-2.5 rounded-lg border border-[#424754] bg-transparent text-[#c2c6d6] text-[14px] font-semibold cursor-pointer transition-colors duration-200 hover:border-[#8c909f] hover:text-[#d4e4fa]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Cancel &amp; Return to Dashboard
              </button>

              {/* Primary CTA */}
              <button
                onClick={handleStart}
                className="inline-flex items-center gap-2.5 px-7 py-3 rounded-lg border-none text-[14px] font-bold cursor-pointer transition-transform duration-150 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, #4d8eff 0%, #adc6ff 100%)',
                  color: '#00285d',
                  fontFamily: "'Inter', sans-serif",
                  boxShadow: '0 0 24px rgba(173,198,255,0.3)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
                </svg>
                Enter Exam
              </button>
            </div>

            {/* Fine print */}
            <p
              className="text-center mt-4 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase"
              style={{ color: 'rgba(194,198,214,0.4)' }}
            >
              By starting, you agree to the Academic Integrity Policy of CodeLit.
            </p>
          </div>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer
        className="h-11 flex-shrink-0 flex items-center px-12 border-t border-[#424754] backdrop-blur-sm"
        style={{ background: 'rgba(1,15,31,0.6)' }}
      >
        <div className="flex justify-between items-center w-full max-w-[1280px] mx-auto">
          <div className="flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bec6e0" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span className="font-mono text-[10px] font-semibold tracking-[0.1em] text-[#c2c6d6]">
              SYNC: 12ms LATENCY
            </span>
          </div>
          <span className="font-mono text-[10px]" style={{ color: 'rgba(194,198,214,0.35)' }}>
            SYSTEM VER: 4.2.0-ACADEMIC
          </span>
        </div>
      </footer>
    </div>
  );
}