export type VerificationStatus = 'idle' | 'verifying' | 'error';

export interface SessionVerificationModalProps {
  isOpen: boolean;
  codeLength?: number;          // total digits, default 6
  dashAfterIndex?: number;      // visually splits input into groups, default 3 (3 - 3)
  expectedCode?: string;
  onConfirm?: (code: string) => void;
  onCancel?: () => void;
}