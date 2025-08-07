import { useCallback, useState } from 'react';
import { toast } from 'react-hot-toast';

export interface ErrorState {
  error: Error | null;
  hasError: boolean;
  errorId: string | null;
}

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  onError?: (error: Error, errorId: string) => void;
  resetOnDeps?: any[];
}

export const useErrorHandler = (options: ErrorHandlerOptions = {}) => {
  const {
    showToast = true,
    logError = true,
    onError,
    resetOnDeps = []
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    hasError: false,
    errorId: null
  });

  const handleError = useCallback((error: Error) => {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log error
    if (logError) {
      console.error('Error handled by useErrorHandler:', error);
      console.error('Error ID:', errorId);
    }

    // Update error state
    setErrorState({
      error,
      hasError: true,
      errorId
    });

    // Show toast notification
    if (showToast) {
      const message = getErrorMessage(error);
      toast.error(message);
    }

    // Call custom error handler
    onError?.(error, errorId);

    // Send to error tracking service
    reportError(error, errorId);
  }, [showToast, logError, onError]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      hasError: false,
      errorId: null
    });
  }, []);

  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        clearError(); // Clear previous errors
        return await fn(...args);
      } catch (error) {
        handleError(error as Error);
        return null;
      }
    };
  }, [handleError, clearError]);

  // Reset error when dependencies change
  const resetError = useCallback(() => {
    clearError();
  }, resetOnDeps);

  return {
    ...errorState,
    handleError,
    clearError,
    resetError,
    withErrorHandling
  };
};

// Utility function to extract meaningful error messages
const getErrorMessage = (error: Error): string => {
  // Network errors
  if (error.message.toLowerCase().includes('network')) {
    return 'Network error. Please check your connection.';
  }

  if (error.message.toLowerCase().includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  // Auth errors
  if (error.message.toLowerCase().includes('unauthorized')) {
    return 'You are not authorized to perform this action.';
  }

  if (error.message.toLowerCase().includes('forbidden')) {
    return 'Access denied. Please check your permissions.';
  }

  // Validation errors
  if (error.message.toLowerCase().includes('validation')) {
    return 'Please check your input and try again.';
  }

  // Generic fallback
  return error.message || 'An unexpected error occurred.';
};

// Error reporting function (integrate with error tracking service)
const reportError = (error: Error, errorId: string) => {
  try {
    const errorData = {
      message: error.message,
      stack: error.stack,
      errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: getUserId(), // Implement based on your auth system
    };

    // In development, just log to console
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Report');
      console.error('Error Data:', errorData);
      console.groupEnd();
      return;
    }

    // TODO: Send to error tracking service
    // Examples:
    // - Sentry: Sentry.captureException(error, { extra: errorData });
    // - LogRocket: LogRocket.captureException(error);
    // - Custom API: api.post('/errors', errorData);
    
  } catch (reportingError) {
    console.error('Failed to report error:', reportingError);
  }
};

// Helper function to get current user ID (implement based on your auth system)
const getUserId = (): string | null => {
  try {
    // Example implementation - replace with your auth system
    const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
    return user.id || null;
  } catch {
    return null;
  }
};

// Specialized error handlers for different contexts
export const useAuthErrorHandler = () => {
  return useErrorHandler({
    showToast: true,
    onError: (error, errorId) => {
      // Special handling for auth errors
      if (error.message.toLowerCase().includes('unauthorized')) {
        // Maybe redirect to login
        window.location.href = '/auth';
      }
    }
  });
};

export const useApiErrorHandler = () => {
  return useErrorHandler({
    showToast: true,
    logError: true,
    onError: (error, errorId) => {
      // API-specific error handling
      if (error.message.toLowerCase().includes('rate limit')) {
        toast.error('Too many requests. Please slow down.');
      }
    }
  });
};

export const useValidationErrorHandler = () => {
  return useErrorHandler({
    showToast: false, // Usually handle validation errors in forms directly
    logError: false,  // Validation errors are expected
  });
};