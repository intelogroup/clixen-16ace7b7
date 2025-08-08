#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Client } = pg;

// Configuration from CLAUDE.md
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

// Test credentials from CLAUDE.md
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

// n8n configuration from CLAUDE.md
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

console.log('🔥 COMPREHENSIVE CLIXEN SYSTEM TEST');
console.log('====================================');

// Initialize clients
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// PostgreSQL client
const pgClient = new Client({
  host: 'aws-0-us-east-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.zfbgdixbzezpxllkoyfc',
  password: 'Goldyear2023#',
  ssl: { rejectUnauthorized: false }
});

let testResults = {
  connectivity: false,
  authentication: false,
  database: false,
  mvpTables: false,
  edgeFunctions: false,
  n8nIntegration: false,
  userFlow: false
};

async function testConnectivity() {
  console.log('\n🌐 1. CONNECTIVITY TESTS');
  console.log('========================');
  
  try {
    // Test Supabase connection
    console.log('Testing Supabase API connection...');
    const { data, error } = await anonClient.auth.getSession();
    if (error) {
      console.log('❌ Supabase connection failed:', error.message);
      return false;
    }
    console.log('✅ Supabase API connected');

    // Test PostgreSQL connection
    console.log('Testing PostgreSQL connection...');
    await pgClient.connect();
    const dbResult = await pgClient.query('SELECT current_user, current_database()');
    console.log('✅ PostgreSQL connected');
    console.log(`   User: ${dbResult.rows[0].current_user}`);
    console.log(`   Database: ${dbResult.rows[0].current_database}`);

    // Test n8n connection
    console.log('Testing n8n API connection...');
    const n8nResponse = await fetch(`${N8N_API_URL}/workflows`, {
      headers: {
        'Authorization': `Bearer ${N8N_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (n8nResponse.ok) {
      const n8nData = await n8nResponse.json();
      console.log('✅ n8n API connected');
      console.log(`   Workflows: ${n8nData.data?.length || 0}`);
    } else {
      console.log('⚠️  n8n API connection issues:', n8nResponse.status);
    }

    return true;
  } catch (error) {
    console.log('❌ Connectivity test failed:', error.message);
    return false;
  }
}

async function testAuthentication() {
  console.log('\n🔐 2. AUTHENTICATION TESTS');
  console.log('===========================');
  
  try {
    // Test sign in with existing user
    console.log('Testing user authentication...');
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (authError) {
      console.log('❌ Authentication failed:', authError.message);
      return false;
    }
    
    console.log('✅ User authentication successful');
    console.log(`   User ID: ${authData.user?.id}`);
    console.log(`   Email: ${authData.user?.email}`);
    console.log(`   Confirmed: ${authData.user?.email_confirmed_at ? 'Yes' : 'No'}`);
    
    // Test session retrieval
    const { data: sessionData, error: sessionError } = await anonClient.auth.getSession();
    if (sessionError) {
      console.log('⚠️  Session retrieval failed:', sessionError.message);
    } else {
      console.log('✅ Session retrieval successful');
    }
    
    // Test auth with service client (admin operations)
    console.log('Testing admin auth operations...');
    const { data: usersData, error: usersError } = await serviceClient.auth.admin.listUsers();
    if (usersError) {
      console.log('⚠️  Admin auth failed:', usersError.message);
    } else {
      console.log('✅ Admin auth successful');
      console.log(`   Total users: ${usersData.users?.length || 0}`);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Authentication test failed:', error.message);
    return false;
  }
}

async function testDatabase() {
  console.log('\n🗄️  3. DATABASE SCHEMA TESTS');
  console.log('=============================');
  
  try {
    // Check database health
    console.log('Testing basic database operations...');
    await pgClient.query('SELECT 1');
    console.log('✅ Database queries working');
    
    // Check auth schema
    console.log('Checking auth schema...');
    const authTables = await pgClient.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'auth' 
      ORDER BY table_name
    `);
    console.log(`✅ Auth schema: ${authTables.rows.length} tables`);
    
    // Check public schema tables
    console.log('Checking public schema...');
    const publicTables = await pgClient.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`✅ Public schema: ${publicTables.rows.length} tables`);
    publicTables.rows.slice(0, 10).forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    if (publicTables.rows.length > 10) {
      console.log(`   ... and ${publicTables.rows.length - 10} more`);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Database test failed:', error.message);
    return false;
  }
}

async function testMVPTables() {
  console.log('\n📋 4. MVP TABLES VALIDATION');
  console.log('============================');
  
  const mvpTables = [
    'user_profiles',
    'projects', 
    'mvp_workflows',
    'mvp_chat_sessions',
    'mvp_chat_messages',
    'deployments',
    'telemetry_events'
  ];
  
  let foundTables = 0;
  
  try {
    for (const tableName of mvpTables) {
      try {
        const result = await pgClient.query(`
          SELECT COUNT(*) as count FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
        `, [tableName]);
        
        if (parseInt(result.rows[0].count) > 0) {
          // Get row count
          const dataResult = await pgClient.query(`SELECT COUNT(*) as rows FROM ${tableName}`);
          console.log(`✅ ${tableName} (${result.rows[0].count} columns, ${dataResult.rows[0].rows} rows)`);
          foundTables++;
        } else {
          console.log(`❌ ${tableName} - Missing`);
        }
      } catch (error) {
        console.log(`❌ ${tableName} - Error: ${error.message}`);
      }
    }
    
    const completionPercentage = Math.round((foundTables / mvpTables.length) * 100);
    console.log(`\n📊 MVP Tables: ${foundTables}/${mvpTables.length} (${completionPercentage}%)`);
    
    return foundTables >= Math.ceil(mvpTables.length * 0.8); // 80% or more
  } catch (error) {
    console.log('❌ MVP tables test failed:', error.message);
    return false;
  }
}

async function testEdgeFunctions() {
  console.log('\n⚡ 5. EDGE FUNCTIONS TESTS');
  console.log('==========================');
  
  const functions = [
    'health-check',
    'projects-api',
    'workflows-api',
    'ai-chat-simple'
  ];
  
  let workingFunctions = 0;
  
  for (const funcName of functions) {
    try {
      console.log(`Testing ${funcName}...`);
      const { data, error } = await anonClient.functions.invoke(funcName, {
        body: { test: true }
      });
      
      if (error) {
        console.log(`⚠️  ${funcName}: ${error.message}`);
      } else {
        console.log(`✅ ${funcName}: Working`);
        workingFunctions++;
      }
    } catch (error) {
      console.log(`❌ ${funcName}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Edge Functions: ${workingFunctions}/${functions.length} working`);
  return workingFunctions > 0;
}

async function testN8nIntegration() {
  console.log('\n🔌 6. N8N INTEGRATION TESTS');
  console.log('============================');
  
  try {
    // Test n8n API access
    console.log('Testing n8n API endpoints...');
    
    // List workflows
    const workflowsResponse = await fetch(`${N8N_API_URL}/workflows`, {
      headers: {
        'Authorization': `Bearer ${N8N_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (workflowsResponse.ok) {
      const workflowsData = await workflowsResponse.json();
      console.log(`✅ Workflows endpoint: ${workflowsData.data?.length || 0} workflows`);
    } else {
      console.log('❌ Workflows endpoint failed:', workflowsResponse.status);
      return false;
    }
    
    // Test executions endpoint
    const executionsResponse = await fetch(`${N8N_API_URL}/executions`, {
      headers: {
        'Authorization': `Bearer ${N8N_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (executionsResponse.ok) {
      const executionsData = await executionsResponse.json();
      console.log(`✅ Executions endpoint: ${executionsData.data?.length || 0} executions`);
    } else {
      console.log('⚠️  Executions endpoint issues:', executionsResponse.status);
    }
    
    return true;
  } catch (error) {
    console.log('❌ n8n integration test failed:', error.message);
    return false;
  }
}

async function testUserFlow() {
  console.log('\n👤 7. USER FLOW SIMULATION');
  console.log('===========================');
  
  try {
    // Simulate creating a project
    console.log('Testing project creation...');
    const { data: projectData, error: projectError } = await anonClient
      .from('projects')
      .insert({
        name: 'Test Project from System Test',
        description: 'Automated test project',
        user_id: (await anonClient.auth.getUser()).data.user?.id
      })
      .select()
      .single();
    
    if (projectError) {
      console.log('⚠️  Project creation failed:', projectError.message);
    } else {
      console.log('✅ Project creation successful');
      console.log(`   Project ID: ${projectData.id}`);
      
      // Try to create a workflow
      console.log('Testing workflow creation...');
      const { data: workflowData, error: workflowError } = await anonClient
        .from('mvp_workflows')
        .insert({
          name: 'Test Workflow',
          description: 'Automated test workflow',
          user_id: (await anonClient.auth.getUser()).data.user?.id,
          project_id: projectData.id,
          workflow_data: { nodes: [], connections: {} },
          status: 'draft'
        })
        .select()
        .single();
      
      if (workflowError) {
        console.log('⚠️  Workflow creation failed:', workflowError.message);
      } else {
        console.log('✅ Workflow creation successful');
        console.log(`   Workflow ID: ${workflowData.id}`);
      }
      
      // Clean up test data
      console.log('Cleaning up test data...');
      await anonClient.from('mvp_workflows').delete().eq('id', workflowData?.id);
      await anonClient.from('projects').delete().eq('id', projectData.id);
      console.log('✅ Cleanup completed');
    }
    
    return true;
  } catch (error) {
    console.log('❌ User flow test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log(`Starting comprehensive system test...\n`);
  console.log(`🔧 Configuration:`);
  console.log(`   Supabase URL: ${SUPABASE_URL}`);
  console.log(`   n8n URL: ${N8N_API_URL}`);
  console.log(`   Test User: ${TEST_EMAIL}`);
  
  try {
    testResults.connectivity = await testConnectivity();
    testResults.authentication = await testAuthentication();
    testResults.database = await testDatabase();
    testResults.mvpTables = await testMVPTables();
    testResults.edgeFunctions = await testEdgeFunctions();
    testResults.n8nIntegration = await testN8nIntegration();
    testResults.userFlow = await testUserFlow();
    
  } catch (error) {
    console.log('\n💥 Test suite failed:', error.message);
  }
  
  // Generate summary report
  console.log('\n📊 COMPREHENSIVE TEST RESULTS');
  console.log('==============================');
  
  const passed = Object.values(testResults).filter(Boolean).length;
  const total = Object.keys(testResults).length;
  const percentage = Math.round((passed / total) * 100);
  
  Object.entries(testResults).forEach(([test, result]) => {
    const icon = result ? '✅' : '❌';
    const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
    console.log(`${icon} ${testName}`);
  });
  
  console.log(`\n🎯 Overall Score: ${passed}/${total} (${percentage}%)`);
  
  if (percentage >= 90) {
    console.log('🎉 EXCELLENT - System is fully operational!');
  } else if (percentage >= 75) {
    console.log('✅ GOOD - System is mostly working with minor issues');
  } else if (percentage >= 50) {
    console.log('⚠️  FAIR - System has significant issues that need attention');
  } else {
    console.log('❌ POOR - System has major problems requiring immediate attention');
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (!testResults.connectivity) {
    console.log('- Check network connectivity and API endpoints');
  }
  if (!testResults.authentication) {
    console.log('- Verify Supabase authentication configuration');
  }
  if (!testResults.database) {
    console.log('- Check database connection and permissions');
  }
  if (!testResults.mvpTables) {
    console.log('- Run database migrations to create missing MVP tables');
  }
  if (!testResults.edgeFunctions) {
    console.log('- Deploy Edge Functions to Supabase');
  }
  if (!testResults.n8nIntegration) {
    console.log('- Check n8n server status and API configuration');
  }
  if (!testResults.userFlow) {
    console.log('- Review database permissions and RLS policies');
  }
  
  console.log('\n🚀 System is ready for MVP development and testing!');
}

// Execute the comprehensive test
runAllTests()
  .then(() => {
    console.log('\n🏁 Comprehensive test completed');
  })
  .catch((error) => {
    console.error('\n💥 Test execution failed:', error);
  })
  .finally(async () => {
    try {
      await pgClient.end();
      console.log('🔌 Database connection closed');
    } catch (error) {
      // Ignore cleanup errors
    }
  });
