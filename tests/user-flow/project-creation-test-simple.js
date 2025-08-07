/**
 * Simple Project Creation Test
 * Tests project creation without the status column
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user credentials
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

async function testSimpleProjectManagement() {
  console.log('🚀 Starting Simple Project Management Test\n');

  const results = {
    signin: { success: false, duration: 0, error: null },
    createProject: { success: false, duration: 0, error: null },
    listProjects: { success: false, duration: 0, error: null },
    updateProject: { success: false, duration: 0, error: null },
    deleteProject: { success: false, duration: 0, error: null },
    overall: { success: false, duration: 0 }
  };

  const startTime = Date.now();
  let projectId = null;

  try {
    // Step 1: Sign in
    console.log('🔐 Signing in...');
    const signinStart = Date.now();

    const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    results.signin.duration = Date.now() - signinStart;

    if (signinError) {
      results.signin.error = signinError.message;
      console.log(`❌ Signin failed: ${signinError.message}`);
      throw new Error('Authentication required');
    } else {
      results.signin.success = true;
      console.log(`✅ Signin successful in ${results.signin.duration}ms`);
    }

    // Step 2: Create project (without status column)
    console.log('\n📁 Testing Project Creation (Simple)...');
    const createStart = Date.now();

    const testProjectName = `Simple Test Project ${Date.now()}`;
    
    const { data: projectData, error: createError } = await supabase
      .from('projects')
      .insert([
        {
          name: testProjectName,
          description: 'A simple test project without status column'
        }
      ])
      .select()
      .single();

    results.createProject.duration = Date.now() - createStart;

    if (createError) {
      results.createProject.error = createError.message;
      console.log(`❌ Project creation failed: ${createError.message}`);
    } else {
      results.createProject.success = true;
      projectId = projectData.id;
      console.log(`✅ Project created successfully in ${results.createProject.duration}ms`);
      console.log(`   Project ID: ${projectId}`);
      console.log(`   Project Name: ${projectData.name}`);
    }

    // Step 3: List projects
    console.log('\n📋 Testing Project Listing...');
    const listStart = Date.now();

    const { data: projects, error: listError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    results.listProjects.duration = Date.now() - listStart;

    if (listError) {
      results.listProjects.error = listError.message;
      console.log(`❌ Project listing failed: ${listError.message}`);
    } else {
      results.listProjects.success = true;
      console.log(`✅ Project listing successful in ${results.listProjects.duration}ms`);
      console.log(`   Found ${projects?.length || 0} projects`);
      
      if (projects && projects.length > 0) {
        console.log('   Recent projects:');
        projects.slice(0, 3).forEach((project, index) => {
          console.log(`     ${index + 1}. ${project.name} - Created: ${project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Unknown'}`);
        });
      }
    }

    // Step 4: Update project (if we have one)
    if (projectId) {
      console.log('\n✏️ Testing Project Update...');
      const updateStart = Date.now();

      const updatedName = `${testProjectName} - Updated`;
      const { data: updatedProject, error: updateError } = await supabase
        .from('projects')
        .update({
          name: updatedName,
          description: 'Updated description for simple testing'
        })
        .eq('id', projectId)
        .select()
        .single();

      results.updateProject.duration = Date.now() - updateStart;

      if (updateError) {
        results.updateProject.error = updateError.message;
        console.log(`❌ Project update failed: ${updateError.message}`);
      } else {
        results.updateProject.success = true;
        console.log(`✅ Project updated successfully in ${results.updateProject.duration}ms`);
        console.log(`   Updated name: ${updatedProject.name}`);
      }
    }

    // Step 5: Delete project cleanup
    if (projectId) {
      console.log('\n🗑️ Testing Project Deletion (Cleanup)...');
      const deleteStart = Date.now();

      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      results.deleteProject.duration = Date.now() - deleteStart;

      if (deleteError) {
        results.deleteProject.error = deleteError.message;
        console.log(`❌ Project deletion failed: ${deleteError.message}`);
      } else {
        results.deleteProject.success = true;
        console.log(`✅ Project deleted successfully in ${results.deleteProject.duration}ms`);
      }
    }

  } catch (error) {
    console.error(`💥 Unexpected error: ${error.message}`);
  }

  // Calculate results
  results.overall.duration = Date.now() - startTime;
  results.overall.success = [
    results.signin.success,
    results.createProject.success,
    results.listProjects.success
  ].every(Boolean); // Core functionality must work

  // Print results
  console.log('\n📊 Simple Project Management Test Results');
  console.log('=========================================');
  console.log(`Overall Status: ${results.overall.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Total Duration: ${results.overall.duration}ms\n`);

  console.log('Test Breakdown:');
  console.log(`  Signin:     ${results.signin.success ? '✅' : '❌'} ${results.signin.duration}ms`);
  console.log(`  Create:     ${results.createProject.success ? '✅' : '❌'} ${results.createProject.duration}ms`);
  console.log(`  List:       ${results.listProjects.success ? '✅' : '❌'} ${results.listProjects.duration}ms`);
  console.log(`  Update:     ${results.updateProject.success ? '✅' : '❌'} ${results.updateProject.duration}ms`);
  console.log(`  Delete:     ${results.deleteProject.success ? '✅' : '❌'} ${results.deleteProject.duration}ms`);

  // MVP Acceptance Criteria
  console.log('\n🎯 MVP Acceptance Criteria Check:');
  console.log('=================================');
  
  const projectManagementWorking = results.createProject.success && results.listProjects.success;
  console.log(`"Users can create and select a project": ${projectManagementWorking ? '✅ PASS' : '❌ FAIL'}`);
  
  const avgTime = Object.values(results).filter(r => r.duration > 0).reduce((sum, r) => sum + r.duration, 0) / 
                 Object.values(results).filter(r => r.duration > 0).length;
  console.log(`Performance (<2s avg): ${avgTime < 2000 ? '✅ PASS' : '❌ FAIL'} (${avgTime.toFixed(0)}ms)`);

  return results;
}

// Run the test
testSimpleProjectManagement()
  .then(results => {
    console.log('\n🏁 Simple Project Management Test Completed');
    process.exit(results.overall.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });

export { testSimpleProjectManagement };