#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testAuthSystem() {
  console.log('🚀 Testing Auth System with Service Role Key');
  console.log('═'.repeat(50));
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  const results = {
    adminCreate: false,
    login: false,
    session: false,
    delete: false
  };
  
  // Test 1: Create user with admin API
  console.log('\n1. Creating user with Admin API...');
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true // Auto-confirm email
    });
    
    if (error) {
      console.error('❌ Admin create failed:', error.message);
    } else {
      console.log('✅ User created successfully!');
      console.log('   ID:', data.user.id);
      console.log('   Email:', data.user.email);
      console.log('   Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
      results.adminCreate = true;
      
      // Test 2: Login with created user
      console.log('\n2. Testing login with created user...');
      const { data: loginData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      
      if (loginError) {
        console.error('❌ Login failed:', loginError.message);
      } else {
        console.log('✅ Login successful!');
        console.log('   Session:', loginData.session ? 'Active' : 'None');
        results.login = true;
      }
      
      // Test 3: Get session
      console.log('\n3. Testing session retrieval...');
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session retrieval failed:', sessionError.message);
      } else {
        console.log('✅ Session retrieved:', sessionData.session ? 'Active' : 'None');
        results.session = true;
      }
      
      // Test 4: Delete test user
      console.log('\n4. Cleaning up test user...');
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      
      if (deleteError) {
        console.error('❌ Delete failed:', deleteError.message);
      } else {
        console.log('✅ Test user deleted successfully');
        results.delete = true;
      }
    }
  } catch (error) {
    console.error('❌ Exception:', error.message);
  }
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('═'.repeat(50));
  console.log(`✅ Admin Create: ${results.adminCreate ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Login: ${results.login ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Session: ${results.session ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Delete: ${results.delete ? 'PASSED' : 'FAILED'}`);
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  console.log(`\n📈 Overall: ${passed}/${total} tests passed (${Math.round(passed/total * 100)}%)`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Auth system is working correctly with service role key.');
  } else {
    console.log('⚠️  Some tests failed. This indicates issues with the Supabase Auth configuration.');
    console.log('\n💡 Recommended Actions:');
    console.log('1. Check Supabase Dashboard > Authentication > Settings');
    console.log('2. Ensure email confirmations are disabled for testing');
    console.log('3. Check if there are any auth hooks that might be failing');
    console.log('4. Verify the service role key has proper permissions');
  }
}

// Run tests
testAuthSystem()
  .then(() => {
    console.log('\n✨ Testing complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });