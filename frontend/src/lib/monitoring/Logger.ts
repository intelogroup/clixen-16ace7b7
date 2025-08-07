/**
 * Comprehensive logging and monitoring system
 */

import { supabase } from '../supabase';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: any;
  userId?: string;
  sessionId: string;
  stack?: string;
  userAgent: string;
  url: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: Date;
  type: 'navigation' | 'resource' | 'measure' | 'custom';
  metadata?: Record<string, any>;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private sessionId: string;
  private userId: string | null = null;
  private isInitialized = false;
  private logBuffer: LogEntry[] = [];
  private flushInterval: number | null = null;
  private maxBufferSize = 50;

  private constructor() {
    this.sessionId = crypto.randomUUID();
    this.initialize();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private async initialize() {
    if (this.isInitialized) return;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.userId = user.id;
      }

      // Set up global error handlers
      this.setupGlobalErrorHandlers();

      // Set up performance monitoring
      this.setupPerformanceMonitoring();

      // Set up log flushing
      this.setupLogFlushing();

      // Log session start
      this.info('Session started', {
        sessionId: this.sessionId,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize logger:', error);
    }
  }

  private setupGlobalErrorHandlers() {
    // Catch unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.error('Uncaught error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });

    // Catch React errors (if using error boundaries)
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('React')) {
        this.error('React error', { args });
      }
      originalConsoleError.apply(console, args);
    };
  }

  private setupPerformanceMonitoring() {
    // Monitor navigation timing
    if ('performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          this.logPerformance({
            name: 'page_load',
            duration: navigation.loadEventEnd - navigation.fetchStart,
            timestamp: new Date(),
            type: 'navigation',
            metadata: {
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
              firstPaint: this.getFirstPaint(),
              firstContentfulPaint: this.getFirstContentfulPaint()
            }
          });
        }, 0);
      });

      // Monitor resource loading
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource' && entry.duration > 1000) {
            this.logPerformance({
              name: 'slow_resource',
              duration: entry.duration,
              timestamp: new Date(),
              type: 'resource',
              metadata: {
                name: entry.name,
                size: (entry as PerformanceResourceTiming).transferSize
              }
            });
          }
        });
      });

      observer.observe({ entryTypes: ['resource', 'measure'] });
    }
  }

  private getFirstPaint(): number | null {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : null;
  }

  private getFirstContentfulPaint(): number | null {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? fcp.startTime : null;
  }

  private setupLogFlushing() {
    // Flush logs periodically
    this.flushInterval = window.setInterval(() => {
      this.flushLogs();
    }, 30000); // Every 30 seconds

    // Flush logs before page unload
    window.addEventListener('beforeunload', () => {
      this.flushLogs(true);
    });

    // Flush logs when buffer is full
    this.checkBufferSize();
  }

  private checkBufferSize() {
    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flushLogs();
    }
  }

  private async flushLogs(isSync = false) {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      if (process.env.NODE_ENV === 'production') {
        // Send to logging service (e.g., Supabase, external API)
        await this.sendToLoggingService(logsToFlush);
      } else {
        // In development, just log to console
        console.group('📋 Flushing logs');
        logsToFlush.forEach(log => {
          const style = this.getLogStyle(log.level);
          console.log(`%c[${log.level.toUpperCase()}] ${log.message}`, style, log);
        });
        console.groupEnd();
      }
    } catch (error) {
      console.error('Failed to flush logs:', error);
      // Put logs back in buffer if flushing failed
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  private async sendToLoggingService(logs: LogEntry[]) {
    // Example implementation - replace with your logging service
    try {
      const { error } = await supabase
        .from('application_logs')
        .insert(logs.map(log => ({
          id: log.id,
          timestamp: log.timestamp.toISOString(),
          level: log.level,
          message: log.message,
          context: log.context,
          user_id: log.userId,
          session_id: log.sessionId,
          stack: log.stack,
          user_agent: log.userAgent,
          url: log.url,
          component: log.component,
          action: log.action,
          metadata: log.metadata
        })));

      if (error) {
        throw error;
      }
    } catch (error) {
      // Fallback to external logging service
      console.error('Failed to send logs to Supabase:', error);
    }
  }

  private getLogStyle(level: LogLevel): string {
    const styles = {
      debug: 'color: #6b7280',
      info: 'color: #3b82f6',
      warn: 'color: #f59e0b',
      error: 'color: #ef4444',
      critical: 'color: #dc2626; font-weight: bold'
    };
    return styles[level];
  }

  // Public logging methods
  public debug(message: string, context?: any, component?: string) {
    this.log('debug', message, context, component);
  }

  public info(message: string, context?: any, component?: string) {
    this.log('info', message, context, component);
  }

  public warn(message: string, context?: any, component?: string) {
    this.log('warn', message, context, component);
  }

  public error(message: string, context?: any, component?: string) {
    this.log('error', message, context, component);
  }

  public critical(message: string, context?: any, component?: string) {
    this.log('critical', message, context, component);
    // Immediately flush critical errors
    this.flushLogs();
  }

  private log(level: LogLevel, message: string, context?: any, component?: string) {
    const logEntry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level,
      message,
      context,
      userId: this.userId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      component,
      stack: level === 'error' || level === 'critical' ? new Error().stack : undefined
    };

    this.logs.push(logEntry);
    this.logBuffer.push(logEntry);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const style = this.getLogStyle(level);
      console.log(`%c[${level.toUpperCase()}] ${message}`, style, context);
    }

    this.checkBufferSize();
  }

  public logPerformance(metrics: PerformanceMetrics) {
    this.info('Performance metric', {
      type: 'performance',
      ...metrics
    }, 'PerformanceMonitor');
  }

  public logUserAction(action: string, context?: any, component?: string) {
    this.info('User action', {
      type: 'user_action',
      action,
      ...context
    }, component);
  }

  public logApiCall(endpoint: string, method: string, duration: number, status: number, context?: any) {
    const level = status >= 400 ? 'error' : 'info';
    this.log(level, `API call: ${method} ${endpoint}`, {
      type: 'api_call',
      endpoint,
      method,
      duration,
      status,
      ...context
    }, 'APIClient');
  }

  public logComponentMount(componentName: string, duration?: number) {
    this.debug(`Component mounted: ${componentName}`, {
      type: 'component_lifecycle',
      event: 'mount',
      duration
    }, componentName);
  }

  public logComponentUnmount(componentName: string) {
    this.debug(`Component unmounted: ${componentName}`, {
      type: 'component_lifecycle',
      event: 'unmount'
    }, componentName);
  }

  // Get logs for debugging
  public getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  // Clear logs
  public clearLogs() {
    this.logs = [];
    this.logBuffer = [];
  }

  // Cleanup
  public destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flushLogs();
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export for use in React components
export const useLogger = (componentName: string) => {
  return {
    debug: (message: string, context?: any) => logger.debug(message, context, componentName),
    info: (message: string, context?: any) => logger.info(message, context, componentName),
    warn: (message: string, context?: any) => logger.warn(message, context, componentName),
    error: (message: string, context?: any) => logger.error(message, context, componentName),
    critical: (message: string, context?: any) => logger.critical(message, context, componentName),
    logUserAction: (action: string, context?: any) => logger.logUserAction(action, context, componentName),
    logMount: (duration?: number) => logger.logComponentMount(componentName, duration),
    logUnmount: () => logger.logComponentUnmount(componentName)
  };
};

export default logger;