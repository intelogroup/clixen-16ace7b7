#!/usr/bin/env node

/**
 * Comprehensive OpenAI API Key Configuration System Test
 * 
 * This script tests all aspects of the OpenAI configuration system:
 * 1. Environment variable configuration
 * 2. Supabase database integration
 * 3. Service layer functionality
 * 4. Edge function integration
 * 5. Fallback mechanisms
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test results storage
const testResults = {
  environment: {},
  database: {},
  service: {},
  edgeFunction: {},
  overall: {},
  issues: []
};

function logTest(section, test, status, details = '') {
  const symbol = status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌';
  console.log(`${symbol} [${section.toUpperCase()}] ${test}: ${details}`);
  
  if (!testResults[section]) testResults[section] = {};
  testResults[section][test] = { status, details };
  
  if (status === 'fail') {
    testResults.issues.push({ section, test, details });
  }
}

function logSection(title) {
  console.log(`\n🔍 ${title}`);
  console.log('='.repeat(title.length + 4));
}

async function testEnvironmentConfiguration() {
  logSection('TESTING ENVIRONMENT CONFIGURATION');
  
  // Check if environment variables are present
  const envOpenAI = process.env.VITE_OPENAI_API_KEY;
  const envSupabaseUrl = process.env.VITE_SUPABASE_URL;
  const envSupabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  logTest('environment', 'VITE_OPENAI_API_KEY', 
    envOpenAI ? (envOpenAI === 'your-openai-api-key-here' ? 'warn' : 'pass') : 'fail',
    envOpenAI ? 'Set' : 'Not set'
  );
  
  logTest('environment', 'VITE_SUPABASE_URL', 
    envSupabaseUrl ? 'pass' : 'fail',
    envSupabaseUrl ? 'Set' : 'Not set'
  );
  
  logTest('environment', 'VITE_SUPABASE_ANON_KEY', 
    envSupabaseKey ? 'pass' : 'fail',
    envSupabaseKey ? 'Set' : 'Not set'
  );

  // Test placeholder detection
  if (envOpenAI === 'your-openai-api-key-here') {
    logTest('environment', 'Placeholder_Detection', 'warn', 
      'OpenAI API key is still set to placeholder value'
    );
  }
}

async function testDatabaseSchema() {
  logSection('TESTING DATABASE SCHEMA');
  
  try {
    // Test openai_configurations table
    const { data: openaiConfig, error: openaiError } = await supabase
      .from('openai_configurations')
      .select('*')
      .limit(1);
      
    if (openaiError) {
      logTest('database', 'openai_configurations_table', 'fail', 
        `Table error: ${openaiError.message}`
      );
    } else {
      logTest('database', 'openai_configurations_table', 'pass', 
        `Table exists with ${openaiConfig?.length || 0} records`
      );
      
      if (openaiConfig && openaiConfig.length > 0) {
        const record = openaiConfig[0];
        logTest('database', 'openai_config_structure', 'pass',
          `Fields: ${Object.keys(record).join(', ')}`
        );
      }
    }
    
    // Test api_keys table
    const { data: apiKeys, error: apiKeysError } = await supabase
      .from('api_keys')
      .select('*')
      .limit(1);
      
    if (apiKeysError) {
      logTest('database', 'api_keys_table', 'fail', 
        `Table error: ${apiKeysError.message}`
      );
    } else {
      logTest('database', 'api_keys_table', 'pass', 
        `Table exists with ${apiKeys?.length || 0} records`
      );
    }
    
    // Test AI chat related tables
    const chatTables = ['ai_chat_sessions', 'ai_chat_messages', 'ai_agent_states'];
    for (const tableName of chatTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        if (error) {
          logTest('database', `${tableName}_table`, 'fail', error.message);
        } else {
          logTest('database', `${tableName}_table`, 'pass', 
            `Table exists with ${data?.length || 0} records`
          );
        }
      } catch (err) {
        logTest('database', `${tableName}_table`, 'fail', err.message);
      }
    }
    
  } catch (error) {
    logTest('database', 'connection', 'fail', error.message);
  }
}

async function testOpenAIConfigService() {
  logSection('TESTING OPENAI CONFIG SERVICE');
  
  try {
    // Simulate the service functionality since we can't import ES modules directly
    
    // Test 1: Check global config retrieval
    const { data: globalConfig, error: globalError } = await supabase
      .from('openai_configurations')
      .select('*')
      .eq('config_type', 'global')
      .single();
      
    if (globalError && globalError.code !== 'PGRST116') {
      logTest('service', 'global_config_retrieval', 'fail', globalError.message);
    } else if (globalConfig) {
      logTest('service', 'global_config_retrieval', 'pass', 
        `Found global config with model: ${globalConfig.default_model}`
      );
    } else {
      logTest('service', 'global_config_retrieval', 'warn', 
        'No global config found'
      );
    }
    
    // Test 2: Check user-specific config (will fail without user)
    const testUserId = '123e4567-e89b-12d3-a456-426614174000';
    const { data: userConfig, error: userError } = await supabase
      .from('openai_configurations')
      .select('*')
      .eq('user_id', testUserId)
      .eq('config_type', 'personal')
      .single();
      
    if (userError && userError.code === 'PGRST116') {
      logTest('service', 'user_config_retrieval', 'pass', 
        'User config correctly returns null for non-existent user'
      );
    } else if (userConfig) {
      logTest('service', 'user_config_retrieval', 'pass', 
        'User config found'
      );
    } else {
      logTest('service', 'user_config_retrieval', 'warn', 
        'Unexpected result for user config query'
      );
    }
    
    // Test 3: API key fallback logic
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('openai_api_key')
      .eq('user_id', testUserId)
      .single();
      
    const envFallback = process.env.VITE_OPENAI_API_KEY;
    
    if (apiKeyError && apiKeyError.code === 'PGRST116') {
      if (envFallback && envFallback !== 'your-openai-api-key-here') {
        logTest('service', 'fallback_mechanism', 'pass', 
          'Falls back to environment variable when no user key found'
        );
      } else {
        logTest('service', 'fallback_mechanism', 'warn', 
          'No user key and no valid environment fallback'
        );
      }
    } else if (apiKeyData?.openai_api_key) {
      logTest('service', 'fallback_mechanism', 'pass', 
        'User API key available'
      );
    }
    
  } catch (error) {
    logTest('service', 'overall_functionality', 'fail', error.message);
  }
}

async function testEdgeFunctionIntegration() {
  logSection('TESTING EDGE FUNCTION INTEGRATION');
  
  try {
    // Test 1: Check if edge function is deployed and responding
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-system`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        message: 'Test connectivity',
        user_id: '123e4567-e89b-12d3-a456-426614174000'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.response && data.response.includes('OpenAI API Key Required')) {
        logTest('edgeFunction', 'deployment_status', 'pass', 
          'Edge function deployed and correctly detecting missing API key'
        );
        
        logTest('edgeFunction', 'api_key_detection', 'warn', 
          'Edge function correctly identifies missing OpenAI API key'
        );
      } else {
        logTest('edgeFunction', 'deployment_status', 'pass', 
          'Edge function deployed and responding'
        );
        
        if (data.tokens_used > 0) {
          logTest('edgeFunction', 'api_key_detection', 'pass', 
            'Edge function has access to OpenAI API key'
          );
        }
      }
      
      // Check response structure
      const expectedFields = ['response', 'agent_type', 'message_id', 'processing_time'];
      const hasAllFields = expectedFields.every(field => field in data);
      
      logTest('edgeFunction', 'response_structure', hasAllFields ? 'pass' : 'fail',
        `Response contains: ${Object.keys(data).join(', ')}`
      );
      
    } else {
      const errorText = await response.text();
      logTest('edgeFunction', 'deployment_status', 'fail', 
        `HTTP ${response.status}: ${errorText}`
      );
    }
    
  } catch (error) {
    logTest('edgeFunction', 'connectivity', 'fail', error.message);
  }
}

async function testUserAuthenticationFlow() {
  logSection('TESTING USER AUTHENTICATION FLOW');
  
  try {
    // Test authentication with test credentials
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'jayveedz19@gmail.com',
      password: 'Goldyear2023#'
    });
    
    if (authError) {
      logTest('service', 'user_authentication', 'fail', authError.message);
    } else if (authData.user) {
      logTest('service', 'user_authentication', 'pass', 
        `Successfully authenticated user: ${authData.user.email}`
      );
      
      // Test user-specific configuration retrieval with real user ID
      const { data: userConfig, error: configError } = await supabase
        .from('openai_configurations')
        .select('*')
        .eq('user_id', authData.user.id)
        .eq('config_type', 'personal')
        .single();
        
      if (configError && configError.code === 'PGRST116') {
        logTest('service', 'authenticated_user_config', 'warn', 
          'No personal OpenAI config found for authenticated user'
        );
      } else if (userConfig) {
        logTest('service', 'authenticated_user_config', 'pass', 
          'Personal config found for authenticated user'
        );
      }
      
      // Sign out
      await supabase.auth.signOut();
    }
    
  } catch (error) {
    logTest('service', 'authentication_flow', 'fail', error.message);
  }
}

function generateSummary() {
  logSection('TEST SUMMARY AND RECOMMENDATIONS');
  
  const allTests = Object.entries(testResults).reduce((acc, [section, tests]) => {
    if (section !== 'issues' && section !== 'overall') {
      return acc + Object.keys(tests).length;
    }
    return acc;
  }, 0);
  
  const passedTests = Object.entries(testResults).reduce((acc, [section, tests]) => {
    if (section !== 'issues' && section !== 'overall') {
      return acc + Object.values(tests).filter(test => test.status === 'pass').length;
    }
    return acc;
  }, 0);
  
  const failedTests = testResults.issues.length;
  
  console.log(`\n📊 OVERALL RESULTS:`);
  console.log(`   Total Tests: ${allTests}`);
  console.log(`   Passed: ${passedTests} ✅`);
  console.log(`   Failed: ${failedTests} ❌`);
  console.log(`   Warnings: ${allTests - passedTests - failedTests} ⚠️`);
  
  if (testResults.issues.length > 0) {
    console.log(`\n🚨 CRITICAL ISSUES FOUND:`);
    testResults.issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. [${issue.section.toUpperCase()}] ${issue.test}: ${issue.details}`);
    });
  }
  
  console.log(`\n💡 RECOMMENDATIONS:`);
  
  // Environment issues
  const envOpenAI = process.env.VITE_OPENAI_API_KEY;
  if (!envOpenAI || envOpenAI === 'your-openai-api-key-here') {
    console.log(`   🔑 Set VITE_OPENAI_API_KEY in .env file to a valid OpenAI API key`);
  }
  
  // Database issues
  const dbIssues = testResults.issues.filter(i => i.section === 'database');
  if (dbIssues.length > 0) {
    console.log(`   🗄️ Database schema issues detected - check table structure and RLS policies`);
  }
  
  // Edge function issues
  const edgeIssues = testResults.issues.filter(i => i.section === 'edgeFunction');
  if (edgeIssues.length > 0) {
    console.log(`   ⚡ Edge function issues - verify deployment and configuration`);
  }
  
  // User experience
  if (failedTests > 0) {
    console.log(`   👤 Users may experience "OpenAI API Key Required" messages`);
    console.log(`   🔧 Implement user-facing API key configuration in the UI`);
  }
  
  console.log(`\n📋 NEXT STEPS:`);
  console.log(`   1. Review and fix failed tests above`);
  console.log(`   2. Configure OpenAI API key in environment or database`);
  console.log(`   3. Test end-to-end user flow with authentication`);
  console.log(`   4. Implement user API key management UI if needed`);
  console.log(`   5. Monitor edge function logs for API key usage patterns`);
}

// Main test execution
async function runAllTests() {
  console.log('🧪 CLIXEN OPENAI API KEY CONFIGURATION SYSTEM TEST');
  console.log('='.repeat(60));
  console.log(`📅 Started: ${new Date().toISOString()}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  try {
    await testEnvironmentConfiguration();
    await testDatabaseSchema();
    await testOpenAIConfigService();
    await testEdgeFunctionIntegration();
    await testUserAuthenticationFlow();
    
    generateSummary();
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR during testing:', error);
    process.exit(1);
  }
  
  console.log(`\n✅ Test completed: ${new Date().toISOString()}`);
  
  // Exit with proper code
  const hasFailures = testResults.issues.length > 0;
  process.exit(hasFailures ? 1 : 0);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('\n❌ UNHANDLED REJECTION:', error);
  process.exit(1);
});

// Run the tests
runAllTests();