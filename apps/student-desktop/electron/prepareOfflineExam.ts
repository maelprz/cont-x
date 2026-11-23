import type { OfflineExamSnapshot } from '../src/types/offlineExam';
import type { LocalRubric } from '../src/types/localGrading';
import { validateCodingRubric } from '../shared/localGrading';
import { loadOfflineExam, saveOfflineExam } from './storage/offlineExamStorage';
import { publicExam } from './storage/offlineStorageData';
import { withAttemptLock } from './localGradingService';

// These are the app's build-time public project settings. Tokens stay in memory.
export async function prepareOfflineExam(snapshot: OfflineExamSnapshot, accessToken: string): Promise<OfflineExamSnapshot> {
  const url = process.env.CONTX_SUPABASE_URL;
  const apikey = process.env.CONTX_SUPABASE_ANON_KEY;
  if (!url || !apikey || !accessToken) throw new Error('Reconnect and sign in to download the exam.');
  const headers = { apikey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  const userResponse = await fetch(`${url}/auth/v1/user`, { headers, signal: AbortSignal.timeout(15000) });
  const user = userResponse.ok ? await userResponse.json() : null;
  if (user?.id !== snapshot.studentId) throw new Error('The signed-in student does not match this attempt.');
  return withAttemptLock(snapshot, async () => {
    const response = await fetch(`${url}/rest/v1/rpc/download_local_grading_material`, {
      method: 'POST', headers, body: JSON.stringify({ p_session_id: snapshot.sessionId }), signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error('Could not download the grading materials. Reconnect and retry.');
    const material = await response.json() as Record<string, LocalRubric>;
    for (const question of snapshot.questions) {
      const rubric = material?.[question.id];
      if (!rubric || rubric.feedbackOnly || rubric.type !== question.type || !Number.isFinite(rubric.maxPoints) || rubric.maxPoints <= 0 ||
          (rubric.type === 'mcq' && rubric.correctOptionIds?.length !== 1) ||
          (rubric.type === 'fitb' && !rubric.acceptedAnswers?.length)) {
        throw new Error('The exam grading materials are incomplete. Ask your teacher to check the exam.');
      }
      validateCodingRubric(rubric);
    }
    const existing = await loadOfflineExam(snapshot);
    const prepared: OfflineExamSnapshot = {
      studentId: snapshot.studentId, sessionId: snapshot.sessionId, examId: snapshot.examId, title: snapshot.title,
      questions: snapshot.questions.map(question => ({ ...question, maxPoints: material[question.id].maxPoints,
        checkPenaltyPerAttempt: material[question.id].penaltyPerAttempt ?? question.checkPenaltyPerAttempt })),
      rules: snapshot.rules, timing: snapshot.timing, timingReceivedAt: snapshot.timingReceivedAt,
      gradingMaterial: material, gradingState: existing?.gradingState, draft: existing?.draft,
      visibleTests: Object.fromEntries(Object.entries(material).filter(([, rubric]) => rubric.type === 'coding')
        .map(([id, rubric]) => [id, (rubric.tests ?? []).filter(test => test.is_hidden === false)])),
    };
    await saveOfflineExam(prepared);
    return publicExam(prepared);
  });
}
