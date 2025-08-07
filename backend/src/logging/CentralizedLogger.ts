/**
 * Clixen Centralized Logging System
 * Production-ready logging with structured formats and multiple outputs
 */

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  service: string;
  message: string;
  context?: Record<string, any>;
  user_id?: string;
  session_id?: string;
  request_id?: string;
  environment: string;
  version?: string;
  stack_trace?: string;
  performance_metrics?: {
    duration_ms?: number;
    memory_usage?: number;
    cpu_usage?: number;
  };
}

export interface LogTransport {
  name: string;
  enabled: boolean;
  minLevel: string;
  write(entry: LogEntry): Promise<void>;
}

export class CentralizedLogger {
  private service: string;
  private environment: string;
  private version: string;
  private transports: LogTransport[] = [];
  private logQueue: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(service: string, environment = 'production', version = '1.0.0') {
    this.service = service;
    this.environment = environment;
    this.version = version;

    // Initialize default transports
    this.addTransport(new ConsoleTransport());
    this.addTransport(new SupabaseTransport());
    
    // Setup log flushing
    this.startLogFlushing();
    
    // Graceful shutdown handling
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  /**
   * Add a transport for log output
   */
  addTransport(transport: LogTransport) {
    this.transports.push(transport);
  }

  /**
   * Remove a transport
   */
  removeTransport(transportName: string) {
    this.transports = this.transports.filter(t => t.name !== transportName);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>, userId?: string) {
    this.log('debug', message, context, userId);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>, userId?: string) {
    this.log('info', message, context, userId);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>, userId?: string) {
    this.log('warn', message, context, userId);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: Record<string, any>, userId?: string) {
    const logContext = { ...context };
    
    if (error) {
      logContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    
    this.log('error', message, logContext, userId, error?.stack);
  }

  /**
   * Log fatal error message
   */
  fatal(message: string, error?: Error, context?: Record<string, any>, userId?: string) {
    const logContext = { ...context };
    
    if (error) {
      logContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    
    this.log('fatal', message, logContext, userId, error?.stack);
  }

  /**
   * Log performance metrics
   */
  performance(message: string, metrics: LogEntry['performance_metrics'], context?: Record<string, any>) {
    this.log('info', message, context, undefined, undefined, metrics);
  }

  /**
   * Log user action for analytics
   */
  userAction(action: string, userId: string, context?: Record<string, any>) {
    this.log('info', `User action: ${action}`, {
      ...context,
      action_type: 'user_action',
      action_name: action
    }, userId);
  }

  /**
   * Log API request/response
   */
  apiLog(method: string, endpoint: string, statusCode: number, duration: number, userId?: string, context?: Record<string, any>) {
    this.log('info', `API ${method} ${endpoint}`, {
      ...context,
      api: {
        method,
        endpoint,
        status_code: statusCode,
        duration_ms: duration
      }
    }, userId, undefined, { duration_ms: duration });
  }

  /**
   * Core logging method
   */
  private log(
    level: LogEntry['level'], 
    message: string, 
    context?: Record<string, any>,
    userId?: string,
    stackTrace?: string,
    performanceMetrics?: LogEntry['performance_metrics']
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      context,
      user_id: userId,
      session_id: this.generateSessionId(),
      request_id: this.generateRequestId(),
      environment: this.environment,
      version: this.version,
      stack_trace: stackTrace,
      performance_metrics: performanceMetrics
    };

    // Add to queue for batch processing
    this.logQueue.push(entry);
    
    // Immediate flush for errors and fatal logs
    if (level === 'error' || level === 'fatal') {
      this.flushLogs();
    }
  }

  /**
   * Generate session ID (simplified for demo)
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate request ID (simplified for demo)
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start periodic log flushing
   */
  private startLogFlushing() {
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, 5000); // Flush every 5 seconds
  }

  /**
   * Flush logs to all transports
   */
  private async flushLogs() {
    if (this.logQueue.length === 0 || this.isShuttingDown) return;

    const logsToFlush = [...this.logQueue];
    this.logQueue = [];

    for (const entry of logsToFlush) {
      for (const transport of this.transports) {
        if (!transport.enabled) continue;
        
        // Check minimum level
        if (!this.shouldLog(entry.level, transport.minLevel)) continue;

        try {
          await transport.write(entry);
        } catch (error) {
          // Fallback to console if transport fails
          console.error(`Log transport ${transport.name} failed:`, error);
          console.log(JSON.stringify(entry, null, 2));
        }
      }
    }
  }

  /**
   * Check if log level meets minimum threshold
   */
  private shouldLog(entryLevel: string, minLevel: string): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };
    return levels[entryLevel as keyof typeof levels] >= levels[minLevel as keyof typeof levels];
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Flush remaining logs
    await this.flushLogs();
    
