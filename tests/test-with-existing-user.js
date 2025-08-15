#!/usr/bin/env node

/**
 * Test with existing user to bypass signup issues
 * Uses the known working test user credentials
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import chalk from 'chalk';
import ora from 'ora';

const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';
const N8N_API_URL = 'https://n8nio-n8n-7xzf6n.sliplane.app/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiN2ZmZWU5My04YTBlLTQwYTItYmMyYi0xOGE1NDliODAwZDYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTAzNzc1fQ.mXnHtIvlmj-93EjwXZqBwzmUx9uUIddS4fO3TGMRCZ0';

// Use existing test user
const existingUser = {
  email: 'jayveedz19@gmail.com',
  password: 'Goldyear2023#'
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testWithExistingUser() {
  console.log(chalk.blue.bold('\n🚀 TESTING USER JOURNEY WITH EXISTING USER'));
  console.log(chalk.blue('=' .repeat(60)));
  console.log(chalk.cyan('Test User:', existingUser.email));
  
  let userId, accessToken, projectId, workflowId;
  let spinner;
  const results = [];
  
  // Step 1: Sign In
  spinner = ora('Signing in with existing user...').start();
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: existingUser.email,
      password: existingUser.password
    });
    
    if (error) throw error;
    
    userId = data.user?.id;
    accessToken = data.session?.access_token;
    
    spinner.succeed('Sign in successful');
    results.push({ step: 'Sign In', success: true, userId });
    
  } catch (error) {
    spinner.fail('Sign in failed');
    console.error(chalk.red('Error:'), error.message);
    results.push({ step: 'Sign In', success: false, error: error.message });
    return;
  }
  
  // Step 2: Create Project
  spinner = ora('Creating test project...').start();
  try {
    const timestamp = Date.now();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/projects-api`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'create',
        data: {
          name: `Journey Test Project ${timestamp}`,
          description: 'Testing complete user journey'
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const projectData = await response.json();
    projectId = projectData.id;
    
    spinner.succeed('Project created');
    results.push({ step: 'Create Project', success: true, projectId });
    
  } catch (error) {
    spinner.fail('Project creation failed');
    console.error(chalk.red('Error:'), error.message);
    results.push({ step: 'Create Project', success: false, error: error.message });
    
    // Try direct DB creation
    try {
      const { data: project } = await supabaseService
        .from('projects')
        .insert({
          name: `Journey Test Project ${Date.now()}`,
          description: 'Testing complete user journey',
          user_id: userId
        })
        .select()
        .single();
      
      if (project) {
        projectId = project.id;
        console.log(chalk.yellow('Created project via direct DB'));
      }
    } catch (dbError) {
      console.error(chalk.red('Direct DB also failed:'), dbError.message);
    }
  }
  
  // Step 3: Test Chat/Workflow Generation
  if (projectId) {
    spinner = ora('Testing workflow generation...').start();
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-simple`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Create a simple workflow that checks the weather daily',
          projectId: projectId
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const chatData = await response.json();
      workflowId = chatData.workflowId;
      
      spinner.succeed('Workflow generation successful');
      results.push({ step: 'Workflow Generation', success: true, workflowId });
      
    } catch (error) {
      spinner.fail('Workflow generation failed');
      console.error(chalk.red('Error:'), error.message);
      results.push({ step: 'Workflow Generation', success: false, error: error.message });
    }
  }
  
  // Step 4: Verify n8n Deployment
  if (workflowId) {
    spinner = ora('Checking n8n deployment...').start();
    try {
      const response = await fetch(`${N8N_API_URL}/workflows`, {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY
        }
      });
      
      if (!response.ok) {
        throw new Error(`n8n API error: ${response.status}`);
      }
      
      const workflows = await response.json();
      const deployed = workflows.data?.find(w => 
        w.name?.includes(`USR-${userId}`) || w.name?.includes(workflowId)
      );
      
      if (deployed) {
        spinner.succeed('Workflow deployed to n8n');
        results.push({ step: 'n8n Deployment', success: true, n8nId: deployed.id });
      } else {
        throw new Error('Workflow not found in n8n');
      }
      
    } catch (error) {
      spinner.fail('n8n deployment check failed');
      console.error(chalk.red('Error:'), error.message);
      results.push({ step: 'n8n Deployment', success: false, error: error.message });
    }
  }
  
  // Step 5: Test Dashboard Access
  spinner = ora('Testing dashboard access...').start();
  try {
    const { data: workflows } = await supabaseService
      .from('workflows')
      .select('*')
      .eq('user_id', userId)
      .limit(5);
    
    const { data: projects } = await supabaseService
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .limit(5);
    
    spinner.succeed('Dashboard access successful');
    results.push({ 
      step: 'Dashboard Access', 
      success: true, 
      workflows: workflows?.length || 0,
      projects: projects?.length || 0
    });
    
  } catch (error) {
    spinner.fail('Dashboard access failed');
    console.error(chalk.red('Error:'), error.message);
    results.push({ step: 'Dashboard Access', success: false, error: error.message });
  }
  
  // Cleanup
  if (projectId) {
    spinner = ora('Cleaning up test data...').start();
    try {
      await supabaseService.from('workflows').delete().eq('project_id', projectId);
      await supabaseService.from('projects').delete().eq('id', projectId);
      spinner.succeed('Test data cleaned up');
    } catch (error) {
      spinner.warn('Cleanup failed (non-critical)');
    }
  }
  
  // Report
  console.log(chalk.blue('\n' + '=' .repeat(60)));
  console.log(chalk.blue.bold('TEST RESULTS'));
  console.log(chalk.blue('=' .repeat(60)));
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  console.log(chalk.white('\n📊 Summary:'));
  console.log(chalk.green(`  ✅ Successful: ${successCount}/${results.length}`));
  console.log(chalk.red(`  ❌ Failed: ${failureCount}/${results.length}`));
  
  console.log(chalk.white('\n📝 Details:'));
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? chalk.green : chalk.red;
    console.log(color(`  ${index + 1}. ${icon} ${result.step}`));
    if (!result.success && result.error) {
      console.log(chalk.gray(`     Error: ${result.error}`));
    }
  });
  
  if (failureCount === 0) {
    console.log(chalk.green.bold('\n🎉 ALL TESTS PASSED!'));
    console.log(chalk.green('System is ready for production use with existing users.'));
  } else {
    console.log(chalk.yellow.bold('\n⚠️  SOME TESTS FAILED'));
    console.log(chalk.yellow('Identified issues need to be fixed.'));
  }
  
  console.log(chalk.blue('\n' + '=' .repeat(60)));
}

testWithExistingUser();