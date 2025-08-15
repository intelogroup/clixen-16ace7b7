#!/usr/bin/env node

import fetch from 'node-fetch';
import chalk from 'chalk';

const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

async function verifySupabaseStatus() {
  console.log(chalk.blue.bold('\n🔍 Verifying Supabase Project Status\n'));
  
  // Test 1: Check if Supabase is responding
  console.log(chalk.yellow('1. Testing Supabase availability...'));
  try {
    const response = await fetch(SUPABASE_URL);
    console.log(chalk.green(`✅ Supabase responding: ${response.status} ${response.statusText}`));
  } catch (error) {
    console.log(chalk.red('❌ Supabase not responding:', error.message));
  }
  
  // Test 2: Check auth endpoint
  console.log(chalk.yellow('\n2. Testing auth endpoint...'));
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`);
    const text = await response.text();
    console.log(chalk.green(`✅ Auth health check: ${response.status}`));
    if (text) console.log('Response:', text);
  } catch (error) {
    console.log(chalk.red('❌ Auth endpoint error:', error.message));
  }
  
  // Test 3: Try to get existing user (should fail with 401 but proves auth is working)
  console.log(chalk.yellow('\n3. Testing auth API with service role...'));
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(chalk.green(`✅ Admin API working. Found ${data.users?.length || 0} users`));
    } else {
      const text = await response.text();
      console.log(chalk.red(`❌ Admin API error: ${response.status} - ${text}`));
    }
  } catch (error) {
    console.log(chalk.red('❌ Admin API request failed:', error.message));
  }
  
  // Test 4: Test database connection via REST API
  console.log(chalk.yellow('\n4. Testing database via REST API...'));
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });
    
    if (response.ok) {
      console.log(chalk.green('✅ Database REST API is accessible'));
    } else {
      console.log(chalk.red(`❌ Database REST API error: ${response.status}`));
    }
  } catch (error) {
    console.log(chalk.red('❌ Database REST API failed:', error.message));
  }
  
  // Test 5: Check if user_profiles table exists via REST
  console.log(chalk.yellow('\n5. Checking user_profiles table via REST...'));
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?select=count`, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Prefer': 'count=exact'
      }
    });
    
    if (response.ok) {
      const count = response.headers.get('content-range');
      console.log(chalk.green('✅ user_profiles table exists'));
      if (count) console.log(`   Records: ${count}`);
    } else if (response.status === 404) {
      console.log(chalk.red('❌ user_profiles table does not exist'));
    } else {
      console.log(chalk.red(`❌ Table check error: ${response.status}`));
    }
  } catch (error) {
    console.log(chalk.red('❌ Table check failed:', error.message));
  }
  
  // Test 6: Try minimal signup to isolate the issue
  console.log(chalk.yellow('\n6. Testing minimal signup...'));
  const testEmail = `minimal_${Date.now()}@test.com`;
  
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'Test123!'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(chalk.green('✅ Minimal signup successful!'));
      console.log('User ID:', data.user?.id);
      
      // Try to clean up
      if (data.user?.id) {
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${data.user.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_SERVICE_ROLE_KEY
          }
        });
      }
    } else {
      console.log(chalk.red('❌ Minimal signup failed:', response.status));
      console.log('Error:', data);
    }
  } catch (error) {
    console.log(chalk.red('❌ Signup request failed:', error.message));
  }
  
  console.log(chalk.blue('\n' + '='.repeat(60)));
  console.log(chalk.blue.bold('Summary:'));
  console.log(chalk.cyan('If auth is failing, the issue is likely:'));
  console.log('1. Database trigger is failing');
  console.log('2. user_profiles table or constraints issue');
  console.log('3. RLS policies blocking the operation');
  console.log('4. Supabase service issue');
  console.log(chalk.blue('='.repeat(60) + '\n'));
}

verifySupabaseStatus();