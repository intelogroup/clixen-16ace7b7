import { supabase } from '../supabase';

interface ErrorLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'critical';
  message: string;
  context?: any;
  userId?: string;
  sessionId?: string;
  stack?: string;
  userAgent?: string;
  url?: string;
}

export class ErrorLogger {
  private static logs: ErrorLog[] = [];
  private static sessionId: string = crypto.randomUUID();
  private static userId: string | null = null;

  static initialize() {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        this.userId = user.id;
      }
    });

    // Set up global error handler
    window.addEventListener('error', (event) => {
      this.logError('Uncaught error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });

    // Set up unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });

    // Log initialization
    this.logInfo('ErrorLogger initialized', {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    });
  }

  static log(level: ErrorLog['level'], message: string, context?: any) {
    const log: ErrorLog = {
      timestamp: new Date(),
      level,
      message,
      context,
      userId: this.userId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // If it's an error, capture stack trace
    if (level === 'error' || level === 'critical') {
      const error = new Error();
      log.stack = error.stack;
    }

    // Store locally
    this.logs.push(log);

    // Console output with styling
    const styles = {
      info: 'color: #3B82F6',
      warn: 'color: #F59E0B',
      error: 'color: #EF4444',
      critical: 'color: #DC2626; font-weight: bold'
    };

    console.log(
      `%c[${level.toUpperCase()}] ${message}`,
      styles[level],
      context || ''
    );

    // Send to Supabase for critical errors
    if (level === 'error' || level === 'critical') {
      this.sendToSupabase(log);
    }

    // Keep only last 100 logs in memory
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  static logInfo(message: string, context?: any) {
    this.log('info', message, context);
  }

  static logWarn(message: string, context?: any) {
    this.log('warn', message, context);
  }

  static logError(message: string, context?: any) {
    this.log('error', message, context);
  }

  static logCritical(message: string, context?: any) {
    this.log('critical', message, context);
  }

  static async sendToSupabase(log: ErrorLog) {
    try {
      // Create error_logs table if it doesn't exist
      const { error } = await supabase
        .from('error_logs')
        .insert({
          user_id: log.userId,
          session_id: log.sessionId,
          level: log.level,
          message: log.message,
          context: log.context,
          stack: log.stack,
          user_agent: log.userAgent,
          url: log.url,
          created_at: log.timestamp.toISOString()
        });

      if (error) {
        console.error('Failed to send error log to Supabase:', error);
      }
    } catch (e) {
      console.error('Error logging to Supabase:', e);
    }
  }

  static getLogs(level?: ErrorLog['level']) {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return this.logs;
  }

  static clearLogs() {
    this.logs = [];
  }

  static downloadLogs() {
    const logsData = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([logsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${this.sessionId}-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Track API errors specifically
  static logAPIError(endpoint: string, error: any, request?: any) {
    this.logError(`API Error: ${endpoint}`, {
      endpoint,
      error: error.message || error,
      status: error.status,
      request,
      response: error.response
    });
  }

  // Track agent errors
  static logAgentError(agentId: string, action: string, error: any, context?: any) {
    this.logError(`Agent Error: ${agentId}`, {
      agentId,
      action,
      error: error.message || error,
      stack: error.stack,
      context
    });
  }

  // Performance logging
  static logPerformance(operation: string, duration: number, metadata?: any) {
    const level = duration > 5000 ? 'warn' : 'info';
    this.log(level, `Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      metadata
    });
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  ErrorLogger.initialize();
}

// Export to window for debugging
if (import.meta.env.DEV) {
  (window as any).ErrorLogger = ErrorLogger;
}