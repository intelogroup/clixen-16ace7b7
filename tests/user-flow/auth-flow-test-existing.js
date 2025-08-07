/**
 * Authentication Flow Test with Existing User
 * Tests authentication with verified existing credentials
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Existing test user credentials (from CLAUDE.md)
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

async function testExistingUserAuth() {
  console.log('🚀 Starting Authentication Flow Test (Existing User)\n');

  const results = {
    signin: { success: false, duration: 0, error: null },
    profile: { success: false, duration: 0, error: null },
    session: { success: false, duration: 0, error: null },
    signout: { success: false, duration: 0, error: null },
    overall: { success: false, duration: 0 }
  };

  const startTime = Date.now();

  try {
    // Test 1: User Signin with existing credentials
    console.log('🔐 Testing User Signin (Existing User)...');
    const signinStart = Date.now();

    const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    results.signin.duration = Date.now() - signinStart;

    if (signinError) {
      results.signin.error = signinError.message;
      console.log(`❌ Signin failed: ${signinError.message}`);
    } else {
      results.signin.success = true;
      console.log(`✅ Signin successful in ${results.signin.duration}ms`);
      console.log(`   User ID: ${signinData.user?.id}`);
      console.log(`   Email: ${signinData.user?.email}`);
      console.log(`   Session token: ${signinData.session?.access_token?.substring(0, 20)}...`);
      console.log(`   Token expires: ${new Date(signinData.session?.expires_at * 1000).toISOString()}`);
    }

    // Test 2: Get User Profile
    console.log('\n👤 Testing User Profile Access...');
    const profileStart = Date.now();

    const { data: profileData, error: profileError } = await supabase.auth.getUser();

    results.profile.duration = Date.now() - profileStart;

    if (profileError) {
      results.profile.error = profileError.message;
      console.log(`❌ Profile access failed: ${profileError.message}`);
    } else {
      results.profile.success = true;
      console.log(`✅ Profile access successful in ${results.profile.duration}ms`);
      console.log(`   User email: ${profileData.user?.email}`);
      console.log(`   User ID: ${profileData.user?.id}`);
      console.log(`   Email confirmed: ${profileData.user?.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Created at: ${profileData.user?.created_at}`);
    }

    // Test 3: Session Management
    console.log('\n🔑 Testing Session Management...');
    const sessionStart = Date.now();

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    results.session.duration = Date.now() - sessionStart;

    if (sessionError) {
      results.session.error = sessionError.message;
      console.log(`❌ Session access failed: ${sessionError.message}`);
    } else {
      results.session.success = true;
      console.log(`✅ Session access successful in ${results.session.duration}ms`);
      console.log(`   Session exists: ${sessionData.session ? 'Yes' : 'No'}`);
      if (sessionData.session) {
        console.log(`   Token type: ${sessionData.session.token_type}`);
        console.log(`   Expires at: ${new Date(sessionData.session.expires_at * 1000).toISOString()}`);
      }
    }

    // Test 4: User Signout
    console.log('\n🚪 Testing User Signout...');
    const signoutStart = Date.now();

    const { error: signoutError } = await supabase.auth.signOut();

    results.signout.duration = Date.now() - signoutStart;

    if (signoutError) {
      results.signout.error = signoutError.message;
      console.log(`❌ Signout failed: ${signoutError.message}`);
    } else {
      results.signout.success = true;
      console.log(`✅ Signout successful in ${results.signout.duration}ms`);
    }

    // Verify signout worked
    console.log('\n🔍 Verifying Signout...');
    const { data: postSignoutData } = await supabase.auth.getUser();
    if (postSignoutData.user) {
      console.log(`⚠️  Warning: User still appears to be signed in after signout`);
      console.log(`   User ID: ${postSignoutData.user.id}`);
    } else {
      console.log(`✅ Signout verified - no active session`);
    }

    const { data: postSignoutSession } = await supabase.auth.getSession();
    if (postSignoutSession.session) {
      console.log(`⚠️  Warning: Session still exists after signout`);
    } else {
      console.log(`✅ Session cleanup verified`);
    }

  } catch (error) {
    console.error(`💥 Unexpected error: ${error.message}`);
  }

  // Calculate overall results
  results.overall.duration = Date.now() - startTime;
  results.overall.success = Object.values(results)
    .filter(r => r !== results.overall)
    .every(r => r.success);

  // Print test summary
  console.log('\n📊 Authentication Flow Test Results');
  console.log('=====================================');
  console.log(`Overall Status: ${results.overall.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Total Duration: ${results.overall.duration}ms\n`);

  console.log('Test Breakdown:');
  console.log(`  Signin:   ${results.signin.success ? '✅' : '❌'} ${results.signin.duration}ms ${results.signin.error ? `(${results.signin.error})` : ''}`);
  console.log(`  Profile:  ${results.profile.success ? '✅' : '❌'} ${results.profile.duration}ms ${results.profile.error ? `(${results.profile.error})` : ''}`);
  console.log(`  Session:  ${results.session.success ? '✅' : '❌'} ${results.session.duration}ms ${results.session.error ? `(${results.session.error})` : ''}`);
  console.log(`  Signout:  ${results.signout.success ? '✅' : '❌'} ${results.signout.duration}ms ${results.signout.error ? `(${results.signout.error})` : ''}`);

  // Performance analysis
  console.log('\n⚡ Performance Analysis:');
  const avgResponseTime = (results.signin.duration + results.profile.duration + results.session.duration + results.signout.duration) / 4;
  console.log(`  Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`  Fastest Operation: ${Math.min(results.signin.duration, results.profile.duration, results.session.duration, results.signout.duration)}ms`);
  console.log(`  Slowest Operation: ${Math.max(results.signin.duration, results.profile.duration, results.session.duration, results.signout.duration)}ms`);

  if (avgResponseTime < 1000) {
    console.log('  ✅ Excellent performance (< 1s average)');
  } else if (avgResponseTime < 2000) {
    console.log('  ⚠️  Good performance (< 2s average)');
  } else {
    console.log('  ❌ Poor performance (> 2s average)');
  }

  // MVP Success Criteria Check
  console.log('\n🎯 MVP Success Criteria Check:');
  console.log('==============================');
  
  // User can sign up and sign in via email/password ✅ (signin tested)
  console.log(`Authentication Working: ${results.signin.success ? '✅ PASS' : '❌ FAIL'}`);
  
  // Session management working
  console.log(`Session Management: ${results.session.success ? '✅ PASS' : '❌ FAIL'}`);
  
  // Profile access working
  console.log(`Profile Access: ${results.profile.success ? '✅ PASS' : '❌ FAIL'}`);
  
  // Performance targets
  const performancePass = avgResponseTime < 2000;
  console.log(`Performance Target (<2s): ${performancePass ? '✅ PASS' : '❌ FAIL'}`);

  return results;
}

// Run the test
testExistingUserAuth()
  .then(results => {
    console.log('\n🏁 Test Completed');
    process.exit(results.overall.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });

export { testExistingUserAuth };