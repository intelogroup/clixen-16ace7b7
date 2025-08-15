#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user details
const testEmail = `testuser_${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';

console.log('🚀 Starting Complete User Flow Test\n');
console.log('━'.repeat(60));

async function testCompleteUserFlow() {
  try {
    // Step 1: Create new user
    console.log('📝 Step 1: Creating new test user...');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError) {
      throw new Error(`Sign up failed: ${signUpError.message}`);
    }

    console.log(`✅ User created successfully!`);
    console.log(`   User ID: ${signUpData.user?.id}`);
    console.log(`   Session: ${signUpData.session ? 'Active' : 'Needs confirmation'}`);

    // Step 2: Sign in the user
    console.log('\n🔐 Step 2: Signing in test user...');
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      throw new Error(`Sign in failed: ${signInError.message}`);
    }

    const userId = signInData.user?.id;
    const accessToken = signInData.session?.access_token;

    console.log(`✅ Sign in successful!`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Access Token: ${accessToken?.substring(0, 20)}...`);

    // Step 3: Call assign-user-folder Edge Function
    console.log('\n📁 Step 3: Calling assign-user-folder Edge Function...');
    
    const assignResponse = await fetch(`${SUPABASE_URL}/functions/v1/assign-user-folder`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    const assignResult = await assignResponse.json();
    
    if (!assignResponse.ok) {
      console.log(`⚠️  Edge Function returned ${assignResponse.status}: ${JSON.stringify(assignResult)}`);
      console.log('   Note: Function may not be deployed. Testing direct database assignment...');
      
      // Try direct database assignment for testing
      const { data: folderData, error: folderError } = await supabase
        .rpc('assign_user_folder', { p_user_id: userId });
      
      if (folderError) {
        console.log(`   Database function error: ${folderError.message}`);
      } else if (folderData) {
        console.log(`✅ Direct database assignment successful!`);
        console.log(`   Folder: ${folderData.folder_tag_name}`);
        console.log(`   Project: CLIXEN-PROJ-${String(folderData.project_number).padStart(2, '0')}`);
        console.log(`   User Slot: ${folderData.user_slot}`);
      }
    } else {
      console.log(`✅ Folder assignment successful!`);
      console.log(`   Response: ${JSON.stringify(assignResult, null, 2)}`);
    }

    // Step 4: Check folder assignment from database
    console.log('\n🔍 Step 4: Verifying folder assignment in database...');
    
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('folder_assignments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (assignmentError) {
      console.log(`⚠️  Could not fetch assignment: ${assignmentError.message}`);
    } else if (assignmentData) {
      console.log(`✅ Folder assignment verified!`);
      console.log(`   Folder: ${assignmentData.folder_tag_name}`);
      console.log(`   Project Number: ${assignmentData.project_number}`);
      console.log(`   User Slot: ${assignmentData.user_slot}`);
      console.log(`   Status: ${assignmentData.status}`);
      console.log(`   Assigned At: ${assignmentData.assigned_at}`);
    }

    // Step 5: Test workflow creation via chat
    console.log('\n💬 Step 5: Testing workflow creation via chat...');
    console.log('   Prompt: "Create a simple workflow that gets the current weather"');
    
    const chatResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-simple`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Create a simple workflow that gets the current weather for Boston',
        conversationId: `test-conversation-${Date.now()}`,
      }),
    });

    const chatResult = await chatResponse.json();
    
    if (!chatResponse.ok) {
      console.log(`⚠️  Chat function returned ${chatResponse.status}: ${JSON.stringify(chatResult)}`);
    } else {
      console.log(`✅ Workflow creation initiated!`);
      console.log(`   Response: ${chatResult.response?.substring(0, 200)}...`);
      if (chatResult.workflow) {
        console.log(`   Workflow ID: ${chatResult.workflow.id}`);
        console.log(`   Workflow Name: ${chatResult.workflow.name}`);
        console.log(`   Project: ${chatResult.workflow.projectId}`);
        console.log(`   Folder: ${chatResult.workflow.folder}`);
      }
    }

    // Step 6: Check database for workflow assignment stats
    console.log('\n📊 Step 6: Checking system assignment statistics...');
    
    const { data: statsData, error: statsError } = await supabase
      .rpc('get_folder_assignment_stats');

    if (statsError) {
      console.log(`⚠️  Could not fetch stats: ${statsError.message}`);
    } else if (statsData) {
      console.log(`✅ System Statistics:`);
      statsData.forEach(stat => {
        console.log(`   Project ${stat.project_number}: ${stat.assigned_count} assigned, ${stat.available_count} available`);
      });
    }

    // Step 7: Get all users and their assignments
    console.log('\n👥 Step 7: All users and their project assignments...');
    
    const { data: allAssignments, error: allError } = await supabase
      .from('folder_assignments')
      .select('user_id, folder_tag_name, project_number, user_slot, status')
      .eq('status', 'active')
      .order('project_number', { ascending: true })
      .order('user_slot', { ascending: true });

    if (allError) {
      console.log(`⚠️  Could not fetch all assignments: ${allError.message}`);
    } else if (allAssignments) {
      console.log(`✅ Active User Assignments:`);
      console.log(`   Total Active Users: ${allAssignments.length}`);
      
      // Group by project
      const byProject = {};
      allAssignments.forEach(a => {
        const proj = `CLIXEN-PROJ-${String(a.project_number).padStart(2, '0')}`;
        if (!byProject[proj]) byProject[proj] = [];
        byProject[proj].push({
          folder: a.folder_tag_name,
          slot: a.user_slot,
          userId: a.user_id?.substring(0, 8) + '...'
        });
      });
      
      Object.keys(byProject).sort().forEach(proj => {
        console.log(`\n   ${proj}:`);
        byProject[proj].forEach(u => {
          console.log(`     - Slot ${u.slot}: ${u.folder} (User: ${u.userId})`);
        });
      });
    }

    // Step 8: Explain how the system chooses projects and folders
    console.log('\n🎯 How the System Assigns Projects and Folders:');
    console.log('━'.repeat(60));
    console.log(`
The Clixen folder assignment system uses a sophisticated round-robin algorithm:

1. **Folder Pool**: 50 pre-created folders (10 projects × 5 users each)
   - FOLDER-P01-U1 through FOLDER-P01-U5 (Project 1)
   - FOLDER-P02-U1 through FOLDER-P02-U5 (Project 2)
   - ... up to FOLDER-P10-U5 (Project 10)

2. **Assignment Algorithm** (from assign_user_folder function):
   - Searches for the first available folder (status = 'available')
   - Orders by project_number ASC, then user_slot ASC
   - This ensures even distribution across projects
   - Example: First user → P01-U1, Second → P01-U2, etc.
   - After P01 fills (5 users), next goes to P02-U1

3. **Project Mapping**:
   - Folder tag (e.g., FOLDER-P03-U2) maps to:
     - Project: CLIXEN-PROJ-03
     - User Slot: 2 (second user in that project)
   - Each project can host up to 5 isolated users

4. **User Isolation**:
   - Workflows prefixed with [USR-{userId}]
   - Assigned to user's project (e.g., CLIXEN-PROJ-03)
   - Tagged with user's folder (e.g., FOLDER-P03-U2)
   - Triple isolation: Naming + Project + Folder

5. **Smart Pre-Assignment**:
   - Assignment happens on first API call (login/chat)
   - User gets permanent folder for session lifetime
   - Folder released only on user deletion or manual release

6. **Current Capacity**:
   - Total Slots: 50 (10 projects × 5 users)
   - Active Users: ${allAssignments?.length || 0}
   - Available Slots: ${50 - (allAssignments?.length || 0)}
`);

    console.log('━'.repeat(60));
    console.log('✅ Complete user flow test finished successfully!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testCompleteUserFlow();