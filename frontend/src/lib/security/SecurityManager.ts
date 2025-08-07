/**
 * Comprehensive Security Manager for Clixen MVP
 * Handles authentication, authorization, input sanitization, and security monitoring
 */

import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';

// Security event types for monitoring
export type SecurityEventType = 
  | 'auth_success' 
  | 'auth_failure' 
  | 'auth_brute_force' 
  | 'invalid_token' 
  | 'permission_denied' 
  | 'suspicious_activity'
  | 'xss_attempt'
  | 'injection_attempt';

export interface SecurityEvent {
  event_type: SecurityEventType;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number; // in minutes
  passwordMinLength: number;
  passwordRequireComplexity: boolean;
  sessionTimeout: number; // in minutes
  enableSecurityLogging: boolean;
}

class SecurityManager {
  private static instance: SecurityManager;
  private config: SecurityConfig;
  private loginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private securityEvents: SecurityEvent[] = [];

  private constructor() {
    this.config = {
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      passwordMinLength: 8,
      passwordRequireComplexity: true,
      sessionTimeout: 60,
      enableSecurityLogging: true
    };
  }

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Enhanced password validation with security requirements
   */
  public validatePassword(password: string): { 
    isValid: boolean; 
    errors: string[]; 
    strength: 'weak' | 'medium' | 'strong' | 'very_strong' 
  } {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < this.config.passwordMinLength) {
      errors.push(`Password must be at least ${this.config.passwordMinLength} characters long`);
    } else if (password.length >= 8) score++;

    if (this.config.passwordRequireComplexity) {
      // Uppercase check
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      } else score++;

