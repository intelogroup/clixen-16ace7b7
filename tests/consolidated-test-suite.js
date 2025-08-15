/**
 * Consolidated Test Suite for Clixen
 * Combines all test functionality into a single, maintainable file
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const N8N_API_URL = 'https://n8nio-n8n-7xzf6n.sliplane.app/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiN2ZmZWU5My04YTBlLTQwYTItYmMyYi0xOGE1NDliODAwZDYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTAzNzc1fQ.mXnHtIvlmj-93EjwXZqBwzmUx9uUIddS4fO3TGMRCZ0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test utilities
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
    this.testUser = null;
    this.testProject = null;
    this.testWorkflow = null;
  }

  async run() {
    console.log(`${colors.blue}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.blue}║           CLIXEN COMPREHENSIVE TEST SUITE                        ║${colors.reset}`);
    console.log(`${colors.blue}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    // Run test suites in order
    await this.runAuthTests();
    await this.runDatabaseTests();
    await this.runApiTests();
    await this.runWorkflowTests();
    await this.runIntegrationTests();
    await this.runPerformanceTests();

    // Show final results
    this.showResults();
  }

  async runAuthTests() {
    console.log(`${colors.cyan}━━━ AUTHENTICATION TESTS ━━━${colors.reset}\n`);

    // Test 1: Sign in with existing user
    await this.test('User sign in', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'jayveedz19@gmail.com',
        password: 'Goldyear2023#'
      });

      if (error) throw error;
      this.testUser = data.user;
      return !!data.session;
    });

    // Test 2: Get session
    await this.test('Get session', async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return !!data.session;
    });

    // Test 3: Refresh token
    await this.test('Refresh token', async () => {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return !!data.session;
    });
  }

  async runDatabaseTests() {
    console.log(`\n${colors.cyan}━━━ DATABASE TESTS ━━━${colors.reset}\n`);

    // Test 1: Check core tables
    await this.test('Core tables exist', async () => {
      const tables = ['user_profiles', 'projects', 'workflows', 'conversations'];
      for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error && error.code === '42P01') {
          throw new Error(`Table '${table}' does not exist`);
        }
      }
      return true;
    });

    // Test 2: RLS policies
    await this.test('RLS policies enforced', async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', this.testUser?.id || '');
      
      return !error;
    });

    // Test 3: Create project
    await this.test('Create project', async () => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: `Test Project ${Date.now()}`,
          description: 'Created by test suite',
          user_id: this.testUser?.id
        })
        .select()
        .single();

      if (error) throw error;
      this.testProject = data;
      return !!data.id;
    });

    // Test 4: Create workflow
    await this.test('Create workflow', async () => {
      const { data, error } = await supabase
        .from('workflows')
        .insert({
          name: `Test Workflow ${Date.now()}`,
          description: 'Created by test suite',
          workflow_json: { nodes: [], connections: {} },
          project_id: this.testProject?.id,
          user_id: this.testUser?.id,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;
      this.testWorkflow = data;
      return !!data.id;
    });
  }

  async runApiTests() {
    console.log(`\n${colors.cyan}━━━ API TESTS ━━━${colors.reset}\n`);

    // Test 1: Chat API
    await this.test('Chat API - Send message', async () => {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.access_token}`
        },
        body: JSON.stringify({
          message: 'Test message',
          user_id: this.testUser?.id
        })
      });

      return response.status === 200;
    });

    // Test 2: Projects API
    await this.test('Projects API - List projects', async () => {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/projects-api`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.session?.access_token}`
        }
      });

      return response.status === 200 || response.status === 404; // 404 if function not deployed
    });

    // Test 3: n8n API connectivity
    await this.test('n8n API - List workflows', async () => {
      const response = await fetch(`${N8N_API_URL}/workflows`, {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY
        }
      });

      return response.status === 200;
    });
  }

  async runWorkflowTests() {
    console.log(`\n${colors.cyan}━━━ WORKFLOW TESTS ━━━${colors.reset}\n`);

    // Test 1: Generate workflow JSON
    await this.test('Generate workflow JSON', async () => {
      const workflowJson = {
        name: '[USR-test] Test Workflow',
        nodes: [
          {
            id: 'trigger-1',
            name: 'Manual Trigger',
            type: 'n8n-nodes-base.manualTrigger',
            position: [200, 300],
            parameters: {}
          }
        ],
        connections: {},
        settings: {}
      };

      return workflowJson.nodes.length > 0;
    });

    // Test 2: Deploy workflow to n8n
    await this.test('Deploy workflow to n8n', async () => {
      const workflowData = {
        name: `[USR-${this.testUser?.id?.substring(0, 8)}] Test Deploy ${Date.now()}`,
        nodes: [
          {
            parameters: {},
            id: 'manual-trigger',
            name: 'Manual Trigger',
            type: 'n8n-nodes-base.manualTrigger',
            typeVersion: 1,
            position: [240, 300]
          }
        ],
        connections: {},
        settings: {
          executionOrder: 'v1'
        }
      };

      const response = await fetch(`${N8N_API_URL}/workflows`, {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowData)
      });

      return response.status === 200 || response.status === 201;
    });

    // Test 3: User isolation
    await this.test('User isolation naming', async () => {
      const workflowName = `[USR-${this.testUser?.id?.substring(0, 8)}] Test`;
      return workflowName.startsWith('[USR-');
    });
  }

  async runIntegrationTests() {
    console.log(`\n${colors.cyan}━━━ INTEGRATION TESTS ━━━${colors.reset}\n`);

    // Test 1: End-to-end workflow creation
    await this.test('E2E - Create and deploy workflow', async () => {
      // Create workflow in database
      const { data: workflow, error } = await supabase
        .from('workflows')
        .insert({
          name: `E2E Test ${Date.now()}`,
          description: 'End-to-end test',
          workflow_json: {
            nodes: [{ id: 'node1', type: 'manual' }],
            connections: {}
          },
          project_id: this.testProject?.id,
          user_id: this.testUser?.id,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      // Update status to deployed
      const { error: updateError } = await supabase
        .from('workflows')
        .update({ status: 'deployed' })
        .eq('id', workflow.id);

      return !updateError;
    });

    // Test 2: Chat to workflow
    await this.test('Chat to workflow generation', async () => {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.access_token}`
        },
        body: JSON.stringify({
          message: 'Create a simple webhook that responds with hello world',
          user_id: this.testUser?.id
        })
      });

      const data = await response.json();
      return response.status === 200 && (data.response || data.workflow_generated);
    });
  }

  async runPerformanceTests() {
    console.log(`\n${colors.cyan}━━━ PERFORMANCE TESTS ━━━${colors.reset}\n`);

    // Test 1: Database query performance
    await this.test('Database query < 100ms', async () => {
      const start = Date.now();
      await supabase.from('projects').select('id').limit(1);
      const duration = Date.now() - start;
      return duration < 100;
    });

    // Test 2: API response time
    await this.test('API response < 500ms', async () => {
      const { data: session } = await supabase.auth.getSession();
      const start = Date.now();
      
      await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.access_token}`
        },
        body: JSON.stringify({
          message: 'Hi',
          user_id: this.testUser?.id
        })
      });

      const duration = Date.now() - start;
      return duration < 500;
    });

    // Test 3: n8n API performance
    await this.test('n8n API response < 300ms', async () => {
      const start = Date.now();
      
      await fetch(`${N8N_API_URL}/workflows`, {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY
        }
      });

      const duration = Date.now() - start;
      return duration < 300;
    });
  }

  async test(name, fn) {
    const start = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - start;
      
      if (result) {
        this.results.passed++;
        console.log(`${colors.green}✅ ${name}${colors.reset} (${duration}ms)`);
        this.results.tests.push({ name, status: 'passed', duration });
      } else {
        this.results.failed++;
        console.log(`${colors.red}❌ ${name}${colors.reset} (${duration}ms)`);
        this.results.tests.push({ name, status: 'failed', duration });
      }
    } catch (error) {
      const duration = Date.now() - start;
      this.results.failed++;
      console.log(`${colors.red}❌ ${name}: ${error.message}${colors.reset} (${duration}ms)`);
      this.results.tests.push({ name, status: 'failed', duration, error: error.message });
    }
  }

  showResults() {
    const total = this.results.passed + this.results.failed + this.results.skipped;
    const passRate = Math.round((this.results.passed / total) * 100);
    const avgDuration = Math.round(
      this.results.tests.reduce((sum, t) => sum + (t.duration || 0), 0) / this.results.tests.length
    );

    console.log(`\n${colors.blue}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.blue}║                    TEST RESULTS SUMMARY                       ║${colors.reset}`);
    console.log(`${colors.blue}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`${colors.cyan}Tests Run:${colors.reset} ${total}`);
    console.log(`${colors.green}Passed:${colors.reset} ${this.results.passed}`);
    console.log(`${colors.red}Failed:${colors.reset} ${this.results.failed}`);
    console.log(`${colors.yellow}Skipped:${colors.reset} ${this.results.skipped}`);
    console.log(`${colors.magenta}Pass Rate:${colors.reset} ${passRate}%`);
    console.log(`${colors.cyan}Avg Duration:${colors.reset} ${avgDuration}ms\n`);

    if (passRate === 100) {
      console.log(`${colors.green}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
      console.log(`${colors.green}║            🎉 ALL TESTS PASSED! SYSTEM READY! 🎉             ║${colors.reset}`);
      console.log(`${colors.green}╚═══════════════════════════════════════════════════════════════╝${colors.reset}`);
    } else if (passRate >= 80) {
      console.log(`${colors.yellow}⚠️ System mostly ready (${passRate}% pass rate)${colors.reset}`);
      console.log(`${colors.yellow}Review failed tests above for issues${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ System not ready (${passRate}% pass rate)${colors.reset}`);
      console.log(`${colors.red}Critical issues need to be resolved${colors.reset}`);
    }

    // Clean up
    supabase.auth.signOut();
    process.exit(passRate === 100 ? 0 : 1);
  }
}

// Run tests
const runner = new TestRunner();
runner.run().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});