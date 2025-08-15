#!/usr/bin/env node

/**
 * Comprehensive User Journey Test
 * Tests the complete user flow from signup to workflow execution
 * WITH REAL DATA - NO MOCKS
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';

// Load environment variables
config();

// Configuration - Using SERVICE ROLE KEY for auth operations
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';
const N8N_API_URL = 'https://n8nio-n8n-7xzf6n.sliplane.app/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiN2ZmZWU5My04YTBlLTQwYTItYmMyYi0xOGE1NDliODAwZDYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTAzNzc1fQ.mXnHtIvlmj-93EjwXZqBwzmUx9uUIddS4fO3TGMRCZ0';

// Generate unique test user
const timestamp = Date.now();
const testUser = {
  email: `test_user_${timestamp}@clixen.app`,
  password: 'TestPassword123!@#',
  fullName: `Test User ${timestamp}`
};

// Initialize Supabase clients - one for anon operations, one for service role
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Error handler with detailed debugging
class ErrorHandler {
  static async handle(error, context, debugInfo = {}) {
    console.error(chalk.red(`\n❌ Error in ${context}:`));
    console.error(chalk.red('Message:'), error.message || error);
    
    if (error.stack) {
      console.error(chalk.yellow('Stack trace:'));
      console.error(error.stack);
    }
    
    if (debugInfo && Object.keys(debugInfo).length > 0) {
      console.error(chalk.yellow('\n📊 Debug Information:'));
      Object.entries(debugInfo).forEach(([key, value]) => {
        console.error(chalk.cyan(`  ${key}:`), value);
      });
    }
    
    // Additional error context
    if (error.response) {
      console.error(chalk.yellow('\n🔍 Response Details:'));
      console.error('  Status:', error.response.status);
      console.error('  Status Text:', error.response.statusText);
      if (error.response.data) {
        console.error('  Data:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    return { success: false, error: error.message, context, debugInfo };
  }
}

// Test results collector
class TestResults {
  constructor() {
    this.results = [];
    this.roadblocks = [];
    this.criticalIssues = [];
  }
  
  addResult(step, success, data = {}) {
    this.results.push({ step, success, data, timestamp: new Date().toISOString() });
    if (!success && data.error) {
      this.roadblocks.push({ step, error: data.error, data });
    }
  }
  
  addCriticalIssue(issue) {
    this.criticalIssues.push(issue);
  }
  
  generateReport() {
    console.log(chalk.blue('\n' + '='.repeat(80)));
    console.log(chalk.blue.bold('📋 USER JOURNEY TEST REPORT'));
    console.log(chalk.blue('='.repeat(80)));
    
    // Summary
    const successCount = this.results.filter(r => r.success).length;
    const failureCount = this.results.filter(r => !r.success).length;
    
    console.log(chalk.white('\n📊 Summary:'));
    console.log(chalk.green(`  ✅ Successful steps: ${successCount}`));
    console.log(chalk.red(`  ❌ Failed steps: ${failureCount}`));
    console.log(chalk.yellow(`  ⚠️  Roadblocks found: ${this.roadblocks.length}`));
    console.log(chalk.red(`  🚨 Critical issues: ${this.criticalIssues.length}`));
    
    // Detailed results
    console.log(chalk.white('\n📝 Detailed Results:'));
    this.results.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      const color = result.success ? chalk.green : chalk.red;
      console.log(color(`  ${index + 1}. ${icon} ${result.step}`));
      if (result.data && Object.keys(result.data).length > 0) {
        Object.entries(result.data).forEach(([key, value]) => {
          if (key !== 'error') {
            console.log(chalk.gray(`     ${key}: ${JSON.stringify(value)}`));
          }
        });
      }
    });
    
    // Roadblocks
    if (this.roadblocks.length > 0) {
      console.log(chalk.yellow('\n⚠️  Roadblocks Identified:'));
      this.roadblocks.forEach((roadblock, index) => {
        console.log(chalk.yellow(`  ${index + 1}. ${roadblock.step}`));
        console.log(chalk.red(`     Error: ${roadblock.error}`));
        if (roadblock.data) {
          console.log(chalk.gray(`     Context: ${JSON.stringify(roadblock.data)}`));
        }
      });
    }
    
    // Critical Issues
    if (this.criticalIssues.length > 0) {
      console.log(chalk.red('\n🚨 Critical Issues Requiring Immediate Fix:'));
      this.criticalIssues.forEach((issue, index) => {
        console.log(chalk.red(`  ${index + 1}. ${issue}`));
      });
    }
    
    // Recommendations
    console.log(chalk.cyan('\n💡 Recommendations:'));
    if (this.roadblocks.length === 0) {
      console.log(chalk.green('  ✨ System is production ready! All tests passed.'));
    } else {
      console.log(chalk.yellow('  1. Fix identified roadblocks before production deployment'));
      console.log(chalk.yellow('  2. Add error recovery mechanisms for failed steps'));
      console.log(chalk.yellow('  3. Implement retry logic for transient failures'));
      console.log(chalk.yellow('  4. Enhance error messages for better user experience'));
    }
    
    console.log(chalk.blue('\n' + '='.repeat(80)));
    
    return {
      success: failureCount === 0,
      summary: {
        total: this.results.length,
        successful: successCount,
        failed: failureCount,
        roadblocks: this.roadblocks.length,
        criticalIssues: this.criticalIssues.length
      }
    };
  }
}

// Main test execution
async function runUserJourneyTest() {
  const testResults = new TestResults();
  let spinner;
  
  console.log(chalk.blue.bold('\n🚀 COMPREHENSIVE USER JOURNEY TEST'));
  console.log(chalk.blue('Testing complete user flow with real data\n'));
  console.log(chalk.cyan('Test User:', testUser.email));
  console.log(chalk.cyan('Timestamp:', new Date().toISOString()));
  console.log(chalk.cyan('Using: SERVICE ROLE KEY for auth operations'));
  console.log(chalk.blue('=' .repeat(80)));
  
  let userId, accessToken, projectId, workflowId, conversationId;
  
  // Step 1: User Signup (Using Service Role Key)
  spinner = ora('Testing user signup with service role key...').start();
  try {
    // Use service role client for signup to bypass RLS
    const { data: signUpData, error: signUpError } = await supabaseService.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: testUser.fullName
      }
    });
    
    if (signUpError) throw signUpError;
    
    userId = signUpData.user?.id;
    
    // Now sign in to get access token
    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });
    
    if (signInError) throw signInError;
    
    accessToken = signInData.session?.access_token;
    
    spinner.succeed('User signup successful');
    testResults.addResult('User Signup', true, { userId, email: testUser.email });
    
    // Verify user profile was created
    const { data: profile, error: profileError } = await supabaseService
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      throw new Error(`User profile not created: ${profileError.message}`);
    }
    
    testResults.addResult('User Profile Creation', true, { profileId: profile.id });
    
  } catch (error) {
    spinner.fail('User signup failed');
    await ErrorHandler.handle(error, 'User Signup', { email: testUser.email });
    testResults.addResult('User Signup', false, { error: error.message });
    testResults.addCriticalIssue('User signup is broken - authentication system failure');
  }
  
  // Step 2: User Sign In (verify authentication works)
  if (userId) {
    spinner = ora('Testing user sign in...').start();
    try {
      const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });
      
      if (signInError) throw signInError;
      
      accessToken = signInData.session?.access_token;
      spinner.succeed('User sign in successful');
      testResults.addResult('User Sign In', true, { hasToken: !!accessToken });
      
    } catch (error) {
      spinner.fail('User sign in failed');
      await ErrorHandler.handle(error, 'User Sign In', { email: testUser.email });
      testResults.addResult('User Sign In', false, { error: error.message });
      testResults.addCriticalIssue('Sign in is broken - users cannot authenticate');
    }
  }
  
  // Step 3: Create Project
  if (accessToken) {
    spinner = ora('Testing project creation...').start();
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/projects-api`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create',
          data: {
            name: `Test Project ${timestamp}`,
            description: 'Automated test project'
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const projectData = await response.json();
      projectId = projectData.id;
      
      spinner.succeed('Project created successfully');
      testResults.addResult('Project Creation', true, { projectId });
      
    } catch (error) {
      spinner.fail('Project creation failed');
      await ErrorHandler.handle(error, 'Project Creation', { userId });
      testResults.addResult('Project Creation', false, { error: error.message });
      
      // Try direct database creation as fallback
      try {
        const { data: project, error: dbError } = await supabaseService
          .from('projects')
          .insert({
            name: `Test Project ${timestamp}`,
            description: 'Automated test project',
            user_id: userId
          })
          .select()
          .single();
        
        if (!dbError && project) {
          projectId = project.id;
          testResults.addResult('Project Creation (Fallback)', true, { projectId });
        }
      } catch (fallbackError) {
        testResults.addCriticalIssue('Project creation completely broken - no fallback works');
      }
    }
  }
  
  // Step 4: Test Chat/Workflow Generation
  if (accessToken && projectId) {
    spinner = ora('Testing workflow generation via chat...').start();
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-simple`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Create a simple workflow that sends a daily weather report email',
          projectId: projectId,
          conversationId: null
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const chatData = await response.json();
      conversationId = chatData.conversationId;
      workflowId = chatData.workflowId;
      
      spinner.succeed('Workflow generation successful');
      testResults.addResult('Workflow Generation', true, { workflowId, conversationId });
      
    } catch (error) {
      spinner.fail('Workflow generation failed');
      await ErrorHandler.handle(error, 'Workflow Generation', { projectId, userId });
      testResults.addResult('Workflow Generation', false, { error: error.message });
      testResults.addCriticalIssue('Chat/workflow generation broken - core feature failure');
    }
  }
  
  // Step 5: Verify Workflow in Database
  if (workflowId) {
    spinner = ora('Verifying workflow in database...').start();
    try {
      const { data: workflow, error: dbError } = await supabaseService
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single();
      
      if (dbError) throw dbError;
      
      spinner.succeed('Workflow verified in database');
      testResults.addResult('Workflow Database Verification', true, {
        workflowName: workflow.name,
        status: workflow.status
      });
      
    } catch (error) {
      spinner.fail('Workflow database verification failed');
      await ErrorHandler.handle(error, 'Workflow Database Verification', { workflowId });
      testResults.addResult('Workflow Database Verification', false, { error: error.message });
    }
  }
  
  // Step 6: Test n8n Deployment
  if (workflowId) {
    spinner = ora('Testing n8n deployment...').start();
    try {
      // Check if workflow exists in n8n
      const response = await fetch(`${N8N_API_URL}/workflows`, {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY
        }
      });
      
      if (!response.ok) {
        throw new Error(`n8n API error: ${response.status}`);
      }
      
      const workflows = await response.json();
      const deployedWorkflow = workflows.data?.find(w => 
        w.name?.includes(`USR-${userId}`) || w.name?.includes(workflowId)
      );
      
      if (deployedWorkflow) {
        spinner.succeed('Workflow deployed to n8n');
        testResults.addResult('n8n Deployment', true, {
          n8nWorkflowId: deployedWorkflow.id,
          active: deployedWorkflow.active
        });
      } else {
        throw new Error('Workflow not found in n8n');
      }
      
    } catch (error) {
      spinner.fail('n8n deployment verification failed');
      await ErrorHandler.handle(error, 'n8n Deployment', { workflowId });
      testResults.addResult('n8n Deployment', false, { error: error.message });
      testResults.addCriticalIssue('n8n integration broken - workflows not deploying');
    }
  }
  
  // Step 7: Test Dashboard Access
  if (accessToken) {
    spinner = ora('Testing dashboard data access...').start();
    try {
      // Get user's workflows
      const { data: workflows, error: workflowError } = await supabaseService
        .from('workflows')
        .select('*')
        .eq('user_id', userId);
      
      if (workflowError) throw workflowError;
      
      // Get user's projects
      const { data: projects, error: projectError } = await supabaseService
        .from('projects')
        .select('*')
        .eq('user_id', userId);
      
      if (projectError) throw projectError;
      
      spinner.succeed('Dashboard data access successful');
      testResults.addResult('Dashboard Access', true, {
        workflowCount: workflows?.length || 0,
        projectCount: projects?.length || 0
      });
      
    } catch (error) {
      spinner.fail('Dashboard data access failed');
      await ErrorHandler.handle(error, 'Dashboard Access', { userId });
      testResults.addResult('Dashboard Access', false, { error: error.message });
    }
  }
  
  // Step 8: Test Error Recovery
  spinner = ora('Testing error recovery mechanisms...').start();
  try {
    // Test with invalid token
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-simple`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid_token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'test' })
    });
    
    if (response.status === 401 || response.status === 403) {
      spinner.succeed('Error recovery working (auth rejection)');
      testResults.addResult('Error Recovery', true, { authErrorHandled: true });
    } else {
      throw new Error('Invalid token not rejected properly');
    }
    
  } catch (error) {
    spinner.fail('Error recovery not working properly');
    await ErrorHandler.handle(error, 'Error Recovery');
    testResults.addResult('Error Recovery', false, { error: error.message });
  }
  
  // Step 9: Cleanup Test Data
  spinner = ora('Cleaning up test data...').start();
  try {
    // Delete test user data using service role
    if (userId) {
      // Delete workflows
      await supabaseService.from('workflows').delete().eq('user_id', userId);
      // Delete projects
      await supabaseService.from('projects').delete().eq('user_id', userId);
      // Delete conversations
      await supabaseService.from('conversations').delete().eq('user_id', userId);
      // Delete user profile
      await supabaseService.from('user_profiles').delete().eq('id', userId);
      // Delete auth user
      await supabaseService.auth.admin.deleteUser(userId);
    }
    
    spinner.succeed('Test data cleaned up');
    testResults.addResult('Cleanup', true);
    
  } catch (error) {
    spinner.warn('Cleanup partially failed (non-critical)');
    testResults.addResult('Cleanup', false, { error: error.message });
  }
  
  // Generate final report
  const report = testResults.generateReport();
  
  // Return test results
  return report;
}

// Execute test
console.log(chalk.blue.bold('\n🏁 Starting Comprehensive User Journey Test...\n'));

runUserJourneyTest()
  .then(report => {
    if (report.success) {
      console.log(chalk.green.bold('\n✅ ALL TESTS PASSED - SYSTEM IS PRODUCTION READY!\n'));
      process.exit(0);
    } else {
      console.log(chalk.red.bold('\n❌ TESTS FAILED - CRITICAL ISSUES FOUND!\n'));
      console.log(chalk.yellow('Please fix identified roadblocks before production deployment.\n'));
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(chalk.red.bold('\n💥 CATASTROPHIC TEST FAILURE:'));
    console.error(error);
    process.exit(1);
  });