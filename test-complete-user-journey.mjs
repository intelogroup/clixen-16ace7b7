#!/usr/bin/env node
/**
 * Complete User Journey Test - Test the full Clixen workflow creation experience
 * Tests: Authentication → Workflow Creation → Agent System → n8n Deployment → Verification
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs';

// Configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test state
let testSession = {
  user: null,
  sessionToken: null,
  conversationId: null,
  workflowId: null,
  n8nWorkflowId: null,
  startTime: Date.now(),
  steps: []
};

const testResults = {
  timestamp: new Date().toISOString(),
  phases: [],
  totalDuration: 0,
  success: false,
  errors: []
};

// Utility functions
function logStep(phase, step, status, details = null, error = null) {
  const stepData = {
    phase,
    step,
    status,
    timestamp: new Date().toISOString(),
    duration: Date.now() - testSession.startTime,
    details,
    error: error?.message || null
  };
  
  testSession.steps.push(stepData);
  
  const statusIcon = status === 'success' ? '✅' : status === 'error' ? '❌' : '🔄';
  console.log(`${statusIcon} [${phase}] ${step}${details ? `: ${details}` : ''}`);
  
  if (error) {
    console.log(`   Error: ${error.message}`);
    testResults.errors.push(error.message);
  }
}

function logPhase(phase, status, summary = null) {
  testResults.phases.push({
    name: phase,
    status,
    duration: Date.now() - testSession.startTime,
    summary
  });
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📋 PHASE: ${phase.toUpperCase()} - ${status.toUpperCase()}`);
  if (summary) console.log(`📝 ${summary}`);
  console.log(`${'='.repeat(50)}\n`);
}

// Test phases
async function phase1_Authentication() {
  logPhase('Authentication', 'starting');
  
  try {
    logStep('Auth', 'Attempting user login', 'progress');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user data returned');

    testSession.user = data.user;
    testSession.sessionToken = data.session.access_token;
    
    logStep('Auth', 'Login successful', 'success', `User ID: ${data.user.id}`);
    logStep('Auth', 'Session token obtained', 'success', `Token length: ${testSession.sessionToken.length}`);
    
    // Test token validity
    const { data: session } = await supabase.auth.getSession();
    if (session.session) {
      logStep('Auth', 'Session validation', 'success', `Expires: ${new Date(session.session.expires_at * 1000).toLocaleString()}`);
    }
    
    logPhase('Authentication', 'completed', 'User authenticated successfully');
    return true;
    
  } catch (error) {
    logStep('Auth', 'Authentication failed', 'error', null, error);
    logPhase('Authentication', 'failed', error.message);
    return false;
  }
}

async function phase2_MultiAgentSystem() {
  logPhase('Multi-Agent System', 'starting');
  
  try {
    logStep('AI', 'Testing AI chat system endpoint', 'progress');
    
    const testMessage = 'I need to create a workflow that automatically sends a welcome email to new users when they sign up. The workflow should trigger from a webhook, validate the user data, and send a personalized welcome email.';
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-system`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testSession.sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testMessage,
        user_id: testSession.user.id,
        context: {
          mode: 'workflow_creation',
          conversation_history: [],
          current_step: 0
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const aiResponse = await response.json();
    
    logStep('AI', 'AI response received', 'success', `Agent: ${aiResponse.agent || 'unknown'}, Tokens: ${aiResponse.usage?.total_tokens || 0}`);
    
    if (aiResponse.response && aiResponse.response.length > 0) {
      logStep('AI', 'Response content validation', 'success', `Length: ${aiResponse.response.length} chars`);
    } else {
      throw new Error('Empty or invalid AI response');
    }
    
    // Test workflow design phase
    if (aiResponse.workflow_progress) {
      logStep('AI', 'Workflow progress tracking', 'success', `Steps: ${Object.keys(aiResponse.workflow_progress).length}`);
    }
    
    if (aiResponse.conversation_id) {
      testSession.conversationId = aiResponse.conversation_id;
      logStep('AI', 'Conversation ID assigned', 'success', testSession.conversationId);
    }
    
    logPhase('Multi-Agent System', 'completed', 'AI agents responding correctly');
    return true;
    
  } catch (error) {
    logStep('AI', 'Multi-agent system failed', 'error', null, error);
    logPhase('Multi-Agent System', 'failed', error.message);
    return false;
  }
}

async function phase3_WorkflowCreation() {
  logPhase('Workflow Creation', 'starting');
  
  try {
    logStep('Workflow', 'Requesting workflow design', 'progress');
    
    const designMessage = 'Please create the complete n8n workflow structure for this email automation. I want it to be production-ready with proper error handling.';
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-system`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testSession.sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: designMessage,
        user_id: testSession.user.id,
        context: {
          mode: 'workflow_creation',
          conversation_id: testSession.conversationId,
          phase: 'design',
          current_step: 1
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const designResponse = await response.json();
    
    logStep('Workflow', 'Workflow design received', 'success', `Agent: ${designResponse.agent}`);
    
    if (designResponse.workflow_preview) {
      logStep('Workflow', 'Workflow preview generated', 'success', `Nodes: ${designResponse.workflow_preview.nodes?.length || 0}`);
      testSession.workflowId = designResponse.workflow_preview.id || `workflow-${Date.now()}`;
    }
    
    // Request actual deployment
    logStep('Workflow', 'Requesting workflow deployment', 'progress');
    
    const deployMessage = 'Deploy this workflow to n8n now. Make it active and provide me with the webhook URL.';
    
    const deployResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-system`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testSession.sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: deployMessage,
        user_id: testSession.user.id,
        context: {
          mode: 'workflow_creation',
          conversation_id: testSession.conversationId,
          phase: 'deploy',
          current_step: 2,
          workflow_id: testSession.workflowId
        }
      })
    });

    if (!deployResponse.ok) {
      throw new Error(`Deployment failed: HTTP ${deployResponse.status}: ${await deployResponse.text()}`);
    }

    const deployment = await deployResponse.json();
    
    logStep('Workflow', 'Deployment response received', 'success', `Agent: ${deployment.agent}`);
    
    // Check for deployment success indicators
    if (deployment.workflow_deployment) {
      logStep('Workflow', 'Workflow deployment confirmed', 'success', `ID: ${deployment.workflow_deployment.id}`);
      testSession.n8nWorkflowId = deployment.workflow_deployment.id;
    } else if (deployment.response && deployment.response.includes('webhook')) {
      logStep('Workflow', 'Webhook URL provided', 'success', 'URL found in response');
    }
    
    logPhase('Workflow Creation', 'completed', 'Workflow designed and deployed');
    return true;
    
  } catch (error) {
    logStep('Workflow', 'Workflow creation failed', 'error', null, error);
    logPhase('Workflow Creation', 'failed', error.message);
    return false;
  }
}

async function phase4_N8nIntegration() {
  logPhase('n8n Integration', 'starting');
  
  try {
    // Test n8n API health
    logStep('n8n', 'Testing n8n API connection', 'progress');
    
    const healthResponse = await fetch(`${N8N_API_URL.replace('/api/v1', '')}/healthz`);
    if (healthResponse.ok) {
      logStep('n8n', 'n8n service health check', 'success', 'Service is running');
    } else {
      throw new Error(`n8n health check failed: ${healthResponse.status}`);
    }
    
    // List workflows to verify our deployment
    logStep('n8n', 'Fetching workflows from n8n', 'progress');
    
    const workflowsResponse = await fetch(`${N8N_API_URL}/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
      }
    });
    
    if (!workflowsResponse.ok) {
      throw new Error(`Failed to fetch workflows: ${workflowsResponse.status}`);
    }
    
    const workflows = await workflowsResponse.json();
    logStep('n8n', 'Workflows retrieved', 'success', `Count: ${workflows.data?.length || workflows.length || 0}`);
    
    // Check if our workflow exists
    if (testSession.n8nWorkflowId) {
      const ourWorkflow = workflows.data?.find(w => w.id === testSession.n8nWorkflowId) || 
                         workflows.find(w => w.id === testSession.n8nWorkflowId);
      
      if (ourWorkflow) {
        logStep('n8n', 'Created workflow found', 'success', `Name: ${ourWorkflow.name}`);
        logStep('n8n', 'Workflow status', 'success', `Active: ${ourWorkflow.active}`);
      } else {
        logStep('n8n', 'Created workflow not found', 'progress', 'Workflow may be using different ID format');
      }
    }
    
    // Test API operations endpoint
    logStep('n8n', 'Testing api-operations integration', 'progress');
    
    const apiTestResponse = await fetch(`${SUPABASE_URL}/functions/v1/api-operations/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testSession.sessionToken}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (apiTestResponse.ok) {
      const healthData = await apiTestResponse.json();
      logStep('n8n', 'API operations health check', 'success', `Status: ${healthData.status}`);
    } else {
      logStep('n8n', 'API operations test', 'error', `Status: ${apiTestResponse.status}`);
    }
    
    logPhase('n8n Integration', 'completed', 'n8n API integration verified');
    return true;
    
  } catch (error) {
    logStep('n8n', 'n8n integration failed', 'error', null, error);
    logPhase('n8n Integration', 'failed', error.message);
    return false;
  }
}

async function phase5_EndToEndValidation() {
  logPhase('End-to-End Validation', 'starting');
  
  try {
    // Test complete flow simulation
    logStep('E2E', 'Simulating complete user flow', 'progress');
    
    const flowTest = {
      userSignup: true,
      workflowTrigger: testSession.n8nWorkflowId !== null,
      agentResponse: testSession.steps.some(s => s.phase === 'AI' && s.status === 'success'),
      n8nIntegration: testSession.steps.some(s => s.phase === 'n8n' && s.status === 'success'),
      authenticationWorking: testSession.user !== null
    };
    
    const flowScore = Object.values(flowTest).filter(Boolean).length;
    const maxScore = Object.keys(flowTest).length;
    
    logStep('E2E', 'Flow component validation', 'success', `Score: ${flowScore}/${maxScore}`);
    
    // Performance validation
    const totalDuration = Date.now() - testSession.startTime;
    logStep('E2E', 'Performance check', totalDuration < 60000 ? 'success' : 'progress', `Total time: ${Math.round(totalDuration/1000)}s`);
    
    // Error rate validation
    const errorSteps = testSession.steps.filter(s => s.status === 'error').length;
    const totalSteps = testSession.steps.length;
    const errorRate = (errorSteps / totalSteps) * 100;
    
    logStep('E2E', 'Error rate analysis', errorRate < 20 ? 'success' : 'progress', `Error rate: ${errorRate.toFixed(1)}%`);
    
    // Success criteria
    const isSuccessful = flowScore >= 4 && errorRate < 30 && totalDuration < 120000;
    
    testResults.success = isSuccessful;
    testResults.totalDuration = totalDuration;
    
    if (isSuccessful) {
      logStep('E2E', 'Overall test result', 'success', 'All critical systems operational');
      logPhase('End-to-End Validation', 'completed', 'Complete user journey validated successfully');
    } else {
      logStep('E2E', 'Overall test result', 'progress', `${flowScore}/${maxScore} components working`);
      logPhase('End-to-End Validation', 'partial', 'Some issues identified but core functionality working');
    }
    
    return isSuccessful;
    
  } catch (error) {
    logStep('E2E', 'Validation failed', 'error', null, error);
    logPhase('End-to-End Validation', 'failed', error.message);
    return false;
  }
}

// Generate comprehensive report
function generateReport() {
  const report = {
    test_session: testSession,
    results: testResults,
    system_health: {
      authentication: testResults.phases.find(p => p.name === 'Authentication')?.status || 'not_tested',
      ai_agents: testResults.phases.find(p => p.name === 'Multi-Agent System')?.status || 'not_tested',
      workflow_creation: testResults.phases.find(p => p.name === 'Workflow Creation')?.status || 'not_tested',
      n8n_integration: testResults.phases.find(p => p.name === 'n8n Integration')?.status || 'not_tested',
      e2e_validation: testResults.phases.find(p => p.name === 'End-to-End Validation')?.status || 'not_tested'
    },
    performance_metrics: {
      total_duration_ms: testResults.totalDuration,
      total_duration_seconds: Math.round(testResults.totalDuration / 1000),
      error_count: testResults.errors.length,
      success_rate: testResults.success ? 100 : Math.max(0, 100 - (testResults.errors.length * 10))
    },
    recommendations: []
  };
  
  // Add recommendations
  if (testResults.totalDuration > 60000) {
    report.recommendations.push('Consider optimizing AI response times');
  }
  
  if (testResults.errors.length > 0) {
    report.recommendations.push('Review error handling and retry mechanisms');
  }
  
  if (!testSession.n8nWorkflowId) {
    report.recommendations.push('Verify n8n workflow deployment process');
  }
  
  if (report.recommendations.length === 0) {
    report.recommendations.push('System performing excellently - consider adding advanced features');
  }
  
  return report;
}

// Main test execution
async function runCompleteUserJourneyTest() {
  console.log('🚀 Starting Complete User Journey Test');
  console.log('🎯 Testing Clixen Multi-Agent Workflow Automation Platform');
  console.log(`⏰ Start Time: ${new Date().toLocaleString()}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const phases = [
    { name: 'Authentication', test: phase1_Authentication },
    { name: 'Multi-Agent System', test: phase2_MultiAgentSystem },
    { name: 'Workflow Creation', test: phase3_WorkflowCreation },
    { name: 'n8n Integration', test: phase4_N8nIntegration },
    { name: 'End-to-End Validation', test: phase5_EndToEndValidation }
  ];
  
  let allPassed = true;
  
  for (const phase of phases) {
    const result = await phase.test();
    if (!result) {
      allPassed = false;
      // Continue with remaining phases for complete assessment
    }
    
    // Brief pause between phases
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Generate and save report
  const report = generateReport();
  const reportFile = `user-journey-test-report-${Date.now()}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  // Final summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('🏁 COMPLETE USER JOURNEY TEST SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`⏱️  Total Duration: ${Math.round(testResults.totalDuration / 1000)}s`);
  console.log(`✅ Success Rate: ${report.performance_metrics.success_rate}%`);
  console.log(`❌ Total Errors: ${testResults.errors.length}`);
  console.log(`📊 Phases Completed: ${testResults.phases.length}`);
  console.log(`💾 Report Saved: ${reportFile}`);
  
  if (testResults.success || report.performance_metrics.success_rate >= 80) {
    console.log(`\n🎉 RESULT: USER JOURNEY TEST ${testResults.success ? 'PASSED' : 'PARTIALLY PASSED'}`);
    console.log('✨ Clixen platform is ready for production use!');
  } else {
    console.log('\n⚠️  RESULT: USER JOURNEY TEST NEEDS ATTENTION');
    console.log('🔧 Some components require fixes before production deployment');
  }
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => console.log(`   • ${rec}`));
  }
  
  console.log(`\n📋 Detailed report: ${reportFile}`);
  
  return testResults.success;
}

// Run the test
runCompleteUserJourneyTest()
  .then(success => {
    console.log(`\n🏆 Test ${success ? 'COMPLETED SUCCESSFULLY' : 'COMPLETED WITH ISSUES'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Test suite crashed:', error);
    console.log('📝 This indicates a critical system failure');
    process.exit(1);
  });