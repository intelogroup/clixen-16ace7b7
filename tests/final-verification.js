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
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

async function finalVerification() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}🔍 CLIXEN PRODUCTION READINESS VERIFICATION${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
  const results = {
    auth: false,
    database: false,
    chatAPI: false,
    n8nIntegration: false
  };

  // Use the known test user
  const testEmail = 'jayveedz19@gmail.com';
  const testPassword = 'Goldyear2023#';

  // ========================
  // 1. AUTHENTICATION TEST
  // ========================
  console.log(`${colors.cyan}━━━ AUTHENTICATION SYSTEM ━━━${colors.reset}`);
  
  try {
    const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signinError) {
      console.log(`${colors.red}❌ Authentication Failed: ${signinError.message}${colors.reset}`);
    } else if (signinData.session) {
      console.log(`${colors.green}✅ Authentication Successful${colors.reset}`);
      console.log(`   • User ID: ${signinData.user.id.substring(0, 8)}***`);
      console.log(`   • Email: ${signinData.user.email}`);
      console.log(`   • JWT Token: ${signinData.session.access_token.substring(0, 20)}...`);
      results.auth = true;
      
      // ========================
      // 2. DATABASE CONNECTIVITY
      // ========================
      console.log(`\n${colors.cyan}━━━ DATABASE CONNECTIVITY ━━━${colors.reset}`);
      
      try {
        // Check core tables exist
        const tables = ['user_profiles', 'projects', 'workflows', 'conversations'];
        let allTablesExist = true;
        
        for (const table of tables) {
          const { error } = await supabase.from(table).select('id').limit(1);
          if (error && error.code === '42P01') {
            console.log(`${colors.red}   ❌ Table '${table}' does not exist${colors.reset}`);
            allTablesExist = false;
          } else {
            console.log(`${colors.green}   ✅ Table '${table}' accessible${colors.reset}`);
          }
        }
        
        if (allTablesExist) {
          console.log(`${colors.green}✅ All core tables verified${colors.reset}`);
          results.database = true;
        } else {
          console.log(`${colors.red}❌ Some tables missing - migrations may not be applied${colors.reset}`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ Database check failed: ${error.message}${colors.reset}`);
      }
      
      // ========================
      // 3. CHAT API TEST
      // ========================
      console.log(`\n${colors.cyan}━━━ CHAT API (EDGE FUNCTION) ━━━${colors.reset}`);
      
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-simple`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${signinData.session.access_token}`
          },
          body: JSON.stringify({
            message: 'What is 2+2?',
            user_id: signinData.user.id
          })
        });

        if (response.status === 401) {
          console.log(`${colors.red}❌ Chat API Authentication Failed${colors.reset}`);
          console.log(`   • JWT validation not working properly`);
        } else if (response.status === 200) {
          console.log(`${colors.green}✅ Chat API Responding${colors.reset}`);
          console.log(`   • Status: ${response.status}`);
          console.log(`   • Authentication: Working`);
          
          const data = await response.json();
          if (data.response) {
            console.log(`   • Response type: AI response received`);
            results.chatAPI = true;
          }
        } else {
          console.log(`${colors.yellow}⚠️ Chat API returned status ${response.status}${colors.reset}`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ Chat API unreachable: ${error.message}${colors.reset}`);
      }
      
      // ========================
      // 4. N8N INTEGRATION TEST
      // ========================
      console.log(`\n${colors.cyan}━━━ N8N WORKFLOW INTEGRATION ━━━${colors.reset}`);
      
      try {
        // Test n8n API connectivity
        const n8nUrl = 'https://n8nio-n8n-7xzf6n.sliplane.app/api/v1';
        const n8nApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiN2ZmZWU5My04YTBlLTQwYTItYmMyYi0xOGE1NDliODAwZDYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTAzNzc1fQ.mXnHtIvlmj-93EjwXZqBwzmUx9uUIddS4fO3TGMRCZ0';
        
        const n8nResponse = await fetch(`${n8nUrl}/workflows`, {
          method: 'GET',
          headers: {
            'X-N8N-API-KEY': n8nApiKey
          }
        });
        
        if (n8nResponse.ok) {
          const workflows = await n8nResponse.json();
          console.log(`${colors.green}✅ n8n API Connected${colors.reset}`);
          console.log(`   • Total workflows: ${workflows.data?.length || 0}`);
          console.log(`   • API endpoint: ${n8nUrl}`);
          results.n8nIntegration = true;
        } else {
          console.log(`${colors.red}❌ n8n API returned status ${n8nResponse.status}${colors.reset}`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ n8n integration check failed: ${error.message}${colors.reset}`);
      }
    }
  } catch (error) {
    console.log(`${colors.red}❌ Fatal error: ${error.message}${colors.reset}`);
  }

  // ========================
  // FINAL SUMMARY
  // ========================
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}📊 PRODUCTION READINESS ASSESSMENT${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  
  const passedTests = Object.values(results).filter(r => r).length;
  const totalTests = Object.keys(results).length;
  const readinessPercent = Math.round((passedTests / totalTests) * 100);
  
  console.log(`\n${colors.cyan}Component Status:${colors.reset}`);
  console.log(`• Authentication System:  ${results.auth ? colors.green + '✅ OPERATIONAL' : colors.red + '❌ FAILED'}${colors.reset}`);
  console.log(`• Database Connectivity:  ${results.database ? colors.green + '✅ OPERATIONAL' : colors.red + '❌ FAILED'}${colors.reset}`);
  console.log(`• Chat API (Edge Func):   ${results.chatAPI ? colors.green + '✅ OPERATIONAL' : colors.red + '❌ FAILED'}${colors.reset}`);
  console.log(`• n8n Integration:        ${results.n8nIntegration ? colors.green + '✅ OPERATIONAL' : colors.red + '❌ FAILED'}${colors.reset}`);
  
  console.log(`\n${colors.cyan}Overall Status:${colors.reset}`);
  
  if (readinessPercent === 100) {
    console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.green}🎉 SYSTEM IS PRODUCTION READY! (${readinessPercent}%)${colors.reset}`);
    console.log(`${colors.green}✅ All critical components operational${colors.reset}`);
    console.log(`${colors.green}✅ Authentication working correctly${colors.reset}`);
    console.log(`${colors.green}✅ Database properly configured${colors.reset}`);
    console.log(`${colors.green}✅ Edge Functions responding${colors.reset}`);
    console.log(`${colors.green}✅ n8n workflow engine connected${colors.reset}`);
    console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  } else if (readinessPercent >= 75) {
    console.log(`${colors.yellow}⚠️ SYSTEM MOSTLY READY (${readinessPercent}%)${colors.reset}`);
    console.log(`${colors.yellow}• Core functionality working but some components need attention${colors.reset}`);
  } else if (readinessPercent >= 50) {
    console.log(`${colors.yellow}⚠️ SYSTEM PARTIALLY READY (${readinessPercent}%)${colors.reset}`);
    console.log(`${colors.yellow}• Critical issues need to be resolved before production${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ SYSTEM NOT READY FOR PRODUCTION (${readinessPercent}%)${colors.reset}`);
    console.log(`${colors.red}• Multiple critical failures detected${colors.reset}`);
  }
  
  console.log(`\n${colors.cyan}Next Steps:${colors.reset}`);
  if (!results.auth) {
    console.log(`• Fix authentication in Edge Functions (JWT validation)`);
  }
  if (!results.database) {
    console.log(`• Apply database migrations to create missing tables`);
  }
  if (!results.chatAPI) {
    console.log(`• Ensure Edge Functions are deployed with correct auth`);
  }
  if (!results.n8nIntegration) {
    console.log(`• Verify n8n API credentials and connectivity`);
  }
  
  if (readinessPercent === 100) {
    console.log(`• ${colors.green}Ready for user testing and deployment!${colors.reset}`);
  }
  
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
  // Clean up
  await supabase.auth.signOut();
  
  process.exit(readinessPercent === 100 ? 0 : 1);
}

// Run verification
finalVerification().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});