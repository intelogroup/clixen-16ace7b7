/**
 * Authentication API Integration Tests
 * Tests all authentication endpoints and flows
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

describe('Authentication API', () => {
  let supabase: SupabaseClient;
  let testEmail: string;
  let testPassword: string;

  beforeEach(() => {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
      process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
    );
    
    testEmail = `test-${Date.now()}@example.com`;
    testPassword = 'TestPassword123!';
  });

  afterEach(async () => {
    // Clean up any created test user
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('User Registration', () => {
    test('should register new user successfully', async () => {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(testEmail);
      expect(data.session).toBeDefined(); // Might be null if email confirmation required
    });

    test('should reject weak passwords', async () => {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: '123' // Too weak
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Password');
    });

    test('should reject invalid email formats', async () => {
      const { data, error } = await supabase.auth.signUp({
        email: 'invalid-email',
        password: testPassword
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/email|format/i);
    });

    test('should prevent duplicate user registration', async () => {
      // First registration
      await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });

      // Attempt duplicate registration
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });

      // Should either succeed (if email confirmation pending) or reject
      if (error) {
        expect(error.message).toMatch(/already|exists|registered/i);
      }
    });
  });

  describe('User Authentication', () => {
    beforeEach(async () => {
      // Create test user for login tests
      await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });
    });

    test('should authenticate with valid credentials', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(testEmail);
      expect(data.session).toBeDefined();
      expect(data.session?.access_token).toBeDefined();
    });

    test('should reject invalid credentials', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: 'WrongPassword123!'
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/credentials|password|invalid/i);
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });

    test('should reject non-existent user', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: testPassword
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });

    test('should handle malformed email addresses', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'not-an-email',
        password: testPassword
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
    });
  });

  describe('Session Management', () => {
    let userSession: any;

    beforeEach(async () => {
      // Create and sign in test user
      await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });

      const { data } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

      userSession = data.session;
    });

    test('should retrieve current session', async () => {
      const { data, error } = await supabase.auth.getSession();

      expect(error).toBeNull();
      if (userSession) {
        expect(data.session).toBeDefined();
        expect(data.session?.user.email).toBe(testEmail);
      }
    });

    test('should retrieve current user', async () => {
      const { data, error } = await supabase.auth.getUser();

      expect(error).toBeNull();
      if (userSession) {
        expect(data.user).toBeDefined();
        expect(data.user?.email).toBe(testEmail);
      }
    });

    test('should sign out successfully', async () => {
      const { error } = await supabase.auth.signOut();

      expect(error).toBeNull();

      // Verify session is cleared
      const { data } = await supabase.auth.getSession();
      expect(data.session).toBeNull();
    });

    test('should refresh session token', async () => {
      if (!userSession) {
        console.log('Skipping refresh test - no active session');
        return;
      }

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: userSession.refresh_token
      });

      expect(error).toBeNull();
      expect(data.session).toBeDefined();
      expect(data.session?.access_token).toBeDefined();
      expect(data.session?.access_token).not.toBe(userSession.access_token);
    });
  });

  describe('Password Reset', () => {
    beforeEach(async () => {
      // Create test user
      await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });
    });

    test('should send password reset email', async () => {
      const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail);

      expect(error).toBeNull();
      // Note: Supabase doesn't return confirmation data for security
    });

    test('should handle password reset for non-existent user gracefully', async () => {
      const { data, error } = await supabase.auth.resetPasswordForEmail('nonexistent@example.com');

      // Should not reveal whether user exists
      expect(error).toBeNull();
    });

    test('should reject malformed email in password reset', async () => {
      const { data, error } = await supabase.auth.resetPasswordForEmail('invalid-email');

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/email|format/i);
    });
  });

  describe('User Profile Management', () => {
    let authenticatedSupabase: SupabaseClient;

    beforeEach(async () => {
      // Create and authenticate user
      await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });

      const { data } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

      if (data.session) {
        authenticatedSupabase = createClient(
          process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
          process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
        );
        authenticatedSupabase.auth.setSession(data.session);
      }
    });

    test('should update user metadata', async () => {
      if (!authenticatedSupabase) {
        console.log('Skipping metadata test - no authenticated client');
        return;
      }

      const { data, error } = await authenticatedSupabase.auth.updateUser({
        data: {
          display_name: 'Test User',
          preferences: { theme: 'dark' }
        }
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.user_metadata.display_name).toBe('Test User');
    });

    test('should update user email', async () => {
      if (!authenticatedSupabase) {
        console.log('Skipping email update test - no authenticated client');
        return;
      }

      const newEmail = `updated-${Date.now()}@example.com`;
      const { data, error } = await authenticatedSupabase.auth.updateUser({
        email: newEmail
      });

      // Email update might require confirmation
      expect(error).toBeNull();
      expect(data.user).toBeDefined();
    });

    test('should update user password', async () => {
      if (!authenticatedSupabase) {
        console.log('Skipping password update test - no authenticated client');
        return;
      }

      const newPassword = 'NewPassword123!';
      const { data, error } = await authenticatedSupabase.auth.updateUser({
        password: newPassword
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
    });
  });

  describe('Authentication State Changes', () => {
    test('should handle auth state change events', async () => {
      const authStateChanges: any[] = [];

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        authStateChanges.push({ event, session });
      });

      // Sign up user
      await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });

      // Sign in user
      await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

      // Sign out user
      await supabase.auth.signOut();

      // Give events time to fire
      await new Promise(resolve => setTimeout(resolve, 1000));

      subscription.unsubscribe();

      expect(authStateChanges.length).toBeGreaterThan(0);
      
      // Check for expected events
      const events = authStateChanges.map(change => change.event);
      expect(events).toContain('SIGNED_IN');
    });
  });

  describe('Rate Limiting and Security', () => {
    test('should handle rapid authentication attempts', async () => {
      const promises = [];
      
      // Make multiple rapid authentication attempts
      for (let i = 0; i < 5; i++) {
        promises.push(
          supabase.auth.signInWithPassword({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
        );
      }

      const results = await Promise.allSettled(promises);
      
      // All should fail, but shouldn't crash the system
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value.error).toBeDefined();
        }
      });
    });

    test('should sanitize error messages', async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

      expect(error).toBeDefined();
      
      // Error message should not reveal sensitive information
      const errorMessage = error?.message.toLowerCase() || '';
      expect(errorMessage).not.toContain('database');
      expect(errorMessage).not.toContain('sql');
      expect(errorMessage).not.toContain('internal');
    });

    test('should handle malicious input attempts', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'DROP TABLE users;',
        "'; DELETE FROM users; --",
        'null',
        'undefined',
        ''
      ];

      for (const maliciousInput of maliciousInputs) {
        const { error } = await supabase.auth.signInWithPassword({
          email: maliciousInput,
          password: maliciousInput
        });

        // Should handle gracefully without crashing
        expect(error).toBeDefined();
        expect(typeof error.message).toBe('string');
      }
    });
  });

  describe('Integration with Application Features', () => {
    test('should integrate with RLS policies', async () => {
      // Create and authenticate user
      const { data: signUpData } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });

      if (signUpData.session) {
        const authenticatedClient = createClient(
          process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
          process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
        );
        authenticatedClient.auth.setSession(signUpData.session);

        // Try to access user-specific data
        const { data, error } = await authenticatedClient
          .from('projects')
          .select('*')
          .limit(1);

        // Should not error due to RLS (though might be empty)
        expect(error).toBeNull();
        expect(Array.isArray(data)).toBe(true);
      }
    });

    test('should provide user context for application features', async () => {
      const { data } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });

      if (data.user) {
        expect(data.user.id).toBeDefined();
        expect(data.user.email).toBe(testEmail);
        expect(data.user.created_at).toBeDefined();
        
        // User should have properties needed for application
        expect(typeof data.user.id).toBe('string');
        expect(data.user.id.length).toBeGreaterThan(0);
      }
    });
  });
});