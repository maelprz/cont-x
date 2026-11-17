import type { OfflineExamSnapshot } from '../../types/offlineExam';

export type VerificationStatus = 'idle' | 'checking_apps' | 'verifying' | 'saving_exam' | 'error';

export interface SessionVerificationModalProps {
  isOpen: boolean;
  examId: string;               // real exam id, needed to call the server check
  codeLength?: number;          // total digits, default 6
  dashAfterIndex?: number;      // visually splits input into groups, default 3 (3 - 3)
  onConfirm?: (sessionId: string, snapshot: OfflineExamSnapshot | null) => void;
  onCancel?: () => void;
}
