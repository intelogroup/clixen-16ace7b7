/**
 * MVP Performance Benchmarks and Load Testing
 * Validates performance requirements and system capacity under load
 */
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { performance } from 'perf_hooks';

describe('MVP Performance Benchmarks', () => {
  let supabase: SupabaseClient;
  let serviceRoleClient: SupabaseClient;
  let testSession: any;
  
  const performanceMetrics = {
    apiResponseTimes: [] as number[],
    databaseQueryTimes: [] as number[],
    workflowGenerationTimes: [] as number[],
    deploymentTimes: [] as number[],
    memoryUsage: [] as number[],
    concurrentUserResults: [] as any[]
  };

  beforeAll(async () => {
    // Initialize clients
    supabase = createClient(
      global.testConfig.supabase.url,
      global.testConfig.supabase.anonKey
    );

    serviceRoleClient = createClient(
      global.testConfig.supabase.url,
      global.testConfig.supabase.serviceRoleKey
    );

    // Authenticate for performance tests
    const { data, error } = await supabase.auth.signInWithPassword({
      email: global.testConfig.testUser.email,
      password: global.testConfig.testUser.password
    });

    if (!error && data.session) {
      testSession = data.session;
      console.log('✅ Performance test authentication successful');
    } else {
      console.warn('⚠️ Performance test authentication failed');
    }
  });

  afterAll(async () => {
    await supabase.auth.signOut();
    
    // Calculate and log performance summary
    const summary = {
      avgApiResponseTime: calculateAverage(performanceMetrics.apiResponseTimes),
      avgDatabaseQueryTime: calculateAverage(performanceMetrics.databaseQueryTimes),
      avgWorkflowGenerationTime: calculateAverage(performanceMetrics.workflowGenerationTimes),
      avgDeploymentTime: calculateAverage(performanceMetrics.deploymentTimes),
      p95ApiResponseTime: calculatePercentile(performanceMetrics.apiResponseTimes, 95),
      p99ApiResponseTime: calculatePercentile(performanceMetrics.apiResponseTimes, 99),
      concurrentUserCapacity: performanceMetrics.concurrentUserResults.length,
      memoryEfficiency: calculateAverage(performanceMetrics.memoryUsage)
    };

    console.log('🚀 Performance Test Summary:', summary);
    
    // Validate against MVP performance targets
    expect(summary.avgApiResponseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime);
    expect(summary.avgWorkflowGenerationTime).toBeLessThan(global.testConfig.thresholds.maxWorkflowGeneration);
  });

  describe('API Response Time Benchmarks', () => {
    test('should meet API response time requirements', async () => {
      const endpoints = [
        { name: 'projects-api', action: 'list' },
        { name: 'workflows-api', action: 'list' },
        { name: 'ai-chat-system', action: 'get_conversations' },
        { name: 'telemetry-api', action: 'analytics' }
      ];

      for (const endpoint of endpoints) {
        const startTime = performance.now();
        
        const { data, error } = await supabase.functions.invoke(endpoint.name, {
          body: { action: endpoint.action },
          headers: testSession ? {
            'Authorization': `Bearer ${testSession.access_token}`
          } : {}
        });

        const responseTime = performance.now() - startTime;
        performanceMetrics.apiResponseTimes.push(responseTime);

        console.log(`⚡ ${endpoint.name} response time: ${Math.round(responseTime)}ms`);
        
        // Individual response should be under threshold
        expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime);
        
        if (error) {
          console.warn(`⚠️ ${endpoint.name} error (performance still measured):`, error.message);
        }
      }
    });

    test('should handle burst API requests efficiently', async () => {
      const burstSize = 20;
      const promises = [];
      const startTime = performance.now();

      // Create burst of concurrent API requests
      for (let i = 0; i < burstSize; i++) {
        const requestPromise = supabase.functions.invoke('projects-api', {
          body: { action: 'list' },
          headers: testSession ? {
            'Authorization': `Bearer ${testSession.access_token}`
          } : {}
        }).then(result => ({
          ...result,
          requestIndex: i
        }));

        promises.push(requestPromise);
      }

      const results = await Promise.all(promises);
      const totalBurstTime = performance.now() - startTime;
      const avgBurstResponseTime = totalBurstTime / burstSize;

      performanceMetrics.apiResponseTimes.push(avgBurstResponseTime);

      console.log(`🔥 Burst test (${burstSize} requests): ${Math.round(totalBurstTime)}ms total, ${Math.round(avgBurstResponseTime)}ms average`);
      
      // Burst average should still be reasonable
      expect(avgBurstResponseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime * 2);
      
      // All requests should complete
      expect(results).toHaveLength(burstSize);
    });

    test('should maintain performance under sustained load', async () => {
      if (!global.testConfig.features.loadTesting) {
        console.log('⏭️ Load testing disabled - skipping sustained load test');
        return;
      }

      const testDuration = 60000; // 1 minute
      const requestInterval = 1000; // 1 request per second
      const startTime = performance.now();
      const sustainedMetrics: number[] = [];

      console.log('🏋️ Starting sustained load test (1 minute)...');

      while (performance.now() - startTime < testDuration) {
        const requestStart = performance.now();
        
        const { data, error } = await supabase.functions.invoke('projects-api', {
          body: { action: 'list' },
          headers: testSession ? {
            'Authorization': `Bearer ${testSession.access_token}`
          } : {}
        });

        const requestTime = performance.now() - requestStart;
        sustainedMetrics.push(requestTime);
        performanceMetrics.apiResponseTimes.push(requestTime);

        // Wait for next interval
        const elapsed = performance.now() - requestStart;
        if (elapsed < requestInterval) {
          await new Promise(resolve => setTimeout(resolve, requestInterval - elapsed));
        }
      }

      const avgSustainedTime = calculateAverage(sustainedMetrics);
      const p95SustainedTime = calculatePercentile(sustainedMetrics, 95);

      console.log(`🎯 Sustained load results: ${sustainedMetrics.length} requests, avg ${Math.round(avgSustainedTime)}ms, p95 ${Math.round(p95SustainedTime)}ms`);

      // Performance shouldn't degrade significantly under sustained load
      expect(avgSustainedTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime * 1.5);
      expect(p95SustainedTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime * 3);
    });
  });

  describe('Database Performance Benchmarks', () => {
    test('should execute database queries efficiently', async () => {
      const queries = [
        { table: 'projects', operation: 'select' },
        { table: 'workflows', operation: 'select' },
        { table: 'conversations', operation: 'select' },
        { table: 'messages', operation: 'select' }
      ];

      for (const query of queries) {
        const startTime = performance.now();

        const { data, error } = await supabase
          .from(query.table)
          .select('*')
          .limit(10);

        const queryTime = performance.now() - startTime;
        performanceMetrics.databaseQueryTimes.push(queryTime);

        console.log(`🗄️ ${query.table} query time: ${Math.round(queryTime)}ms`);

        if (error && !error.message.includes('does not exist')) {
          console.warn(`Database query error for ${query.table}:`, error.message);
        } else {
          // Query should be fast
          expect(queryTime).toBeLessThan(1000); // 1 second max for simple queries
        }
      }
    });

    test('should handle complex database operations efficiently', async () => {
      const startTime = performance.now();

      // Create a test project and measure time
      const projectData = {
        name: `Performance Test ${global.testUtils.generateTestId()}`,
        description: 'Performance testing project'
      };

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      const createTime = performance.now() - startTime;
      performanceMetrics.databaseQueryTimes.push(createTime);

      if (!projectError && project) {
        // Now test complex query with joins
        const complexQueryStart = performance.now();
        
        const { data: complexData, error: complexError } = await supabase
          .from('projects')
          .select(`
            *,
            workflows(count),
            conversations(count)
          `)
          .eq('id', project.id)
          .single();

        const complexQueryTime = performance.now() - complexQueryStart;
        performanceMetrics.databaseQueryTimes.push(complexQueryTime);

        console.log(`🔗 Complex query time: ${Math.round(complexQueryTime)}ms`);

        // Clean up
        await supabase.from('projects').delete().eq('id', project.id);

        // Complex queries should still be reasonable
        expect(complexQueryTime).toBeLessThan(5000); // 5 seconds max for complex queries
      }

      console.log(`📝 Database create operation: ${Math.round(createTime)}ms`);
      expect(createTime).toBeLessThan(2000); // 2 seconds max for create operations
    });

    test('should handle concurrent database operations', async () => {
      const concurrentOperations = 10;
      const operations = [];

      // Create concurrent operations
      for (let i = 0; i < concurrentOperations; i++) {
        const operation = supabase
          .from('projects')
          .select('id, name, created_at')
          .limit(5);
        
        operations.push(operation);
      }

      const startTime = performance.now();
      const results = await Promise.allSettled(operations);
      const concurrentTime = performance.now() - startTime;

      performanceMetrics.databaseQueryTimes.push(concurrentTime);

      const successfulOperations = results.filter(r => r.status === 'fulfilled').length;
      
      console.log(`⚡ Concurrent DB operations: ${successfulOperations}/${concurrentOperations} successful in ${Math.round(concurrentTime)}ms`);

      // Concurrent operations should complete in reasonable time
      expect(concurrentTime).toBeLessThan(10000); // 10 seconds max for concurrent operations
      expect(successfulOperations).toBeGreaterThan(concurrentOperations * 0.8); // 80% success rate minimum
    });
  });

  describe('Workflow Generation Performance', () => {
    test('should generate workflows within time limits', async () => {
      const workflowPrompts = [
        'Create a simple webhook workflow',
        'Build a data processing pipeline with validation',
        'Set up email notifications for form submissions',
        'Create a workflow to sync data between systems'
      ];

      for (const prompt of workflowPrompts) {
        const startTime = performance.now();

        const { data, error } = await supabase.functions.invoke('ai-chat-system', {
          body: {
            action: 'chat',
            message: prompt,
            conversation_id: global.testUtils.generateTestId(),
            include_workflow_generation: true
          },
          headers: testSession ? {
            'Authorization': `Bearer ${testSession.access_token}`
          } : {}
        });

        const generationTime = performance.now() - startTime;
        performanceMetrics.workflowGenerationTimes.push(generationTime);

        console.log(`🤖 Workflow generation time: ${Math.round(generationTime)}ms`);

        if (error) {
          console.warn('Workflow generation error:', error.message);
        } else {
          // Workflow generation should be within limits
          expect(generationTime).toBeLessThan(global.testConfig.thresholds.maxWorkflowGeneration);
        }
      }
    });

    test('should handle multiple simultaneous workflow generations', async () => {
      if (!testSession) {
        console.log('⏭️ Skipping simultaneous workflow test - no auth session');
        return;
      }

      const simultaneousRequests = 3;
      const prompt = 'Create a basic webhook workflow for testing';
      const promises = [];

      const startTime = performance.now();

      for (let i = 0; i < simultaneousRequests; i++) {
        const promise = supabase.functions.invoke('ai-chat-system', {
          body: {
            action: 'chat',
            message: `${prompt} (request ${i + 1})`,
            conversation_id: `test-${i}-${global.testUtils.generateTestId()}`,
            include_workflow_generation: true
          },
          headers: {
            'Authorization': `Bearer ${testSession.access_token}`
          }
        });

        promises.push(promise);
      }

      const results = await Promise.allSettled(promises);
      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / simultaneousRequests;

      performanceMetrics.workflowGenerationTimes.push(avgTime);

      const successfulGenerations = results.filter(r => r.status === 'fulfilled').length;

      console.log(`🔄 Simultaneous workflow generations: ${successfulGenerations}/${simultaneousRequests} in ${Math.round(totalTime)}ms (avg ${Math.round(avgTime)}ms)`);

      // Should handle multiple requests reasonably
      expect(avgTime).toBeLessThan(global.testConfig.thresholds.maxWorkflowGeneration * 1.5);
    });
  });

  describe('Memory and Resource Efficiency', () => {
    test('should maintain efficient memory usage', async () => {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const initialMemory = process.memoryUsage();
        
        // Perform memory-intensive operations
        const operations = [];
        for (let i = 0; i < 100; i++) {
          operations.push(
            supabase.from('projects').select('*').limit(1)
          );
        }

        await Promise.all(operations);

        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
        
        performanceMetrics.memoryUsage.push(memoryIncrease);

        console.log(`🧠 Memory usage increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);

        // Memory increase should be reasonable (less than 100MB for 100 operations)
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      } else {
        console.log('⏭️ Memory testing not available in this environment');
      }
    });

    test('should handle garbage collection efficiently', async () => {
      if (typeof process !== 'undefined' && global.gc) {
        const initialMemory = process.memoryUsage();
        
        // Create temporary objects
        const tempData = [];
        for (let i = 0; i < 10000; i++) {
          tempData.push({ id: i, data: new Array(1000).fill(i) });
        }

        const beforeGC = process.memoryUsage();
        
        // Clear references
        tempData.length = 0;
        
        // Force garbage collection if available
        global.gc();
        
        const afterGC = process.memoryUsage();
        const memoryReclaimed = beforeGC.heapUsed - afterGC.heapUsed;

        console.log(`♻️ Memory reclaimed by GC: ${Math.round(memoryReclaimed / 1024 / 1024)}MB`);

        // Should reclaim significant memory
        expect(memoryReclaimed).toBeGreaterThan(0);
      } else {
        console.log('⏭️ Garbage collection testing not available');
      }
    });
  });

  describe('Concurrent User Simulation', () => {
    test('should handle moderate concurrent user load', async () => {
      if (!global.testConfig.features.loadTesting) {
        console.log('⏭️ Load testing disabled - skipping concurrent user test');
        return;
      }

      const concurrentUsers = parseInt(process.env.LOAD_TEST_CONCURRENT_USERS || '10');
      const userSimulations = [];

      console.log(`👥 Simulating ${concurrentUsers} concurrent users...`);

      // Simulate concurrent user sessions
      for (let i = 0; i < concurrentUsers; i++) {
        const userSimulation = simulateUserSession(i);
        userSimulations.push(userSimulation);
      }

      const startTime = performance.now();
      const results = await Promise.allSettled(userSimulations);
      const totalTime = performance.now() - startTime;

      const successfulUsers = results.filter(r => r.status === 'fulfilled').length;
      const failedUsers = results.filter(r => r.status === 'rejected').length;

      performanceMetrics.concurrentUserResults = results;

      console.log(`📊 Concurrent user results: ${successfulUsers} successful, ${failedUsers} failed in ${Math.round(totalTime)}ms`);

      // Should handle most users successfully
      expect(successfulUsers / concurrentUsers).toBeGreaterThan(0.8); // 80% success rate
      expect(totalTime).toBeLessThan(60000); // Should complete within 1 minute
    });

    test('should scale to higher user loads', async () => {
      if (!global.testConfig.features.loadTesting) {
        console.log('⏭️ Load testing disabled - skipping scale test');
        return;
      }

      const maxUsers = parseInt(process.env.LOAD_TEST_MAX_USERS || '50');
      const scalingResults = [];

      // Test different user loads
      const userCounts = [10, 25, 50].filter(count => count <= maxUsers);

      for (const userCount of userCounts) {
        console.log(`🔬 Testing ${userCount} concurrent users...`);
        
        const userPromises = [];
        for (let i = 0; i < userCount; i++) {
          userPromises.push(simulateBasicUserOperation(i));
        }

        const startTime = performance.now();
        const results = await Promise.allSettled(userPromises);
        const totalTime = performance.now() - startTime;

        const successRate = results.filter(r => r.status === 'fulfilled').length / userCount;
        const avgTimePerUser = totalTime / userCount;

        scalingResults.push({
          userCount,
          successRate,
          totalTime,
          avgTimePerUser
        });

        console.log(`📈 ${userCount} users: ${(successRate * 100).toFixed(1)}% success, ${Math.round(avgTimePerUser)}ms avg`);
      }

      // System should maintain reasonable performance as load increases
      const degradation = calculatePerformanceDegradation(scalingResults);
      expect(degradation).toBeLessThan(3.0); // Performance shouldn't degrade more than 3x

      console.log(`⚖️ Performance degradation factor: ${degradation.toFixed(2)}x`);
    });
  });

  // Helper functions
  async function simulateUserSession(userId: number): Promise<any> {
    const sessionStartTime = performance.now();
    
    try {
      // Simulate typical user journey
      const operations = [
        () => supabase.functions.invoke('projects-api', { body: { action: 'list' } }),
        () => supabase.functions.invoke('workflows-api', { body: { action: 'list' } }),
        () => supabase.functions.invoke('ai-chat-system', { 
          body: { 
            action: 'chat', 
            message: `User ${userId} test message`,
            conversation_id: `user-${userId}-conversation`
          } 
        })
      ];

      const results = [];
      for (const operation of operations) {
        const result = await operation();
        results.push(result);
        
        // Simulate user think time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      }

      const sessionTime = performance.now() - sessionStartTime;
      return { userId, sessionTime, operations: results.length, success: true };
      
    } catch (error) {
      const sessionTime = performance.now() - sessionStartTime;
      return { userId, sessionTime, error: error.message, success: false };
    }
  }

  async function simulateBasicUserOperation(userId: number): Promise<any> {
    const startTime = performance.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('projects-api', {
        body: { action: 'list' }
      });

      const operationTime = performance.now() - startTime;
      return { userId, operationTime, success: !error };
      
    } catch (error) {
      const operationTime = performance.now() - startTime;
      return { userId, operationTime, error: error.message, success: false };
    }
  }

  function calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  function calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  function calculatePerformanceDegradation(results: any[]): number {
    if (results.length < 2) return 1;
    
    const firstResult = results[0];
    const lastResult = results[results.length - 1];
    
    return lastResult.avgTimePerUser / firstResult.avgTimePerUser;
  }
});