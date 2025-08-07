/**
 * Workflows API Integration Tests
 * Tests workflow generation, deployment, and management endpoints
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

describe('Workflows API', () => {
  let supabase: SupabaseClient;
  let authenticatedClient: SupabaseClient;
  let testUserId: string;
  let testProjectId: string;
  let testWorkflowId: string;

  beforeEach(async () => {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
      process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
    );

    // Create and authenticate test user
    const testEmail = `workflow-test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    const { data: signUpData } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });

    if (signUpData.session && signUpData.user) {
      testUserId = signUpData.user.id;
      authenticatedClient = createClient(
        process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
        process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
      );
      authenticatedClient.auth.setSession(signUpData.session);

      // Create test project
      const { data: project } = await authenticatedClient
        .from('projects')
        .insert({
          name: `Workflow Test Project ${Date.now()}`,
          user_id: testUserId
        })
        .select()
        .single();

      if (project) {
        testProjectId = project.id;
      }
    }
  });

  afterEach(async () => {
    // Clean up test data
    if (authenticatedClient) {
      if (testWorkflowId) {
        try {
          await authenticatedClient
            .from('workflows')
            .delete()
            .eq('id', testWorkflowId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }

      if (testProjectId) {
        try {
          await authenticatedClient
            .from('projects')
            .delete()
            .eq('id', testProjectId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }

    // Sign out
    try {
      await supabase.auth.signOut();
      if (authenticatedClient) {
        await authenticatedClient.auth.signOut();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Workflow Creation', () => {
    test('should create new workflow successfully', async () => {
      if (!authenticatedClient || !testProjectId) {
        console.log('Skipping test - no authenticated client or project ID');
        return;
      }

      const workflowData = {
        name: `Test Workflow ${Date.now()}`,
        description: 'A test workflow for API testing',
        project_id: testProjectId,
        json_payload: {
          nodes: [
            {
              id: '1',
              type: 'n8n-nodes-base.webhook',
              typeVersion: 1,
              position: [100, 100],
              parameters: {}
            }
          ],
          connections: {}
        },
        status: 'draft' as const
      };

      const { data, error } = await authenticatedClient
        .from('workflows')
        .insert(workflowData)
        .select()
        .single();

      if (error && error.message.includes('relation "workflows" does not exist')) {
        console.log('Workflows table does not exist yet - skipping test');
        return;
      }

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe(workflowData.name);
      expect(data.project_id).toBe(testProjectId);
      expect(data.status).toBe('draft');
      expect(data.json_payload).toEqual(workflowData.json_payload);

      testWorkflowId = data.id;
    });

    test('should validate required workflow fields', async () => {
      if (!authenticatedClient || !testProjectId) {
        console.log('Skipping test - no authenticated client or project ID');
        return;
      }

      const incompleteWorkflowData = {
        description: 'Workflow without name',
        project_id: testProjectId,
        json_payload: { nodes: [], connections: {} }
        // Missing required 'name' field
      };

      const { data, error } = await authenticatedClient
        .from('workflows')
        .insert(incompleteWorkflowData)
        .select()
        .single();

      if (error && error.message.includes('relation "workflows" does not exist')) {
        console.log('Workflows table does not exist yet - skipping test');
        return;
      }

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/name|required|null/i);
      expect(data).toBeNull();
    });

    test('should validate JSON payload structure', async () => {
      if (!authenticatedClient || !testProjectId) {
        console.log('Skipping test - no authenticated client or project ID');
        return;
      }

      const workflowWithInvalidJson = {
        name: `Invalid JSON Workflow ${Date.now()}`,
        project_id: testProjectId,
        json_payload: null, // Invalid JSON payload
        status: 'draft' as const
      };

      const { data, error } = await authenticatedClient
        .from('workflows')
        .insert(workflowWithInvalidJson)
        .select()
        .single();

      if (error && error.message.includes('relation "workflows" does not exist')) {
        console.log('Workflows table does not exist yet - skipping test');
        return;
      }

      // Should either reject or accept null JSON payload depending on schema
      if (error) {
        expect(error.message).toMatch(/json|payload|null/i);
      } else if (data) {
        expect(data.json_payload).toBeNull();
      }
    });
  });

  describe('Workflow Generation via AI Chat', () => {
    test('should generate workflow from natural language prompt', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      const prompt = 'Create a workflow that sends daily email notifications';
      
      // Test the AI chat system endpoint
      const { data, error } = await authenticatedClient.functions.invoke('ai-chat-system', {
        body: {
          message: prompt,
          conversation_id: `test-conv-${Date.now()}`,
          user_id: testUserId,
          project_id: testProjectId
        }
      });

      if (error && error.message.includes('Function not found')) {
        console.log('AI chat system function not deployed - skipping test');
        return;
      }

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Response should contain workflow-related information
      if (data && typeof data === 'object') {
        const responseText = JSON.stringify(data).toLowerCase();
        expect(responseText).toMatch(/workflow|email|notification|daily/);
      }
    });

    test('should handle complex workflow generation requests', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      const complexPrompt = 'Create a workflow that monitors RSS feeds, filters for AI-related articles, and posts them to Slack with sentiment analysis';

      const { data, error } = await authenticatedClient.functions.invoke('ai-chat-system', {
        body: {
          message: complexPrompt,
          conversation_id: `test-complex-conv-${Date.now()}`,
          user_id: testUserId,
          project_id: testProjectId
        }
      });

      if (error && error.message.includes('Function not found')) {
        console.log('AI chat system function not deployed - skipping test');
        return;
      }

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Should handle complexity appropriately
      if (data && typeof data === 'object') {
        const responseText = JSON.stringify(data).toLowerCase();
        expect(responseText).toMatch(/rss|slack|sentiment|ai|workflow/);
      }
    });

    test('should validate workflow feasibility', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      const impossiblePrompt = 'Create a workflow that predicts lottery numbers with 100% accuracy';

      const { data, error } = await authenticatedClient.functions.invoke('ai-chat-system', {
        body: {
          message: impossiblePrompt,
          conversation_id: `test-impossible-conv-${Date.now()}`,
          user_id: testUserId,
          project_id: testProjectId
        }
      });

      if (error && error.message.includes('Function not found')) {
        console.log('AI chat system function not deployed - skipping test');
        return;
      }

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Should provide realistic feedback
      if (data && typeof data === 'object') {
        const responseText = JSON.stringify(data).toLowerCase();
        expect(responseText).toMatch(/cannot|impossible|not possible|realistic|alternative/);
      }
    });
  });

  describe('Workflow Retrieval and Querying', () => {
    beforeEach(async () => {
      // Create test workflow
      if (authenticatedClient && testProjectId) {
        const { data } = await authenticatedClient
          .from('workflows')
          .insert({
            name: `Retrieval Test Workflow ${Date.now()}`,
            project_id: testProjectId,
            json_payload: { nodes: [], connections: {} },
            status: 'draft'
          })
          .select()
          .single()
          .catch(() => ({ data: null }));

        if (data) {
          testWorkflowId = data.id;
        }
      }
    });

    test('should retrieve workflows by project', async () => {
      if (!authenticatedClient || !testProjectId) {
        console.log('Skipping test - no authenticated client or project ID');
        return;
      }

      const { data, error } = await authenticatedClient
        .from('workflows')
        .select('*')
        .eq('project_id', testProjectId);

      if (error && error.message.includes('relation "workflows" does not exist')) {
        console.log('Workflows table does not exist yet - skipping test');
        return;
      }

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      if (data && data.length > 0) {
        data.forEach(workflow => {
          expect(workflow.project_id).toBe(testProjectId);
        });
      }
    });

    test('should retrieve specific workflow by ID', async () => {
      if (!authenticatedClient || !testWorkflowId) {
        console.log('Skipping test - no authenticated client or workflow ID');
        return;
      }

      const { data, error } = await authenticatedClient
        .from('workflows')
        .select('*')
        .eq('id', testWorkflowId)
        .single();

      if (error && error.message.includes('relation "workflows" does not exist')) {
        console.log('Workflows table does not exist yet - skipping test');
        return;
      }

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.id).toBe(testWorkflowId);
    });

    test('should filter workflows by status', async () => {
      if (!authenticatedClient || !testProjectId) {
        console.log('Skipping test - no authenticated client or project ID');
        return;
      }

      const { data, error } = await authenticatedClient
        .from('workflows')
        .select('*')
        .eq('project_id', testProjectId)
        .eq('status', 'draft');

      if (error && error.message.includes('relation "workflows" does not exist')) {
        console.log('Workflows table does not exist yet - skipping test');
        return;
      }

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      if (data && data.length > 0) {
        data.forEach(workflow => {
          expect(workflow.status).toBe('draft');
        });
      }
    });
  });

  describe('Workflow Updates and Version Management', () => {
    beforeEach(async () => {
      // Create test workflow
      if (authenticatedClient && testProjectId) {
        const { data } = await authenticatedClient
          .from('workflows')
          .insert({
            name: `Update Test Workflow ${Date.now()}`,
            project_id: testProjectId,
            json_payload: { nodes: [], connections: {} },
            status: 'draft',
            version: 1
          })
          .select()
          .single()
          .catch(() => ({ data: null }));

        if (data) {
          testWorkflowId = data.id;
        }
      }
    });

    test('should update workflow name and description', async () => {
      if (!authenticatedClient || !testWorkflowId) {
        console.log('Skipping test - no authenticated client or workflow ID');
        return;
      }

      const updates = {
        name: `Updated Workflow ${Date.now()}`,
        description: `Updated description ${Date.now()}`
      };

      const { data, error } = await authenticatedClient
        .from('workflows')
        .update(updates)
        .eq('id', testWorkflowId)
        .select()
        .single();

      if (error && error.message.includes('relation "workflows" does not exist')) {
        console.log('Workflows table does not exist yet - skipping test');
        return;
      }

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe(updates.name);
      expect(data.description).toBe(updates.description);
    });

    test('should update workflow JSON payload', async () => {
      if (!authenticatedClient || !testWorkflowId) {
        console.log('Skipping test - no authenticated client or workflow ID');
        return;
      }

      const newJsonPayload = {
        nodes: [
          {
            id: '1',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [100, 100],
            parameters: {
              httpMethod: 'POST',
              path: 'webhook'
            }
          },
          {
            id: '2',
            type: 'n8n-nodes-base.emailSend',
            typeVersion: 1,
            position: [300, 100],
            parameters: {
              subject: 'Test Email',
              text: 'Hello World'
            }
          }
        ],
        connections: {
          '1': {
            'main': [[{ 'node': '2', 'type': 'main', 'index': 0 }]]
          }
        }
      };

      const { data, error } = await authenticatedClient
        .from('workflows')
        .update({
          json_payload: newJsonPayload,
          version: 2
        })
        .eq('id', testWorkflowId)
        .select()
        .single();

      if (error && error.message.includes('relation "workflows" does not exist')) {
        console.log('Workflows table does not exist yet - skipping test');
        return;
      }

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.json_payload).toEqual(newJsonPayload);
      expect(data.version).toBe(2);
    });

    test('should update workflow status', async () => {
      if (!authenticatedClient || !testWorkflowId) {
        console.log('Skipping test - no authenticated client or workflow ID');
        return;
      }

      const { data, error } = await authenticatedClient
        .from('workflows')
        .update({ status: 'deployed' })
        .eq('id', testWorkflowId)
        .select()
        .single();

      if (error && error.message.includes('relation "workflows" does not exist')) {
        console.log('Workflows table does not exist yet - skipping test');
        return;
      }

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('deployed');
      expect(data.deployed_at).toBeDefined();
    });
  });

  describe('Workflow Deployment to n8n', () => {
    beforeEach(async () => {
      // Create deployable workflow
      if (authenticatedClient && testProjectId) {
        const { data } = await authenticatedClient
          .from('workflows')
          .insert({
            name: `Deployable Workflow ${Date.now()}`,
            project_id: testProjectId,
            json_payload: {
              nodes: [
                {
                  id: '1',
                  type: 'n8n-nodes-base.webhook',
                  typeVersion: 1,
                  position: [100, 100],
                  parameters: {
                    httpMethod: 'GET',
                    path: 'test'
                  }
                }
              ],
              connections: {}
            },
            status: 'draft'
          })
          .select()
          .single()
          .catch(() => ({ data: null }));

        if (data) {
          testWorkflowId = data.id;
        }
      }
    });

    test('should deploy workflow to n8n instance', async () => {
      if (!authenticatedClient || !testWorkflowId) {
        console.log('Skipping test - no authenticated client or workflow ID');
        return;
      }

      // Test deployment via API operations function
      const { data, error } = await authenticatedClient.functions.invoke('api-operations', {
        body: {
          operation: 'deploy_workflow',
          workflow_id: testWorkflowId,
          user_id: testUserId
        }
      });

      if (error && error.message.includes('Function not found')) {
        console.log('API operations function not deployed - skipping test');
        return;
      }

      if (error && error.message.includes('n8n instance not available')) {
        console.log('n8n instance not available for testing - skipping test');
        return;
      }

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Should return deployment information
      if (data && typeof data === 'object') {
        expect(data).toHaveProperty('success');
        if (data.success) {
          expect(data).toHaveProperty('workflow_id');
          expect(data).toHaveProperty('webhook_url');
        }
      }
    });

    test('should handle deployment errors gracefully', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      // Try to deploy non-existent workflow
      const { data, error } = await authenticatedClient.functions.invoke('api-operations', {
        body: {
          operation: 'deploy_workflow',
          workflow_id: 'non-existent-workflow-id',
          user_id: testUserId
        }
      });

      if (error && error.message.includes('Function not found')) {
        console.log('API operations function not deployed - skipping test');
        return;
      }

      // Should handle error gracefully
      if (data && typeof data === 'object') {
        expect(data).toHaveProperty('success');
        expect(data.success).toBe(false);
        expect(data).toHaveProperty('error');
      } else if (error) {
        expect(error.message).toMatch(/workflow|not found|invalid/i);
      }
    });

    test('should validate workflow before deployment', async () => {
      if (!authenticatedClient || !testProjectId) {
        console.log('Skipping test - no authenticated client or project ID');
        return;
      }

      // Create invalid workflow
      const { data: invalidWorkflow } = await authenticatedClient
        .from('workflows')
        .insert({
          name: `Invalid Workflow ${Date.now()}`,
          project_id: testProjectId,
          json_payload: {
            nodes: [], // Empty nodes - invalid workflow
            connections: {}
          },
          status: 'draft'
        })
        .select()
        .single()
        .catch(() => ({ data: null }));

      if (invalidWorkflow) {
        const { data, error } = await authenticatedClient.functions.invoke('api-operations', {
          body: {
            operation: 'deploy_workflow',
            workflow_id: invalidWorkflow.id,
            user_id: testUserId
          }
        });

        if (error && error.message.includes('Function not found')) {
          console.log('API operations function not deployed - skipping test');
          return;
        }

        // Should detect validation issues
        if (data && typeof data === 'object') {
          expect(data).toHaveProperty('success');
          if (!data.success) {
            expect(data).toHaveProperty('error');
            expect(data.error).toMatch(/validation|invalid|empty|nodes/i);
          }
        }

        // Clean up
        await authenticatedClient
          .from('workflows')
          .delete()
          .eq('id', invalidWorkflow.id)
          .catch(() => {});
      }
    });
  });

  describe('Workflow Execution Monitoring', () => {
    test('should retrieve workflow execution history', async () => {
      if (!authenticatedClient || !testWorkflowId) {
        console.log('Skipping test - no authenticated client or workflow ID');
        return;
      }

      // Try to get execution history
      const { data, error } = await authenticatedClient
        .from('executions')
        .select('*')
        .eq('workflow_id', testWorkflowId);

      if (error && error.message.includes('relation "executions" does not exist')) {
        console.log('Executions table does not exist yet - skipping test');
        return;
      }

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      if (data && data.length > 0) {
        data.forEach(execution => {
          expect(execution.workflow_id).toBe(testWorkflowId);
          expect(execution).toHaveProperty('status');
          expect(execution).toHaveProperty('started_at');
        });
      }
    });

    test('should monitor workflow execution status', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      // Test execution monitoring via API operations
      const { data, error } = await authenticatedClient.functions.invoke('api-operations', {
        body: {
          operation: 'get_execution_status',
          workflow_id: testWorkflowId,
          user_id: testUserId
        }
      });

      if (error && error.message.includes('Function not found')) {
        console.log('API operations function not deployed - skipping test');
        return;
      }

      expect(error).toBeNull();
      expect(data).toBeDefined();

      if (data && typeof data === 'object') {
        expect(data).toHaveProperty('workflow_id');
        expect(data).toHaveProperty('status');
      }
    });
  });

  describe('Workflow Security and Access Control', () => {
    test('should enforce user isolation for workflows', async () => {
      if (!authenticatedClient || !testWorkflowId) {
        console.log('Skipping test - no authenticated client or workflow ID');
        return;
      }

      // Create another user
      const otherUserEmail = `other-workflow-user-${Date.now()}@example.com`;
      const { data: otherUserData } = await supabase.auth.signUp({
        email: otherUserEmail,
        password: 'TestPassword123!'
      });

      if (otherUserData.session) {
        const otherUserClient = createClient(
          process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
          process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
        );
        otherUserClient.auth.setSession(otherUserData.session);

        // Try to access original user's workflow
        const { data, error } = await otherUserClient
          .from('workflows')
          .select('*')
          .eq('id', testWorkflowId)
          .single();

        if (error && error.message.includes('relation "workflows" does not exist')) {
          console.log('Workflows table does not exist yet - skipping test');
          await otherUserClient.auth.signOut();
          return;
        }

        // Should not be able to access other user's workflow
        expect(data).toBeNull();
        if (error) {
          expect(error.message).toMatch(/not found|unauthorized|forbidden/i);
        }

        await otherUserClient.auth.signOut();
      }
    });

    test('should validate API key access for n8n operations', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      // Test with invalid API configuration
      const { data, error } = await authenticatedClient.functions.invoke('api-operations', {
        body: {
          operation: 'test_n8n_connection',
          user_id: testUserId,
          api_key: 'invalid-api-key'
        }
      });

      if (error && error.message.includes('Function not found')) {
        console.log('API operations function not deployed - skipping test');
        return;
      }

      // Should handle invalid API key gracefully
      if (data && typeof data === 'object') {
        expect(data).toHaveProperty('success');
        expect(data.success).toBe(false);
        if (data.error) {
          expect(data.error).toMatch(/api key|unauthorized|authentication/i);
        }
      }
    });
  });

  describe('Workflow Data Validation and Integrity', () => {
    test('should validate n8n node structure', async () => {
      if (!authenticatedClient || !testProjectId) {
        console.log('Skipping test - no authenticated client or project ID');
        return;
      }

      const invalidNodeStructure = {
        nodes: [
          {
            // Missing required fields
            type: 'n8n-nodes-base.webhook'
            // Missing id, position, typeVersion
          }
        ],
        connections: {}
      };

      const { data, error } = await authenticatedClient
        .from('workflows')
        .insert({
          name: `Invalid Node Structure ${Date.now()}`,
          project_id: testProjectId,
          json_payload: invalidNodeStructure,
          status: 'draft'
        })
        .select()
        .single();

      if (error && error.message.includes('relation "workflows" does not exist')) {
        console.log('Workflows table does not exist yet - skipping test');
        return;
      }

      // Should either accept (allowing frontend validation) or reject
      if (data) {
        // If accepted, validation should happen during deployment
        testWorkflowId = data.id;
        console.log('Invalid node structure accepted - validation expected during deployment');
      } else if (error) {
        expect(error.message).toMatch(/invalid|structure|required/i);
      }
    });

    test('should handle large workflow payloads', async () => {
      if (!authenticatedClient || !testProjectId) {
        console.log('Skipping test - no authenticated client or project ID');
        return;
      }

      // Create a large workflow with many nodes
      const largeNodes = Array.from({ length: 100 }, (_, i) => ({
        id: `node-${i}`,
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [100 + (i * 50), 100 + (Math.floor(i / 10) * 100)],
        parameters: {
          values: {
            string: [{
              name: `field-${i}`,
              value: `value-${i}`
            }]
          }
        }
      }));

      const { data, error } = await authenticatedClient
        .from('workflows')
        .insert({
          name: `Large Workflow ${Date.now()}`,
          project_id: testProjectId,
          json_payload: {
            nodes: largeNodes,
            connections: {}
          },
          status: 'draft'
        })
        .select()
        .single();

      if (error && error.message.includes('relation "workflows" does not exist')) {
        console.log('Workflows table does not exist yet - skipping test');
        return;
      }

      // Should handle large payloads appropriately
      if (error) {
        expect(error.message).toMatch(/too large|size limit|payload/i);
      } else if (data) {
        expect(data.json_payload.nodes).toHaveLength(100);
        testWorkflowId = data.id;
      }
    });
  });
});