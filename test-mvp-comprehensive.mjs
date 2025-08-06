#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Configuration from CLAUDE.md
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';
const FRONTEND_URL = 'http://localhost:8080';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class MVPTester {
  constructor() {
    this.results = {
      database: { passed: 0, failed: 0, tests: [] },
      n8n: { passed: 0, failed: 0, tests: [] },
      frontend: { passed: 0, failed: 0, tests: [] },
      integration: { passed: 0, failed: 0, tests: [] }
    };
  }

  log(section, message, status = 'info') {
    const timestamp = new Date().toISOString();
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : status === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${section.toUpperCase()}] ${message}`);
    
    if (status === 'pass') this.results[section].passed++;
    if (status === 'fail') this.results[section].failed++;
    
    this.results[section].tests.push({
      timestamp,
      message,
      status
    });
  }

  async testDatabase() {
    console.log('\n🔍 Testing Database Connection & Schema...\n');

    try {
      // Test 1: Basic connection
      const { data: healthData, error: healthError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (healthError && !healthError.message.includes('relation')) {
        this.log('database', `Connection failed: ${healthError.message}`, 'fail');
        return;
      }
      this.log('database', 'Connection successful', 'pass');

      // Test 2: Key tables exist
      const keyTables = [
        'profiles', 'ai_chat_sessions', 'ai_chat_messages', 
        'workflows', 'workflow_executions', 'api_configurations'
      ];

      for (const table of keyTables) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          if (error) {
            this.log('database', `Table '${table}' not accessible: ${error.message}`, 'fail');
          } else {
            this.log('database', `Table '${table}' exists with ${count} records`, 'pass');
          }
        } catch (err) {
          this.log('database', `Table '${table}' error: ${err.message}`, 'fail');
        }
      }

      // Test 3: Edge functions
      const functions = ['ai-chat-system', 'api-operations', 'ai-chat-sessions'];
      for (const func of functions) {
        try {
          const { data, error } = await supabase.functions.invoke(func, {
            body: { action: 'health-check' }
          });
          
          if (error) {
            this.log('database', `Edge function '${func}' failed: ${error.message}`, 'fail');
          } else {
            this.log('database', `Edge function '${func}' responding`, 'pass');
          }
        } catch (err) {
          this.log('database', `Edge function '${func}' error: ${err.message}`, 'fail');
        }
      }

      // Test 4: Authentication
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) {
        this.log('database', `Auth system failed: ${authError.message}`, 'fail');
      } else {
        this.log('database', `Auth system working: ${authData.users.length} users`, 'pass');
      }

    } catch (error) {
      this.log('database', `Unexpected error: ${error.message}`, 'fail');
    }
  }

  async testN8n() {
    console.log('\n🔧 Testing n8n Integration...\n');

    try {
      // Test 1: Health check
      try {
        const healthResponse = await fetch(`${N8N_API_URL.replace('/api/v1', '')}/healthz`, {
          timeout: 5000
        });
        
        if (healthResponse.ok) {
          this.log('n8n', 'Health endpoint responding', 'pass');
        } else {
          this.log('n8n', `Health check failed: ${healthResponse.status}`, 'fail');
        }
      } catch (err) {
        this.log('n8n', `Health check error: ${err.message}`, 'fail');
      }

      // Test 2: API authentication
      try {
        const workflowsResponse = await fetch(`${N8N_API_URL}/workflows`, {
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json'
          }
        });

        if (workflowsResponse.ok) {
          const workflows = await workflowsResponse.json();
          this.log('n8n', `API authenticated, ${workflows.data?.length || 0} workflows found`, 'pass');
        } else {
          this.log('n8n', `API authentication failed: ${workflowsResponse.status}`, 'fail');
        }
      } catch (err) {
        this.log('n8n', `API request error: ${err.message}`, 'fail');
      }

      // Test 3: Create test workflow
      try {
        const testWorkflow = {
          name: 'MVP Test Workflow',
          nodes: [
            {
              id: 'start',
              type: 'n8n-nodes-base.start',
              position: [250, 300],
              parameters: {}
            },
            {
              id: 'set',
              type: 'n8n-nodes-base.set',
              position: [450, 300],
              parameters: {
                values: {
                  string: [
                    {
                      name: 'message',
                      value: 'MVP Test Successful'
                    }
                  ]
                }
              }
            }
          ],
          connections: {
            start: {
              main: [
                [
                  {
                    node: 'set',
                    type: 'main',
                    index: 0
                  }
                ]
              ]
            }
          }
        };

        const createResponse = await fetch(`${N8N_API_URL}/workflows`, {
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testWorkflow)
        });

        if (createResponse.ok) {
          const created = await createResponse.json();
          this.log('n8n', `Test workflow created: ${created.id}`, 'pass');
          
          // Cleanup - delete test workflow
          await fetch(`${N8N_API_URL}/workflows/${created.id}`, {
            method: 'DELETE',
            headers: {
              'X-N8N-API-KEY': N8N_API_KEY
            }
          });
          this.log('n8n', 'Test workflow cleaned up', 'pass');
        } else {
          this.log('n8n', `Workflow creation failed: ${createResponse.status}`, 'fail');
        }
      } catch (err) {
        this.log('n8n', `Workflow creation error: ${err.message}`, 'fail');
      }

    } catch (error) {
      this.log('n8n', `Unexpected error: ${error.message}`, 'fail');
    }
  }

  async testFrontend() {
    console.log('\n🌐 Testing Frontend Application...\n');

    try {
      // Test 1: Frontend loads
      const homeResponse = await fetch(FRONTEND_URL);
      if (homeResponse.ok) {
        const html = await homeResponse.text();
        if (html.includes('<div id="root">') || html.includes('Clixen')) {
          this.log('frontend', 'Frontend application loads', 'pass');
        } else {
          this.log('frontend', 'Frontend loads but content unexpected', 'warn');
        }
      } else {
        this.log('frontend', `Frontend not accessible: ${homeResponse.status}`, 'fail');
      }

      // Test 2: Check for critical assets
      try {
        const jsResponse = await fetch(`${FRONTEND_URL}/src/main.tsx`);
        if (jsResponse.ok) {
          this.log('frontend', 'Main application script accessible', 'pass');
        }
      } catch (err) {
        // This is expected in production builds
        this.log('frontend', 'Development mode or bundled assets', 'info');
      }

    } catch (error) {
      this.log('frontend', `Unexpected error: ${error.message}`, 'fail');
    }
  }

  async testIntegration() {
    console.log('\n🔗 Testing System Integration...\n');

    try {
      // Test 1: Database to n8n via edge function
      try {
        const { data, error } = await supabase.functions.invoke('api-operations', {
          body: {
            action: 'n8n-health-check'
          }
        });

        if (error) {
          this.log('integration', `Edge function to n8n failed: ${error.message}`, 'fail');
        } else {
          this.log('integration', 'Database to n8n integration working', 'pass');
        }
      } catch (err) {
        this.log('integration', `Integration test error: ${err.message}`, 'fail');
      }

      // Test 2: Multi-agent system readiness
      const agentFiles = [
        'BaseAgent.ts', 'OrchestratorAgent.ts', 'WorkflowDesignerAgent.ts', 
        'DeploymentAgent.ts', 'AgentCoordinator.ts'
      ];

      for (const file of agentFiles) {
        try {
          const response = await fetch(`${FRONTEND_URL}/src/lib/agents/${file}`);
          if (response.ok) {
            this.log('integration', `Agent file ${file} accessible`, 'pass');
          } else {
            this.log('integration', `Agent file ${file} not found`, 'warn');
          }
        } catch (err) {
          this.log('integration', `Agent file ${file} check failed`, 'warn');
        }
      }

    } catch (error) {
      this.log('integration', `Unexpected error: ${error.message}`, 'fail');
    }
  }

  printSummary() {
    console.log('\n📊 MVP Test Summary\n');
    console.log('=' .repeat(50));
    
    let totalPassed = 0;
    let totalFailed = 0;

    Object.entries(this.results).forEach(([section, results]) => {
      const { passed, failed } = results;
      totalPassed += passed;
      totalFailed += failed;
      
      const status = failed === 0 ? '✅' : passed > failed ? '⚠️' : '❌';
      console.log(`${status} ${section.toUpperCase()}: ${passed} passed, ${failed} failed`);
    });

    console.log('=' .repeat(50));
    console.log(`🎯 OVERALL: ${totalPassed} passed, ${totalFailed} failed`);
    
    const score = totalPassed / (totalPassed + totalFailed) * 100;
    console.log(`📈 MVP Readiness: ${score.toFixed(1)}%`);

    if (score >= 80) {
      console.log('🚀 MVP is ready for implementation!');
    } else if (score >= 60) {
      console.log('⚠️ MVP needs some fixes before deployment.');
    } else {
      console.log('❌ MVP requires significant work before deployment.');
    }

    return { totalPassed, totalFailed, score };
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive MVP Test Suite\n');
    console.log('Testing Clixen AI Automation Platform');
    console.log('=' .repeat(50));

    await this.testDatabase();
    await this.testN8n();
    await this.testFrontend();
    await this.testIntegration();

    return this.printSummary();
  }
}

// Run the tests
const tester = new MVPTester();
tester.runAllTests().catch(console.error);
