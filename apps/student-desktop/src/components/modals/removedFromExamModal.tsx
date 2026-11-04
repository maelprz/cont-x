import { useEffect } from "react"; // for the auto-redirect timer
import { useExamSessionStore } from "../../stores/useExamSessionStore"; // reset() clears the removed flag and exam state
import { useRouterLogic } from "../../router/routerLogic"; // used to go back to the dashboard

const REDIRECT_MS = 5000; // how long the modal stays before redirecting on its own

export function RemovedFromExamModal() {
  const reset = useExamSessionStore((state) => state.reset); // wipes exam state and turns the flag off
  const navigateTo = useRouterLogic((state) => state.navigateTo); // screen switcher

  const goToDashboard = () => {
    reset(); // clear the session so nothing stale carries over
    navigateTo("dashboard"); // back to the dashboard
  };

  useEffect(() => {
    const timerId = setTimeout(() => {
      reset(); // same cleanup as the button
      navigateTo("dashboard"); // redirect automatically
    }, REDIRECT_MS);
    return () => clearTimeout(timerId); // cancel if the student clicked the button first
  }, [reset, navigateTo]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-[8px] bg-[var(--bg-app)/2]">
      <div className="w-full max-w-md rounded-xl overflow-hidden relative border-[1px] border-[var(--border-primary)] bg-[var(--bg-sidebar)]">
        <div className="p-8 flex flex-col gap-6 text-center">
          <h2 className="text-[26px] font-semibold text-[var(--text-inverted)] tracking-tight">
            You were removed from this exam
          </h2>
          <p className="text-[14px] text-[var(--text-inverted-secondary)] opacity-80 leading-relaxed">
            Your teacher removed you from this exam. You will be redirected to
            your dashboard.
          </p>
          <button
            onClick={goToDashboard} // lets the student skip the wait
            className="w-full py-3.5 rounded-lg font-bold text-[15px] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] bg-[image:var(--button-gradient)] text-[var(--button-gradient-text)] font-[var(--font-body)] border border-[var(--border-subtle)]"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
