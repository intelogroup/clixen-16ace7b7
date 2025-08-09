/**
 * Enhanced Error Logging System for Clixen MVP
 * Created by Error Diagnostics Agent recommendation
 * 
 * Captures verbose error context for better debugging
 */

export interface ErrorContext {
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  stackTrace?: string;
  additionalData?: Record<string, any>;
  errorBoundary?: string;
  networkStatus?: string;
}

export interface StructuredError {
  id: string;
  type: 'network' | 'api' | 'component' | 'auth' | 'n8n' | 'database' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  originalError?: Error;
  context: ErrorContext;
  reproduced?: boolean;
  resolved?: boolean;
}

class ErrorLogger {
  private sessionId: string;
  private userId?: string;
  private errorQueue: StructuredError[] = [];
  private maxQueueSize = 100;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeErrorHandlers();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeErrorHandlers(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'component',
        severity: 'high',
        message: `Unhandled Error: ${event.message}`,
        originalError: event.error,
        context: this.buildContext({
          component: 'global',
          stackTrace: event.error?.stack,
          additionalData: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        })
      });
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'api',
        severity: 'high',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        context: this.buildContext({
          component: 'promise',
          additionalData: {
            reason: event.reason,
            promise: event.promise
          }
        })
      });
    });
  }

  private buildContext(overrides: Partial<ErrorContext> = {}): ErrorContext {
    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.userId,
      sessionId: this.sessionId,
      networkStatus: navigator.onLine ? 'online' : 'offline',
      ...overrides
    };
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  logError(error: Omit<StructuredError, 'id' | 'context'> & { context?: Partial<ErrorContext> }): void {
    const structuredError: StructuredError = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      context: this.buildContext(error.context),
      ...error
    };

    // Add to queue
    this.errorQueue.push(structuredError);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift(); // Remove oldest
    }

    // Log to console with enhanced formatting
    this.logToConsole(structuredError);

    // Send to external error tracking (if available)
    this.sendToErrorTracking(structuredError);
  }

  private logToConsole(error: StructuredError): void {
    const style = this.getConsoleStyle(error.severity);
    
    console.group(`%c🔍 Error Diagnostics: ${error.type.toUpperCase()}`, style);
    console.error(`Message: ${error.message}`);
    console.error(`Severity: ${error.severity}`);
    console.error(`ID: ${error.id}`);
    console.error(`Timestamp: ${error.context.timestamp}`);
    
    if (error.context.component) {
      console.error(`Component: ${error.context.component}`);
    }
    
    if (error.context.action) {
      console.error(`Action: ${error.context.action}`);
    }

    if (error.context.userId) {
      console.error(`User ID: ${error.context.userId}`);
    }

    if (error.context.additionalData) {
      console.error('Additional Data:', error.context.additionalData);
    }

    if (error.originalError) {
      console.error('Original Error:', error.originalError);
    }

    if (error.context.stackTrace) {
      console.error('Stack Trace:', error.context.stackTrace);
    }

    console.groupEnd();
  }

  private getConsoleStyle(severity: string): string {
    const styles = {
      low: 'color: #10B981; font-weight: bold;',
      medium: 'color: #F59E0B; font-weight: bold;',
      high: 'color: #EF4444; font-weight: bold;',
      critical: 'color: #DC2626; background: #FEE2E2; font-weight: bold; padding: 2px 4px;'
    };
    return styles[severity as keyof typeof styles] || styles.medium;
  }

  private sendToErrorTracking(error: StructuredError): void {
    // Integration with Sentry or other error tracking
    // For MVP, we'll just store locally
    try {
      const stored = localStorage.getItem('clixen_error_log');
      const errorLog = stored ? JSON.parse(stored) : [];
      errorLog.push(error);
      
      // Keep only last 50 errors
      if (errorLog.length > 50) {
        errorLog.splice(0, errorLog.length - 50);
      }
      
      localStorage.setItem('clixen_error_log', JSON.stringify(errorLog));
    } catch (e) {
      console.warn('Failed to store error log:', e);
    }
  }

  // Specialized logging methods for common Clixen errors
  logApiError(endpoint: string, error: Error, requestData?: any): void {
    this.logError({
      type: 'api',
      severity: 'high',
      message: `API Error: ${endpoint}`,
      originalError: error,
      context: {
        action: 'api_call',
        additionalData: {
          endpoint,
          requestData,
          responseStatus: (error as any)?.response?.status,
          responseData: (error as any)?.response?.data
        }
      }
    });
  }

  logN8nError(operation: string, error: Error, workflowData?: any): void {
    this.logError({
      type: 'n8n',
      severity: 'critical',
      message: `n8n Integration Error: ${operation}`,
      originalError: error,
      context: {
        component: 'n8n-integration',
        action: operation,
        additionalData: {
          workflowData,
          n8nEndpoint: import.meta.env.VITE_N8N_API_URL,
          hasApiKey: !!import.meta.env.VITE_N8N_API_KEY
        }
      }
    });
  }

  logAuthError(action: string, error: Error, userContext?: any): void {
    this.logError({
      type: 'auth',
      severity: 'high',
      message: `Authentication Error: ${action}`,
      originalError: error,
      context: {
        component: 'auth',
        action,
        additionalData: {
          userContext: userContext ? { ...userContext, password: '[REDACTED]' } : undefined
        }
      }
    });
  }

  logDatabaseError(query: string, error: Error, params?: any): void {
    this.logError({
      type: 'database',
      severity: 'high',
      message: `Database Error: ${query}`,
      originalError: error,
      context: {
        component: 'database',
        action: 'query',
        additionalData: {
          query,
          params
        }
      }
    });
  }

  // Get error statistics for debugging
  getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recent: StructuredError[];
  } {
    return {
      total: this.errorQueue.length,
      byType: this.errorQueue.reduce((acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: this.errorQueue.reduce((acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recent: this.errorQueue.slice(-10)
    };
  }

  // Export error log for analysis
  exportErrorLog(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      userId: this.userId,
      exportTimestamp: new Date().toISOString(),
      errors: this.errorQueue,
      stats: this.getErrorStats()
    }, null, 2);
  }
}

// Global error logger instance
export const errorLogger = new ErrorLogger();

// Development helper
if (import.meta.env.DEV) {
  (window as any).clixenErrorLogger = errorLogger;
  console.log('🔍 Clixen Error Logger initialized in development mode');
  console.log('Access via window.clixenErrorLogger for debugging');
}