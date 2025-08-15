#!/usr/bin/env node

/**
 * Manual Auth Testing Script
 * Tests signup and login functionality programmatically
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

// Create Supabase client with anon key (frontend simulation)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testEmail = `test-${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';

async function testSignup() {
  console.log('\n🧪 Testing Signup Flow');
  console.log('━'.repeat(50));
  console.log(`📧 Email: ${testEmail}`);
  console.log(`🔑 Password: ${testPassword}`);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'http://localhost:8081/dashboard',
      }
    });
    
    if (error) {
      console.error('❌ Signup failed:', error.message);
      console.error('   Error details:', error);
      return false;
    }
    
    if (data.user && !data.session) {
      console.log('✅ Signup successful!');
      console.log('📨 Email confirmation required');
      console.log('   User ID:', data.user.id);
      console.log('   Email:', data.user.email);
      console.log('   Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
      return true;
    } else if (data.session) {
      console.log('✅ Signup successful with auto-confirm!');
      console.log('   User ID:', data.user.id);
      console.log('   Session:', data.session.access_token.substring(0, 20) + '...');
      return true;
    }
    
    console.log('⚠️  Unexpected response:', data);
    return false;
  } catch (error) {
    console.error('💥 Exception during signup:', error);
    return false;
  }
}

async function testLogin() {
  console.log('\n🧪 Testing Login Flow');
  console.log('━'.repeat(50));
  console.log(`📧 Email: ${testEmail}`);
  console.log(`🔑 Password: ${testPassword}`);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (error) {
      console.error('❌ Login failed:', error.message);
      if (error.message.includes('Email not confirmed')) {
        console.log('   ℹ️  Email confirmation is required before login');
      }
      return false;
    }
    
    if (data.session) {
      console.log('✅ Login successful!');
      console.log('   User ID:', data.user.id);
      console.log('   Email:', data.user.email);
      console.log('   Session:', data.session.access_token.substring(0, 20) + '...');
      console.log('   Expires at:', new Date(data.session.expires_at * 1000).toISOString());
      return true;
    }
    
    console.log('⚠️  No session returned');
    return false;
  } catch (error) {
    console.error('💥 Exception during login:', error);
    return false;
  }
}

async function testInvalidLogin() {
  console.log('\n🧪 Testing Invalid Login');
  console.log('━'.repeat(50));
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'nonexistent@example.com',
      password: 'WrongPassword123'
    });
    
    if (error) {
      console.log('✅ Error handling works correctly');
      console.log('   Error message:', error.message);
      return true;
    }
    
    console.log('❌ Expected error for invalid credentials');
    return false;
  } catch (error) {
    console.log('✅ Exception caught as expected:', error.message);
    return true;
  }
}

async function testWeakPassword() {
  console.log('\n🧪 Testing Weak Password');
  console.log('━'.repeat(50));
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: `weak-${Date.now()}@example.com`,
      password: '123' // Too short
    });
    
    if (error) {
      console.log('✅ Password validation works');
      console.log('   Error message:', error.message);
      return true;
    }
    
    console.log('❌ Expected error for weak password');
    return false;
  } catch (error) {
    console.log('✅ Exception caught as expected:', error.message);
    return true;
  }
}

async function testSession() {
  console.log('\n🧪 Testing Session Management');
  console.log('━'.repeat(50));
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Session check failed:', error.message);
      return false;
    }
    
    if (session) {
      console.log('✅ Session exists');
      console.log('   User:', session.user.email);
      console.log('   Expires:', new Date(session.expires_at * 1000).toISOString());
    } else {
      console.log('ℹ️  No active session');
    }
    
    return true;
  } catch (error) {
    console.error('💥 Exception during session check:', error);
    return false;
  }
}

async function testSignout() {
  console.log('\n🧪 Testing Signout');
  console.log('━'.repeat(50));
  
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Signout failed:', error.message);
      return false;
    }
    
    console.log('✅ Signout successful');
    
    // Verify session is cleared
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('✅ Session cleared successfully');
    } else {
      console.log('❌ Session still exists after signout');
    }
    
    return true;
  } catch (error) {
    console.error('💥 Exception during signout:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Auth System Tests');
  console.log('═'.repeat(50));
  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('🔑 Using anon key (frontend mode)');
  
  const results = {
    signup: false,
    login: false,
    invalidLogin: false,
    weakPassword: false,
    session: false,
    signout: false
  };
  
  // Test 1: Signup
  results.signup = await testSignup();
  
  // Test 2: Login (may fail if email confirmation required)
  await new Promise(resolve => setTimeout(resolve, 1000));
  results.login = await testLogin();
  
  // Test 3: Invalid login
  results.invalidLogin = await testInvalidLogin();
  
  // Test 4: Weak password
  results.weakPassword = await testWeakPassword();
  
  // Test 5: Session check
  results.session = await testSession();
  
  // Test 6: Signout
  results.signout = await testSignout();
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('═'.repeat(50));
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  
  for (const [test, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅' : '❌'} ${test.charAt(0).toUpperCase() + test.slice(1)}`);
  }
  
  console.log('━'.repeat(50));
  console.log(`📈 Score: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests * 100)}%)`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Auth system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
}

// Run tests
runAllTests()
  .then(() => {
    console.log('\n✨ Testing complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });