import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

// Test credentials
const testEmail = 'jayveedz19@gmail.com';
const testPassword = 'Goldyear2023#';

async function testWorkflowDeployment() {
  try {
    console.log('🚀 TESTING COMPLETE WORKFLOW DEPLOYMENT');
    console.log('='.repeat(55));
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Authenticate
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.error('❌ Authentication failed:', signInError.message);
      return;
    }
    
    console.log('✅ User authenticated');
    const userId = signInData.user.id;
    
    // Test workflow creation with immediate deployment
    console.log('\n🎯 CREATING AND DEPLOYING WORKFLOW');
    
    const workflowPrompt = "Create a simple test workflow that gets the current time and logs it";
    const conversationId = `deploy-test-${Date.now()}`;
    
    console.log(`   Prompt: "${workflowPrompt}"`);
    
    // Step 1: Generate workflow
    console.log('\n1. 🤖 GENERATING WORKFLOW VIA AI CHAT');
    
    const { data: chatResponse, error: chatError } = await supabase.functions.invoke('ai-chat-simple', {
      body: {
        message: workflowPrompt,
        conversationId: conversationId,
        requestDeployment: true
      }
    });
    
    if (chatError) {
      console.error('   ❌ Chat function error:', chatError.message);
      return;
    }
    
    console.log('   ✅ Workflow generated successfully');
    console.log(`   Session ID: ${chatResponse.session_id}`);
    console.log(`   Workflow generated: ${chatResponse.workflow_generated}`);
    
    if (chatResponse.workflow_data) {
      console.log(`   Workflow name: ${chatResponse.workflow_data.name || 'N/A'}`);
      console.log(`   Node count: ${chatResponse.workflow_data.nodes?.length || 0}`);
    }
    
    // Step 2: Check if workflow was stored in Supabase
    console.log('\n2. 💾 CHECKING WORKFLOW STORAGE');
    
    const { data: workflows, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (workflowError) {
      console.error('   ❌ Workflow query error:', workflowError.message);
    } else if (workflows.length > 0) {
      const latestWorkflow = workflows[0];
      console.log('   ✅ Workflow stored in database');
      console.log(`   ID: ${latestWorkflow.id}`);
      console.log(`   Name: ${latestWorkflow.name}`);
      console.log(`   Status: ${latestWorkflow.status}`);
      console.log(`   n8n ID: ${latestWorkflow.n8n_workflow_id || 'Not deployed'}`);
      
      // Step 3: Test deployment to n8n
      if (latestWorkflow.n8n_workflow_id) {
        console.log('\n3. 🔧 VERIFYING N8N DEPLOYMENT');
        await verifyN8nDeployment(latestWorkflow.n8n_workflow_id, userId);
      } else {
        console.log('\n3. 🚀 ATTEMPTING N8N DEPLOYMENT');
        await attemptN8nDeployment(supabase, latestWorkflow, userId);
      }
    } else {
      console.log('   ⚠️ No workflows found in database');
    }
    
    // Step 4: Verify user isolation
    console.log('\n4. 🔒 VERIFYING USER ISOLATION');
    
    const expectedWorkflowName = `[USR-${userId}]`;
    console.log(`   Expected prefix: ${expectedWorkflowName}`);
    
    // Check workflows have proper naming
    const { data: userWorkflows } = await supabase
      .from('workflows')
      .select('name')
      .eq('user_id', userId);
    
    const properlyNamed = userWorkflows?.filter(w => w.name.includes(`[USR-${userId}]`));
    console.log(`   ✅ ${properlyNamed?.length || 0}/${userWorkflows?.length || 0} workflows have proper user prefixes`);
    
    console.log('\n' + '='.repeat(55));
    console.log('🎯 WORKFLOW DEPLOYMENT TEST COMPLETE');
    
    return {
      success: true,
      userId,
      workflowGenerated: chatResponse.workflow_generated,
      workflowStored: workflows?.length > 0,
      workflowDeployed: workflows?.[0]?.n8n_workflow_id ? true : false
    };
    
  } catch (error) {
    console.error('❌ Deployment test error:', error.message);
    return { success: false, error: error.message };
  }
}

async function verifyN8nDeployment(n8nWorkflowId, userId) {
  try {
    console.log(`   📡 Checking n8n workflow: ${n8nWorkflowId}`);
    
    // Use n8n API to verify the workflow exists
    const n8nApiUrl = 'https://n8nio-n8n-7xzf6n.sliplane.app/api/v1';
    const n8nApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiN2ZmZWU5My04YTBlLTQwYTItYmMyYi0xOGE1NDliODAwZDYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTAzNzc1fQ.mXnHtIvlmj-93EjwXZqBwzmUx9uUIddS4fO3TGMRCZ0';
    
    const response = await fetch(`${n8nApiUrl}/workflows/${n8nWorkflowId}`, {
      headers: {
        'Authorization': `Bearer ${n8nApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const workflowData = await response.json();
      console.log('   ✅ Workflow found in n8n');
      console.log(`   Name: ${workflowData.name}`);
      console.log(`   Active: ${workflowData.active}`);
      console.log(`   Nodes: ${workflowData.nodes?.length || 0}`);
      
      // Verify user isolation
      const hasUserPrefix = workflowData.name.includes(`[USR-${userId}]`);
      console.log(`   User isolation: ${hasUserPrefix ? '✅' : '❌'} ${hasUserPrefix ? 'Correct' : 'Missing user prefix'}`);
      
      return true;
    } else {
      console.log(`   ❌ Workflow not found in n8n (status: ${response.status})`);
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ n8n verification error: ${error.message}`);
    return false;
  }
}

async function attemptN8nDeployment(supabase, workflow, userId) {
  try {
    console.log('   🚀 Attempting to deploy workflow to n8n...');
    
    // Call the workflows-api function to deploy
    const { data: deployResult, error: deployError } = await supabase.functions.invoke('workflows-api', {
      body: {
        action: 'deploy',
        workflowId: workflow.id,
        userId: userId
      }
    });
    
    if (deployError) {
      console.log(`   ❌ Deployment error: ${deployError.message}`);
      return false;
    }
    
    console.log('   ✅ Deployment request sent');
    console.log(`   Result: ${JSON.stringify(deployResult)}`);
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ Deployment attempt error: ${error.message}`);
    return false;
  }
}

testWorkflowDeployment().then(result => {
  if (result?.success) {
    console.log('\n🎯 DEPLOYMENT TEST RESULTS:');
    console.log(`• Workflow Generation: ${result.workflowGenerated ? '✅' : '❌'} ${result.workflowGenerated ? 'Working' : 'Failed'}`);
    console.log(`• Database Storage: ${result.workflowStored ? '✅' : '❌'} ${result.workflowStored ? 'Working' : 'Failed'}`);
    console.log(`• n8n Deployment: ${result.workflowDeployed ? '✅' : '❌'} ${result.workflowDeployed ? 'Working' : 'Needs attention'}`);
    
    console.log('\n🧪 MANUAL TESTING STEPS:');
    console.log('1. 🌐 Open https://clixen.app');
    console.log('2. 🔐 Login with test credentials');
    console.log('3. 💬 Go to chat and create a workflow');
    console.log('4. 🔍 Verify workflow appears in dashboard');
    console.log('5. 🎯 Check n8n interface for proper organization');
    
  } else {
    console.log('\n❌ DEPLOYMENT TEST FAILED');
    console.log(`Error: ${result?.error}`);
  }
});