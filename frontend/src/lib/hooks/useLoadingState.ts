import { useState } from 'react';

export type LoadingStateType = 'idle' | 'loading' | 'success' | 'error';

// Extended loading state for advanced components like LoadingButton
export interface LoadingState {
  isLoading: boolean;
  isRetrying?: boolean;
  error?: string | null;
  canRetry?: boolean;
  attempt?: number;
}

export interface UseLoadingStateReturn {
  state: LoadingStateType;
  setLoading: () => void;
  setSuccess: () => void;
  setError: (error?: string) => void;
  setIdle: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
  // Extended state for LoadingButton compatibility
  loadingState: LoadingState;
}

export function useLoadingState(initialState: LoadingStateType = 'idle'): UseLoadingStateReturn {
  const [state, setState] = useState<LoadingStateType>(initialState);
  const [error, setErrorMsg] = useState<string | null>(null);

  return {
    state,
    setLoading: () => {
      setState('loading');
      setErrorMsg(null);
    },
    setSuccess: () => {
      setState('success');
      setErrorMsg(null);
    },
    setError: (errorMsg?: string) => {
      setState('error');
      setErrorMsg(errorMsg || 'An error occurred');
    },
    setIdle: () => {
      setState('idle');
      setErrorMsg(null);
    },
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
    isIdle: state === 'idle',
    // Extended state for LoadingButton compatibility
    loadingState: {
      isLoading: state === 'loading',
      error: state === 'error' ? error : null,
      canRetry: state === 'error',
      attempt: 1,
    },
  };
}