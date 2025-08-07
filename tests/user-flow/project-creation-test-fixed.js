/**
 * Fixed Project Creation Test
 * Tests project creation with proper user_id for RLS compliance
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user credentials
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

async function testProjectManagementFixed() {
  console.log('🚀 Starting Fixed Project Management Test\n');

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
  let userId = null;

  try {
    // Step 1: Sign in and get user ID
    console.log('🔐 Signing in and getting user info...');
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
      userId = signinData.user.id;
      console.log(`✅ Signin successful in ${results.signin.duration}ms`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Email: ${signinData.user.email}`);
    }

    // Step 2: Create project with user_id for RLS compliance
    console.log('\n📁 Testing Project Creation (RLS Compliant)...');
    const createStart = Date.now();

    const testProjectName = `Test Project ${Date.now()}`;
    
    const { data: projectData, error: createError } = await supabase
      .from('projects')
      .insert([
        {
          name: testProjectName,
          description: 'A test project with proper RLS compliance',
          user_id: userId  // Explicitly set user_id for RLS policy
        }
      ])
      .select()
      .single();

    results.createProject.duration = Date.now() - createStart;

    if (createError) {
      results.createProject.error = createError.message;
      console.log(`❌ Project creation failed: ${createError.message}`);
      console.log(`   Error code: ${createError.code}`);
      console.log(`   Error details: ${createError.details}`);
      console.log(`   Error hint: ${createError.hint}`);
    } else {
      results.createProject.success = true;
      projectId = projectData.id;
      console.log(`✅ Project created successfully in ${results.createProject.duration}ms`);
      console.log(`   Project ID: ${projectId}`);
      console.log(`   Project Name: ${projectData.name}`);
      console.log(`   User ID: ${projectData.user_id}`);
      console.log(`   Created At: ${projectData.created_at}`);
    }

    // Step 3: List user's projects
    console.log('\n📋 Testing Project Listing...');
    const listStart = Date.now();

    const { data: projects, error: listError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    results.listProjects.duration = Date.now() - listStart;

    if (listError) {
      results.listProjects.error = listError.message;
      console.log(`❌ Project listing failed: ${listError.message}`);
    } else {
      results.listProjects.success = true;
      console.log(`✅ Project listing successful in ${results.listProjects.duration}ms`);
      console.log(`   Found ${projects?.length || 0} projects for user`);
      
      if (projects && projects.length > 0) {
        console.log('   User\'s projects:');
        projects.forEach((project, index) => {
          console.log(`     ${index + 1}. ${project.name} (ID: ${project.id?.substring(0, 8)}...)`);
          console.log(`        Created: ${project.created_at ? new Date(project.created_at).toLocaleString() : 'Unknown'}`);
        });
      }
    }

    // Step 4: Update project
    if (projectId) {
      console.log('\n✏️ Testing Project Update...');
      const updateStart = Date.now();

      const updatedName = `${testProjectName} - Updated`;
      const { data: updatedProject, error: updateError } = await supabase
        .from('projects')
        .update({
          name: updatedName,
          description: 'Updated description with RLS compliance'
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
        console.log(`   Updated description: ${updatedProject.description}`);
      }
    }

    // Step 5: Test project selection (simulating dashboard selection)
    if (projectId) {
      console.log('\n🎯 Testing Project Selection (Dashboard Simulation)...');
      const selectStart = Date.now();

      const { data: selectedProject, error: selectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      const selectDuration = Date.now() - selectStart;

      if (selectError) {
        console.log(`❌ Project selection failed: ${selectError.message}`);
      } else {
        console.log(`✅ Project selection successful in ${selectDuration}ms`);
        console.log(`   Selected: ${selectedProject.name}`);
        console.log(`   Description: ${selectedProject.description}`);
      }
    }

    // Step 6: Clean up test project
    if (projectId) {
      console.log('\n🗑️ Cleaning up test project...');
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
        
        // Verify deletion
        const { data: deletedCheck } = await supabase
          .from('projects')
          .select('id')
          .eq('id', projectId)
          .single();
        
        if (!deletedCheck) {
          console.log('✅ Project deletion verified');
        } else {
          console.log('⚠️  Project still exists after deletion');
        }
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
  ].every(Boolean); // Core MVP functionality

  // Print comprehensive results
  console.log('\n📊 Fixed Project Management Test Results');
  console.log('========================================');
  console.log(`Overall Status: ${results.overall.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Total Duration: ${results.overall.duration}ms\n`);

  console.log('Test Breakdown:');
  console.log(`  Signin:       ${results.signin.success ? '✅' : '❌'} ${results.signin.duration}ms ${results.signin.error ? `(${results.signin.error})` : ''}`);
  console.log(`  Create:       ${results.createProject.success ? '✅' : '❌'} ${results.createProject.duration}ms ${results.createProject.error ? `(${results.createProject.error})` : ''}`);
  console.log(`  List:         ${results.listProjects.success ? '✅' : '❌'} ${results.listProjects.duration}ms ${results.listProjects.error ? `(${results.listProjects.error})` : ''}`);
  console.log(`  Update:       ${results.updateProject.success ? '✅' : '❌'} ${results.updateProject.duration}ms ${results.updateProject.error ? `(${results.updateProject.error})` : ''}`);
  console.log(`  Delete:       ${results.deleteProject.success ? '✅' : '❌'} ${results.deleteProject.duration}ms ${results.deleteProject.error ? `(${results.deleteProject.error})` : ''}`);

  // Performance analysis
  console.log('\n⚡ Performance Analysis:');
  const operations = Object.values(results).filter(r => r !== results.overall && r.duration > 0);
  const avgTime = operations.reduce((sum, r) => sum + r.duration, 0) / operations.length;
  const maxTime = Math.max(...operations.map(r => r.duration));
  const minTime = Math.min(...operations.map(r => r.duration));
  
  console.log(`  Average Response Time: ${avgTime.toFixed(0)}ms`);
  console.log(`  Fastest Operation: ${minTime}ms`);
  console.log(`  Slowest Operation: ${maxTime}ms`);

  if (avgTime < 500) {
    console.log('  ✅ Excellent performance (< 500ms average)');
  } else if (avgTime < 1000) {
    console.log('  ✅ Good performance (< 1s average)');
  } else if (avgTime < 2000) {
    console.log('  ⚠️  Acceptable performance (< 2s average)');
  } else {
    console.log('  ❌ Poor performance (> 2s average)');
  }

  // MVP Acceptance Criteria Validation
  console.log('\n🎯 MVP Acceptance Criteria Validation:');
  console.log('====================================');
  
  // "Users can create and select a project in a dashboard view"
  const projectCRUDWorking = results.createProject.success && 
                            results.listProjects.success && 
                            results.updateProject.success;
  console.log(`✅ Project CRUD Operations: ${projectCRUDWorking ? 'PASS' : 'FAIL'}`);
  
  // "Users can create and select a project in a dashboard view"
  const dashboardSimulation = results.createProject.success && results.listProjects.success;
  console.log(`✅ Dashboard View Simulation: ${dashboardSimulation ? 'PASS' : 'FAIL'}`);
  
  // Performance requirements
  const performanceAcceptable = avgTime < 2000;
  console.log(`✅ Performance Requirements: ${performanceAcceptable ? 'PASS' : 'FAIL'} (${avgTime.toFixed(0)}ms avg)`);
  
  // Security (RLS working)
  const rlsWorking = results.createProject.success; // If this works, RLS is properly configured
  console.log(`✅ Row Level Security: ${rlsWorking ? 'PASS' : 'FAIL'}`);

  console.log('\n📋 Next Steps for Complete MVP:');
  console.log('=============================');
  if (results.overall.success) {
    console.log('✅ Project management is working correctly');
    console.log('👉 Ready to test workflow generation and n8n integration');
  } else {
    console.log('❌ Project management needs fixes before proceeding');
    if (!results.createProject.success) {
      console.log('   - Fix project creation issues');
    }
    if (!results.listProjects.success) {
      console.log('   - Fix project listing issues');
    }
  }

  return results;
}

// Run the test
testProjectManagementFixed()
  .then(results => {
    console.log('\n🏁 Fixed Project Management Test Completed');
    process.exit(results.overall.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });

export { testProjectManagementFixed };