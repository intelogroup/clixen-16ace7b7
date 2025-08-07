/**
 * Security Integration Hook for Clixen MVP
 * Provides a unified interface to all security systems
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { securityManager } from '../security/SecurityManager';
import { authorizationManager } from '../security/AuthorizationManager';
import { securityMonitor } from '../security/SecurityMonitor';
import { inputValidator } from '../security/InputValidator';
import type { 
  SecurityEventType, 
  SecurityEvent,
  SecurityConfig 
} from '../security/SecurityManager';
import type { 
  UserPermissions,
  ResourceType, 
  Permission,
  AccessControlResult 
} from '../security/AuthorizationManager';
import type { SecurityMetrics, SecurityAlert } from '../security/SecurityMonitor';

export interface SecurityStatus {
  isAuthenticated: boolean;
  permissions?: UserPermissions;
  securityMetrics: SecurityMetrics;
  activeAlerts: SecurityAlert[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastSecurityCheck: Date;
}

export interface SecurityActions {
  // Authentication
  validatePassword: (password: string) => ReturnType<typeof securityManager.validatePassword>;
  validateEmail: (email: string) => ReturnType<typeof securityManager.validateEmail>;
  checkLoginLockout: (identifier: string) => ReturnType<typeof securityManager.checkLoginLockout>;
  
  // Authorization
  hasPermission: (resourceType: ResourceType, permission: Permission) => Promise<AccessControlResult>;
  hasResourceAccess: (resourceType: ResourceType, resourceId: string, permission?: Permission) => Promise<AccessControlResult>;
  checkUsageLimit: (limitType: keyof UserPermissions['limits'], currentUsage: number) => Promise<any>;
  
  // Input Validation
  validateInput: (value: any, rule: any) => ReturnType<typeof inputValidator.validateField>;
  sanitizeHTML: (html: string, options?: any) => string;
  detectMaliciousInput: (input: string) => ReturnType<typeof inputValidator.detectMaliciousInput>;
  
  // Security Monitoring
  logSecurityEvent: (type: SecurityEventType, details?: Record<string, any>) => Promise<void>;
  resolveAlert: (alertId: string) => boolean;
  
  // Utilities
  refreshSecurityStatus: () => Promise<void>;
  clearSecurityCache: () => void;
}

export function useSecurityIntegration() {
  const { user } = useAuth();
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    isAuthenticated: false,
    securityMetrics: {
      totalEvents: 0,
      eventsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      eventsByCategory: { authentication: 0, authorization: 0, data_access: 0, input_validation: 0, network: 0, system: 0, compliance: 0 },
      threatsByType: { brute_force: 0, credential_stuffing: 0, xss_attempt: 0, sql_injection: 0, csrf_attack: 0, data_exfiltration: 0, unauthorized_access: 0, suspicious_behavior: 0, rate_limit_abuse: 0, privilege_escalation: 0 },
      activeAlerts: 0,
      resolvedAlerts: 0,
      averageResponseTime: 0,
      topThreats: [],
      riskScore: 0
    },
    activeAlerts: [],
    riskLevel: 'low',
    lastSecurityCheck: new Date()
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh security status
  const refreshSecurityStatus = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Get user permissions
      const permissions = await authorizationManager.getUserPermissions(user.id);
      
      // Get security metrics
      const metrics = securityMonitor.getSecurityMetrics();
      
      // Get active alerts
      const alerts = securityMonitor.getActiveAlerts();
      
      // Determine risk level
      const riskLevel = metrics.riskScore >= 75 ? 'critical' :
                       metrics.riskScore >= 50 ? 'high' :
                       metrics.riskScore >= 25 ? 'medium' : 'low';

      setSecurityStatus({
        isAuthenticated: true,
        permissions,
        securityMetrics: metrics,
        activeAlerts: alerts,
        riskLevel,
        lastSecurityCheck: new Date()
      });

      // Log security check event
      await logSecurityEvent('security_status_check', {
        user_id: user.id,
        risk_score: metrics.riskScore,
        active_alerts: alerts.length
      });

    } catch (error) {
      console.error('Failed to refresh security status:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh security status');
      
      await logSecurityEvent('security_check_failed', {
        user_id: user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Security actions
  const validatePassword = useCallback((password: string) => {
    const result = securityManager.validatePassword(password);
    
    // Log weak password attempts
    if (!result.isValid) {
      logSecurityEvent('weak_password_attempt', {
        strength: result.strength,
        errors: result.errors
      });
    }
    
    return result;
  }, []);

  const validateEmail = useCallback((email: string) => {
    const result = securityManager.validateEmail(email);
    
    // Log invalid email attempts
    if (!result.isValid) {
      logSecurityEvent('invalid_email_attempt', {
        email: email.substring(0, 3) + '***', // Partially masked for privacy
        errors: result.errors
      });
    }
    
    return result;
  }, []);

  const checkLoginLockout = useCallback((identifier: string) => {
    const result = securityManager.checkLoginLockout(identifier);
    
    if (result.isLocked) {
      logSecurityEvent('login_lockout_check', {
        identifier: identifier.substring(0, 3) + '***',
        time_remaining: result.timeRemaining
      });
    }
    
    return result;
  }, []);

  const hasPermission = useCallback(async (resourceType: ResourceType, permission: Permission): Promise<AccessControlResult> => {
    if (!user) {
      return {
        allowed: false,
        reason: 'User not authenticated',
        missingPermissions: [permission]
      };
    }

    const result = await authorizationManager.hasPermission(user.id, resourceType, permission);
    
    // Log permission denials
    if (!result.allowed) {
      await logSecurityEvent('permission_denied', {
        user_id: user.id,
        resource_type: resourceType,
        permission,
        reason: result.reason
      });
    }
    
    return result;
  }, [user]);

  const hasResourceAccess = useCallback(async (
    resourceType: ResourceType, 
    resourceId: string, 
    permission: Permission = 'read'
  ): Promise<AccessControlResult> => {
    if (!user) {
      return {
        allowed: false,
        reason: 'User not authenticated',
        missingPermissions: [permission]
      };
    }

    const result = await authorizationManager.hasResourceAccess(
      user.id, 
      resourceType, 
      resourceId, 
      permission
    );
    
    // Log unauthorized access attempts
    if (!result.allowed) {
      await logSecurityEvent('unauthorized_access_attempt', {
        user_id: user.id,
        resource_type: resourceType,
        resource_id: resourceId,
        permission,
        reason: result.reason
      });
    }
    
    return result;
  }, [user]);

  const checkUsageLimit = useCallback(async (
    limitType: keyof UserPermissions['limits'], 
    currentUsage: number
  ) => {
    if (!user) return { allowed: false, limit: 0, usage: 0, remaining: 0 };

    const result = await authorizationManager.checkUsageLimit(user.id, limitType, currentUsage);
    
    // Log usage limit violations
    if (!result.allowed) {
      await logSecurityEvent('usage_limit_exceeded', {
        user_id: user.id,
        limit_type: limitType,
        current_usage: currentUsage,
        limit: result.limit
      });
    }
    
    return result;
  }, [user]);

  const validateInput = useCallback((value: any, rule: any) => {
    const result = inputValidator.validateField(value, rule);
    
    // Log malicious input attempts
    if (result.warnings && result.warnings.length > 0) {
      logSecurityEvent('suspicious_input_detected', {
        user_id: user?.id,
        warnings: result.warnings,
        sanitized: result.value !== value
      });
    }
    
    return result;
  }, [user]);

  const sanitizeHTML = useCallback((html: string, options?: any) => {
    const originalLength = html.length;
    const sanitized = inputValidator.sanitizeHTML(html, options);
    
    // Log if significant sanitization occurred
    if (sanitized.length < originalLength * 0.8) {
      logSecurityEvent('html_sanitization', {
        user_id: user?.id,
        original_length: originalLength,
        sanitized_length: sanitized.length,
        reduction_percent: Math.round((1 - sanitized.length / originalLength) * 100)
      });
    }
    
    return sanitized;
  }, [user]);

  const detectMaliciousInput = useCallback((input: string) => {
    const result = inputValidator.detectMaliciousInput(input);
    
    // Log malicious input detection
    if (result.isMalicious) {
      logSecurityEvent('malicious_input_detected', {
        user_id: user?.id,
        threats: result.threats,
        risk_level: result.riskLevel,
        input_preview: input.substring(0, 50) + (input.length > 50 ? '...' : '')
      });
    }
    
    return result;
  }, [user]);

  const logSecurityEvent = useCallback(async (
    type: SecurityEventType | string, 
    details: Record<string, any> = {}
  ) => {
    try {
      // Determine category and severity based on event type
      let category: any = 'system';
      let severity: any = 'low';

      if (type.includes('auth') || type.includes('login') || type.includes('password')) {
        category = 'authentication';
      } else if (type.includes('permission') || type.includes('access') || type.includes('unauthorized')) {
        category = 'authorization';
        severity = 'medium';
      } else if (type.includes('input') || type.includes('xss') || type.includes('injection')) {
        category = 'input_validation';
        severity = 'high';
      }

      // Enhanced details
      const enhancedDetails = {
        ...details,
        user_id: user?.id,
        session_id: details.session_id,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        url: window.location.href
      };

      await securityMonitor.logSecurityEvent(
        type,
        category,
        severity,
        enhancedDetails
      );
    } catch (error) {
      console.warn('Failed to log security event:', error);
    }
  }, [user]);

  const resolveAlert = useCallback((alertId: string) => {
    const resolved = securityMonitor.resolveAlert(alertId, user?.id || 'system');
    
    if (resolved) {
      // Refresh security status after resolving alert
      refreshSecurityStatus();
    }
    
    return resolved;
  }, [user, refreshSecurityStatus]);

  const clearSecurityCache = useCallback(() => {
    authorizationManager.clearCache(user?.id);
    securityManager.clearLoginAttempts();
    
    logSecurityEvent('security_cache_cleared', {
      user_id: user?.id
    });
  }, [user]);

  // Initialize security status on mount and user change
  useEffect(() => {
    refreshSecurityStatus();
  }, [refreshSecurityStatus]);

  // Periodic security status refresh
  useEffect(() => {
    const interval = setInterval(refreshSecurityStatus, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, [refreshSecurityStatus]);

  // Monitor for critical security events
  useEffect(() => {
    const handleSecurityAlert = (event: CustomEvent) => {
      const alert = event.detail as SecurityAlert;
      
      if (alert.severity === 'critical') {
        // Force refresh security status on critical alerts
        refreshSecurityStatus();
        
        // Show notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Security Alert: ${alert.title}`, {
            body: alert.description,
            icon: '/favicon.ico'
          });
        }
      }
    };

    window.addEventListener('security-alert', handleSecurityAlert as EventListener);
    return () => window.removeEventListener('security-alert', handleSecurityAlert as EventListener);
  }, [refreshSecurityStatus]);

  const actions: SecurityActions = {
    validatePassword,
    validateEmail,
    checkLoginLockout,
    hasPermission,
    hasResourceAccess,
    checkUsageLimit,
    validateInput,
    sanitizeHTML,
    detectMaliciousInput,
    logSecurityEvent,
    resolveAlert,
    refreshSecurityStatus,
    clearSecurityCache
  };

  return {
    securityStatus,
    actions,
    loading,
    error,
    // Convenience getters
    isAuthenticated: securityStatus.isAuthenticated,
    permissions: securityStatus.permissions,
    riskLevel: securityStatus.riskLevel,
    hasActiveAlerts: securityStatus.activeAlerts.length > 0,
    securityScore: Math.max(0, 100 - securityStatus.securityMetrics.riskScore)
  };
}

// Security context provider for app-wide access
import React, { createContext, useContext } from 'react';

interface SecurityContextType {
  securityStatus: SecurityStatus;
  actions: SecurityActions;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  permissions?: UserPermissions;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  hasActiveAlerts: boolean;
  securityScore: number;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const securityIntegration = useSecurityIntegration();
  
  return (
    <SecurityContext.Provider value={securityIntegration}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

// Security configuration hook
export function useSecurityConfig() {
  const [config, setConfig] = useState<SecurityConfig>(securityManager.getConfig());
  
  const updateConfig = useCallback((updates: Partial<SecurityConfig>) => {
    securityManager.updateConfig(updates);
    setConfig(securityManager.getConfig());
  }, []);
  
  const resetConfig = useCallback(() => {
    // Reset to defaults
    securityManager.updateConfig({
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      passwordMinLength: 8,
      passwordRequireComplexity: true,
      sessionTimeout: 60,
      enableSecurityLogging: true
    });
    setConfig(securityManager.getConfig());
  }, []);
  
  return {
    config,
    updateConfig,
    resetConfig
  };
}

export default useSecurityIntegration;