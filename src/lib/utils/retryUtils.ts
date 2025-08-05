/**
 * Retry utilities for handling network failures and transient errors
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface RetryState {
  attempt: number;
  isRetrying: boolean;
  error: Error | null;
  canRetry: boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error?.code === 'NETWORK_ERROR' || error?.code === 'TIMEOUT') return true;
    if (error?.status >= 500 && error?.status < 600) return true;
    if (error?.message?.toLowerCase().includes('network')) return true;
    if (error?.message?.toLowerCase().includes('timeout')) return true;
    return false;
  }
};

export class RetryableError extends Error {
  constructor(message: string, public readonly originalError: Error, public readonly retryable: boolean = true) {
    super(message);
    this.name = 'RetryableError';
  }
}

export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> => {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      const shouldRetry = config.retryCondition?.(error) ?? DEFAULT_RETRY_OPTIONS.retryCondition!(error);
      const isLastAttempt = attempt === config.maxAttempts;

      if (!shouldRetry || isLastAttempt) {
        throw error;
      }

      config.onRetry?.(attempt, error);

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

export const createRetryHook = (defaultOptions: Partial<RetryOptions> = {}) => {
  return <T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ) => {
    const mergedOptions = { ...defaultOptions, ...options };
    return withRetry(operation, mergedOptions);
  };
};

// Specific retry configurations for different types of operations
export const authRetryOptions: Partial<RetryOptions> = {
  maxAttempts: 2,
  baseDelay: 1000,
  retryCondition: (error) => {
    // Don't retry auth errors like wrong password, but retry network issues
    if (error?.message?.toLowerCase().includes('invalid_credentials')) return false;
    if (error?.message?.toLowerCase().includes('user_not_found')) return false;
    return DEFAULT_RETRY_OPTIONS.retryCondition!(error);
  }
};

export const apiRetryOptions: Partial<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 5000,
  backoffMultiplier: 1.5
};

export const dbRetryOptions: Partial<RetryOptions> = {
  maxAttempts: 2,
  baseDelay: 500,
  maxDelay: 2000,
  retryCondition: (error) => {
    // Retry on connection issues but not on constraint violations
    if (error?.code === '23505') return false; // Unique constraint violation
    if (error?.code === '23503') return false; // Foreign key violation
    return DEFAULT_RETRY_OPTIONS.retryCondition!(error);
  }
};

export const fileUploadRetryOptions: Partial<RetryOptions> = {
  maxAttempts: 5,
  baseDelay: 2000,
  maxDelay: 30000,
  backoffMultiplier: 2
};