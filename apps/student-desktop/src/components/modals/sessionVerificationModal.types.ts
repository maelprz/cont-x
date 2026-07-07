export type VerificationStatus = 'idle' | 'verifying' | 'error';

export interface SessionVerificationModalProps {
  isOpen: boolean;
  examId: string;               // real exam id, needed to call the server check
  codeLength?: number;          // total digits, default 6
  dashAfterIndex?: number;      // visually splits input into groups, default 3 (3 - 3)
  onConfirm?: (sessionId: string) => void; // fires only after the server confirms success
  onCancel?: () => void;
}