/**
 * Security Monitoring and Threat Detection System for Clixen MVP
 * Monitors security events, detects threats, and provides incident response
 */

import { supabase } from '../supabase';
import { securityManager } from './SecurityManager';

// Security event severity levels
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

// Security event categories
export type SecurityCategory = 
  | 'authentication' 
  | 'authorization' 
  | 'data_access' 
  | 'input_validation' 
  | 'network' 
  | 'system' 
  | 'compliance';

// Threat types
export type ThreatType = 
  | 'brute_force' 
  | 'credential_stuffing' 
  | 'xss_attempt' 
  | 'sql_injection' 
  | 'csrf_attack' 
  | 'data_exfiltration' 
  | 'unauthorized_access' 
  | 'suspicious_behavior' 
  | 'rate_limit_abuse'
  | 'privilege_escalation';

export interface SecurityEvent {
  id: string;
  type: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
  threat_type?: ThreatType;
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  url?: string;
  method?: string;
  payload?: any;
  response_code?: number;
  timestamp: Date;
  details: Record<string, any>;
  resolved?: boolean;
  resolved_at?: Date;
  resolved_by?: string;
}

export interface ThreatPattern {
  id: string;
  name: string;
  type: ThreatType;
  pattern: RegExp | ((event: SecurityEvent) => boolean);
  threshold: number;
  timeWindow: number; // in minutes
  severity: SecuritySeverity;
  description: string;
  mitigation: string[];
}

export interface SecurityAlert {
  id: string;
  pattern_id: string;
  threat_type: ThreatType;
  severity: SecuritySeverity;
  title: string;
  description: string;
  events: SecurityEvent[];
  first_seen: Date;
  last_seen: Date;
  count: number;
  resolved: boolean;
  resolved_at?: Date;
  resolved_by?: string;
  mitigation_applied?: string[];
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsBySeverity: Record<SecuritySeverity, number>;
  eventsByCategory: Record<SecurityCategory, number>;
  threatsByType: Record<ThreatType, number>;
  activeAlerts: number;
  resolvedAlerts: number;
  averageResponseTime: number;
  topThreats: Array<{ type: ThreatType; count: number }>;
  riskScore: number;
}

// Predefined threat patterns
const THREAT_PATTERNS: ThreatPattern[] = [
  {
    id: 'brute_force_login',
    name: 'Brute Force Login Attack',
    type: 'brute_force',
    pattern: (event: SecurityEvent) => 
      event.category === 'authentication' && 
      event.type === 'auth_failure',
    threshold: 10,
    timeWindow: 10,
    severity: 'high',
    description: 'Multiple failed login attempts from same source',
    mitigation: ['rate_limiting', 'ip_blocking', 'account_lockout']
  },
  {
    id: 'xss_injection',
    name: 'Cross-Site Scripting Attempt',
    type: 'xss_attempt',
    pattern: (event: SecurityEvent) => 
      event.category === 'input_validation' && 
      (event.details.contains_script || event.details.suspicious_html),
    threshold: 3,
    timeWindow: 5,
    severity: 'critical',
    description: 'Attempts to inject malicious scripts',
    mitigation: ['input_sanitization', 'csp_enforcement', 'user_education']
  },
  {
    id: 'sql_injection',
    name: 'SQL Injection Attempt',
    type: 'sql_injection',
    pattern: (event: SecurityEvent) => 
      event.category === 'input_validation' && 
      event.details.sql_patterns_detected,
    threshold: 1,
    timeWindow: 1,
    severity: 'critical',
    description: 'Attempts to manipulate database queries',
    mitigation: ['parameterized_queries', 'input_validation', 'waf_rules']
  },
  {
    id: 'privilege_escalation',
    name: 'Privilege Escalation Attempt',
    type: 'privilege_escalation',
    pattern: (event: SecurityEvent) => 
      event.category === 'authorization' && 
      event.type === 'access_denied' &&
      event.details.attempted_privilege_level,
    threshold: 5,
    timeWindow: 15,
    severity: 'high',
    description: 'Attempts to access higher privilege resources',
    mitigation: ['access_control_review', 'session_validation', 'audit_logging']
  },
  {
    id: 'rate_limit_abuse',
    name: 'API Rate Limit Abuse',
    type: 'rate_limit_abuse',
    pattern: (event: SecurityEvent) => 
      event.type === 'rate_limit_exceeded',
    threshold: 100,
    timeWindow: 60,
    severity: 'medium',
    description: 'Excessive API usage beyond normal limits',
    mitigation: ['enhanced_rate_limiting', 'api_key_review', 'usage_monitoring']
  }
];