    console.log('CentralizedLogger shutdown complete');
  }
}

/**
 * Console Transport - logs to console with colors
 */
export class ConsoleTransport implements LogTransport {
  name = 'console';
  enabled = true;
  minLevel = 'debug';

  private colors = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m',  // green
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
    fatal: '\x1b[35m', // magenta
    reset: '\x1b[0m'
  };

  async write(entry: LogEntry): Promise<void> {
    const color = this.colors[entry.level];
    const reset = this.colors.reset;
    
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const level = entry.level.toUpperCase().padEnd(5);
    const service = entry.service.padEnd(15);
    
    let output = `${color}[${timestamp}] ${level} ${service}${reset} ${entry.message}`;
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }
    
    if (entry.performance_metrics) {
      output += `\n  Performance: ${JSON.stringify(entry.performance_metrics)}`;
    }
    
    if (entry.stack_trace && (entry.level === 'error' || entry.level === 'fatal')) {
      output += `\n  Stack: ${entry.stack_trace}`;
    }
    
    console.log(output);
  }
}

/**
 * Supabase Transport - logs to Supabase database
 */
export class SupabaseTransport implements LogTransport {
  name = 'supabase';
  enabled = true;
  minLevel = 'info';
  
  private supabaseUrl: string;
  private supabaseKey: string;
  private logBuffer: LogEntry[] = [];
  private bufferSize = 50; // Batch size

  constructor() {
    this.supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    this.enabled = !!(this.supabaseUrl && this.supabaseKey);
  }

  async write(entry: LogEntry): Promise<void> {
    if (!this.enabled) return;

    this.logBuffer.push(entry);
    
    // Batch write when buffer is full or for high-priority logs
    if (this.logBuffer.length >= this.bufferSize || entry.level === 'error' || entry.level === 'fatal') {
      await this.flushBuffer();
    }
  }

  private async flushBuffer() {
    if (this.logBuffer.length === 0) return;

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/application_logs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(logsToSend.map(entry => ({
          timestamp: entry.timestamp,
          level: entry.level,
          service: entry.service,
          message: entry.message,
          context: entry.context || {},
          user_id: entry.user_id,
          session_id: entry.session_id,
          request_id: entry.request_id,
          environment: entry.environment,
          version: entry.version,
          stack_trace: entry.stack_trace,
          performance_metrics: entry.performance_metrics || {}
        })))
      });

      if (!response.ok) {
        throw new Error(`Supabase logging failed: ${response.status}`);
      }
    } catch (error) {
      // Re-add logs to buffer on failure (with limit to prevent memory leak)
      if (this.logBuffer.length < 200) {
        this.logBuffer.unshift(...logsToSend);
      }
      throw error;
    }
  }
}

/**
 * File Transport - logs to local file system
 */
export class FileTransport implements LogTransport {
  name = 'file';
  enabled = true;
  minLevel = 'info';
  
  private filePath: string;
  private maxFileSize = 10 * 1024 * 1024; // 10MB
  private maxFiles = 5;

  constructor(filePath = './logs/clixen.log') {
    this.filePath = filePath;
  }

  async write(entry: LogEntry): Promise<void> {
    // Implementation would write to file with rotation
    // Simplified for demo
    const logLine = `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.service}: ${entry.message}\n`;
    
    // In real implementation, use fs.appendFile with rotation logic
    console.log(`FILE LOG: ${logLine.trim()}`);
  }
}

/**
 * External Service Transport (Axiom, LogRocket, etc.)
 */
export class ExternalServiceTransport implements LogTransport {
  name = 'external';
  enabled = false;
  minLevel = 'warn';
  
  private apiKey: string;
  private endpoint: string;

  constructor(apiKey?: string, endpoint?: string) {
    this.apiKey = apiKey || process.env.AXIOM_TOKEN || '';
    this.endpoint = endpoint || process.env.AXIOM_ENDPOINT || '';
    this.enabled = !!(this.apiKey && this.endpoint);
  }

  async write(entry: LogEntry): Promise<void> {
    if (!this.enabled) return;

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([entry])
      });
    } catch (error) {
      throw new Error(`External service logging failed: ${error.message}`);
    }
  }
}

// Create global logger instances for different services
export const apiLogger = new CentralizedLogger('api', process.env.NODE_ENV || 'production');
export const frontendLogger = new CentralizedLogger('frontend', process.env.NODE_ENV || 'production');
export const workflowLogger = new CentralizedLogger('workflow', process.env.NODE_ENV || 'production');
export const monitoringLogger = new CentralizedLogger('monitoring', process.env.NODE_ENV || 'production');

// Export default logger
export default new CentralizedLogger('clixen', process.env.NODE_ENV || 'production');