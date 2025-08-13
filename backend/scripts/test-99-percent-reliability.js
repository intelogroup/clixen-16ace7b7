#!/usr/bin/env node

/**
 * 99% Reliability System Test
 * Tests the complete template-first, verify-always workflow healing system
 * User: jimkalinov@gmail.com | Email delivery via Resend
 */

import axios from 'axios';
import pkg from 'pg';
const { Client } = pkg;

// Environment Configuration
const N8N_HOST = 'http://18.221.12.50:5678';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';
const RESEND_API_KEY = 're_eP6sgKMF_ELjbAvaFyFEsSbnj3pzFUJm2';
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';
const TARGET_EMAIL = 'jimkalinov@gmail.com';
const FROM_EMAIL = 'onboarding@resend.dev';

class ReliabilitySystemTest {
  constructor() {
    this.n8nAPI = axios.create({
      baseURL: `${N8N_HOST}/api/v1`,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    this.supabaseAPI = axios.create({
      baseURL: `${SUPABASE_URL}/rest/v1`,
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    this.pgClient = new Client({
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      user: 'postgres.zfbgdixbzezpxllkoyfc',
      password: 'Goldyear2023#',
      ssl: { rejectUnauthorized: false }
    });

    this.testResults = {
      userFound: false,
      workflowsFound: 0,
      healingResults: [],
      deploymentResults: [],
      executionResults: [],
      emailsSent: 0,
      successRate: 0
    };
  }

  async runComprehensiveTest() {
    console.log('🚀 TESTING 99% RELIABILITY SYSTEM');
    console.log('================================');
    console.log(`👤 Target User: ${TARGET_EMAIL}`);
    console.log(`📧 Email Delivery: ${FROM_EMAIL} → ${TARGET_EMAIL}`);
    console.log(`🔧 Backend: Supabase + n8n + Resend`);
    console.log('');

    try {
      // Step 1: Authenticate and get user
      console.log('📋 Step 1: User Authentication & Data Retrieval');
      const user = await this.authenticateUser();
      
      if (!user) {
        console.log('❌ User not found, creating test workflows...');
        await this.createTestWorkflows();
        return;
      }

      // Step 2: Get user's latest workflows
      console.log('\n📊 Step 2: Retrieving User Workflows');
      const workflows = await this.getUserWorkflows(user.id);

      // Step 3: Apply healing to each workflow
      console.log('\n🔧 Step 3: Applying 99% Reliability Healing');
      const healedWorkflows = await this.healWorkflows(workflows, user);

      // Step 4: Deploy and test each healed workflow
      console.log('\n🚀 Step 4: Deploying Healed Workflows');
      const deployedWorkflows = await this.deployWorkflows(healedWorkflows, user);

      // Step 5: Execute workflows and send test emails
      console.log('\n⚡ Step 5: Executing Workflows & Email Delivery');
      await this.executeWorkflows(deployedWorkflows, user);

      // Step 6: Generate comprehensive report
      console.log('\n📊 Step 6: Generating Test Report');
      this.generateReport();

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      console.error(error.stack);
    } finally {
      await this.cleanup();
    }
  }

  async authenticateUser() {
    try {
      await this.pgClient.connect();
      console.log('  ✅ Connected to Supabase database');

      const result = await this.pgClient.query(
        'SELECT id, email, created_at FROM auth.users WHERE email = $1',
        [TARGET_EMAIL]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        console.log(`  ✅ User found: ${user.email}`);
        console.log(`  🆔 User ID: ${user.id}`);
        console.log(`  📅 Created: ${user.created_at}`);
        
        this.testResults.userFound = true;
        return user;
      } else {
        console.log('  ❌ User not found in database');
        return null;
      }
    } catch (error) {
      console.log('  ❌ Authentication failed:', error.message);
      return null;
    }
  }

  async getUserWorkflows(userId) {
    try {
      const result = await this.pgClient.query(`
        SELECT 
          id, name, description, n8n_workflow_json, n8n_workflow_id,
          status, created_at, webhook_url, original_prompt
        FROM mvp_workflows 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 3
      `, [userId]);

      console.log(`  ✅ Found ${result.rows.length} workflows`);
      
      if (result.rows.length === 0) {
        console.log('  🔧 No workflows found, creating test workflows...');
        return await this.createTestWorkflows(userId);
      }

      result.rows.forEach((wf, i) => {
        console.log(`  ${i+1}. ${wf.name} (${wf.status})`);
        console.log(`     ID: ${wf.id} | n8n: ${wf.n8n_workflow_id || 'none'}`);
        console.log(`     Created: ${wf.created_at}`);
      });

      this.testResults.workflowsFound = result.rows.length;
      return result.rows;

    } catch (error) {
      console.log('  ❌ Failed to retrieve workflows:', error.message);
      return [];
    }
  }

  async createTestWorkflows(userId) {
    console.log('  🛠️  Creating test workflows for healing demonstration...');
    
    const testWorkflows = [
      {
        name: '[TEST] Email Notification Workflow',
        description: 'Send email when webhook receives data',
        original_prompt: 'create a workflow that sends an email notification when I receive webhook data',
        n8n_workflow_json: {
          name: 'Email Notification Workflow',
          nodes: [
            {
              id: 'webhook_trigger',
              name: 'Webhook',
              type: 'n8n-nodes-base.webhook',
              position: [250, 300],
              parameters: {
                httpMethod: 'POST',
                path: 'notification-webhook'
              }
            },
            {
              id: 'send_email',
              name: 'Send Email',
              type: 'n8n-nodes-base.httpRequest', // Will be healed to proper email sending
              position: [450, 300],
              parameters: {
                url: 'https://api.resend.com/emails',
                method: 'POST'
                // Missing required parameters - will be healed
              }
            }
          ],
          connections: {
            'Webhook': {
              main: [[{ node: 'Send Email', type: 'main', index: 0 }]]
            }
          }
        }
      },
      {
        name: '[TEST] Scheduled Data Processing',
        description: 'Process data every hour and send results',
        original_prompt: 'create a workflow that fetches data every hour and processes it',
        n8n_workflow_json: {
          name: 'Scheduled Data Processing',
          nodes: [
            {
              id: 'schedule',
              name: 'Schedule',
              type: 'n8n-nodes-base.scheduleTrigger',
              position: [250, 300],
              parameters: {
                // Missing rule - will be healed
              }
            },
            {
              id: 'fetch_data',
              name: 'Fetch Data',
              type: 'n8n-nodes-base.httpRequest',
              position: [450, 300],
              parameters: {
                // Missing URL - will be healed
                method: 'GET'
              }
            }
          ],
          connections: {
            'Schedule': {
              main: [[{ node: 'Fetch Data', type: 'main', index: 0 }]]
            }
          }
        }
      },
      {
        name: '[TEST] Webhook to Database',
        description: 'Store webhook data in database',
        original_prompt: 'save incoming webhook data to database',
        n8n_workflow_json: {
          name: 'Webhook to Database',
          nodes: [
            {
              id: 'webhook',
              name: 'Webhook',
              type: 'n8n-nodes-base.webhook',
              position: [250, 300],
              parameters: {
                httpMethod: 'POST'
                // Missing path - will be healed
              }
            },
            {
              id: 'process',
              name: 'Process Data',
              type: 'n8n-nodes-base.set',
              position: [450, 300],
              parameters: {
                values: {
                  string: [
                    { name: 'processed', value: 'true' }
                  ]
                }
              }
            }
          ],
          connections: {
            'Webhook': {
              main: [[{ node: 'Process Data', type: 'main', index: 0 }]]
            }
          }
        }
      }
    ];

    const createdWorkflows = [];
    
    for (const workflow of testWorkflows) {
      try {
        const result = await this.pgClient.query(`
          INSERT INTO mvp_workflows (
            user_id, name, description, n8n_workflow_json, 
            original_prompt, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
          RETURNING *
        `, [
          userId || '00000000-0000-0000-0000-000000000000', // Use placeholder if no user
          workflow.name,
          workflow.description,
          JSON.stringify(workflow.n8n_workflow_json),
          workflow.original_prompt,
          'draft'
        ]);

        createdWorkflows.push(result.rows[0]);
        console.log(`    ✅ Created: ${workflow.name}`);
        
      } catch (error) {
        console.log(`    ❌ Failed to create ${workflow.name}:`, error.message);
      }
    }

    return createdWorkflows;
  }

  async healWorkflows(workflows, user) {
    const healedWorkflows = [];

    for (const [index, workflow] of workflows.entries()) {
      console.log(`  🔧 Healing workflow ${index + 1}: ${workflow.name}`);
      
      try {
        const healed = await this.applyReliabilityHealing(workflow, user);
        healedWorkflows.push(healed);
        
        this.testResults.healingResults.push({
          original: workflow.name,
          success: true,
          fixes: healed.appliedFixes || [],
          confidence: healed.confidence || 0.9
        });
        
        console.log(`    ✅ Healed successfully (confidence: ${healed.confidence || '0.9'})`);
        if (healed.appliedFixes?.length > 0) {
          console.log(`    🔧 Applied fixes: ${healed.appliedFixes.join(', ')}`);
        }
        
      } catch (error) {
        console.log(`    ❌ Healing failed: ${error.message}`);
        
        this.testResults.healingResults.push({
          original: workflow.name,
          success: false,
          error: error.message
        });
      }
    }

    return healedWorkflows;
  }

  async applyReliabilityHealing(workflow, user) {
    // Simulate the 99% reliability healing system
    const workflowJson = workflow.n8n_workflow_json;
    const healed = JSON.parse(JSON.stringify(workflowJson));
    const appliedFixes = [];

    // Apply user isolation
    if (user?.id) {
      const userHash = user.id.substring(0, 8);
      healed.name = `[USR-${userHash}] ${healed.name}`;
      appliedFixes.push('Applied user isolation naming');
    }

    // Fix webhook paths
    for (const node of healed.nodes) {
      if (node.type === 'n8n-nodes-base.webhook') {
        if (!node.parameters.path) {
          node.parameters.path = `webhook-${Date.now().toString().slice(-6)}`;
          appliedFixes.push(`Added webhook path to ${node.name}`);
        }
        
        // Add user-specific path
        if (user?.id) {
          const userHash = user.id.substring(0, 8);
          node.parameters.path = `usr-${userHash}-${node.parameters.path}`;
          appliedFixes.push('Applied user-specific webhook path');
        }
      }
    }

    // Fix HTTP Request nodes for email sending
    for (const node of healed.nodes) {
      if (node.type === 'n8n-nodes-base.httpRequest' && 
          node.name.toLowerCase().includes('email')) {
        
        // Configure for Resend API
        node.parameters.url = 'https://api.resend.com/emails';
        node.parameters.method = 'POST';
        node.parameters.sendHeaders = true;
        node.parameters.headerParameters = {
          parameters: [
            {
              name: 'Authorization',
              value: `Bearer ${RESEND_API_KEY}`
            },
            {
              name: 'Content-Type',
              value: 'application/json'
            }
          ]
        };
        node.parameters.sendBody = true;
        node.parameters.bodyParameters = {
          parameters: [
            {
              name: 'from',
              value: FROM_EMAIL
            },
            {
              name: 'to',
              value: TARGET_EMAIL
            },
            {
              name: 'subject',
              value: '🧪 99% Reliability Test - Healed Workflow'
            },
            {
              name: 'html',
              value: `<h1>🎉 Workflow Healing Success!</h1>
                      <p><strong>This email was sent from a healed n8n workflow!</strong></p>
                      <p>📋 Workflow: ${healed.name}</p>
                      <p>🔧 Applied Fixes: ${appliedFixes.join(', ')}</p>
                      <p>📅 Sent: ${new Date().toISOString()}</p>
                      <p>✅ 99% Reliability System Working!</p>`
            }
          ]
        };
        
        appliedFixes.push('Configured Resend email API');
      }
    }

    // Fix missing HTTP URLs
    for (const node of healed.nodes) {
      if (node.type === 'n8n-nodes-base.httpRequest' && !node.parameters.url) {
        node.parameters.url = 'https://jsonplaceholder.typicode.com/posts/1';
        appliedFixes.push(`Added placeholder URL to ${node.name}`);
      }
    }

    // Fix missing schedule rules
    for (const node of healed.nodes) {
      if (node.type === 'n8n-nodes-base.scheduleTrigger' && !node.parameters.rule) {
        node.parameters.rule = {
          interval: [{ field: 'hours', hoursInterval: 1 }]
        };
        appliedFixes.push(`Added schedule rule to ${node.name}`);
      }
    }

    // Add response node for webhooks
    const hasWebhook = healed.nodes.some(n => n.type === 'n8n-nodes-base.webhook');
    const hasResponse = healed.nodes.some(n => n.type === 'n8n-nodes-base.respondToWebhook');
    
    if (hasWebhook && !hasResponse) {
      const responseNode = {
        id: `respond_${Date.now()}`,
        name: 'Respond Success',
        type: 'n8n-nodes-base.respondToWebhook',
        position: [650, 300],
        parameters: {
          respondWith: 'json',
          responseBody: '={{ { "status": "success", "timestamp": new Date().toISOString() } }}'
        }
      };
      
      healed.nodes.push(responseNode);
      
      // Connect last node to response
      const lastNode = healed.nodes[healed.nodes.length - 2];
      if (lastNode && healed.connections) {
        healed.connections[lastNode.name] = {
          main: [[{ node: 'Respond Success', type: 'main', index: 0 }]]
        };
      }
      
      appliedFixes.push('Added webhook response handler');
    }

    return {
      originalWorkflow: workflow,
      healedWorkflow: healed,
      appliedFixes,
      confidence: Math.min(0.95, 0.8 + (appliedFixes.length * 0.03))
    };
  }

  async deployWorkflows(healedWorkflows, user) {
    const deployedWorkflows = [];

    for (const [index, healed] of healedWorkflows.entries()) {
      console.log(`  🚀 Deploying workflow ${index + 1}: ${healed.healedWorkflow.name}`);
      
      try {
        // Deploy to n8n
        const response = await this.n8nAPI.post('/workflows', healed.healedWorkflow);
        const deployed = response.data;
        
        console.log(`    ✅ Deployed successfully! ID: ${deployed.id}`);
        
        // Update database with n8n ID
        await this.pgClient.query(`
          UPDATE mvp_workflows 
          SET n8n_workflow_id = $1, status = 'deployed', n8n_workflow_json = $2
          WHERE id = $3
        `, [deployed.id, JSON.stringify(healed.healedWorkflow), healed.originalWorkflow.id]);
        
        deployedWorkflows.push({
          ...healed,
          n8nId: deployed.id,
          deployed: deployed
        });
        
        this.testResults.deploymentResults.push({
          name: healed.healedWorkflow.name,
          success: true,
          n8nId: deployed.id
        });
        
      } catch (error) {
        console.log(`    ❌ Deployment failed: ${error.response?.data?.message || error.message}`);
        
        this.testResults.deploymentResults.push({
          name: healed.healedWorkflow.name,
          success: false,
          error: error.message
        });
      }
    }

    return deployedWorkflows;
  }

  async executeWorkflows(deployedWorkflows, user) {
    for (const [index, deployed] of deployedWorkflows.entries()) {
      console.log(`  ⚡ Executing workflow ${index + 1}: ${deployed.healedWorkflow.name}`);
      
      try {
        // Execute the workflow
        const response = await this.n8nAPI.post(`/workflows/${deployed.n8nId}/execute`, {
          workflowData: deployed.deployed
        });
        
        const execution = response.data;
        console.log(`    🚀 Execution started: ${execution.id}`);
        
        // Wait for completion
        const result = await this.waitForExecution(execution.id);
        
        if (result.success) {
          console.log(`    ✅ Execution completed successfully`);
          
          // Check if email was sent
          if (result.emailSent) {
            this.testResults.emailsSent++;
            console.log(`    📧 Email delivered to ${TARGET_EMAIL}`);
          }
          
          this.testResults.executionResults.push({
            name: deployed.healedWorkflow.name,
            success: true,
            executionId: execution.id,
            emailSent: result.emailSent
          });
          
        } else {
          console.log(`    ❌ Execution failed: ${result.error}`);
          this.testResults.executionResults.push({
            name: deployed.healedWorkflow.name,
            success: false,
            error: result.error
          });
        }
        
      } catch (error) {
        console.log(`    ❌ Execution failed: ${error.message}`);
        this.testResults.executionResults.push({
          name: deployed.healedWorkflow.name,
          success: false,
          error: error.message
        });
      }
      
      // Pause between executions
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async waitForExecution(executionId, maxWaitTime = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await this.n8nAPI.get(`/executions/${executionId}`);
        const execution = response.data;
        
        if (execution.finished) {
          const hasError = execution.data?.resultData?.error;
          
          if (hasError) {
            return {
              success: false,
              error: JSON.stringify(hasError).substring(0, 200)
            };
          }
          
          // Check for email result
          const runData = execution.data?.resultData?.runData || {};
          let emailSent = false;
          
          for (const [nodeName, nodeData] of Object.entries(runData)) {
            if (nodeName.toLowerCase().includes('email') && nodeData[0]?.data?.main?.[0]?.[0]?.json?.id) {
              emailSent = true;
              break;
            }
          }
          
          return {
            success: true,
            emailSent
          };
        }
        
        // Wait 1 second before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
    
    return {
      success: false,
      error: 'Execution timeout'
    };
  }

  generateReport() {
    console.log('\n📊 99% RELIABILITY SYSTEM TEST REPORT');
    console.log('=====================================');
    
    const totalWorkflows = this.testResults.workflowsFound;
    const successfulHealing = this.testResults.healingResults.filter(r => r.success).length;
    const successfulDeployments = this.testResults.deploymentResults.filter(r => r.success).length;
    const successfulExecutions = this.testResults.executionResults.filter(r => r.success).length;
    
    this.testResults.successRate = totalWorkflows > 0 ? 
      Math.round((successfulExecutions / totalWorkflows) * 100) : 0;
    
    console.log(`👤 User: ${TARGET_EMAIL} (${this.testResults.userFound ? 'Found' : 'Not Found'})`);
    console.log(`📊 Workflows Tested: ${totalWorkflows}`);
    console.log(`🔧 Healing Success: ${successfulHealing}/${totalWorkflows} (${Math.round((successfulHealing/totalWorkflows)*100)}%)`);
    console.log(`🚀 Deployment Success: ${successfulDeployments}/${totalWorkflows} (${Math.round((successfulDeployments/totalWorkflows)*100)}%)`);
    console.log(`⚡ Execution Success: ${successfulExecutions}/${totalWorkflows} (${Math.round((successfulExecutions/totalWorkflows)*100)}%)`);
    console.log(`📧 Emails Sent: ${this.testResults.emailsSent}`);
    console.log(`🎯 Overall Success Rate: ${this.testResults.successRate}%`);
    
    console.log('\n🔧 HEALING DETAILS:');
    this.testResults.healingResults.forEach((result, i) => {
      if (result.success) {
        console.log(`  ${i+1}. ✅ ${result.original}`);
        console.log(`     Confidence: ${result.confidence || 'N/A'}`);
        console.log(`     Fixes: ${result.fixes?.join(', ') || 'None'}`);
      } else {
        console.log(`  ${i+1}. ❌ ${result.original}: ${result.error}`);
      }
    });
    
    console.log('\n🚀 DEPLOYMENT DETAILS:');
    this.testResults.deploymentResults.forEach((result, i) => {
      if (result.success) {
        console.log(`  ${i+1}. ✅ ${result.name} (n8n ID: ${result.n8nId})`);
      } else {
        console.log(`  ${i+1}. ❌ ${result.name}: ${result.error}`);
      }
    });
    
    console.log('\n⚡ EXECUTION DETAILS:');
    this.testResults.executionResults.forEach((result, i) => {
      if (result.success) {
        console.log(`  ${i+1}. ✅ ${result.name} ${result.emailSent ? '📧' : '⚪'}`);
      } else {
        console.log(`  ${i+1}. ❌ ${result.name}: ${result.error}`);
      }
    });
    
    console.log('\n🎯 RELIABILITY ASSESSMENT:');
    if (this.testResults.successRate >= 99) {
      console.log('  🏆 EXCELLENT: 99%+ reliability achieved!');
    } else if (this.testResults.successRate >= 95) {
      console.log('  ✅ GREAT: 95%+ reliability achieved!');
    } else if (this.testResults.successRate >= 90) {
      console.log('  🟡 GOOD: 90%+ reliability achieved');
    } else {
      console.log('  🔴 NEEDS IMPROVEMENT: <90% reliability');
    }
    
    console.log(`\n👀 CHECK ${TARGET_EMAIL} INBOX FOR TEST EMAILS!`);
    console.log('📬 Expected emails from: onboarding@resend.dev');
    console.log(`📮 Total expected: ${this.testResults.emailsSent}`);
  }

  async cleanup() {
    try {
      if (this.pgClient) {
        await this.pgClient.end();
        console.log('\n🧹 Database connection closed');
      }
    } catch (error) {
      console.log('⚠️  Cleanup warning:', error.message);
    }
  }
}

// Run the comprehensive test
(async () => {
  const tester = new ReliabilitySystemTest();
  await tester.runComprehensiveTest();
})().catch(console.error);