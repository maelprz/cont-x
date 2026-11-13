import { useRouterLogic } from "../../router/routerLogic";
import { useExamSessionStore } from "../../stores/useExamSessionStore";

export function ViewAnswersButton({ sessionId }: { sessionId: string }) {
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const setSessionId = useExamSessionStore((state) => state.setSessionId);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setSessionId(sessionId);
        navigateTo("examReview");
      }}
      className="px-3 py-1.5 rounded-lg border border-[var(--bg-sidebar)] bg-[var(--bg-sidebar)] text-[var(--text-inverted)] text-xs cursor-pointer hover:opacity-85"
    >
      View Answers
    </button>
  );
}
