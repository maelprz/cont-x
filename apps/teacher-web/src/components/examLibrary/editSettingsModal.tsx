import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useExamSettings } from "../../hooks/useExamSettings";
import { useUpdateExamSettingsForm } from "../../hooks/useUpdateExamSettingsForm";
import { isoToLocalInputValue, localInputValueToIso } from "../../lib/scheduleDateTime";
import type { ClassExamSettingsData } from "../../services/classExamService";

type Props = {
  isOpen: boolean;
  classExamId: string | null;
  onClose: () => void;
  onSaved: () => void;
};
type OpenProps = Omit<Props, "isOpen" | "classExamId"> & { classExamId: string };

const sections = [
  { id: "timing", label: "Timing", description: "Set the time limit and optional exam window." },
  { id: "access", label: "Access", description: "Control entry, attempts and the passing mark." },
  { id: "answers", label: "Answer rules", description: "Choose how students answer and review questions." },
  { id: "overtime", label: "Overtime", description: "Set a bounded allowance after time runs out." },
] as const;
type Section = typeof sections[number]["id"];

const inputClass = "box-border block min-w-0 w-full rounded-[7px] border border-[var(--color-base-300)] bg-[var(--color-base-100)] px-2.5 py-[9px] text-[13px] text-[var(--color-base-content)] tabular-nums max-[480px]:text-base";
const buttonBaseClass = "rounded-lg border px-3.5 py-[9px] text-xs font-medium hover:brightness-[0.97] pointer-coarse:min-h-11";
const buttonClass = `${buttonBaseClass} border-[var(--color-base-300)] bg-[var(--color-base-100)] text-[var(--color-base-content)]`;
const fieldClass = "flex min-w-0 flex-col gap-1.5 text-xs text-[var(--color-base-content)]/65";
const gridClass = "my-4 grid grid-cols-2 gap-4";
const helpClass = "mt-[3px] text-xs leading-normal text-[var(--color-base-content)]/65";
const headerClass = "flex items-start justify-between gap-3.5 px-[25px] pt-[23px] pb-[19px] [&>div]:min-w-0 max-[480px]:px-[17px] max-[480px]:pt-5 max-[480px]:pb-4";
const headingClass = "text-[19px] leading-[1.3] font-medium tracking-[-0.35px]";
const closeClass = "grid shrink-0 place-items-center rounded-[7px] border-0 bg-transparent p-1.5 text-[var(--color-base-content)]/65 hover:bg-[var(--color-base-200)] hover:text-[var(--color-base-content)] pointer-coarse:min-h-11 pointer-coarse:min-w-11";
const footerClass = "flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-base-300)] bg-[var(--color-base-200)] px-[25px] py-4 max-[480px]:px-[17px] max-[480px]:py-3.5";
const actionsClass = "flex flex-wrap items-center justify-end gap-2 max-[480px]:ml-auto";
const statusClass = "min-w-0 flex-1 text-[11px] text-[var(--color-base-content)]/65 max-[480px]:basis-full";
const codeClass = "max-w-[180px] font-mono tracking-[0.1em]";
const errorClass = "text-xs text-[var(--color-error)]";

function SettingSwitch({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-[18px] border-b border-[var(--color-base-300)] py-3.5">
      <div>
        <span id={`${id}-label`} className="text-[13px] font-medium">{label}</span>
        <p id={`${id}-description`} className={helpClass}>{description}</p>
      </div>
      <button type="button" role="switch" aria-checked={checked}
        aria-labelledby={`${id}-label`} aria-describedby={`${id}-description`}
        onClick={() => onChange(!checked)} className="group relative h-[21px] w-9 shrink-0 rounded-full border-0 bg-[#cbd0c5] p-[3px] before:absolute before:-inset-x-1 before:-inset-y-2.5 aria-checked:bg-[#41573b]">
        <span aria-hidden="true" className="block size-[15px] rounded-full bg-white transition-transform duration-150 group-aria-checked:translate-x-[15px] motion-reduce:transition-none" />
      </button>
    </div>
  );
}

