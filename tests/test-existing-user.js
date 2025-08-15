import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function testExistingUser() {
  console.log(`${colors.blue}🔧 Testing with Existing User${colors.reset}\n`);
  
  const testResults = {
    signin: false,
    profile: false,
    chatAPI: false,
    project: false,
    workflow: false
  };

  // Use the known test user
  const testEmail = 'jayveedz19@gmail.com';
  const testPassword = 'Goldyear2023#';

  // Test 1: Sign In with existing user
  console.log(`${colors.yellow}📝 Test 1: Sign In with Existing User${colors.reset}`);
  
  try {
    const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signinError) {
      console.log(`${colors.red}❌ Sign in failed: ${signinError.message}${colors.reset}`);
    } else if (signinData.session) {
      console.log(`${colors.green}✅ Sign in successful!${colors.reset}`);
      console.log(`   User ID: ${signinData.user.id.substring(0, 8)}***`);
      console.log(`   Email: ${signinData.user.email}`);
      console.log(`   Session token exists: ${!!signinData.session.access_token}`);
      console.log(`   Token length: ${signinData.session.access_token.length} chars`);
      testResults.signin = true;
      
      // Test 2: Check User Profile
      console.log(`\n${colors.yellow}📝 Test 2: Check User Profile${colors.reset}`);
      
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', signinData.user.id)
        .single();
      
      if (profileError) {
        console.log(`${colors.red}❌ Profile fetch failed: ${profileError.message}${colors.reset}`);
      } else if (profileData) {
        console.log(`${colors.green}✅ User profile exists!${colors.reset}`);
        console.log(`   Email: ${profileData.email}`);
        console.log(`   Display Name: ${profileData.display_name || 'Not set'}`);
        testResults.profile = true;
      }
      
      // Test 3: Call Chat API with Authentication
      console.log(`\n${colors.yellow}📝 Test 3: Chat API Authentication${colors.reset}`);
      
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-simple`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${signinData.session.access_token}`
          },
          body: JSON.stringify({
            message: 'Hello, this is a test message',
            user_id: signinData.user.id,
            session_id: crypto.randomUUID()
          })
        });

        const responseText = await response.text();
        
        if (response.ok) {
          console.log(`${colors.green}✅ Chat API call successful!${colors.reset}`);
          console.log(`   Status: ${response.status}`);
          
          try {
            const data = JSON.parse(responseText);
            console.log(`   Response type: ${data.response ? 'Chat response' : 'Workflow generated'}`);
            if (data.response) {
              console.log(`   Response preview: ${data.response.substring(0, 100)}...`);
            }
            testResults.chatAPI = true;
          } catch {
            console.log(`   Raw response: ${responseText.substring(0, 100)}...`);
            testResults.chatAPI = true;
          }
        } else {
          console.log(`${colors.red}❌ Chat API call failed${colors.reset}`);
          console.log(`   Status: ${response.status}`);
          console.log(`   Error: ${responseText}`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ Chat API error: ${error.message}${colors.reset}`);
      }

      // Test 4: Get or Create a Project
      console.log(`\n${colors.yellow}📝 Test 4: Project Operations${colors.reset}`);
      
      try {
        // First try to get existing projects
        const { data: existingProjects, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', signinData.user.id)
          .limit(1);

        if (fetchError) {
          console.log(`${colors.red}❌ Project fetch failed: ${fetchError.message}${colors.reset}`);
        } else if (existingProjects && existingProjects.length > 0) {
          console.log(`${colors.green}✅ Found existing project!${colors.reset}`);
          console.log(`   Project ID: ${existingProjects[0].id}`);
          console.log(`   Project Name: ${existingProjects[0].name}`);
          testResults.project = true;
        } else {
          // Create a new project if none exists
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .insert({
              name: `Test Project ${Date.now()}`,
              description: 'Created by auth test',
              user_id: signinData.user.id
            })
            .select()
            .single();

          if (projectError) {
            console.log(`${colors.red}❌ Project creation failed: ${projectError.message}${colors.reset}`);
          } else {
            console.log(`${colors.green}✅ Project created successfully!${colors.reset}`);
            console.log(`   Project ID: ${projectData.id}`);
            console.log(`   Project Name: ${projectData.name}`);
            testResults.project = true;
          }
        }
      } catch (error) {
        console.log(`${colors.red}❌ Project operation error: ${error.message}${colors.reset}`);
      }

      // Test 5: Create a Workflow entry
      console.log(`\n${colors.yellow}📝 Test 5: Workflow Operations${colors.reset}`);
      
      try {
        // Get a project to associate the workflow with
        const { data: project } = await supabase
          .from('projects')
          .select('id')
          .eq('user_id', signinData.user.id)
          .limit(1)
          .single();

        if (project) {
          const { data: workflowData, error: workflowError } = await supabase
            .from('workflows')
            .insert({
              name: `Test Workflow ${Date.now()}`,
              description: 'Created by auth test',
              workflow_json: { 
                name: 'Test Workflow',
                nodes: [], 
                connections: {},
                settings: {}
              },
              project_id: project.id,
              user_id: signinData.user.id,
              status: 'draft'
            })
            .select()
            .single();

          if (workflowError) {
            console.log(`${colors.red}❌ Workflow creation failed: ${workflowError.message}${colors.reset}`);
          } else {
            console.log(`${colors.green}✅ Workflow created successfully!${colors.reset}`);
            console.log(`   Workflow ID: ${workflowData.id}`);
            console.log(`   Workflow Name: ${workflowData.name}`);
            console.log(`   Status: ${workflowData.status}`);
            testResults.workflow = true;
          }
        } else {
          console.log(`${colors.red}❌ No project found for workflow creation${colors.reset}`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ Workflow operation error: ${error.message}${colors.reset}`);
      }
    }
  } catch (error) {
    console.log(`${colors.red}❌ Sign in error: ${error.message}${colors.reset}`);
  }

  // Summary
  console.log(`\n${colors.blue}📊 Test Summary${colors.reset}`);
  console.log('═══════════════════════════════════════');
  
  const passedTests = Object.values(testResults).filter(r => r).length;
  const totalTests = Object.keys(testResults).length;
  const allPassed = passedTests === totalTests;
  
  console.log(`User Sign In:       ${testResults.signin ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
  console.log(`Profile Check:      ${testResults.profile ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
  console.log(`Chat API Auth:      ${testResults.chatAPI ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
  console.log(`Project Operations: ${testResults.project ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
  console.log(`Workflow Creation:  ${testResults.workflow ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
  console.log('═══════════════════════════════════════');
  
  if (allPassed) {
    console.log(`${colors.green}🎉 ALL TESTS PASSED! (${passedTests}/${totalTests})${colors.reset}`);
    console.log(`${colors.green}✅ System is production ready!${colors.reset}`);
  } else {
    console.log(`${colors.red}⚠️ SOME TESTS FAILED (${passedTests}/${totalTests} passed)${colors.reset}`);
    console.log(`${colors.yellow}🔧 Please review the failed tests above${colors.reset}`);
  }
  
  // Clean up - sign out
  await supabase.auth.signOut();
  
  process.exit(allPassed ? 0 : 1);
}

// Run the tests
testExistingUser().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});