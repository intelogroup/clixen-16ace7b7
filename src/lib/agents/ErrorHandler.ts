// Enhanced error handling system for multi-agent coordination
import { AgentMessage } from './types';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  AGENT = 'agent',
  WORKFLOW = 'workflow',
  DEPLOYMENT = 'deployment',
  CONFIGURATION = 'configuration',
  AUTHENTICATION = 'authentication'
}

export interface AgentError {
  id: string;
  timestamp: number;
  agentId: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  details?: any;
  stack?: string;
  recoverable: boolean;
  retryCount: number;
  maxRetries: number;
  resolution?: string;
  userMessage?: string;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Map<ErrorCategory, number>;
  errorsBySeverity: Map<ErrorSeverity, number>;
  errorsByAgent: Map<string, number>;
  errorRate: number; // errors per minute
  lastError?: AgentError;
}

export class ErrorHandler {
  private errors: Map<string, AgentError> = new Map();
  private errorCallbacks: Set<(error: AgentError) => void> = new Set();
  private retryStrategies: Map<ErrorCategory, RetryStrategy> = new Map();
  private metrics: ErrorMetrics;
  private errorWindow: AgentError[] = []; // Last 100 errors for analysis
  private readonly MAX_ERROR_WINDOW = 100;

  constructor() {
    this.metrics = {
      totalErrors: 0,
      errorsByCategory: new Map(),
      errorsBySeverity: new Map(),
      errorsByAgent: new Map(),
      errorRate: 0
    };

    this.initializeRetryStrategies();
    this.startMetricsCollection();
  }

  private initializeRetryStrategies(): void {
    // Define retry strategies for different error categories
    this.retryStrategies.set(ErrorCategory.NETWORK, {
      maxRetries: 3,
      backoffMs: 1000,
      backoffMultiplier: 2,
      shouldRetry: (error) => error.severity !== ErrorSeverity.CRITICAL
    });

    this.retryStrategies.set(ErrorCategory.API, {
      maxRetries: 2,
      backoffMs: 2000,
      backoffMultiplier: 1.5,
      shouldRetry: (error) => !error.message.includes('401') && !error.message.includes('403')
    });

    this.retryStrategies.set(ErrorCategory.AGENT, {
      maxRetries: 1,
      backoffMs: 500,
      backoffMultiplier: 1,
      shouldRetry: (error) => error.recoverable
    });

    this.retryStrategies.set(ErrorCategory.DEPLOYMENT, {
      maxRetries: 2,
      backoffMs: 3000,
      backoffMultiplier: 1,
      shouldRetry: (error) => error.severity === ErrorSeverity.LOW || error.severity === ErrorSeverity.MEDIUM
    });
  }

  private startMetricsCollection(): void {
    // Calculate error rate every minute
    setInterval(() => {
      const oneMinuteAgo = Date.now() - 60000;
      const recentErrors = this.errorWindow.filter(e => e.timestamp > oneMinuteAgo);
      this.metrics.errorRate = recentErrors.length;
    }, 60000);
  }

  public handleError(
    agentId: string,
    error: Error | any,
    category: ErrorCategory = ErrorCategory.AGENT,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): AgentError {
    const agentError: AgentError = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      agentId,
      category,
      severity,
      message: error.message || String(error),
      details: error.details || {},
      stack: error.stack,
      recoverable: this.isRecoverable(error, category, severity),
      retryCount: 0,
      maxRetries: this.getMaxRetries(category),
      userMessage: this.generateUserMessage(error, category, severity)
    };

    // Add resolution suggestions
    agentError.resolution = this.suggestResolution(agentError);

    // Store error
    this.errors.set(agentError.id, agentError);
    this.updateMetrics(agentError);
    this.addToWindow(agentError);

    // Notify callbacks
    this.errorCallbacks.forEach(callback => callback(agentError));

    // Log based on severity
    this.logError(agentError);

