import { useState, useCallback, useRef } from 'react';
import { withRetry, RetryOptions } from '../utils/retryUtils';

export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
  isRetrying: boolean;
  attempt: number;
  canRetry: boolean;
}

export interface LoadingActions {
  execute: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

export interface UseLoadingStateOptions extends Partial<RetryOptions> {
  resetOnSuccess?: boolean;
  resetOnError?: boolean;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  onRetry?: (attempt: number, error: Error) => void;
}

export const useLoadingState = <T = any>(
  operation: () => Promise<T>,
  options: UseLoadingStateOptions = {}
): [LoadingState, LoadingActions, T | null] => {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    isRetrying: false,
    attempt: 0,
    canRetry: false
  });

  const [result, setResult] = useState<T | null>(null);
  const operationRef = useRef(operation);
  const optionsRef = useRef(options);

  // Update refs when props change
  operationRef.current = operation;
  optionsRef.current = options;

  const execute = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      isRetrying: false,
      attempt: 0,
      canRetry: false
    }));

    try {
      const result = await withRetry(operationRef.current, {
        ...optionsRef.current,
        onRetry: (attempt, error) => {
          setState(prev => ({
            ...prev,
            isRetrying: true,
            attempt,
            error
          }));
          optionsRef.current.onRetry?.(attempt, error);
        }
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        isRetrying: false,
        error: null,
        canRetry: false
      }));

      setResult(result);
      optionsRef.current.onSuccess?.(result);

      if (optionsRef.current.resetOnSuccess) {
        setState({
          isLoading: false,
          error: null,
          isRetrying: false,
          attempt: 0,
          canRetry: false
        });
      }

    } catch (error) {
      const err = error as Error;
      const canRetry = optionsRef.current.retryCondition?.(error) ?? true;

      setState(prev => ({
        ...prev,
        isLoading: false,
        isRetrying: false,
        error: err,
        canRetry
      }));

      optionsRef.current.onError?.(err);

      if (optionsRef.current.resetOnError) {
        setTimeout(() => {
          setState(prev => ({ ...prev, error: null }));
        }, 5000);
      }
    }
  }, []);

  const retry = useCallback(async () => {
    if (state.canRetry) {
      await execute();
    }
  }, [execute, state.canRetry]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      isRetrying: false,
      attempt: 0,
      canRetry: false
    });
    setResult(null);
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null, canRetry: false }));
  }, []);

  const actions: LoadingActions = {
    execute,
    retry,
    reset,
    clearError
  };

  return [state, actions, result];
};

// Specialized hooks for common operations
export const useAsyncOperation = <T = any>(
  operation: () => Promise<T>,
  options: UseLoadingStateOptions = {}
) => {
  return useLoadingState(operation, {
    maxAttempts: 3,
    baseDelay: 1000,
    resetOnSuccess: true,
    ...options
  });
};

export const useAuthOperation = <T = any>(
  operation: () => Promise<T>,
  options: UseLoadingStateOptions = {}
) => {
  return useLoadingState(operation, {
    maxAttempts: 2,
    baseDelay: 1000,
    retryCondition: (error) => {
      // Don't retry auth-specific errors
      const message = error?.message?.toLowerCase() || '';
      if (message.includes('invalid_credentials')) return false;
      if (message.includes('user_not_found')) return false;
      if (message.includes('email_not_confirmed')) return false;
      return true;
    },
    ...options
  });
};

export const useApiOperation = <T = any>(
  operation: () => Promise<T>,
  options: UseLoadingStateOptions = {}
) => {
  return useLoadingState(operation, {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    resetOnSuccess: true,
    ...options
  });
};