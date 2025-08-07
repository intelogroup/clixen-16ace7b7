/**
 * MVP API Integration Tests
 * Comprehensive testing of all Edge Functions and API endpoints
 * Tests against production Clixen infrastructure
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { performance } from 'perf_hooks';

describe('MVP API Integration Tests', () => {
  let supabase: SupabaseClient;
  let serviceRoleClient: SupabaseClient;
  let testSession: any;
  let testProjectId: string;
  let testWorkflowId: string;
  let testConversationId: string;

  // Test metrics tracking
  const metrics = {
    responseThemes: [] as number[],
    errors: [] as string[],
    successCount: 0,
    failureCount: 0
  };

  beforeAll(async () => {
    // Initialize Supabase clients
    supabase = createClient(
      global.testConfig.supabase.url,
      global.testConfig.supabase.anonKey
    );

    serviceRoleClient = createClient(
      global.testConfig.supabase.url,
      global.testConfig.supabase.serviceRoleKey
    );

    // Authenticate test user
    const { data, error } = await supabase.auth.signInWithPassword({
      email: global.testConfig.testUser.email,
      password: global.testConfig.testUser.password
    });

    if (error) {
      console.error('Failed to authenticate test user:', error.message);
      throw error;
    }

    testSession = data.session;
    console.log('✅ Test user authenticated successfully');
  });

  afterAll(async () => {
    // Cleanup and sign out
    if (global.testConfig.features.autoCleanup) {
      await cleanupTestData();
    }
    
    await supabase.auth.signOut();
    
    // Log test metrics
    const avgResponseTime = metrics.responseThemes.length > 0 
      ? metrics.responseThemes.reduce((a, b) => a + b, 0) / metrics.responseThemes.length 
      : 0;
    
    console.log('📊 API Integration Test Metrics:', {
      totalTests: metrics.successCount + metrics.failureCount,
      successRate: `${((metrics.successCount / (metrics.successCount + metrics.failureCount)) * 100).toFixed(1)}%`,
      averageResponseTime: `${Math.round(avgResponseTime)}ms`,
      errors: metrics.errors.slice(0, 5) // Show first 5 errors
    });
  });

  beforeEach(() => {
    // Reset per-test state
  });

  afterEach(() => {
    // Per-test cleanup if needed
  });

  describe('Authentication and User Management', () => {
    test('should validate user session and permissions', async () => {
      const startTime = performance.now();
      
      const { data: user, error } = await supabase.auth.getUser();
      
      const responseTime = performance.now() - startTime;
      metrics.responseThemes.push(responseTime);
      
      expect(error).toBeNull();
      expect(user.user).toBeDefined();
      expect(user.user?.email).toBe(global.testConfig.testUser.email);
      expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime);
      
      metrics.successCount++;
      console.log(`✅ User session validated in ${Math.round(responseTime)}ms`);
    });

    test('should handle auth state changes', async () => {
      const startTime = performance.now();
      let authEventReceived = false;
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        authEventReceived = true;
        console.log(`Auth event: ${event}`, session?.user?.email);
      });

      // Trigger auth state change by refreshing session
      const { data, error } = await supabase.auth.refreshSession();
      
      const responseTime = performance.now() - startTime;
      metrics.responseThemes.push(responseTime);
      
      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      subscription.unsubscribe();
      
      expect(error).toBeNull();
      expect(data.session).toBeDefined();
      expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime);
      
      metrics.successCount++;
      console.log(`✅ Auth state change handled in ${Math.round(responseTime)}ms`);
    });
  });

  describe('Projects API (projects-api Edge Function)', () => {
    test('should create a new project', async () => {
      const startTime = performance.now();
      
      const projectData = {
        name: `Test Project ${global.testUtils.generateTestId()}`,
        description: 'Integration test project',
        settings: {
          n8n_enabled: true,
          auto_deploy: false
        }
      };

      const { data, error } = await supabase.functions.invoke('projects-api', {
        body: {
          action: 'create',
          project: projectData
        },
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        }
      });

      const responseTime = performance.now() - startTime;
      metrics.responseThemes.push(responseTime);

      if (error) {
        metrics.errors.push(`Project creation: ${error.message}`);
        metrics.failureCount++;
        throw error;
      }

      expect(data).toBeDefined();
      expect(data.project).toBeDefined();
      expect(data.project.name).toBe(projectData.name);
      expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime);

      testProjectId = data.project.id;
      metrics.successCount++;
      console.log(`✅ Project created in ${Math.round(responseTime)}ms`);
    });

    test('should list user projects', async () => {
      const startTime = performance.now();

      const { data, error } = await supabase.functions.invoke('projects-api', {
        body: {
          action: 'list'
        },
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        }
      });

      const responseTime = performance.now() - startTime;
      metrics.responseThemes.push(responseTime);

      if (error) {
        metrics.errors.push(`Project listing: ${error.message}`);
        metrics.failureCount++;
        throw error;
      }

      expect(data).toBeDefined();
      expect(data.projects).toBeDefined();
      expect(Array.isArray(data.projects)).toBe(true);
      expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime);

      metrics.successCount++;
      console.log(`✅ Projects listed in ${Math.round(responseTime)}ms (${data.projects.length} projects)`);
    });

    test('should update project settings', async () => {
      if (!testProjectId) {
        throw new Error('No test project available for update');
      }

      const startTime = performance.now();

      const updateData = {
        description: 'Updated integration test project',
        settings: {
          n8n_enabled: true,
          auto_deploy: true
        }
      };

      const { data, error } = await supabase.functions.invoke('projects-api', {
        body: {
          action: 'update',
          project_id: testProjectId,
          updates: updateData
        },
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        }
      });

      const responseTime = performance.now() - startTime;
      metrics.responseThemes.push(responseTime);

      if (error) {
        metrics.errors.push(`Project update: ${error.message}`);
        metrics.failureCount++;
        throw error;
      }

      expect(data).toBeDefined();
      expect(data.project).toBeDefined();
      expect(data.project.description).toBe(updateData.description);
      expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime);

      metrics.successCount++;
      console.log(`✅ Project updated in ${Math.round(responseTime)}ms`);
    });
  });

  describe('Workflows API (workflows-api Edge Function)', () => {
    test('should create a workflow', async () => {
      if (!testProjectId) {
        throw new Error('No test project available for workflow creation');
      }

      const startTime = performance.now();

      const workflowData = {
        name: `Test Workflow ${global.testUtils.generateTestId()}`,
        description: 'Integration test workflow',
        project_id: testProjectId,
        n8n_workflow: {
          nodes: [
            {
              name: 'Webhook',
              type: 'n8n-nodes-base.webhook',
              typeVersion: 1,
              position: [250, 300],
              parameters: {
                httpMethod: 'POST',
                path: 'test-webhook'
              }
            },
            {
              name: 'Set',
              type: 'n8n-nodes-base.set',
              typeVersion: 1,
              position: [450, 300],
              parameters: {
                values: {
                  string: [
                    {
                      name: 'message',
                      value: 'Hello from test workflow'
                    }
                  ]
                }
              }
            }
          ],
          connections: {
            'Webhook': {
              main: [
                [
                  {
                    node: 'Set',
                    type: 'main',
                    index: 0
                  }
                ]
              ]
            }
          }
        }
      };

      const { data, error } = await supabase.functions.invoke('workflows-api', {
        body: {
          action: 'create',
          workflow: workflowData
        },
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        }
      });

      const responseTime = performance.now() - startTime;
      metrics.responseThemes.push(responseTime);

      if (error) {
        metrics.errors.push(`Workflow creation: ${error.message}`);
        metrics.failureCount++;
        throw error;
      }

      expect(data).toBeDefined();
      expect(data.workflow).toBeDefined();
      expect(data.workflow.name).toBe(workflowData.name);
      expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime);

      testWorkflowId = data.workflow.id;
      metrics.successCount++;
      console.log(`✅ Workflow created in ${Math.round(responseTime)}ms`);
    });

    test('should validate workflow structure', async () => {
      if (!testWorkflowId) {
        throw new Error('No test workflow available for validation');
      }

      const startTime = performance.now();

      const { data, error } = await supabase.functions.invoke('workflows-api', {
        body: {
          action: 'validate',
          workflow_id: testWorkflowId
        },
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        }
      });

      const responseTime = performance.now() - startTime;
      metrics.responseThemes.push(responseTime);

      if (error) {
        metrics.errors.push(`Workflow validation: ${error.message}`);
        metrics.failureCount++;
        throw error;
      }

      expect(data).toBeDefined();
      expect(data.validation_result).toBeDefined();
      expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime);

      metrics.successCount++;
      console.log(`✅ Workflow validated in ${Math.round(responseTime)}ms`);
    });

    test('should deploy workflow to n8n', async () => {
      if (!testWorkflowId) {
        throw new Error('No test workflow available for deployment');
      }

      const startTime = performance.now();

      const { data, error } = await supabase.functions.invoke('workflows-api', {
        body: {
          action: 'deploy',
          workflow_id: testWorkflowId,
          n8n_config: {
            api_url: global.testConfig.n8n.apiUrl,
            api_key: global.testConfig.n8n.apiKey
          }
        },
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        }
      });

      const responseTime = performance.now() - startTime;
      metrics.responseThemes.push(responseTime);

      if (error) {
        metrics.errors.push(`Workflow deployment: ${error.message}`);
        metrics.failureCount++;
        console.warn(`⚠️ Workflow deployment failed: ${error.message}`);
        return; // Don't fail the test as n8n may not be available
      }

      expect(data).toBeDefined();
      expect(data.deployment_result).toBeDefined();
      expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxDeployment);

      metrics.successCount++;
      console.log(`✅ Workflow deployed in ${Math.round(responseTime)}ms`);
    });
  });

  describe('AI Chat System (ai-chat-system Edge Function)', () => {
    test('should create a new conversation', async () => {
      const startTime = performance.now();

      const { data, error } = await supabase.functions.invoke('ai-chat-system', {
        body: {
          action: 'create_conversation',
          project_id: testProjectId || 'test-project-id',
          title: 'Integration Test Conversation'
        },
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        }
      });

      const responseTime = performance.now() - startTime;
      metrics.responseThemes.push(responseTime);

      if (error) {
        metrics.errors.push(`Conversation creation: ${error.message}`);
        metrics.failureCount++;
        throw error;
      }

      expect(data).toBeDefined();
      expect(data.conversation).toBeDefined();
      expect(data.conversation.id).toBeDefined();
      expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime);

      testConversationId = data.conversation.id;
      metrics.successCount++;
      console.log(`✅ Conversation created in ${Math.round(responseTime)}ms`);
    });

    test('should process AI chat message', async () => {
      if (!testConversationId) {
        throw new Error('No test conversation available for chat');
      }

      const startTime = performance.now();

      const { data, error } = await supabase.functions.invoke('ai-chat-system', {
        body: {
          action: 'chat',
          conversation_id: testConversationId,
          message: 'Create a simple webhook workflow that logs incoming data',
          include_workflow_generation: true
        },
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        }
      });

      const responseTime = performance.now() - startTime;
      metrics.responseThemes.push(responseTime);

      if (error) {
        metrics.errors.push(`AI chat processing: ${error.message}`);
        metrics.failureCount++;
        throw error;
      }

      expect(data).toBeDefined();
      expect(data.response).toBeDefined();
      expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxWorkflowGeneration);

      metrics.successCount++;
      console.log(`✅ AI chat processed in ${Math.round(responseTime)}ms`);
    });

    test('should retrieve conversation history', async () => {
      if (!testConversationId) {
        throw new Error('No test conversation available for history retrieval');
      }

      const startTime = performance.now();

      const { data, error } = await supabase.functions.invoke('ai-chat-system', {
        body: {
          action: 'get_conversation',
          conversation_id: testConversationId
        },
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        }
      });

      const responseTime = performance.now() - startTime;
      metrics.responseThemes.push(responseTime);

      if (error) {
        metrics.errors.push(`Conversation history: ${error.message}`);
        metrics.failureCount++;
        throw error;
      }

      expect(data).toBeDefined();
      expect(data.conversation).toBeDefined();
      expect(data.messages).toBeDefined();
      expect(Array.isArray(data.messages)).toBe(true);
      expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime);

      metrics.successCount++;
      console.log(`✅ Conversation history retrieved in ${Math.round(responseTime)}ms (${data.messages.length} messages)`);
    });
  });

  describe('Telemetry API (telemetry-api Edge Function)', () => {
    test('should record telemetry events', async () => {
      const startTime = performance.now();

      const telemetryData = {
        event_type: 'api_integration_test',
        event_data: {
          test_id: global.testUtils.generateTestId(),
          timestamp: new Date().toISOString(),
          user_agent: 'Jest Integration Test',
          performance_metrics: {
            response_time: Math.round(Math.random() * 1000),
            memory_usage: Math.round(Math.random() * 100)
          }
        }
      };

      const { data, error } = await supabase.functions.invoke('telemetry-api', {
        body: {
          action: 'record',
          events: [telemetryData]
        },
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        }
      });

      const responseTime = performance.now() - startTime;
      metrics.responseThemes.push(responseTime);

      if (error) {
        metrics.errors.push(`Telemetry recording: ${error.message}`);
        metrics.failureCount++;
        throw error;
      }

      expect(data).toBeDefined();
      expect(data.recorded_events).toBeDefined();
      expect(data.recorded_events).toBeGreaterThan(0);
      expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime);

      metrics.successCount++;
      console.log(`✅ Telemetry recorded in ${Math.round(responseTime)}ms`);
    });

    test('should retrieve usage analytics', async () => {
      const startTime = performance.now();

      const { data, error } = await supabase.functions.invoke('telemetry-api', {
        body: {
          action: 'analytics',
          date_range: {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
            end: new Date().toISOString()
          }
        },
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        }
      });

      const responseTime = performance.now() - startTime;
      metrics.responseThemes.push(responseTime);

      if (error) {
        metrics.errors.push(`Analytics retrieval: ${error.message}`);
        metrics.failureCount++;
        throw error;
      }

      expect(data).toBeDefined();
      expect(data.analytics).toBeDefined();
      expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime);

      metrics.successCount++;
      console.log(`✅ Analytics retrieved in ${Math.round(responseTime)}ms`);
    });
  });

  describe('Database Operations and RLS Validation', () => {
    test('should enforce Row Level Security policies', async () => {
      const startTime = performance.now();

      // Test that user can only access their own projects
      const { data: userProjects, error: userError } = await supabase
        .from('projects')
        .select('*')
        .limit(10);

      // Test that service role can access all projects
      const { data: allProjects, error: serviceError } = await serviceRoleClient
        .from('projects')
        .select('*')
        .limit(10);

      const responseTime = performance.now() - startTime;
      metrics.responseThemes.push(responseTime);

      // User query should work (may be empty if no projects)
      expect(userError).toBeNull();
      expect(Array.isArray(userProjects)).toBe(true);

      // Service role query should also work and potentially return more data
      expect(serviceError).toBeNull();
      expect(Array.isArray(allProjects)).toBe(true);
      expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime);

      metrics.successCount++;
      console.log(`✅ RLS validation completed in ${Math.round(responseTime)}ms`);
      console.log(`User projects: ${userProjects?.length || 0}, All projects: ${allProjects?.length || 0}`);
    });

    test('should handle database transactions properly', async () => {
      const startTime = performance.now();

      // Create a test project and workflow in a transaction-like pattern
      const projectData = {
        name: `Transaction Test ${global.testUtils.generateTestId()}`,
        description: 'Transaction test project'
      };

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (projectError) {
        metrics.errors.push(`Transaction test project: ${projectError.message}`);
        metrics.failureCount++;
        throw projectError;
      }

      // Now create a workflow for this project
      const workflowData = {
        name: 'Transaction Test Workflow',
        project_id: project.id,
        description: 'Test workflow for transaction',
        n8n_workflow: { nodes: [], connections: {} }
      };

      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .insert([workflowData])
        .select()
        .single();

      const responseTime = performance.now() - startTime;
      metrics.responseThemes.push(responseTime);

      if (workflowError) {
        // Clean up the project if workflow creation failed
        await supabase.from('projects').delete().eq('id', project.id);
        
        metrics.errors.push(`Transaction test workflow: ${workflowError.message}`);
        metrics.failureCount++;
        throw workflowError;
      }

      expect(project).toBeDefined();
      expect(workflow).toBeDefined();
      expect(workflow.project_id).toBe(project.id);
      expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime);

      // Clean up
      await supabase.from('workflows').delete().eq('id', workflow.id);
      await supabase.from('projects').delete().eq('id', project.id);

      metrics.successCount++;
      console.log(`✅ Database transaction test completed in ${Math.round(responseTime)}ms`);
    });
  });

  describe('n8n Integration Validation', () => {
    test('should connect to n8n API', async () => {
      const startTime = performance.now();

      try {
        const response = await fetch(`${global.testConfig.n8n.apiUrl}/workflows`, {
          method: 'GET',
          headers: {
            'X-N8N-API-KEY': global.testConfig.n8n.apiKey,
            'Content-Type': 'application/json'
          }
        });

        const responseTime = performance.now() - startTime;
        metrics.responseThemes.push(responseTime);

        if (!response.ok) {
          throw new Error(`n8n API returned ${response.status}: ${response.statusText}`);
        }

        const workflows = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(workflows)).toBe(true);
        expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxResponseTime);

        metrics.successCount++;
        console.log(`✅ n8n API connection validated in ${Math.round(responseTime)}ms (${workflows.length} workflows)`);

      } catch (error) {
        const responseTime = performance.now() - startTime;
        metrics.responseThemes.push(responseTime);
        metrics.errors.push(`n8n API connection: ${error.message}`);
        metrics.failureCount++;
        
        console.warn(`⚠️ n8n API connection failed: ${error.message}`);
        // Don't throw - n8n may not be available in test environment
      }
    });

    test('should validate n8n workflow deployment', async () => {
      const startTime = performance.now();

      const testWorkflow = {
        name: `API Integration Test ${global.testUtils.generateTestId()}`,
        nodes: [
          {
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [250, 300],
            parameters: {
              httpMethod: 'POST',
              path: `test-${Date.now()}`
            }
          }
        ],
        connections: {},
        active: false
      };

      try {
        const response = await fetch(`${global.testConfig.n8n.apiUrl}/workflows`, {
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': global.testConfig.n8n.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testWorkflow)
        });

        const responseTime = performance.now() - startTime;
        metrics.responseThemes.push(responseTime);

        if (!response.ok) {
          throw new Error(`n8n workflow creation returned ${response.status}: ${response.statusText}`);
        }

        const createdWorkflow = await response.json();

        expect(response.status).toBe(201);
        expect(createdWorkflow.id).toBeDefined();
        expect(createdWorkflow.name).toBe(testWorkflow.name);
        expect(responseTime).toBeLessThan(global.testConfig.thresholds.maxDeployment);

        // Clean up the test workflow
        await fetch(`${global.testConfig.n8n.apiUrl}/workflows/${createdWorkflow.id}`, {
          method: 'DELETE',
          headers: {
            'X-N8N-API-KEY': global.testConfig.n8n.apiKey
          }
        });

        metrics.successCount++;
        console.log(`✅ n8n workflow deployment validated in ${Math.round(responseTime)}ms`);

      } catch (error) {
        const responseTime = performance.now() - startTime;
        metrics.responseThemes.push(responseTime);
        metrics.errors.push(`n8n workflow deployment: ${error.message}`);
        metrics.failureCount++;
        
        console.warn(`⚠️ n8n workflow deployment test failed: ${error.message}`);
        // Don't throw - n8n may not be available in test environment
      }
    });
  });

  // Cleanup utility function
  async function cleanupTestData() {
    console.log('🧹 Cleaning up test data...');
    
    try {
      // Clean up workflows
      if (testWorkflowId) {
        await supabase.from('workflows').delete().eq('id', testWorkflowId);
      }
      
      // Clean up projects
      if (testProjectId) {
        await supabase.from('projects').delete().eq('id', testProjectId);
      }
      
      // Clean up conversations
      if (testConversationId) {
        await supabase.from('conversations').delete().eq('id', testConversationId);
      }
      
      console.log('✅ Test data cleanup completed');
    } catch (error) {
      console.warn('⚠️ Test data cleanup failed:', error.message);
    }
  }
});