      // Lowercase check
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      } else score++;

      // Number check
      if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
      } else score++;

      // Special character check
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
      } else score++;
    }

    // Common password patterns
    const commonPatterns = [
      /^password/i,
      /^123456/,
      /^qwerty/i,
      /^abc123/i,
      /^letmein/i,
      /^welcome/i,
      /^admin/i
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      errors.push('Password is too common and easily guessable');
      score = Math.max(0, score - 2);
    }

    // Sequential characters check
    if (/123456|abcdef|qwerty/i.test(password)) {
      errors.push('Password should not contain sequential characters');
      score = Math.max(0, score - 1);
    }

    // Repeated characters check
    if (/(.)\1{3,}/.test(password)) {
      errors.push('Password should not contain repeated characters');
      score = Math.max(0, score - 1);
    }

    let strength: 'weak' | 'medium' | 'strong' | 'very_strong';
    if (score <= 1) strength = 'weak';
    else if (score <= 2) strength = 'medium';
    else if (score <= 4) strength = 'strong';
    else strength = 'very_strong';

    return {
      isValid: errors.length === 0,
      errors,
      strength
    };
  }

  /**
   * Check if user is locked out due to failed login attempts
   */
  public checkLoginLockout(identifier: string): { isLocked: boolean; timeRemaining?: number } {
    const attempts = this.loginAttempts.get(identifier);
    
    if (!attempts || attempts.count < this.config.maxLoginAttempts) {
      return { isLocked: false };
    }

    const lockoutExpiry = new Date(attempts.lastAttempt.getTime() + this.config.lockoutDuration * 60 * 1000);
    const now = new Date();

    if (now < lockoutExpiry) {
      const timeRemaining = Math.ceil((lockoutExpiry.getTime() - now.getTime()) / 1000 / 60);
      return { isLocked: true, timeRemaining };
    }

    // Lockout expired, reset attempts
    this.loginAttempts.delete(identifier);
    return { isLocked: false };
  }

  /**
   * Record login attempt (success or failure)
   */
  public recordLoginAttempt(identifier: string, success: boolean, user?: User): void {
    if (success) {
      // Clear attempts on successful login
      this.loginAttempts.delete(identifier);
      this.logSecurityEvent('auth_success', {
        user_id: user?.id,
        email: user?.email
      }, 'low');
    } else {
      // Increment failed attempts
      const current = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: new Date() };
      current.count++;
      current.lastAttempt = new Date();
      this.loginAttempts.set(identifier, current);

      const severity = current.count >= this.config.maxLoginAttempts ? 'high' : 'medium';
      this.logSecurityEvent(
        current.count >= this.config.maxLoginAttempts ? 'auth_brute_force' : 'auth_failure',
        { identifier, attempt_count: current.count },
        severity
      );
    }
  }

  /**
   * Comprehensive input sanitization to prevent XSS and injection attacks
   */
  public sanitizeInput(input: string, options: {
    allowHTML?: boolean;
    maxLength?: number;
    preventScripts?: boolean;
  } = {}): string {
    if (typeof input !== 'string') return '';

    const { allowHTML = false, maxLength = 10000, preventScripts = true } = options;

    let sanitized = input;

    // Trim whitespace
    sanitized = sanitized.trim();

    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    if (!allowHTML) {
      // Remove all HTML tags
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    if (preventScripts) {
      // Remove javascript: protocols
      sanitized = sanitized.replace(/javascript:/gi, '');
      
      // Remove event handlers
      sanitized = sanitized.replace(/on\w+\s*=/gi, '');
      
      // Remove script tags and their content
      sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      
      // Remove data: URIs that could contain scripts
      sanitized = sanitized.replace(/data:(?!image\/)[^;]*;/gi, '');
    }

    // Detect potential XSS attempts
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /onclick=/i,
      /<iframe/i,
      /<embed/i,
      /<object/i
    ];

    if (xssPatterns.some(pattern => pattern.test(input))) {
      this.logSecurityEvent('xss_attempt', { 
        original_input: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
        sanitized_input: sanitized.substring(0, 100) + (sanitized.length > 100 ? '...' : '')
      }, 'high');
    }

    return sanitized;
  }

  /**
   * Validate and sanitize email addresses
   */
  public validateEmail(email: string): { 
    isValid: boolean; 
    email: string; 
    errors: string[] 
  } {
    const errors: string[] = [];
    let sanitizedEmail = this.sanitizeInput(email, { maxLength: 320 }).toLowerCase();

    // Basic email regex (more permissive than HTML5 spec but secure)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(sanitizedEmail)) {
      errors.push('Please enter a valid email address');
    }

    // Check for suspicious patterns
    if (sanitizedEmail.includes('..') || sanitizedEmail.startsWith('.') || sanitizedEmail.endsWith('.')) {
      errors.push('Email format is invalid');
    }

    // Prevent email enumeration by checking against disposable email domains
    const disposableDomains = [
      'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
      'throwaway.email', 'getnada.com', 'temp-mail.org'
    ];

    const domain = sanitizedEmail.split('@')[1];
    if (domain && disposableDomains.includes(domain)) {
      errors.push('Please use a permanent email address');
    }

    return {
      isValid: errors.length === 0,
      email: sanitizedEmail,
      errors
    };
  }

  /**
   * Check session validity and refresh if needed
   */
  public async validateSession(): Promise<{ 
    isValid: boolean; 
    user?: User; 
    error?: string 
  }> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        this.logSecurityEvent('invalid_token', { error: error.message }, 'medium');
        return { isValid: false, error: error.message };
      }

      if (!session) {
        return { isValid: false, error: 'No active session' };
      }

      // Check if session is expired
      const now = Date.now() / 1000;
      if (session.expires_at && session.expires_at < now) {
        this.logSecurityEvent('invalid_token', { reason: 'expired' }, 'low');
        return { isValid: false, error: 'Session expired' };
      }

      return { isValid: true, user: session.user };
    } catch (error) {
      this.logSecurityEvent('invalid_token', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'medium');
      return { isValid: false, error: 'Session validation failed' };
    }
  }

  /**
   * Log security events for monitoring and analysis
   */
  public logSecurityEvent(
    eventType: SecurityEventType, 
    details?: Record<string, any>,
    severity: SecurityEvent['severity'] = 'medium'
  ): void {
    if (!this.config.enableSecurityLogging) return;

    const event: SecurityEvent = {
      event_type: eventType,
      details,
      severity,
      timestamp: new Date(),
      user_agent: navigator.userAgent,
      // Note: IP address would be collected on server-side
    };

    this.securityEvents.push(event);

    // Keep only last 1000 events in memory
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    // Log critical events to console for immediate visibility
    if (severity === 'critical' || severity === 'high') {
      console.warn('🚨 Security Event:', eventType, details);
    }

    // In production, send to security monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendSecurityEventToService(event);
    }
  }

  /**
   * Send security events to monitoring service (placeholder for production implementation)
   */
  private async sendSecurityEventToService(event: SecurityEvent): Promise<void> {
    try {
      // In production, this would send to a security monitoring service like Sentry, LogRocket, etc.
      await supabase.functions.invoke('telemetry-api', {
        body: {
          event_type: 'security_event',
          event_category: 'security',
          event_data: {
            security_event_type: event.event_type,
            severity: event.severity,
            details: event.details,
            user_agent: event.user_agent,
            timestamp: event.timestamp.toISOString()
          }
        }
      });
    } catch (error) {
      console.warn('Failed to send security event to monitoring service:', error);
    }
  }

  /**
   * Get security configuration
   */
  public getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update security configuration
   */
  public updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get recent security events for analysis
   */
  public getSecurityEvents(limit: number = 100): SecurityEvent[] {
    return this.securityEvents.slice(-limit);
  }

  /**
   * Clear login attempts (for testing or admin purposes)
   */
  public clearLoginAttempts(identifier?: string): void {
    if (identifier) {
      this.loginAttempts.delete(identifier);
    } else {
      this.loginAttempts.clear();
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  public detectSuspiciousActivity(): {
    hasSuspiciousActivity: boolean;
    patterns: string[];
  } {
    const patterns: string[] = [];
    
    // Check for multiple failed login attempts from same IP
    const recentFailures = this.securityEvents
      .filter(event => 
        (event.event_type === 'auth_failure' || event.event_type === 'auth_brute_force') &&
        event.timestamp.getTime() > Date.now() - 30 * 60 * 1000 // Last 30 minutes
      );

    if (recentFailures.length > 10) {
      patterns.push('High frequency of authentication failures');
    }

    // Check for XSS attempts
    const xssAttempts = this.securityEvents
      .filter(event => 
        event.event_type === 'xss_attempt' &&
        event.timestamp.getTime() > Date.now() - 60 * 60 * 1000 // Last hour
      );

    if (xssAttempts.length > 3) {
      patterns.push('Multiple XSS injection attempts');
    }

    // Check for permission denied events
    const permissionDenied = this.securityEvents
      .filter(event => 
        event.event_type === 'permission_denied' &&
        event.timestamp.getTime() > Date.now() - 30 * 60 * 1000 // Last 30 minutes
      );

    if (permissionDenied.length > 5) {
      patterns.push('Multiple unauthorized access attempts');
    }

    return {
      hasSuspiciousActivity: patterns.length > 0,
      patterns
    };
  }

  /**
   * Generate security report
   */
  public generateSecurityReport(): {
    totalEvents: number;
    eventsByType: Record<SecurityEventType, number>;
    eventsBySeverity: Record<SecurityEvent['severity'], number>;
    suspiciousActivity: ReturnType<SecurityManager['detectSuspiciousActivity']>;
    activeLoginAttempts: number;
  } {
    const eventsByType = this.securityEvents.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<SecurityEventType, number>);

    const eventsBySeverity = this.securityEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<SecurityEvent['severity'], number>);

    return {
      totalEvents: this.securityEvents.length,
      eventsByType,
      eventsBySeverity,
      suspiciousActivity: this.detectSuspiciousActivity(),
      activeLoginAttempts: this.loginAttempts.size
    };
  }
}

// Export singleton instance
export const securityManager = SecurityManager.getInstance();

// Export types for use in other components
export default securityManager;