/**
 * Project Creation and Management Test
 * Tests complete project lifecycle including creation, listing, and management
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user credentials
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

async function testProjectManagement() {
  console.log('🚀 Starting Project Creation and Management Test\n');

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
    // Step 1: Sign in first
    console.log('🔐 Signing in for project management...');
    const signinStart = Date.now();

    const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    results.signin.duration = Date.now() - signinStart;

    if (signinError) {
      results.signin.error = signinError.message;
      console.log(`❌ Signin failed: ${signinError.message}`);
      throw new Error('Authentication required for project tests');
    } else {
      results.signin.success = true;
      console.log(`✅ Signin successful in ${results.signin.duration}ms`);
      console.log(`   User ID: ${signinData.user?.id}`);
    }

    // Step 2: Create a new project
    console.log('\n📁 Testing Project Creation...');
    const createStart = Date.now();

    const testProjectName = `Test Project ${Date.now()}`;
    const testProjectDescription = 'A test project created by automated testing';

    // Check if projects table exists and what structure it has
    console.log('   Checking available tables...');
    const { data: tableData, error: tableError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      // Table doesn't exist, try alternative table names
      console.log('   Projects table not found, trying alternative names...');
      
      // Try user_profiles or other existing tables
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);

      if (profileError) {
        console.log(`   Available tables query failed: ${profileError.message}`);
      } else {
        console.log('   Found user_profiles table');
      }

      results.createProject.error = 'Projects table does not exist in database';
      console.log(`❌ Project creation failed: ${results.createProject.error}`);
    } else {
      // Projects table exists, try to create project
      const { data: projectData, error: createError } = await supabase
        .from('projects')
        .insert([
          {
            name: testProjectName,
            description: testProjectDescription,
            status: 'active'
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
      } else {
        results.createProject.success = true;
        projectId = projectData.id;
        console.log(`✅ Project created successfully in ${results.createProject.duration}ms`);
        console.log(`   Project ID: ${projectId}`);
        console.log(`   Project Name: ${projectData.name}`);
        console.log(`   Project Status: ${projectData.status}`);
      }
    }

    // Step 3: List projects (if creation succeeded or table exists)
    if (results.createProject.success || !results.createProject.error?.includes('does not exist')) {
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
        console.log(`   Found ${projects?.length || 0} projects`);
        
        if (projects && projects.length > 0) {
          console.log('   Recent projects:');
          projects.slice(0, 3).forEach((project, index) => {
            console.log(`     ${index + 1}. ${project.name} (${project.status}) - Created: ${project.created_at}`);
          });
        }
      }
    }

    // Step 4: Update project (if we have a project ID)
    if (projectId) {
      console.log('\n✏️ Testing Project Update...');
      const updateStart = Date.now();

      const updatedName = `${testProjectName} - Updated`;
      const { data: updatedProject, error: updateError } = await supabase
        .from('projects')
        .update({
          name: updatedName,
          description: 'Updated description for testing',
          status: 'active'
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
    } else {
      results.updateProject.error = 'No project ID available for update test';
      console.log(`⏭️ Skipping project update test: ${results.updateProject.error}`);
    }

    // Step 5: Delete project (if we have a project ID)
    if (projectId) {
      console.log('\n🗑️ Testing Project Deletion...');
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
        console.log(`   Deleted project ID: ${projectId}`);
      }

      // Verify deletion
      const { data: deletedProject, error: verifyError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (verifyError && verifyError.code === 'PGRST116') {
        console.log('✅ Project deletion verified - project no longer exists');
      } else if (deletedProject) {
        console.log('⚠️  Warning: Project still exists after deletion');
      }
    } else {
      results.deleteProject.error = 'No project ID available for deletion test';
      console.log(`⏭️ Skipping project deletion test: ${results.deleteProject.error}`);
    }

  } catch (error) {
    console.error(`💥 Unexpected error: ${error.message}`);
  }

  // Calculate overall results
  results.overall.duration = Date.now() - startTime;
  
  // Consider overall success based on what we could actually test
  const testableOperations = Object.values(results)
    .filter(r => r !== results.overall && !r.error?.includes('No project ID available'));
  
  results.overall.success = testableOperations.length > 0 && 
    testableOperations.every(r => r.success);

  // Print test summary
  console.log('\n📊 Project Management Test Results');
  console.log('==================================');
  console.log(`Overall Status: ${results.overall.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Total Duration: ${results.overall.duration}ms\n`);

  console.log('Test Breakdown:');
  console.log(`  Signin:        ${results.signin.success ? '✅' : '❌'} ${results.signin.duration}ms ${results.signin.error ? `(${results.signin.error})` : ''}`);
  console.log(`  Create:        ${results.createProject.success ? '✅' : '❌'} ${results.createProject.duration}ms ${results.createProject.error ? `(${results.createProject.error})` : ''}`);
  console.log(`  List:          ${results.listProjects.success ? '✅' : '❌'} ${results.listProjects.duration}ms ${results.listProjects.error ? `(${results.listProjects.error})` : ''}`);
  console.log(`  Update:        ${results.updateProject.success ? '✅' : '❌'} ${results.updateProject.duration}ms ${results.updateProject.error ? `(${results.updateProject.error})` : ''}`);
  console.log(`  Delete:        ${results.deleteProject.success ? '✅' : '❌'} ${results.deleteProject.duration}ms ${results.deleteProject.error ? `(${results.deleteProject.error})` : ''}`);

  // Database schema analysis
  console.log('\n🔍 Database Schema Analysis:');
  console.log('============================');
  
  if (results.createProject.error?.includes('does not exist')) {
    console.log('❌ Projects table missing from database schema');
    console.log('   This indicates the MVP database migrations need to be run');
    console.log('   Expected table: "projects" with columns: id, name, description, status, user_id, created_at, updated_at');
  } else if (results.createProject.success) {
    console.log('✅ Projects table exists and functioning correctly');
  } else {
    console.log('⚠️  Projects table exists but has configuration issues');
    console.log(`   Error details: ${results.createProject.error}`);
  }

  // MVP Success Criteria Check
  console.log('\n🎯 MVP Success Criteria Check:');
  console.log('==============================');
  
  // Users can create and select a project in a dashboard view ✅/❌
  const projectFunctionalityWorking = results.createProject.success && results.listProjects.success;
  console.log(`Project Management: ${projectFunctionalityWorking ? '✅ PASS' : '❌ FAIL'}`);
  
  // Performance check
  const avgResponseTime = Object.values(results)
    .filter(r => r !== results.overall && r.duration > 0)
    .reduce((sum, r) => sum + r.duration, 0) / 
    Object.values(results).filter(r => r !== results.overall && r.duration > 0).length;
  
  const performancePass = avgResponseTime < 2000;
  console.log(`Performance Target (<2s): ${performancePass ? '✅ PASS' : '❌ FAIL'} (${avgResponseTime.toFixed(0)}ms avg)`);

  // Database readiness
  const databaseReady = !results.createProject.error?.includes('does not exist');
  console.log(`Database Schema Ready: ${databaseReady ? '✅ PASS' : '❌ FAIL'}`);

  return results;
}

// Run the test
testProjectManagement()
  .then(results => {
    console.log('\n🏁 Project Management Test Completed');
    process.exit(results.overall.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });

export { testProjectManagement };