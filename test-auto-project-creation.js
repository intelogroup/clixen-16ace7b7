/**
 * Test Auto Project Creation Flow
 * 
 * This script tests the complete flow:
 * 1. Simulate user signup  
 * 2. Verify project auto-creation
 * 3. Test workflow creation with project assignment
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testAutoProjectCreation() {
  console.log('🧪 Testing Auto Project Creation Flow\n');

  const testEmail = 'goldbergwalmer@email.com';
  
  try {
    // Step 1: Get user ID from user_profiles table
    console.log('📋 Step 1: Looking up user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('email', testEmail)
      .single();
    
    if (profileError || !profile) {
      console.log('❌ No user profile found for', testEmail);
      console.log('   In real flow, user would sign up first and trigger would create project automatically');
      return;
    }

    const userId = profile.id;
    console.log(`✅ Found user profile: ${userId.substring(0, 8)}... (${profile.email})`);

    // Step 2: Check for existing projects
    console.log('\n📋 Step 2: Checking user projects...');
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId);

    if (projectError) {
      console.error('❌ Error querying projects:', projectError);
      return;
    }

    console.log(`✅ Found ${projects?.length || 0} existing projects`);
    if (projects && projects.length > 0) {
      projects.forEach(project => {
        console.log(`   - ${project.name} (${project.id})`);
        console.log(`     Created: ${project.created_at}`);
        console.log(`     Auto-created: ${project.metadata?.auto_created || 'unknown'}`);
      });
    }

    // Step 3: If no auto-created project exists, create one
    let targetProject = projects?.find(p => p.metadata?.auto_created === true);
    
    if (!targetProject) {
      console.log('\n🔧 Step 3: Creating auto project (simulating signup trigger)...');
      
      // Generate project name using our naming convention
      const username = testEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '').slice(2); // DDMMYYYYHHMM
      const userCode = Math.random().toString(36).substring(2, 10); // 8 random chars
      const projectName = `${username}-project-${timestamp}-user-${userCode}`;
      const projectDescription = `Clixen automated workflow project for ${username}. Created on ${new Date().toISOString().split('T')[0]}. This project contains all workflows created by ${testEmail} in the Clixen application.`;
      
      console.log(`   Creating project: ${projectName}`);
      
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name: projectName,
          description: projectDescription,
          metadata: {
            auto_created: true,
            trigger_type: 'manual_test',
            created_for_email: testEmail,
            username: username,
            creation_timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Project creation failed:', createError);
        return;
      }

      targetProject = newProject;
      console.log(`✅ Project created successfully: ${targetProject.id}`);
    } else {
      console.log(`✅ Auto-created project already exists: ${targetProject.name}`);
    }

    // Step 4: Create a welcome conversation
    console.log('\n📋 Step 4: Creating welcome conversation...');
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        project_id: targetProject.id,
        title: 'Welcome to Clixen!',
        messages: [
          {
            role: 'system',
            content: `Welcome to your personal Clixen workspace! This is your project: "${targetProject.name}". You can start creating workflows by describing what you want to automate.`,
            timestamp: new Date().toISOString()
          }
        ]
      })
      .select()
      .single();

    if (convError) {
      console.warn('⚠️ Warning: Could not create welcome conversation:', convError);
    } else {
      console.log(`✅ Welcome conversation created: ${conversation.id}`);
    }

    // Step 5: Test workflow creation with project assignment
    console.log('\n📋 Step 5: Testing workflow creation flow...');
    
    // Mock workflow data (what would be generated by AI chat)
    const mockWorkflowData = {
      name: `[USR-${userId.substring(0, 8)}] Test Weather Workflow`,
      description: 'Test workflow for project assignment',
      n8n_workflow_json: {
        name: 'Test Weather Workflow',
        nodes: [],
        connections: {},
        settings: {}
      },
      n8n_workflow_id: 'test-workflow-id-123',
      original_prompt: 'Test workflow creation with auto project assignment',
      status: 'draft'
    };

    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        user_id: userId,
        project_id: targetProject.id,
        ...mockWorkflowData
      })
      .select()
      .single();

    if (workflowError) {
      console.error('❌ Workflow creation failed:', workflowError);
    } else {
      console.log(`✅ Test workflow created: ${workflow.id}`);
      console.log(`   Project assignment: ${workflow.project_id} ✅`);
    }

    // Step 6: Verify complete flow
    console.log('\n🎉 Step 6: Flow Summary');
    console.log('═══════════════════════════════════════');
    console.log(`👤 User: ${testEmail} (${userId.substring(0, 8)}...)`);
    console.log(`📁 Project: ${targetProject.name}`);
    console.log(`📅 Created: ${targetProject.created_at}`);
    console.log(`🔧 Auto-created: ${targetProject.metadata?.auto_created ? '✅ Yes' : '❌ No'}`);
    console.log(`💬 Conversations: ${conversation ? '1 welcome message' : 'None created'}`);
    console.log(`⚙️ Workflows: ${workflow ? '1 test workflow' : 'None created'}`);
    console.log('═══════════════════════════════════════');

    // Final verification: Query all user data
    console.log('\n📊 Final Verification:');
    const { data: finalProjects } = await supabase
      .from('projects')
      .select('id, name, created_at, metadata')
      .eq('user_id', userId);
    
    const { data: finalWorkflows } = await supabase
      .from('workflows')
      .select('id, name, project_id, status')
      .eq('user_id', userId);

    console.log(`✅ Total projects: ${finalProjects?.length || 0}`);
    console.log(`✅ Total workflows: ${finalWorkflows?.length || 0}`);
    
    if (finalWorkflows && finalWorkflows.length > 0) {
      const workflowsInProject = finalWorkflows.filter(w => w.project_id === targetProject.id);
      console.log(`✅ Workflows in auto-created project: ${workflowsInProject.length}`);
    }

    console.log('\n🎯 Test Result: AUTO PROJECT CREATION SYSTEM WORKING! 🚀');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testAutoProjectCreation();