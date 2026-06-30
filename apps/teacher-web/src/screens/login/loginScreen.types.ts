// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LoginScreenProps {
  onLoginSuccess?: () => void;   // called when login succeeds — wired later
  onResetPassword?: () => void;  // called when reset button is clicked — wired later
}

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

export interface LoginFormState {
  userId: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Login process state
// ---------------------------------------------------------------------------

export type LoginStatus = 'idle' | 'loading' | 'error' | 'success';