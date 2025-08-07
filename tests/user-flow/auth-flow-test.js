/**
 * Authentication Flow Test
 * Tests complete authentication user journey
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user credentials
const TEST_EMAIL = `test_${Date.now()}@clixen.test`;
const TEST_PASSWORD = 'TestPassword123!';

async function testAuthenticationFlow() {
  console.log('🚀 Starting Authentication Flow Test\n');

  const results = {
    signup: { success: false, duration: 0, error: null },
    signin: { success: false, duration: 0, error: null },
    profile: { success: false, duration: 0, error: null },
    signout: { success: false, duration: 0, error: null },
    overall: { success: false, duration: 0 }
  };

  const startTime = Date.now();

  try {
    // Test 1: User Signup
    console.log('📝 Testing User Signup...');
    const signupStart = Date.now();
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User',
          source: 'auth-flow-test'
        }
      }
    });

    results.signup.duration = Date.now() - signupStart;

    if (signupError) {
      results.signup.error = signupError.message;
      console.log(`❌ Signup failed: ${signupError.message}`);
    } else {
      results.signup.success = true;
      console.log(`✅ Signup successful in ${results.signup.duration}ms`);
      console.log(`   User ID: ${signupData.user?.id}`);
      console.log(`   Email confirmed: ${signupData.user?.email_confirmed_at ? 'Yes' : 'No'}`);
    }

    // Test 2: User Signin
    console.log('\n🔐 Testing User Signin...');
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
      console.log(`   Session token: ${signinData.session?.access_token?.substring(0, 20)}...`);
      console.log(`   Token expires: ${new Date(signinData.session?.expires_at * 1000).toISOString()}`);
    }

    // Test 3: Get User Profile
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
      console.log(`   User metadata: ${JSON.stringify(profileData.user?.user_metadata)}`);
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
    const { data: postSignoutData } = await supabase.auth.getUser();
    if (postSignoutData.user) {
      console.log(`⚠️  Warning: User still appears to be signed in after signout`);
    } else {
      console.log(`✅ Signout verified - no active session`);
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
  console.log(`  Signup:   ${results.signup.success ? '✅' : '❌'} ${results.signup.duration}ms ${results.signup.error ? `(${results.signup.error})` : ''}`);
  console.log(`  Signin:   ${results.signin.success ? '✅' : '❌'} ${results.signin.duration}ms ${results.signin.error ? `(${results.signin.error})` : ''}`);
  console.log(`  Profile:  ${results.profile.success ? '✅' : '❌'} ${results.profile.duration}ms ${results.profile.error ? `(${results.profile.error})` : ''}`);
  console.log(`  Signout:  ${results.signout.success ? '✅' : '❌'} ${results.signout.duration}ms ${results.signout.error ? `(${results.signout.error})` : ''}`);

  // Performance analysis
  console.log('\n⚡ Performance Analysis:');
  const avgResponseTime = (results.signup.duration + results.signin.duration + results.profile.duration + results.signout.duration) / 4;
  console.log(`  Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`  Fastest Operation: ${Math.min(results.signup.duration, results.signin.duration, results.profile.duration, results.signout.duration)}ms`);
  console.log(`  Slowest Operation: ${Math.max(results.signup.duration, results.signin.duration, results.profile.duration, results.signout.duration)}ms`);

  if (avgResponseTime < 1000) {
    console.log('  ✅ Excellent performance (< 1s average)');
  } else if (avgResponseTime < 2000) {
    console.log('  ⚠️  Good performance (< 2s average)');
  } else {
    console.log('  ❌ Poor performance (> 2s average)');
  }

  return results;
}

// Run the test
testAuthenticationFlow()
  .then(results => {
    process.exit(results.overall.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });

export { testAuthenticationFlow };