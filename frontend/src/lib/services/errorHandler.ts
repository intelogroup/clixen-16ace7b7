/**
 * Centralized Error Handler
 * Consolidates error handling logic from multiple files
 */

import toast from 'react-hot-toast';
import { Logger } from '../monitoring/Logger';

export interface ErrorContext {
  operation?: string;
  userId?: string;
  projectId?: string;
  workflowId?: string;
  metadata?: Record<string, any>;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger = new Logger('ErrorHandler');

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle API errors with appropriate user feedback
   */
  handleApiError(error: any, context?: ErrorContext): string {
    const errorMessage = this.getErrorMessage(error);
    
    // Log the error with context
    this.logger.error(`API Error: ${context?.operation || 'Unknown operation'}`, {
      error: errorMessage,
      ...context
    });

    // Show user-friendly toast notification
    this.showErrorToast(errorMessage, context?.operation);

    return errorMessage;
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(error: any): string {
    const errorMessage = this.getAuthErrorMessage(error);
    
    this.logger.error('Authentication error', error);
    
    // Show specific auth error toast
    toast.error(errorMessage, {
      duration: 5000,
      icon: '🔐'
    });

    return errorMessage;
  }

  /**
   * Handle workflow errors
   */
  handleWorkflowError(error: any, workflowName?: string): string {
    const errorMessage = this.getWorkflowErrorMessage(error);
    
    this.logger.error('Workflow error', {
      error: errorMessage,
      workflow: workflowName
    });

    toast.error(
      workflowName 
        ? `Failed to process workflow "${workflowName}": ${errorMessage}`
        : errorMessage,
      {
        duration: 6000,
        icon: '⚠️'
      }
    );

    return errorMessage;
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error: any): string {
    const isOffline = !navigator.onLine;
    
    if (isOffline) {
      const message = 'You are offline. Please check your internet connection.';
      toast.error(message, {
        duration: 10000,
        icon: '📡'
      });
      return message;
    }

    const errorMessage = 'Network error. Please try again.';
    this.logger.error('Network error', error);
    toast.error(errorMessage, {
      duration: 5000,
      icon: '🌐'
    });

    return errorMessage;
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    if (!error) return 'An unexpected error occurred';

    // Handle different error types
    if (typeof error === 'string') return error;
    
    if (error.message) return error.message;
    
    if (error.error) {
      if (typeof error.error === 'string') return error.error;
      if (error.error.message) return error.error.message;
    }

    if (error.statusText) return error.statusText;

    return 'An unexpected error occurred';
  }

  /**
   * Get authentication-specific error message
   */
  private getAuthErrorMessage(error: any): string {
    const message = this.getErrorMessage(error);

    // Map common auth errors to user-friendly messages
    const authErrorMap: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password. Please check your credentials.',
      'Email not confirmed': 'Please check your email and confirm your account.',
      'User already registered': 'An account with this email already exists.',
      'Password is too weak': 'Password must be at least 8 characters with letters and numbers.',
      'Email rate limit exceeded': 'Too many attempts. Please wait a few minutes.',
      'Invalid authentication token': 'Your session has expired. Please sign in again.',
      'User not authenticated': 'Please sign in to continue.',
      'Unauthorized': 'You don\'t have permission to perform this action.'
    };

    for (const [key, value] of Object.entries(authErrorMap)) {
      if (message.includes(key)) {
        return value;
      }
    }

    return message;
  }

  /**
   * Get workflow-specific error message
   */
  private getWorkflowErrorMessage(error: any): string {
    const message = this.getErrorMessage(error);

    const workflowErrorMap: Record<string, string> = {
      'Workflow not found': 'The workflow could not be found.',
      'Invalid workflow JSON': 'The workflow configuration is invalid.',
      'Deployment failed': 'Failed to deploy the workflow. Please try again.',
      'n8n API error': 'Unable to connect to the workflow engine.',
      'Workflow already exists': 'A workflow with this name already exists.',
      'Invalid workflow name': 'Please provide a valid workflow name.',
      'Quota exceeded': 'You have reached your workflow limit.'
    };

    for (const [key, value] of Object.entries(workflowErrorMap)) {
      if (message.includes(key)) {
        return value;
      }
    }

    return message;
  }

  /**
   * Show error toast with appropriate styling
   */
  private showErrorToast(message: string, operation?: string): void {
    const prefix = operation ? `${operation} failed: ` : '';
    
    toast.error(`${prefix}${message}`, {
      duration: 5000,
      style: {
        background: '#dc2626',
        color: 'white',
        padding: '12px',
        borderRadius: '8px'
      }
    });
  }

  /**
   * Show success toast
   */
  showSuccess(message: string, icon?: string): void {
    toast.success(message, {
      duration: 4000,
      icon: icon || '✅',
      style: {
        background: '#10b981',
        color: 'white',
        padding: '12px',
        borderRadius: '8px'
      }
    });
  }

  /**
   * Show warning toast
   */
  showWarning(message: string): void {
    toast(message, {
      duration: 5000,
      icon: '⚠️',
      style: {
        background: '#f59e0b',
        color: 'white',
        padding: '12px',
        borderRadius: '8px'
      }
    });
  }

  /**
   * Show info toast
   */
  showInfo(message: string): void {
    toast(message, {
      duration: 4000,
      icon: 'ℹ️',
      style: {
        background: '#3b82f6',
        color: 'white',
        padding: '12px',
        borderRadius: '8px'
      }
    });
  }

  /**
   * Handle and log critical errors
   */
  handleCriticalError(error: any, context?: ErrorContext): void {
    const errorMessage = this.getErrorMessage(error);
    
    // Log critical error with full stack trace
    this.logger.error('CRITICAL ERROR', {
      message: errorMessage,
      stack: error.stack,
      ...context
    });

    // Show persistent error notification
    toast.error(
      'A critical error occurred. Please refresh the page or contact support.',
      {
        duration: Infinity,
        icon: '🚨'
      }
    );

    // Report to monitoring service if configured
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          app: context
        }
      });
    }
  }

  /**
   * Create error boundary fallback
   */
  createErrorBoundaryFallback(error: Error, resetError: () => void) {
    return {
      title: 'Something went wrong',
      message: this.getErrorMessage(error),
      action: {
        label: 'Try again',
        onClick: resetError
      }
    };
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();