    return agentError;
  }

  private isRecoverable(error: any, category: ErrorCategory, severity: ErrorSeverity): boolean {
    // Critical errors are never recoverable
    if (severity === ErrorSeverity.CRITICAL) return false;

    // Check specific error patterns
    if (error.message) {
      const message = error.message.toLowerCase();
      
      // Non-recoverable patterns
      if (message.includes('invalid api key')) return false;
      if (message.includes('permission denied')) return false;
      if (message.includes('rate limit exceeded')) return false;
      if (message.includes('quota exceeded')) return false;
      
      // Recoverable patterns
      if (message.includes('timeout')) return true;
      if (message.includes('network')) return true;
      if (message.includes('temporary')) return true;
      if (message.includes('retry')) return true;
    }

    // Category-based defaults
    switch (category) {
      case ErrorCategory.NETWORK:
        return true;
      case ErrorCategory.AUTHENTICATION:
        return false;
      case ErrorCategory.CONFIGURATION:
        return false;
      default:
        return severity === ErrorSeverity.LOW || severity === ErrorSeverity.MEDIUM;
    }
  }

  private getMaxRetries(category: ErrorCategory): number {
    const strategy = this.retryStrategies.get(category);
    return strategy?.maxRetries || 0;
  }

  private generateUserMessage(error: any, category: ErrorCategory, severity: ErrorSeverity): string {
    // Generate user-friendly error messages
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'We\'re having trouble connecting. Please check your internet connection.';
      case ErrorCategory.API:
        return 'There was an issue with the service. Please try again in a moment.';
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication failed. Please log in again.';
      case ErrorCategory.VALIDATION:
        return 'The provided information is invalid. Please check and try again.';
      case ErrorCategory.WORKFLOW:
        return 'There was an issue creating the workflow. Our agents are working on it.';
      case ErrorCategory.DEPLOYMENT:
        return 'Deployment encountered an issue. Rolling back to previous state.';
      case ErrorCategory.CONFIGURATION:
        return 'Configuration error detected. Please check your settings.';
      default:
        return severity === ErrorSeverity.CRITICAL 
          ? 'A critical error occurred. Please contact support.'
          : 'Something went wrong. Please try again.';
    }
  }

  private suggestResolution(error: AgentError): string {
    const suggestions: string[] = [];

    // Category-based suggestions
    switch (error.category) {
      case ErrorCategory.NETWORK:
        suggestions.push('Check internet connectivity');
        suggestions.push('Verify firewall settings');
        suggestions.push('Try again in a few moments');
        break;
      case ErrorCategory.API:
        if (error.message.includes('rate limit')) {
          suggestions.push('Wait before retrying');
          suggestions.push('Reduce request frequency');
        } else {
          suggestions.push('Verify API credentials');
          suggestions.push('Check API service status');
        }
        break;
      case ErrorCategory.AUTHENTICATION:
        suggestions.push('Re-authenticate');
        suggestions.push('Check credentials');
        suggestions.push('Verify permissions');
        break;
      case ErrorCategory.VALIDATION:
        suggestions.push('Review input data');
        suggestions.push('Check required fields');
        suggestions.push('Verify data formats');
        break;
      case ErrorCategory.WORKFLOW:
        suggestions.push('Simplify workflow requirements');
        suggestions.push('Check node compatibility');
        suggestions.push('Verify workflow logic');
        break;
      case ErrorCategory.DEPLOYMENT:
        suggestions.push('Check deployment configuration');
        suggestions.push('Verify environment variables');
        suggestions.push('Review deployment logs');
        break;
    }

    // Severity-based additions
    if (error.severity === ErrorSeverity.CRITICAL) {
      suggestions.push('Contact support immediately');
    }

    return suggestions.join('; ');
  }

  private updateMetrics(error: AgentError): void {
    this.metrics.totalErrors++;
    this.metrics.lastError = error;

    // Update category counts
    const categoryCount = this.metrics.errorsByCategory.get(error.category) || 0;
    this.metrics.errorsByCategory.set(error.category, categoryCount + 1);

    // Update severity counts
    const severityCount = this.metrics.errorsBySeverity.get(error.severity) || 0;
    this.metrics.errorsBySeverity.set(error.severity, severityCount + 1);

    // Update agent counts
    const agentCount = this.metrics.errorsByAgent.get(error.agentId) || 0;
    this.metrics.errorsByAgent.set(error.agentId, agentCount + 1);
  }

  private addToWindow(error: AgentError): void {
    this.errorWindow.push(error);
    if (this.errorWindow.length > this.MAX_ERROR_WINDOW) {
      this.errorWindow.shift();
    }
  }

  private logError(error: AgentError): void {
    const logMessage = `[${error.severity.toUpperCase()}] ${error.agentId}: ${error.message}`;
    
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error(logMessage, error);
        break;
      case ErrorSeverity.HIGH:
        console.error(logMessage);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(logMessage);
        break;
      case ErrorSeverity.LOW:
        console.log(logMessage);
        break;
    }
  }

  public async retry<T>(
    operation: () => Promise<T>,
    error: AgentError
  ): Promise<T> {
    const strategy = this.retryStrategies.get(error.category);
    
    if (!strategy || !strategy.shouldRetry(error) || error.retryCount >= error.maxRetries) {
      throw new Error(`Cannot retry: ${error.message}`);
    }

    error.retryCount++;
    const backoffTime = strategy.backoffMs * Math.pow(strategy.backoffMultiplier, error.retryCount - 1);
    
    console.log(`Retrying operation (attempt ${error.retryCount}/${error.maxRetries}) after ${backoffTime}ms`);
    
    await new Promise(resolve => setTimeout(resolve, backoffTime));
    
    try {
      const result = await operation();
      // Success - reset retry count
      error.retryCount = 0;
      return result;
    } catch (retryError) {
      if (error.retryCount >= error.maxRetries) {
        error.recoverable = false;
        throw retryError;
      }
      // Recursive retry
      return this.retry(operation, error);
    }
  }

  public getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  public getRecentErrors(count: number = 10): AgentError[] {
    return this.errorWindow.slice(-count);
  }

  public clearError(errorId: string): void {
    this.errors.delete(errorId);
  }

  public clearAllErrors(): void {
    this.errors.clear();
    this.errorWindow = [];
  }

  public onError(callback: (error: AgentError) => void): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  public analyzeErrorPatterns(): ErrorAnalysis {
    const patterns: ErrorPattern[] = [];
    
    // Analyze error frequency by category
    const categoryFrequency = new Map<ErrorCategory, number>();
    this.errorWindow.forEach(error => {
      const count = categoryFrequency.get(error.category) || 0;
      categoryFrequency.set(error.category, count + 1);
    });

    // Find most common errors
    const errorMessages = new Map<string, number>();
    this.errorWindow.forEach(error => {
      const count = errorMessages.get(error.message) || 0;
      errorMessages.set(error.message, count + 1);
    });

    // Identify error spikes
    const timeWindows = this.analyzeTimeWindows();
    
    return {
      patterns,
      categoryFrequency,
      commonErrors: Array.from(errorMessages.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      errorSpikes: timeWindows.spikes,
      recommendations: this.generateRecommendations(categoryFrequency, errorMessages)
    };
  }

  private analyzeTimeWindows(): { spikes: TimeSpike[] } {
    const spikes: TimeSpike[] = [];
    const windowSize = 60000; // 1 minute windows
    const threshold = 5; // More than 5 errors per minute is a spike

    const windows = new Map<number, number>();
    this.errorWindow.forEach(error => {
      const window = Math.floor(error.timestamp / windowSize);
      const count = windows.get(window) || 0;
      windows.set(window, count + 1);
    });

    windows.forEach((count, window) => {
      if (count > threshold) {
        spikes.push({
          timestamp: window * windowSize,
          errorCount: count,
          duration: windowSize
        });
      }
    });

    return { spikes };
  }

  private generateRecommendations(
    categoryFrequency: Map<ErrorCategory, number>,
    errorMessages: Map<string, number>
  ): string[] {
    const recommendations: string[] = [];

    // Check for high network errors
    const networkErrors = categoryFrequency.get(ErrorCategory.NETWORK) || 0;
    if (networkErrors > 5) {
      recommendations.push('High network error rate detected. Check connectivity and API endpoints.');
    }

    // Check for authentication issues
    const authErrors = categoryFrequency.get(ErrorCategory.AUTHENTICATION) || 0;
    if (authErrors > 0) {
      recommendations.push('Authentication errors detected. Verify API keys and credentials.');
    }

    // Check for repeated errors
    errorMessages.forEach((count, message) => {
      if (count > 3) {
        recommendations.push(`Repeated error: "${message}" (${count} times). Investigate root cause.`);
      }
    });

    return recommendations;
  }
}

// Type definitions for retry strategies and analysis
interface RetryStrategy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
  shouldRetry: (error: AgentError) => boolean;
}

interface ErrorPattern {
  pattern: string;
  frequency: number;
  affectedAgents: string[];
  timeRange: { start: number; end: number };
}

interface TimeSpike {
  timestamp: number;
  errorCount: number;
  duration: number;
}

interface ErrorAnalysis {
  patterns: ErrorPattern[];
  categoryFrequency: Map<ErrorCategory, number>;
  commonErrors: [string, number][];
  errorSpikes: TimeSpike[];
  recommendations: string[];
}

// Export singleton instance
export const errorHandler = new ErrorHandler();