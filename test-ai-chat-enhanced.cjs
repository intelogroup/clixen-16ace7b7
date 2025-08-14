const { createClient } = require('@supabase/supabase-js');

async function testAiChatEnhanced() {
  // Use anon key for function calls
  const supabase = createClient(
    'https://zfbgdixbzezpxllkoyfc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw'
  );
  
  // Service role client for admin operations
  const supabaseAdmin = createClient(
    'https://zfbgdixbzezpxllkoyfc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig'
  );
  
  console.log('🚀 Testing ai-chat-simple with enhanced isolation...');
  
  // Get test user and project using admin client
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const testUser = users.users.find(u => u.email.includes('test18221')) || users.users[0];
  
  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('user_id', testUser.id)
    .limit(1);
  
  if (!projects || projects.length === 0) {
    console.log('❌ No projects found');
    return;
  }
  
  const testProject = projects[0];
  console.log(`👤 User: ${testUser.email} (${testUser.id.substring(0,8)}***)`);
  console.log(`📋 Project: ${testProject.name} (${testProject.id.substring(0,8)}***)`);
  
  // Test prompt that should create a workflow
  const testPrompt = 'Create a workflow to get weather information for Boston and respond with the temperature';
  
  console.log('🤖 Calling ai-chat-simple Edge Function...');
  console.log(`   Prompt: "${testPrompt}"`);
  
  try {
    const { data: response, error } = await supabase.functions.invoke('ai-chat-simple', {
      body: {
        message: testPrompt,
        userId: testUser.id,
        projectId: testProject.id,
        conversationHistory: [],
        createWorkflow: true,
        maxSteps: 2
      }
    });
    
    if (error) {
      console.error('❌ Edge Function error:', error);
      return;
    }
    
    console.log('✅ Edge Function responded successfully!');
    console.log('📄 Response structure:', Object.keys(response));
    
    if (response.response) {
      console.log('💬 AI Response:', response.response.substring(0, 200) + '...');
    }
    
    if (response.workflow) {
      console.log('🎯 Workflow Generated!');
      console.log(`   Name: ${response.workflow.name}`);
      console.log(`   Nodes: ${response.workflow.nodes ? response.workflow.nodes.length : 'N/A'}`);
      
      // Check if enhanced naming is applied
      const expectedUserPrefix = `[USR-${testUser.id.substring(0,8)}]`;
      const expectedProjectPrefix = `[PRJ-${testProject.id.substring(0,8)}]`;
      const expectedFullPrefix = `${expectedUserPrefix}${expectedProjectPrefix}`;
      
      console.log('🔍 Naming Convention Analysis:');
      console.log(`   Expected user prefix: ${expectedUserPrefix}`);
      console.log(`   Expected project prefix: ${expectedProjectPrefix}`);
      console.log(`   Expected full prefix: ${expectedFullPrefix}`);
      console.log(`   Actual name: ${response.workflow.name}`);
      
      if (response.workflow.name.includes(expectedUserPrefix)) {
        console.log('   ✅ User isolation: WORKING');
        
        if (response.workflow.name.includes(expectedProjectPrefix)) {
          console.log('   ✅ Project isolation: WORKING (Enhanced format!)');
        } else {
          console.log('   📝 Project isolation: Using legacy format');
        }
      } else {
        console.log('   ❌ User isolation: NOT APPLIED');
      }
      
      if (response.deployment) {
        console.log('🚀 Deployment Status:');
        console.log(`   Success: ${response.deployment.success}`);
        console.log(`   Workflow ID: ${response.deployment.workflowId || 'N/A'}`);
        if (response.deployment.error) {
          console.log(`   Error: ${response.deployment.error}`);
        }
      }
    }
    
    console.log('');
    console.log('🎯 Enhanced Isolation Test Results:');
    if (response.workflow) {
      const hasUserIsolation = response.workflow.name.includes(`[USR-${testUser.id.substring(0,8)}]`);
      const hasProjectIsolation = response.workflow.name.includes(`[PRJ-${testProject.id.substring(0,8)}]`);
      
      console.log(`   User Isolation: ${hasUserIsolation ? '✅ WORKING' : '❌ FAILED'}`);
      console.log(`   Project Isolation: ${hasProjectIsolation ? '✅ WORKING (Enhanced)' : '📝 Legacy format'}`);
      console.log(`   Workflow Generated: ✅ SUCCESS`);
      
      if (hasUserIsolation && hasProjectIsolation) {
        console.log('   🎉 PHASE 1 IMPLEMENTATION: FULLY SUCCESSFUL!');
      } else if (hasUserIsolation) {
        console.log('   ✅ PHASE 1 IMPLEMENTATION: PARTIALLY SUCCESSFUL');
      } else {
        console.log('   ❌ PHASE 1 IMPLEMENTATION: NEEDS DEBUGGING');
      }
    } else {
      console.log('   ❌ No workflow generated - check AI prompt processing');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testAiChatEnhanced().catch(console.error);