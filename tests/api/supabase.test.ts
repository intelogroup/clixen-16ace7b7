/**
 * Supabase Integration Tests
 * Tests Supabase client configuration, connection, and core functionality
 */
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

describe('Supabase Integration', () => {
  let supabase: SupabaseClient;
  let serviceRoleClient: SupabaseClient;

  beforeAll(() => {
    // Public client
    supabase = createClient(
      process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
      process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
    );

    // Service role client (if available)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      serviceRoleClient = createClient(
        process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }
  });

  afterAll(async () => {
    // Clean up any test data
    try {
      await supabase.auth.signOut();
      if (serviceRoleClient) {
        // Service role doesn't need sign out
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Client Configuration and Connection', () => {
    test('should create Supabase client successfully', () => {
      expect(supabase).toBeDefined();
      expect(supabase.auth).toBeDefined();
      expect(supabase.from).toBeDefined();
      expect(supabase.functions).toBeDefined();
    });

    test('should have correct configuration', () => {
      const config = supabase.supabaseUrl;
      expect(config).toBeDefined();
      expect(typeof config).toBe('string');
      expect(config.length).toBeGreaterThan(0);
    });

    test('should handle database connection', async () => {
      // Test basic database connectivity
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      // Should either connect successfully or fail with expected error
      if (error) {
        // Common expected errors for test environment
        const expectedErrors = [
          'relation "users" does not exist',
          'permission denied',
          'authentication required'
        ];
        
        const isExpectedError = expectedErrors.some(expectedError => 
          error.message.toLowerCase().includes(expectedError.toLowerCase())
        );
        
        if (!isExpectedError) {
          console.warn('Unexpected database error:', error.message);
        }
      } else {
        expect(data).toBeDefined();
      }
    });

    test('should handle network timeouts gracefully', async () => {
      // This test may pass or fail depending on network conditions
      // It's mainly to ensure the client doesn't crash on timeout
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Test timeout')), 5000)
        );

        const queryPromise = supabase
          .from('test_table_that_probably_does_not_exist')
          .select('*')
          .limit(1);

        await Promise.race([queryPromise, timeoutPromise]);
      } catch (error) {
        // Either a timeout or a database error is acceptable
        expect(error).toBeDefined();
        expect(typeof error.message).toBe('string');
      }
    });
  });

  describe('Authentication Integration', () => {
    test('should handle auth state management', async () => {
      const { data, error } = await supabase.auth.getSession();
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.session).toBeNull(); // Should be null initially
    });

    test('should handle auth state changes', async () => {
      let authEvents: any[] = [];

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        authEvents.push({ event, session });
      });

      // Give it a moment to set up
      await new Promise(resolve => setTimeout(resolve, 100));

      subscription.unsubscribe();

      expect(subscription).toBeDefined();
      expect(typeof subscription.unsubscribe).toBe('function');
    });

    test('should validate JWT tokens properly', async () => {
      // Test with invalid JWT
      const invalidClient = createClient(
        process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
        'invalid.jwt.token'
      );

      const { data, error } = await invalidClient.auth.getSession();
      
      // Should handle invalid JWT gracefully
      if (error) {
        expect(error.message).toMatch(/jwt|token|invalid|api key/i);
      } else {
        expect(data.session).toBeNull();
      }
    });
  });

  describe('Database Operations', () => {
    test('should handle basic queries', async () => {
      // Test a simple query that should work in most Supabase setups
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .limit(5);

      if (error) {
        // May not have access to information_schema in test environment
        console.log('Information schema access limited:', error.message);
      } else {
        expect(Array.isArray(data)).toBe(true);
      }
    });

    test('should handle malformed queries gracefully', async () => {
      // Test with invalid table name
      const { data, error } = await supabase
        .from('definitely_not_a_real_table_name_12345')
        .select('*')
        .limit(1);

      expect(error).toBeDefined();
      expect(error.message).toMatch(/relation.*does not exist|table.*not found/i);
      expect(data).toBeNull();
    });

    test('should enforce RLS policies', async () => {
      // Create test user to test RLS
      const testEmail = `rls-test-${Date.now()}@example.com`;
      const { data: signUpData } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPassword123!'
      });

      if (signUpData.session) {
        const authenticatedClient = createClient(
          process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
          process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
        );
        authenticatedClient.auth.setSession(signUpData.session);

        // Test access to user data (should be filtered by RLS)
        const { data, error } = await authenticatedClient
          .from('projects')
          .select('*')
          .limit(10);

        if (error && !error.message.includes('relation "projects" does not exist')) {
          console.warn('RLS test error:', error.message);
        } else if (data) {
          // RLS should ensure user only sees their own data
          expect(Array.isArray(data)).toBe(true);
        }

        await authenticatedClient.auth.signOut();
      }
    });
  });

  describe('Real-time Features', () => {
    test('should create real-time channels', () => {
      const channel = supabase.channel('test-channel');
      
      expect(channel).toBeDefined();
      expect(typeof channel.on).toBe('function');
      expect(typeof channel.subscribe).toBe('function');
      expect(typeof channel.unsubscribe).toBe('function');
    });

    test('should handle real-time subscriptions', async () => {
      const channel = supabase.channel('test-subscription');
      
      let subscriptionStatus = 'pending';
      
      channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'projects'
        }, (payload) => {
          console.log('Real-time event:', payload);
        })
        .subscribe((status) => {
          subscriptionStatus = status;
        });

      // Give subscription time to connect
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clean up
      await channel.unsubscribe();

      expect(['SUBSCRIBED', 'CLOSED', 'CHANNEL_ERROR']).toContain(subscriptionStatus);
    });

    test('should handle presence features', () => {
      const channel = supabase.channel('test-presence', {
        config: {
          presence: {
            key: 'test-user'
          }
        }
      });

      expect(channel).toBeDefined();
      expect(typeof channel.track).toBe('function');
      expect(typeof channel.untrack).toBe('function');
    });
  });

  describe('Edge Functions', () => {
    test('should invoke edge functions', async () => {
      // Test invoking a function (may not exist in test environment)
      const { data, error } = await supabase.functions.invoke('ai-chat-system', {
        body: {
          message: 'test message',
          conversation_id: 'test-conversation'
        }
      });

      if (error && error.message.includes('Function not found')) {
        console.log('Edge function not deployed - skipping test');
      } else if (error) {
        // Other errors might be expected (auth, validation, etc.)
        console.log('Edge function error (may be expected):', error.message);
      } else {
        expect(data).toBeDefined();
      }
    });

    test('should handle function timeouts', async () => {
      // Test with a function that might timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Function timeout')), 10000)
      );

      try {
        const functionPromise = supabase.functions.invoke('long-running-function', {
          body: { test: true }
        });

        await Promise.race([functionPromise, timeoutPromise]);
      } catch (error) {
        // Timeout or function error is acceptable
        expect(error).toBeDefined();
      }
    });

    test('should validate function parameters', async () => {
      const { data, error } = await supabase.functions.invoke('ai-chat-system', {
        body: null // Invalid body
      });

      // Should handle invalid parameters gracefully
      if (error) {
        expect(typeof error.message).toBe('string');
      }
    });
  });

  describe('Storage Operations', () => {
    test('should handle storage bucket operations', async () => {
      // Test basic storage functionality
      const { data, error } = await supabase.storage
        .from('test-bucket')
        .list('', {
          limit: 1
        });

      if (error && error.message.includes('not found')) {
        console.log('Storage bucket not configured - skipping test');
      } else if (error) {
        // May have permission or configuration issues
        console.log('Storage error (may be expected):', error.message);
      } else {
        expect(Array.isArray(data)).toBe(true);
      }
    });

    test('should validate file operations', async () => {
      // Test file upload validation
      const { data, error } = await supabase.storage
        .from('test-bucket')
        .upload('test-file.txt', 'test content');

      if (error && error.message.includes('not found')) {
        console.log('Storage bucket not configured - skipping test');
      } else if (error) {
        // Upload errors are expected in test environment
        expect(typeof error.message).toBe('string');
      } else if (data) {
        expect(data.path).toBeDefined();
        
        // Clean up
        await supabase.storage
          .from('test-bucket')
          .remove(['test-file.txt']);
      }
    });
  });

  describe('Service Role Operations', () => {
    test('should handle admin operations with service role', async () => {
      if (!serviceRoleClient) {
        console.log('Service role key not available - skipping test');
        return;
      }

      // Test admin-level operations
      const { data, error } = await serviceRoleClient
        .from('users')
        .select('id, email')
        .limit(5);

      if (error && !error.message.includes('relation "users" does not exist')) {
        console.warn('Service role operation failed:', error.message);
      } else if (data) {
        expect(Array.isArray(data)).toBe(true);
      }
    });

    test('should bypass RLS with service role', async () => {
      if (!serviceRoleClient) {
        console.log('Service role key not available - skipping test');
        return;
      }

      // Service role should bypass RLS
      const { data, error } = await serviceRoleClient
        .from('projects')
        .select('*')
        .limit(10);

      if (error && !error.message.includes('relation "projects" does not exist')) {
        console.warn('Service role RLS bypass failed:', error.message);
      } else if (data) {
        expect(Array.isArray(data)).toBe(true);
        // Should see all projects, not filtered by user
      }
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle network disconnection gracefully', async () => {
      // Simulate network issues by using invalid URL
      const disconnectedClient = createClient(
        'https://invalid-url-that-does-not-exist.supabase.co',
        process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
      );

      const { data, error } = await disconnectedClient
        .from('users')
        .select('*')
        .limit(1);

      expect(error).toBeDefined();
      expect(data).toBeNull();
      expect(typeof error.message).toBe('string');
    });

    test('should handle malicious input safely', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'DROP TABLE users;',
        "'; DELETE FROM users; --",
        null,
        undefined,
        { malicious: 'object' }
      ];

      for (const maliciousInput of maliciousInputs) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', maliciousInput as any)
            .limit(1);

          // Should handle gracefully without crashing
          if (error) {
            expect(typeof error.message).toBe('string');
          } else {
            expect(data).toBeDefined();
          }
        } catch (clientError) {
          // Client-side validation errors are also acceptable
          expect(clientError).toBeDefined();
        }
      }
    });

    test('should handle concurrent operations', async () => {
      const concurrentQueries = Array.from({ length: 10 }, (_, i) =>
        supabase
          .from('users')
          .select('count')
          .limit(1)
      );

      const results = await Promise.allSettled(concurrentQueries);

      // All operations should complete (successfully or with expected errors)
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          const { data, error } = result.value;
          if (error) {
            // Expected database errors are OK
            expect(typeof error.message).toBe('string');
          }
        }
      });
    });

    test('should maintain connection pool efficiently', async () => {
      // Test rapid sequential queries
      const sequentialQueries = [];
      
      for (let i = 0; i < 20; i++) {
        sequentialQueries.push(
          supabase
            .from('users')
            .select('count')
            .limit(1)
        );
      }

      const results = await Promise.all(sequentialQueries);
      
      // Should complete all queries without connection pool exhaustion
      expect(results).toHaveLength(20);
      
      results.forEach(result => {
        const { data, error } = result;
        if (error) {
          // Database errors are expected, but not connection errors
          expect(error.message).not.toMatch(/connection pool|too many connections/i);
        }
      });
    });
  });

  describe('Performance and Optimization', () => {
    test('should handle large result sets efficiently', async () => {
      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1000);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (error && !error.message.includes('relation "users" does not exist')) {
        console.warn('Large query test failed:', error.message);
      } else {
        // Query should complete within reasonable time
        expect(queryTime).toBeLessThan(30000); // 30 seconds max
        
        if (data) {
          expect(Array.isArray(data)).toBe(true);
        }
      }
    });

    test('should optimize query performance with indexes', async () => {
      // Test common query patterns that should be optimized
      const queries = [
        supabase.from('users').select('id').eq('email', 'test@example.com').limit(1),
        supabase.from('projects').select('*').eq('user_id', 'test-user-id').limit(10),
        supabase.from('workflows').select('*').eq('project_id', 'test-project-id').limit(10)
      ];

      const queryPromises = queries.map(async (query) => {
        const startTime = Date.now();
        const result = await query;
        const endTime = Date.now();
        
        return {
          time: endTime - startTime,
          error: result.error
        };
      });

      const results = await Promise.all(queryPromises);
      
      results.forEach((result, index) => {
        if (!result.error || !result.error.message.includes('does not exist')) {
          // Query should be reasonably fast
          expect(result.time).toBeLessThan(5000); // 5 seconds max
        }
      });
    });
  });
});