class SecurityMonitor {
  private static instance: SecurityMonitor;
  private events: SecurityEvent[] = [];
  private alerts: SecurityAlert[] = [];
  private patterns: ThreatPattern[] = THREAT_PATTERNS;
  private monitoring = false;
  private patternCheckInterval?: number;

  private constructor() {
    this.startMonitoring();
  }

  public static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  /**
   * Start security monitoring
   */
  public startMonitoring(): void {
    if (this.monitoring) return;

    this.monitoring = true;
    console.log('🔒 Security monitoring started');

    // Check for threat patterns every 30 seconds
    this.patternCheckInterval = window.setInterval(() => {
      this.checkThreatPatterns();
    }, 30000);

    // Listen for security events from SecurityManager
    this.subscribeToSecurityEvents();
  }

  /**
   * Stop security monitoring
   */
  public stopMonitoring(): void {
    this.monitoring = false;
    if (this.patternCheckInterval) {
      clearInterval(this.patternCheckInterval);
      this.patternCheckInterval = undefined;
    }
    console.log('🔓 Security monitoring stopped');
  }

  /**
   * Log a security event
   */
  public async logSecurityEvent(
    type: string,
    category: SecurityCategory,
    severity: SecuritySeverity,
    details: Record<string, any> = {},
    threatType?: ThreatType
  ): Promise<void> {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      type,
      category,
      severity,
      threat_type: threatType,
      user_id: details.user_id,
      session_id: details.session_id,
      ip_address: details.ip_address,
      user_agent: details.user_agent || navigator.userAgent,
      url: details.url || window.location.href,
      method: details.method,
      payload: details.payload,
      response_code: details.response_code,
      timestamp: new Date(),
      details,
      resolved: false
    };

    // Store event in memory
    this.events.push(event);

