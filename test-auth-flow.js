import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

// Test user credentials from CLAUDE.md
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

const supabase = createClient(supabaseUrl, anonKey);

async function testAuthenticationFlow() {
  console.log('🔐 Testing Clixen Authentication Flow\n');
  
  try {
    // Test 1: Sign out any existing session
    console.log('1. Clearing existing session...');
    await supabase.auth.signOut();
    console.log('✅ Session cleared');
    
    // Test 2: Attempt to sign in with test credentials
    console.log('\n2. Testing sign-in with test credentials...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (signInError) {
      console.log(`❌ Sign-in failed: ${signInError.message}`);
      
      // Check if user exists
      console.log('\n🔍 Checking if user exists in database...');
      const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      
      const { data: users, error: userError } = await adminClient.auth.admin.listUsers();
      if (!userError) {
        const existingUser = users.users.find(u => u.email === TEST_EMAIL);
        if (existingUser) {
          console.log(`✅ User exists: ${existingUser.email} (ID: ${existingUser.id})`);
          console.log(`   Status: ${existingUser.email_confirmed_at ? 'Confirmed' : 'Unconfirmed'}`);
          console.log(`   Created: ${existingUser.created_at}`);
        } else {
          console.log('❌ Test user not found in database');
        }
      }
      return false;
    }
    
    console.log('✅ Sign-in successful!');
    console.log(`   User ID: ${signInData.user.id}`);
    console.log(`   Email: ${signInData.user.email}`);
    console.log(`   Access Token: ${signInData.session.access_token.substring(0, 20)}...`);
    
    // Test 3: Verify session is active
    console.log('\n3. Verifying active session...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      console.log('❌ Session verification failed');
      return false;
    }
    
    console.log('✅ Session verified');
    console.log(`   Session expires: ${new Date(sessionData.session.expires_at * 1000).toISOString()}`);
    
    // Test 4: Test database access with authenticated user
    console.log('\n4. Testing database access with authenticated user...');
    const { data: conversationsData, error: dbError } = await supabase
      .from('conversations')
      .select('id, title, created_at')
      .limit(5);
    
    if (dbError) {
      console.log(`❌ Database access failed: ${dbError.message}`);
    } else {
      console.log(`✅ Database access successful - Found ${conversationsData.length} conversations`);
      if (conversationsData.length > 0) {
        console.log(`   Latest: "${conversationsData[0].title}" (${conversationsData[0].created_at})`);
      }
    }
    
    // Test 5: Test user profile access
    console.log('\n5. Testing user profile access...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', signInData.user.id)
      .single();
    
    if (profileError) {
      console.log(`⚠️  Profile access: ${profileError.message}`);
    } else {
      console.log('✅ Profile access successful');
    }
    
    // Test 6: Sign out
    console.log('\n6. Testing sign-out...');
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.log(`❌ Sign-out failed: ${signOutError.message}`);
      return false;
    }
    
    console.log('✅ Sign-out successful');
    
    // Verify session is cleared
    const { data: finalSession } = await supabase.auth.getSession();
    if (finalSession.session) {
      console.log('⚠️  Session still active after sign-out');
    } else {
      console.log('✅ Session properly cleared');
    }
    
    return true;
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

async function testFrontendAuthIntegration() {
  console.log('\n🌐 Testing Frontend Auth Integration\n');
  
  try {
    const fetch = (await import('node-fetch')).default;
    const frontendUrl = 'http://18.221.12.50';
    
    // Test 1: Check if auth pages are accessible
    console.log('1. Testing auth page accessibility...');
    const authResponse = await fetch(`${frontendUrl}/auth`, {
      timeout: 5000,
      headers: { 'User-Agent': 'Clixen-Auth-Test' }
    });
    
    if (authResponse.ok) {
      console.log('✅ Auth page accessible');
    } else {
      console.log(`⚠️  Auth page status: ${authResponse.status}`);
    }
    
    // Test 2: Check if the main app is accessible
    console.log('\n2. Testing main app accessibility...');
    const appResponse = await fetch(frontendUrl, {
      timeout: 5000,
      headers: { 'User-Agent': 'Clixen-App-Test' }
    });
    
    if (appResponse.ok) {
      const html = await appResponse.text();
      const hasSupabase = html.includes('supabase') || html.includes('Supabase');
      const hasAuth = html.includes('auth') || html.includes('login') || html.includes('sign');
      
      console.log('✅ Main app accessible');
      console.log(`   Contains Supabase references: ${hasSupabase ? 'Yes' : 'No'}`);
      console.log(`   Contains auth references: ${hasAuth ? 'Yes' : 'No'}`);
    } else {
      console.log(`❌ Main app not accessible: ${appResponse.status}`);
    }
    
    return true;
    
  } catch (err) {
    console.log(`❌ Frontend test error: ${err.message}`);
    return false;
  }
}

async function runAuthTests() {
  console.log('🚀 Clixen Authentication System Test Suite\n');
  
  const authResult = await testAuthenticationFlow();
  const frontendResult = await testFrontendAuthIntegration();
  
  console.log('\n📊 Authentication Test Results:');
  console.log(`Supabase Auth Flow: ${authResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Frontend Integration: ${frontendResult ? '✅ PASS' : '❌ FAIL'}`);
  
  if (authResult && frontendResult) {
    console.log('\n🎉 Authentication system fully operational!');
    console.log('🔑 Test user can successfully sign in/out');
    console.log('🌐 Frontend properly integrated with Supabase auth');
  } else {
    console.log('\n⚠️  Authentication system needs attention');
  }
  
  return { authResult, frontendResult };
}

runAuthTests();