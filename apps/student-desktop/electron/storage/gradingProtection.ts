import { safeStorage } from 'electron';
import type { OfflineExamSnapshot } from '../../src/types/offlineExam';

export async function checkGradingProtection(): Promise<void> {
  if (!await safeStorage.isAsyncEncryptionAvailable() ||
      (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')) {
    throw new Error('Protected local grading storage is unavailable on this device.');
  }
}

export async function sealGradingData(value: unknown): Promise<string> {
  await checkGradingProtection();
  return (await safeStorage.encryptStringAsync(JSON.stringify(value))).toString('base64');
}

export async function openGradingData<T>(value: string): Promise<T> {
  await checkGradingProtection();
  const { result } = await safeStorage.decryptStringAsync(Buffer.from(value, 'base64'));
  return JSON.parse(result) as T;
}

export async function protectSnapshot(snapshot: OfflineExamSnapshot): Promise<OfflineExamSnapshot> {
  return { ...snapshot, gradingMaterial: undefined, gradingState: undefined,
    protectedGradingMaterial: snapshot.gradingMaterial
      ? await sealGradingData(snapshot.gradingMaterial) : snapshot.protectedGradingMaterial,
    protectedGradingState: snapshot.gradingState
      ? await sealGradingData(snapshot.gradingState) : snapshot.protectedGradingState };
}

export async function openSnapshot(snapshot: OfflineExamSnapshot | null): Promise<OfflineExamSnapshot | null> {
  if (!snapshot) return null;
  return { ...snapshot,
    gradingMaterial: snapshot.protectedGradingMaterial
      ? await openGradingData(snapshot.protectedGradingMaterial) : snapshot.gradingMaterial,
    gradingState: snapshot.protectedGradingState
      ? await openGradingData(snapshot.protectedGradingState) : snapshot.gradingState };
}