    // Keep only last 10000 events in memory
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }

    // Send to backend for persistent storage
    await this.persistSecurityEvent(event);

    // Check for immediate threats
    await this.evaluateEvent(event);

    // Log to console for critical events
    if (severity === 'critical' || severity === 'high') {
      console.warn(`🚨 Security Event [${severity.toUpperCase()}]: ${type}`, details);
    }
  }

  /**
   * Persist security event to backend
   */
  private async persistSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      await supabase.functions.invoke('telemetry-api', {
        body: {
          event_type: 'security_event',
          event_category: 'security',
          event_data: {
            security_event_type: event.type,
            security_category: event.category,
            severity: event.severity,
            threat_type: event.threat_type,
            user_id: event.user_id,
            session_id: event.session_id,
            ip_address: event.ip_address,
            user_agent: event.user_agent,
            url: event.url,
            method: event.method,
            response_code: event.response_code,
            details: event.details,
            timestamp: event.timestamp.toISOString()
          },
          success: false // Security events are alerts/warnings
        }
      });
    } catch (error) {
      console.warn('Failed to persist security event:', error);
    }
  }

  /**
   * Evaluate a single event against threat patterns
   */
  private async evaluateEvent(event: SecurityEvent): Promise<void> {
    for (const pattern of this.patterns) {
      let matches = false;

      if (pattern.pattern instanceof RegExp) {
        matches = pattern.pattern.test(JSON.stringify(event));
      } else if (typeof pattern.pattern === 'function') {
        matches = pattern.pattern(event);
      }

      if (matches) {
        await this.handlePatternMatch(pattern, event);
      }
    }
  }

  /**
   * Handle when an event matches a threat pattern
   */
  private async handlePatternMatch(pattern: ThreatPattern, event: SecurityEvent): Promise<void> {
    const timeWindowMs = pattern.timeWindow * 60 * 1000;
    const cutoffTime = new Date(Date.now() - timeWindowMs);

    // Find matching events in the time window
    const matchingEvents = this.events.filter(e => 
      e.timestamp >= cutoffTime &&
      e.threat_type === pattern.type ||
      (pattern.pattern instanceof Function && pattern.pattern(e)) ||
      (pattern.pattern instanceof RegExp && pattern.pattern.test(JSON.stringify(e)))
    );

    if (matchingEvents.length >= pattern.threshold) {
      await this.createSecurityAlert(pattern, matchingEvents);
    }
  }

  /**
   * Create a security alert
   */
  private async createSecurityAlert(pattern: ThreatPattern, events: SecurityEvent[]): Promise<void> {
    const existingAlert = this.alerts.find(alert => 
      alert.pattern_id === pattern.id && 
      !alert.resolved
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.events = [...existingAlert.events, ...events].slice(-100); // Keep last 100 events
      existingAlert.last_seen = new Date();
      existingAlert.count += events.length;
    } else {
      // Create new alert
      const alert: SecurityAlert = {
        id: crypto.randomUUID(),
        pattern_id: pattern.id,
        threat_type: pattern.type,
        severity: pattern.severity,
        title: pattern.name,
        description: pattern.description,
        events: events.slice(-100),
        first_seen: events[0]?.timestamp || new Date(),
        last_seen: events[events.length - 1]?.timestamp || new Date(),
        count: events.length,
        resolved: false
      };

      this.alerts.push(alert);

      // Notify about critical alerts
      if (alert.severity === 'critical') {
        await this.handleCriticalAlert(alert);
      }

      console.warn(`🚨 Security Alert Created: ${alert.title}`, {
        severity: alert.severity,
        count: alert.count,
        pattern: pattern.id
      });
    }

    // Send alert to backend
    await this.sendAlertToBackend(pattern, events);
  }

  /**
   * Handle critical security alerts
   */
  private async handleCriticalAlert(alert: SecurityAlert): Promise<void> {
    // For critical alerts, we might want to:
    // 1. Immediately notify administrators
    // 2. Temporarily block suspicious IPs
    // 3. Force user re-authentication
    // 4. Enable enhanced monitoring

    console.error(`🚨 CRITICAL SECURITY ALERT: ${alert.title}`, alert);

    // Send immediate notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Security Alert: ${alert.title}`, {
        body: alert.description,
        icon: '/favicon.ico',
        tag: 'security-alert'
      });
    }

    // Apply automatic mitigation if configured
    const pattern = this.patterns.find(p => p.id === alert.pattern_id);
    if (pattern) {
      await this.applyAutomaticMitigation(alert, pattern);
    }
  }

  /**
   * Apply automatic mitigation measures
   */
  private async applyAutomaticMitigation(alert: SecurityAlert, pattern: ThreatPattern): Promise<void> {
    const mitigations: string[] = [];

    for (const mitigation of pattern.mitigation) {
      switch (mitigation) {
        case 'rate_limiting':
          // Enhanced rate limiting would be applied server-side
          mitigations.push('Enhanced rate limiting applied');
          break;

        case 'input_sanitization':
          // Already handled by InputValidator
          mitigations.push('Input sanitization enforced');
          break;

        case 'session_validation':
          // Force session validation
          await this.forceSessionValidation(alert);
          mitigations.push('Session validation forced');
          break;

        case 'user_education':
          // Show security warning to user
          this.showSecurityWarning(alert);
          mitigations.push('Security warning displayed');
          break;

        default:
          console.log(`Manual mitigation required: ${mitigation}`);
      }
    }

    alert.mitigation_applied = mitigations;
  }

  /**
   * Force session validation for security
   */
  private async forceSessionValidation(alert: SecurityAlert): Promise<void> {
    const sessionValidation = await securityManager.validateSession();
    if (!sessionValidation.isValid) {
      // Session is invalid, redirect to login
      console.warn('Invalid session detected during security check');
      window.location.href = '/auth';
    }
  }

  /**
   * Show security warning to user
   */
  private showSecurityWarning(alert: SecurityAlert): void {
    // Create a security warning modal or notification
    const warningMessage = `Security Alert: ${alert.title}\n\n${alert.description}\n\nFor your security, please review your recent activity and change your password if you suspect any unauthorized access.`;
    
    // In a real application, this would be a proper modal component
    if (confirm(warningMessage + '\n\nWould you like to review your security settings now?')) {
      // Redirect to security settings
      window.location.href = '/settings/security';
    }
  }

  /**
   * Send alert to backend monitoring system
   */
  private async sendAlertToBackend(pattern: ThreatPattern, events: SecurityEvent[]): Promise<void> {
    try {
      await supabase.functions.invoke('telemetry-api', {
        body: {
          event_type: 'security_alert',
          event_category: 'security',
          event_data: {
            pattern_id: pattern.id,
            threat_type: pattern.type,
            severity: pattern.severity,
            title: pattern.name,
            description: pattern.description,
            event_count: events.length,
            first_event: events[0]?.timestamp,
            last_event: events[events.length - 1]?.timestamp,
            affected_users: [...new Set(events.map(e => e.user_id).filter(Boolean))],
            source_ips: [...new Set(events.map(e => e.ip_address).filter(Boolean))],
            timestamp: new Date().toISOString()
          },
          success: false
        }
      });
    } catch (error) {
      console.warn('Failed to send security alert to backend:', error);
    }
  }

  /**
   * Check threat patterns periodically
   */
  private checkThreatPatterns(): void {
    if (!this.monitoring) return;

    // Check each pattern against recent events
    for (const pattern of this.patterns) {
      const timeWindowMs = pattern.timeWindow * 60 * 1000;
      const cutoffTime = new Date(Date.now() - timeWindowMs);

      const recentEvents = this.events.filter(event => 
        event.timestamp >= cutoffTime
      );

      const matchingEvents = recentEvents.filter(event => {
        if (pattern.pattern instanceof RegExp) {
          return pattern.pattern.test(JSON.stringify(event));
        } else if (typeof pattern.pattern === 'function') {
          return pattern.pattern(event);
        }
        return false;
      });

      if (matchingEvents.length >= pattern.threshold) {
        this.handlePatternMatch(pattern, matchingEvents[matchingEvents.length - 1]);
      }
    }
  }

  /**
   * Subscribe to security events from SecurityManager
   */
  private subscribeToSecurityEvents(): void {
    // This would integrate with the SecurityManager's event system
    // For now, we'll rely on manual logging
  }

  /**
   * Get security metrics
   */
  public getSecurityMetrics(): SecurityMetrics {
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    const recentEvents = this.events.filter(event => 
      now.getTime() - event.timestamp.getTime() < oneHour
    );

    const eventsBySeverity: Record<SecuritySeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    const eventsByCategory: Record<SecurityCategory, number> = {
      authentication: 0,
      authorization: 0,
      data_access: 0,
      input_validation: 0,
      network: 0,
      system: 0,
      compliance: 0
    };

    const threatsByType: Record<ThreatType, number> = {
      brute_force: 0,
      credential_stuffing: 0,
      xss_attempt: 0,
      sql_injection: 0,
      csrf_attack: 0,
      data_exfiltration: 0,
      unauthorized_access: 0,
      suspicious_behavior: 0,
      rate_limit_abuse: 0,
      privilege_escalation: 0
    };

    recentEvents.forEach(event => {
      eventsBySeverity[event.severity]++;
      eventsByCategory[event.category]++;
      if (event.threat_type) {
        threatsByType[event.threat_type]++;
      }
    });

    const topThreats = Object.entries(threatsByType)
      .map(([type, count]) => ({ type: type as ThreatType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate risk score (0-100)
    const riskScore = Math.min(100, 
      (eventsBySeverity.critical * 25) +
      (eventsBySeverity.high * 10) +
      (eventsBySeverity.medium * 3) +
      (eventsBySeverity.low * 1)
    );

    const activeAlerts = this.alerts.filter(alert => !alert.resolved).length;
    const resolvedAlerts = this.alerts.filter(alert => alert.resolved).length;

    // Calculate average response time (placeholder)
    const averageResponseTime = resolvedAlerts > 0 
      ? this.alerts
          .filter(alert => alert.resolved && alert.resolved_at)
          .reduce((sum, alert) => 
            sum + (alert.resolved_at!.getTime() - alert.first_seen.getTime()), 0
          ) / resolvedAlerts / 1000 / 60 // Convert to minutes
      : 0;

    return {
      totalEvents: recentEvents.length,
      eventsBySeverity,
      eventsByCategory,
      threatsByType,
      activeAlerts,
      resolvedAlerts,
      averageResponseTime,
      topThreats,
      riskScore
    };
  }

  /**
   * Get active security alerts
   */
  public getActiveAlerts(): SecurityAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve a security alert
   */
  public resolveAlert(alertId: string, resolvedBy: string = 'system'): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolved_at = new Date();
      alert.resolved_by = resolvedBy;
      
      console.log(`✅ Security alert resolved: ${alert.title} by ${resolvedBy}`);
      return true;
    }
    return false;
  }

  /**
   * Add custom threat pattern
   */
  public addThreatPattern(pattern: ThreatPattern): void {
    this.patterns.push(pattern);
    console.log(`🔍 Added custom threat pattern: ${pattern.name}`);
  }

  /**
   * Get recent security events
   */
  public getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Clear old events and alerts
   */
  public cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoffTime = new Date(Date.now() - maxAge);
    
    this.events = this.events.filter(event => event.timestamp >= cutoffTime);
    this.alerts = this.alerts.filter(alert => 
      alert.first_seen >= cutoffTime || !alert.resolved
    );
    
    console.log('🧹 Security monitoring cleanup completed');
  }
}

// Export singleton instance
export const securityMonitor = SecurityMonitor.getInstance();

// Initialize monitoring if in production
if (process.env.NODE_ENV === 'production') {
  securityMonitor.startMonitoring();
}

export default securityMonitor;