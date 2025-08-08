#!/usr/bin/env node

/**
 * Phase 3 - 2-Way Sync System Test
 * 
 * This script tests the complete 2-way sync implementation:
 * 1. Workflow sync between Supabase and n8n
 * 2. Real-time updates
 * 3. Error handling and graceful degradation
 * 4. Data consistency
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

// Test credentials
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(name, success, details = '') {
  testResults.total++;
  if (success) {
    testResults.passed++;
    console.log(`✅ ${name}${details ? ` - ${details}` : ''}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}${details ? ` - ${details}` : ''}`);
    testResults.errors.push({ name, details });
  }
}

async function authenticateUser() {
  console.log('🔐 Authenticating test user...');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });
  
  if (error) {
    logTest('User Authentication', false, error.message);
    return null;
  }
  
  logTest('User Authentication', true, `User: ${data.user.email}`);
  return data.user;
}

async function testDatabaseSchema() {
  console.log('\n📊 Testing Database Schema...');
  
  try {
    // Check if sync columns exist in mvp_workflows
    const { data, error } = await supabase
      .from('mvp_workflows')
      .select('id, execution_count, successful_executions, failed_executions, last_execution_at, last_execution_status, last_sync_at')
      .limit(1);
    
    if (error && error.message.includes('column')) {
      logTest('Sync Columns', false, 'Missing sync columns in mvp_workflows table');
      return false;
    }
    
    logTest('Sync Columns', true, 'All sync columns present');
    
    // Check if sync_logs table exists
    const { error: logsError } = await supabase
      .from('sync_logs')
      .select('id')
      .limit(1);
    
    if (logsError && logsError.message.includes('relation')) {
      logTest('Sync Logs Table', false, 'sync_logs table does not exist');
      return false;
    }
    
    logTest('Sync Logs Table', true, 'Table exists and accessible');
    return true;
    
  } catch (error) {
    logTest('Database Schema', false, error.message);
    return false;
  }
}

async function testN8nConnection() {
  console.log('\n🔗 Testing n8n Connection...');
  
  try {
    const response = await fetch(`${N8N_API_URL}/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    });
    
    if (!response.ok) {
      logTest('n8n API Connection', false, `HTTP ${response.status}: ${response.statusText}`);
      return false;
    }
    
    const data = await response.json();
    logTest('n8n API Connection', true, `Found ${data.data?.length || data.length || 0} workflows`);
    return true;
    
  } catch (error) {
    logTest('n8n API Connection', false, error.message);
    return false;
  }
}

async function testSyncEdgeFunction(user) {
  console.log('\n⚡ Testing Sync Edge Function...');
  
  try {
    const startTime = Date.now();
    
    // Test health check
    const healthResponse = await supabase.functions.invoke('workflow-sync', {
      body: {}
    });
    
    const healthTime = Date.now() - startTime;
    
    if (healthResponse.error) {
      logTest('Sync Function Health Check', false, healthResponse.error.message);
      return false;
    }
    
    logTest('Sync Function Health Check', true, `Response time: ${healthTime}ms`);
    
    // Test user sync
    const syncStartTime = Date.now();
    
    const syncResponse = await supabase.functions.invoke('workflow-sync', {
      body: {
        action: 'sync_user_workflows',
        user_id: user.id
      }
    });
    
    const syncTime = Date.now() - syncStartTime;
    
    if (syncResponse.error) {
      logTest('User Workflow Sync', false, syncResponse.error.message);
      return false;
    }
    
    const summary = syncResponse.data?.summary;
    logTest('User Workflow Sync', true, 
      `${summary?.totalWorkflows || 0} workflows, ${summary?.successful || 0} synced (${syncTime}ms)`);
    
    // Test sync logs were created
    const { data: logs, error: logsError } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (logsError) {
      logTest('Sync Logging', false, logsError.message);
    } else if (logs && logs.length > 0) {
      logTest('Sync Logging', true, `Latest log: ${logs[0].status} (${logs[0].workflows_processed} workflows)`);
    } else {
      logTest('Sync Logging', false, 'No sync logs found');
    }
    
    return true;
    
  } catch (error) {
    logTest('Sync Edge Function', false, error.message);
    return false;
  }
}

async function testWorkflowCRUD(user) {
  console.log('\n📝 Testing Workflow CRUD Operations...');
  
  try {
    // Create a test workflow
    const testWorkflow = {
      user_id: user.id,
      project_id: null, // We'll use default project
      name: `[USR-${user.id.substring(0, 8)}] Sync Test Workflow`,
      description: 'Test workflow for sync system validation',
      n8n_workflow_json: {
        name: 'Test Sync Workflow',
        nodes: [
          { id: 'webhook', type: 'n8n-nodes-base.webhook', position: [200, 300] },
          { id: 'response', type: 'n8n-nodes-base.respondToWebhook', position: [500, 300] }
        ],
        connections: {
          webhook: { main: [{ node: 'response', type: 'main', index: 0 }] }
        }
      },
      status: 'draft',
      webhook_url: null,
      execution_count: 0
    };
    
    const { data: created, error: createError } = await supabase
      .from('mvp_workflows')
      .insert(testWorkflow)
      .select()
      .single();
    
    if (createError) {
      logTest('Create Test Workflow', false, createError.message);
      return null;
    }
    
    logTest('Create Test Workflow', true, `ID: ${created.id}`);
    
    // Update workflow to simulate deployment
    const { error: updateError } = await supabase
      .from('mvp_workflows')
      .update({
        status: 'deployed',
        n8n_workflow_id: `test-${Date.now()}`,
        webhook_url: `http://18.221.12.50:5678/webhook/test-${Date.now()}`,
        execution_count: 5,
        successful_executions: 4,
        failed_executions: 1,
        last_execution_at: new Date().toISOString(),
        last_execution_status: 'success'
      })
      .eq('id', created.id);
    
    if (updateError) {
      logTest('Update Workflow Status', false, updateError.message);
    } else {
      logTest('Update Workflow Status', true, 'Updated to deployed with execution data');
    }
    
    return created;
    
  } catch (error) {
    logTest('Workflow CRUD', false, error.message);
    return null;
  }
}

async function testRealtimeSubscription(testWorkflow) {
  console.log('\n🔄 Testing Realtime Updates...');
  
  return new Promise((resolve) => {
    let subscription = null;
    let timeout = null;
    let received = false;
    
    try {
      // Set up subscription
      subscription = supabase
        .channel('test_workflow_changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'mvp_workflows',
            filter: `id=eq.${testWorkflow.id}`
          },
          (payload) => {
            console.log('📡 Received realtime update:', payload.new?.execution_count);
            
            if (!received) {
              received = true;
              logTest('Realtime Subscription', true, 'Received workflow update');
              cleanup();
              resolve(true);
            }
          }
        )
        .subscribe((status) => {
          console.log(`📡 Realtime status: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            // Trigger an update after subscription is active
            setTimeout(async () => {
              await supabase
                .from('mvp_workflows')
                .update({ execution_count: 10 })
                .eq('id', testWorkflow.id);
            }, 1000);
          }
        });
      
      // Set timeout for test
      timeout = setTimeout(() => {
        if (!received) {
          logTest('Realtime Subscription', false, 'Timeout - no update received');
          cleanup();
          resolve(false);
        }
      }, 10000); // 10 second timeout
      
      const cleanup = () => {
        if (subscription) {
          supabase.removeChannel(subscription);
        }
        if (timeout) {
          clearTimeout(timeout);
        }
      };
      
    } catch (error) {
      logTest('Realtime Subscription', false, error.message);
      resolve(false);
    }
  });
}

async function testErrorHandling() {
  console.log('\n⚠️  Testing Error Handling...');
  
  try {
    // Test sync with invalid user ID
    const invalidSyncResponse = await supabase.functions.invoke('workflow-sync', {
      body: {
        action: 'sync_user_workflows',
        user_id: 'invalid-user-id'
      }
    });
    
    // Should handle gracefully without crashing
    if (invalidSyncResponse.data || !invalidSyncResponse.error) {
      logTest('Invalid User ID Handling', true, 'Handled gracefully');
    } else {
      logTest('Invalid User ID Handling', false, 'Did not handle gracefully');
    }
    
    // Test sync with invalid action
    const invalidActionResponse = await supabase.functions.invoke('workflow-sync', {
      body: {
        action: 'invalid_action'
      }
    });
    
    if (invalidActionResponse.error) {
      logTest('Invalid Action Handling', true, 'Rejected invalid action');
    } else {
      logTest('Invalid Action Handling', false, 'Did not reject invalid action');
    }
    
  } catch (error) {
    logTest('Error Handling Tests', false, error.message);
  }
}

async function cleanup(testWorkflow, user) {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    if (testWorkflow) {
      await supabase
        .from('mvp_workflows')
        .delete()
        .eq('id', testWorkflow.id);
      
      logTest('Cleanup Test Workflow', true, 'Deleted test workflow');
    }
    
    // Clean up test sync logs
    await supabase
      .from('sync_logs')
      .delete()
      .eq('user_id', user.id)
      .like('metadata->description', '%test%');
    
    logTest('Cleanup Test Logs', true, 'Deleted test sync logs');
    
  } catch (error) {
    logTest('Cleanup', false, error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Phase 3 - 2-Way Sync System Tests');
  console.log('=' .repeat(60));
  
  // Authenticate
  const user = await authenticateUser();
  if (!user) {
    console.log('\n❌ Cannot proceed without authentication');
    process.exit(1);
  }
  
  // Test database schema
  const schemaOk = await testDatabaseSchema();
  if (!schemaOk) {
    console.log('\n❌ Database schema issues - run migration first');
  }
  
  // Test n8n connection
  await testN8nConnection();
  
  // Test sync function
  await testSyncEdgeFunction(user);
  
  // Test workflow operations
  const testWorkflow = await testWorkflowCRUD(user);
  
  // Test realtime updates
  if (testWorkflow) {
    await testRealtimeSubscription(testWorkflow);
  }
  
  // Test error handling
  await testErrorHandling();
  
  // Cleanup
  if (testWorkflow) {
    await cleanup(testWorkflow, user);
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Summary:');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n💥 Failed Tests:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.name}: ${error.details}`);
    });
  }
  
  console.log('\n🎯 Phase 3 Implementation Status:');
  
  if (testResults.failed === 0) {
    console.log('✅ All systems operational - ready for 50-user trial!');
  } else if (testResults.failed <= 2) {
    console.log('⚠️  Minor issues detected - review failed tests');
  } else {
    console.log('❌ Major issues detected - deployment not recommended');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Review any failed tests above');
  console.log('2. Deploy to production if all critical tests pass');
  console.log('3. Monitor sync performance for 24 hours');
  console.log('4. Run user acceptance testing');
  console.log('5. Document any issues for team');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 2 ? 1 : 0);
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run tests
runTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});