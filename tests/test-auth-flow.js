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

async function testAuthFlow() {
  console.log(`${colors.blue}🔧 Starting Authentication Flow Tests${colors.reset}\n`);
  
  const testResults = {
    signup: false,
    signin: false,
    profile: false,
    chatAPI: false,
    workflow: false
  };

  // Test 1: User Signup
  console.log(`${colors.yellow}📝 Test 1: User Signup${colors.reset}`);
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });

    if (signupError) {
      console.log(`${colors.red}❌ Signup failed: ${signupError.message}${colors.reset}`);
    } else if (signupData.user) {
      console.log(`${colors.green}✅ User signup successful!${colors.reset}`);
      console.log(`   User ID: ${signupData.user.id.substring(0, 8)}***`);
      console.log(`   Email: ${signupData.user.email}`);
      testResults.signup = true;
      
      // Check if user profile was created
      const { data: profileCheck } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', signupData.user.id)
        .single();
        
      if (profileCheck) {
        console.log(`${colors.green}✅ User profile auto-created!${colors.reset}`);
        testResults.profile = true;
      } else {
        console.log(`${colors.red}❌ User profile not created automatically${colors.reset}`);
      }
    }
  } catch (error) {
    console.log(`${colors.red}❌ Signup error: ${error.message}${colors.reset}`);
  }

  // Test 2: Sign In
  console.log(`\n${colors.yellow}📝 Test 2: User Sign In${colors.reset}`);
  
  try {
    const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signinError) {
      console.log(`${colors.red}❌ Sign in failed: ${signinError.message}${colors.reset}`);
    } else if (signinData.session) {
      console.log(`${colors.green}✅ Sign in successful!${colors.reset}`);
      console.log(`   Session token exists: ${!!signinData.session.access_token}`);
      console.log(`   Token length: ${signinData.session.access_token.length} chars`);
      testResults.signin = true;
      
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
            message: 'Hello, test message',
            user_id: signinData.user.id
          })
        });

        const responseText = await response.text();
        
        if (response.ok) {
          console.log(`${colors.green}✅ Chat API call successful!${colors.reset}`);
          console.log(`   Status: ${response.status}`);
          console.log(`   Response preview: ${responseText.substring(0, 100)}...`);
          testResults.chatAPI = true;
        } else {
          console.log(`${colors.red}❌ Chat API call failed${colors.reset}`);
          console.log(`   Status: ${response.status}`);
          console.log(`   Error: ${responseText}`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ Chat API error: ${error.message}${colors.reset}`);
      }

      // Test 4: Create a Project
      console.log(`\n${colors.yellow}📝 Test 4: Create Project${colors.reset}`);
      
      try {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .insert({
            name: 'Test Project',
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
        }
      } catch (error) {
        console.log(`${colors.red}❌ Project creation error: ${error.message}${colors.reset}`);
      }

      // Test 5: Create a Workflow entry
      console.log(`\n${colors.yellow}📝 Test 5: Create Workflow Entry${colors.reset}`);
      
      try {
        // First get a project
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
              name: 'Test Workflow',
              description: 'Created by auth test',
              n8n_workflow_json: { nodes: [], connections: {} },
              original_prompt: 'Test prompt',
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
            testResults.workflow = true;
          }
        }
      } catch (error) {
        console.log(`${colors.red}❌ Workflow creation error: ${error.message}${colors.reset}`);
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
  
  console.log(`User Signup:        ${testResults.signup ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
  console.log(`Profile Creation:   ${testResults.profile ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
  console.log(`User Sign In:       ${testResults.signin ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
  console.log(`Chat API Auth:      ${testResults.chatAPI ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
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
testAuthFlow().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});