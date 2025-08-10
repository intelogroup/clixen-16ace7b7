import { useState } from 'react';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface UseLoadingStateReturn {
  state: LoadingState;
  setLoading: () => void;
  setSuccess: () => void;
  setError: () => void;
  setIdle: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
}

export function useLoadingState(initialState: LoadingState = 'idle'): UseLoadingStateReturn {
  const [state, setState] = useState<LoadingState>(initialState);

  return {
    state,
    setLoading: () => setState('loading'),
    setSuccess: () => setState('success'),
    setError: () => setState('error'),
    setIdle: () => setState('idle'),
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
    isIdle: state === 'idle',
  };
}