// Native modality keeps class management inert and contains/restores focus.
function SettingsDialog({ children, onRequestClose }: { children: ReactNode; onRequestClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog ref={ref} aria-labelledby="exam-settings-title"
      onCancel={(event) => { event.preventDefault(); onRequestClose(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onRequestClose();
      }}
      className="m-auto w-[min(636px,calc(100vw_-_32px))] max-h-[calc(100dvh_-_32px)] max-w-none overflow-hidden rounded-2xl border border-[var(--color-base-300)] bg-[var(--color-base-100)] p-0 font-[inherit] text-[13px] text-[var(--color-base-content)] shadow-[0_24px_70px_rgb(25_34_21_/_20%)] backdrop:bg-[rgb(25_30_23_/_38%)] backdrop:backdrop-blur-[2px] [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50 [&_:is(button,input):focus-visible]:outline-2 [&_:is(button,input):focus-visible]:outline-offset-3 [&_:is(button,input):focus-visible]:outline-[#41573b] max-[480px]:w-[calc(100vw_-_24px)] max-[480px]:max-h-[calc(100dvh_-_24px)]">
      {children}
    </dialog>
  );
}

export function EditSettingsModal({ isOpen, classExamId, ...callbacks }: Props) {
  if (!isOpen || !classExamId) return null;
  // Remount each opening/attachment so drafts and errors cannot cross classes.
  return <LoadSettings key={classExamId} classExamId={classExamId} {...callbacks} />;
}

function LoadSettings({ classExamId, onClose, onSaved }: OpenProps) {
  const [retry, setRetry] = useState(0);
  useLayoutEffect(() => {
    const trigger = document.activeElement;
    return () => {
      // Loading swaps dialog instances. Restore the original launcher after
      // the entire settings flow closes, once native modality is removed.
      queueMicrotask(() => {
        if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
      });
    };
  }, []);
  return <SettingsRequest key={retry} classExamId={classExamId} onClose={onClose} onSaved={onSaved} onRetry={() => setRetry((value) => value + 1)} />;
}

function SettingsRequest({ classExamId, onClose, onSaved, onRetry }: OpenProps & { onRetry: () => void }) {
  const { settings, error } = useExamSettings(classExamId);
  if (settings) return <SettingsEditor settings={settings} onClose={onClose} onSaved={onSaved} />;
  return (
    <SettingsDialog onRequestClose={onClose}>
      <div className="flex min-h-[260px] max-h-[calc(100dvh_-_34px)] flex-col">
        <header className={headerClass}>
          <h2 id="exam-settings-title" className={headingClass}>Exam settings</h2>
          <button type="button" className={closeClass} aria-label="Close settings" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-[25px] pt-3 pb-6 [&_button]:mt-3.5 max-[480px]:px-[17px] max-[480px]:py-[18px]">
          {error ? <p role="alert" className={`${errorClass} mt-3`}>{error}</p> : <p role="status">Loading settings...</p>}
          {error && <button type="button" className={buttonClass} onClick={onRetry}>Retry</button>}
        </div>
        <footer className={footerClass}><button type="button" className={buttonClass} onClick={onClose}>Cancel</button></footer>
      </div>
    </SettingsDialog>
  );
}

function initialDraft(settings: ClassExamSettingsData) {
  return {
    hours: String(Math.floor(settings.durationMinutes / 60)),
    minutes: String(settings.durationMinutes % 60),
    scheduled: settings.displayAt !== null || settings.startsAt !== null || settings.endsAt !== null,
    display: isoToLocalInputValue(settings.displayAt),
    start: isoToLocalInputValue(settings.startsAt),
    end: isoToLocalInputValue(settings.endsAt),
    attempts: String(settings.maxAttempts),
    passMark: settings.passMark === null ? "" : String(settings.passMark),
    code: settings.verificationCode ?? "",
    shuffle: settings.randomizeOrder,
    sequential: settings.sequential,
    review: settings.allowReview,
    deduction: String(settings.answerChangeDeduction),
    overtime: settings.allowOvertime,
    overtimeMinutes: String(settings.overtimeMinutes),
    overtimeDeduction: String(settings.overtimeDeduction),
  };
}

function SettingsEditor({ settings, onClose, onSaved }: { settings: ClassExamSettingsData; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState(() => initialDraft(settings));
  const [section, setSection] = useState<Section>("timing");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const { saveSettings, isSaving, error: saveError } = useUpdateExamSettingsForm();
  const savingRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Partial<Record<Section, HTMLButtonElement>>>({});
  const panelId = useId();
  const wasConfirming = useRef(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft(settings));
  const canEditCode = settings.status === "scheduled";

  function update<K extends keyof typeof draft>(key: K, value: typeof draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty && !savingRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => { contentRef.current?.scrollTo(0, 0); }, [section]);
  useEffect(() => {
    if (confirmDiscard) keepEditingRef.current?.focus();
    else if (wasConfirming.current) cancelRef.current?.focus();
    wasConfirming.current = confirmDiscard;
  }, [confirmDiscard]);

  const totalMinutes = Number(draft.hours) * 60 + Number(draft.minutes);
  const passMark = draft.passMark.trim() === "" ? null : Number(draft.passMark);
  const deduction = draft.deduction.trim() === "" ? 0 : Number(draft.deduction);
  const errors: Partial<Record<Section, string[]>> = {};
  function invalid(where: Section, condition: boolean, message: string) {
    if (condition) (errors[where] ??= []).push(message);
  }
  invalid("timing", !draft.hours.trim() || !draft.minutes.trim() || !Number.isInteger(Number(draft.hours)) || Number(draft.hours) < 0 || !Number.isInteger(Number(draft.minutes)) || Number(draft.minutes) < 0 || Number(draft.minutes) > 59 || totalMinutes <= 0, "Enter a positive duration using whole hours and 0–59 minutes.");
  invalid("timing", draft.scheduled && !!draft.start && !!draft.end && draft.end <= draft.start, "End time must be after start time.");
  invalid("timing", draft.scheduled && !!draft.display && !!draft.start && draft.display > draft.start, "Display time must be at or before start time.");
  invalid("access", !draft.attempts.trim() || !Number.isInteger(Number(draft.attempts)) || Number(draft.attempts) < 1, "Allowed attempts must be a positive whole number.");
  invalid("access", passMark !== null && (!Number.isFinite(passMark) || passMark < 0 || passMark > 100), "Pass mark must be a percent from 0 to 100.");
  invalid("access", canEditCode && draft.code !== "" && !/^\d{6}$/.test(draft.code), "Enter a 6-digit session code or leave it blank.");
  invalid("answers", !Number.isFinite(deduction) || deduction < 0, "Answer-change deduction must be 0 or more.");
  invalid("overtime", draft.overtime && (!draft.overtimeMinutes.trim() || !Number.isInteger(Number(draft.overtimeMinutes)) || Number(draft.overtimeMinutes) <= 0 || !draft.overtimeDeduction.trim() || !Number.isFinite(Number(draft.overtimeDeduction)) || Number(draft.overtimeDeduction) < 0), "Enter positive whole overtime minutes and a fixed deduction of 0 or more.");
  const firstInvalid = sections.find(({ id }) => errors[id]?.length)?.id;

  function keepEditing() {
    setConfirmDiscard(false);
  }

  function requestClose() {
    if (savingRef.current) return;
    if (confirmDiscard) { keepEditing(); return; }
    if (dirty) setConfirmDiscard(true);
    else onClose();
  }

  async function handleSave() {
    if (savingRef.current || confirmDiscard) return;
    if (firstInvalid) {
      setSection(firstInvalid);
      tabRefs.current[firstInvalid]?.focus();
      contentRef.current?.scrollTo(0, 0);
      return;
    }
    savingRef.current = true;
    try {
      const saved = await saveSettings(settings.classExamId, {
        durationMinutes: totalMinutes,
        maxAttempts: Number(draft.attempts),
        passMark,
        randomizeOrder: draft.shuffle,
        sequential: draft.sequential,
        allowReview: draft.review,
        answerChangeDeduction: deduction,
        allowOvertime: draft.overtime,
        overtimeMinutes: Number(draft.overtimeMinutes),
        overtimeDeduction: Number(draft.overtimeDeduction),
        ...(canEditCode ? { verificationCode: draft.code.trim() } : {}),
        displayAt: draft.scheduled ? localInputValueToIso(draft.display) : null,
        startsAt: draft.scheduled ? localInputValueToIso(draft.start) : null,
        endsAt: draft.scheduled ? localInputValueToIso(draft.end) : null,
      });
      if (saved) { onSaved(); onClose(); }
    } finally { savingRef.current = false; }
  }

  const activeSection = sections.find(({ id }) => id === section)!;

  return (
    <SettingsDialog onRequestClose={requestClose}>
      <form noValidate onSubmit={(event) => { event.preventDefault(); void handleSave(); }} className="grid h-[min(580px,calc(100dvh_-_34px))] min-w-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] max-[480px]:h-[min(580px,calc(100dvh_-_26px))]">
        <header className={headerClass}>
          <div>
            <h2 id="exam-settings-title" className={headingClass}>Exam settings</h2>
            <p className="mt-1.5 text-xs wrap-anywhere text-[var(--color-base-content)]/65">{settings.className} · {settings.status}</p>
          </div>
          <button type="button" className={closeClass} aria-label="Close settings" onClick={requestClose} disabled={isSaving}>
            <X size={18} />
          </button>
        </header>

        <div role="tablist" aria-label="Settings sections" className="flex gap-[22px] border-b border-[var(--color-base-300)] px-[25px] max-[480px]:justify-between max-[480px]:gap-2 max-[480px]:px-[17px]">
          {sections.map(({ id, label }, index) => (
            <button key={id} ref={(element) => { if (element) tabRefs.current[id] = element; }}
              type="button" role="tab" id={`${panelId}-${id}`} aria-selected={section === id}
              aria-controls={panelId} aria-label={errors[id]?.length ? `${label} — check settings` : label}
              tabIndex={section === id ? 0 : -1} disabled={isSaving || confirmDiscard}
              onClick={() => setSection(id)}
              onKeyDown={(event) => {
                let next: number;
                if (event.key === "ArrowRight") next = (index + 1) % sections.length;
                else if (event.key === "ArrowLeft") next = (index + sections.length - 1) % sections.length;
                else if (event.key === "Home") next = 0;
                else if (event.key === "End") next = sections.length - 1;
                else return;
                event.preventDefault();
                setSection(sections[next].id);
                tabRefs.current[sections[next].id]?.focus();
              }}
              className={`relative border-0 border-b-2 border-transparent bg-transparent pt-[11px] pb-[13px] text-[13px] whitespace-nowrap text-[var(--color-base-content)]/65 aria-selected:border-[#41573b] aria-selected:font-medium aria-selected:text-[#41573b] max-[480px]:text-xs pointer-coarse:min-h-11 ${errors[id]?.length ? "after:absolute after:top-[9px] after:-right-[7px] after:size-[5px] after:rounded-full after:bg-[var(--color-error)]" : ""}`}>
              {label}
            </button>
          ))}
        </div>

        <div ref={contentRef} role="tabpanel" id={panelId} aria-labelledby={`${panelId}-${section}`} className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-[25px] py-[22px] max-[480px]:px-[17px] max-[480px]:py-[18px]">
          <fieldset disabled={isSaving || confirmDiscard} className="m-0 min-w-0 border-0 p-0">
            <legend className="sr-only">{activeSection.label}</legend>
            <h3 className="mb-1.5 text-sm font-medium">{activeSection.label}</h3>
            <p className="mb-2.5 text-xs leading-normal text-[var(--color-base-content)]/65">{activeSection.description}</p>

            {section === "timing" && <>
              <div className={gridClass}>
                <label className={fieldClass}>Hours
                  <input className={inputClass} type="number" min={0} step={1} value={draft.hours} onChange={(e) => update("hours", e.target.value)} />
                </label>
                <label className={fieldClass}>Minutes
                  <input className={inputClass} type="number" min={0} max={59} step={1} value={draft.minutes} onChange={(e) => update("minutes", e.target.value)} />
                </label>
              </div>
              <SettingSwitch label="Automatic schedule" description="Reveal and open the exam at set times."
                checked={draft.scheduled} onChange={(checked) => update("scheduled", checked)} />
              {draft.scheduled ? <>
                <div className={gridClass}>
                  <label className={`${fieldClass} col-span-full`}>Display to students at
                    <input className={inputClass} type="datetime-local" value={draft.display} onChange={(e) => update("display", e.target.value)} />
                  </label>
                  <label className={`${fieldClass} col-span-full`}>Start at
                    <input className={inputClass} type="datetime-local" value={draft.start} onChange={(e) => update("start", e.target.value)} />
                  </label>
                  <label className={`${fieldClass} col-span-full`}>Scheduled end at
                    <input className={inputClass} type="datetime-local" value={draft.end} onChange={(e) => update("end", e.target.value)} />
                  </label>
                </div>
                <p className={helpClass}>Dates are optional and use your local time. Display reveals the exam; start permits entry. Before allowed overtime, each attempt ends at its duration limit or the scheduled end, whichever comes first.</p>
              </> : <p className={helpClass}>No automatic window. Entry follows the exam’s current status.</p>}
            </>}

            {section === "access" && <>
              <div className={gridClass}>
                <label className={fieldClass}>Allowed attempts
                  <input className={inputClass} type="number" min={1} step={1} value={draft.attempts} onChange={(e) => update("attempts", e.target.value)} />
                </label>
                <label className={fieldClass}>Pass mark (%)
                  <input className={inputClass} type="number" min={0} max={100} step="any" placeholder="No minimum" value={draft.passMark} onChange={(e) => update("passMark", e.target.value)} />
                </label>
                <div className="col-span-full">
                  {canEditCode ? <label className={fieldClass}>Session code
                    <input className={`${inputClass} ${codeClass}`} type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={draft.code} onChange={(e) => update("code", e.target.value.replace(/[^0-9]/g, ""))} />
                  </label> : <>
                    <p className="text-[13px] font-medium">Session code</p>
                    <p className={codeClass}>{settings.verificationCode ?? "—"}</p>
                    <p className={helpClass}>Locked — this class is already live or has ended.</p>
                  </>}
                </div>
              </div>
              <p className={helpClass}>Leave the pass mark blank for no minimum. Students enter the session code before their attempt; it can only be changed before this class goes live.</p>
            </>}

            {section === "answers" && <>
              <SettingSwitch label="Shuffle questions" description="A different order for each student."
                checked={draft.shuffle} onChange={(checked) => update("shuffle", checked)} />
              <SettingSwitch label="Require answers in order" description="Students can revisit earlier questions, but cannot skip unanswered ones."
                checked={draft.sequential} onChange={(checked) => update("sequential", checked)} />
              <SettingSwitch label="Allow answer review" description="Available after a completed attempt. You can change this after the exam."
                checked={draft.review} onChange={(checked) => update("review", checked)} />
              <div className="flex flex-wrap items-center justify-between gap-3 pt-[18px]">
                <div>
                  <label className="text-[13px] font-medium" htmlFor={`${panelId}-deduction`}>Answer-change deduction</label>
                  <p id={`${panelId}-deduction-help`} className={helpClass}>Per settled answer changed after a revisit. Each question stays at or above 0.</p>
                </div>
                <div className="ml-auto flex items-center gap-2 text-xs text-[var(--color-base-content)]/65 [&_input]:w-[76px] [&_input]:text-center">
                  <input id={`${panelId}-deduction`} aria-describedby={`${panelId}-deduction-help`} className={inputClass} type="number" min={0} step="any" value={draft.deduction} onChange={(e) => update("deduction", e.target.value)} />
                  <span>pts</span>
                </div>
              </div>
            </>}

            {section === "overtime" && <>
              <SettingSwitch label="Allow overtime" description="Extra time with one fixed point deduction."
                checked={draft.overtime} onChange={(checked) => update("overtime", checked)} />
              {draft.overtime ? <>
                <div className={gridClass}>
                  <label className={fieldClass}>Extra minutes
                    <input className={inputClass} type="number" min={1} step={1} value={draft.overtimeMinutes} onChange={(e) => update("overtimeMinutes", e.target.value)} />
                  </label>
                  <label className={fieldClass}>Fixed deduction (pts)
                    <input className={inputClass} type="number" min={0} step="any" value={draft.overtimeDeduction} onChange={(e) => update("overtimeDeduction", e.target.value)} />
                  </label>
                </div>
                <p className={helpClass}>Applied once if overtime is used. Scores stay at or above zero. Overtime extends the scheduled end; manually ending the exam stops everyone immediately.</p>
              </> : <p className={helpClass}>Answers are submitted automatically at time-up.</p>}
            </>}

            {errors[section] && <div role="alert" className={`${errorClass} mt-3`}>
              {errors[section]?.map((message) => <p key={message}>{message}</p>)}
            </div>}
          </fieldset>
        </div>

        <footer className={footerClass}>
          {saveError && <p role="alert" className={`${errorClass} basis-full`}>{saveError}</p>}
          {confirmDiscard ? <>
            <p className={statusClass} role="status">Discard unsaved settings?</p>
            <div className={actionsClass} role="group" aria-label="Unsaved settings">
              <button ref={keepEditingRef} type="button" className={buttonClass} onClick={keepEditing}>Keep editing</button>
              <button type="button" className={buttonClass} onClick={onClose}>Discard changes</button>
            </div>
          </> : <>
            <p role="status" className={statusClass}>{isSaving ? "Saving settings..." : firstInvalid ? "Check the marked sections." : dirty ? "Unsaved changes" : "Changes apply to this class"}</p>
            <div className={actionsClass}>
              <button ref={cancelRef} type="button" className={buttonClass} disabled={isSaving} onClick={requestClose}>Cancel</button>
              <button type="submit" disabled={isSaving} className={`${buttonBaseClass} border-[#41573b] bg-[#41573b] text-white`}>{isSaving ? "Saving..." : "Save changes"}</button>
            </div>
          </>}
        </footer>
      </form>
    </SettingsDialog>
  );
}
