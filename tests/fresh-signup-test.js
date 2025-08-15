#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import chalk from 'chalk';

const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

// Create a fresh client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFreshSignup() {
  const timestamp = Date.now();
  const testEmail = `fresh_test_${timestamp}@clixen.app`;
  const testPassword = 'TestPassword123!@#';
  
  console.log(chalk.blue.bold('\n🧪 Fresh Signup Test'));
  console.log(chalk.cyan(`Testing with: ${testEmail}`));
  
  try {
    // Try direct API call first
    console.log(chalk.yellow('\n1. Testing Direct API Call...'));
    const directResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        data: {
          full_name: 'Fresh Test User'
        }
      })
    });
    
    const directData = await directResponse.json();
    console.log('Status:', directResponse.status);
    console.log('Response:', JSON.stringify(directData, null, 2));
    
    if (directResponse.ok) {
      console.log(chalk.green('✅ Direct API signup successful!'));
      
      // Clean up
      if (directData.user?.id) {
        const { Client } = await import('pg');
        const client = new Client({
          connectionString: 'postgresql://postgres.zfbgdixbzezpxllkoyfc:Goldyear2023#@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
          ssl: { rejectUnauthorized: false }
        });
        await client.connect();
        await client.query(`DELETE FROM user_profiles WHERE id = $1;`, [directData.user.id]);
        await client.query(`DELETE FROM auth.users WHERE id = $1;`, [directData.user.id]);
        await client.end();
      }
    } else {
      console.log(chalk.red('❌ Direct API signup failed'));
    }
    
    // Try SDK method
    console.log(chalk.yellow('\n2. Testing Supabase SDK...'));
    const testEmail2 = `sdk_test_${timestamp}@clixen.app`;
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail2,
      password: testPassword,
      options: {
        data: {
          full_name: 'SDK Test User'
        }
      }
    });
    
    if (signUpError) {
      console.log(chalk.red('❌ SDK signup failed:'), signUpError.message);
      console.log('Full error:', signUpError);
    } else {
      console.log(chalk.green('✅ SDK signup successful!'));
      console.log('User ID:', signUpData.user?.id);
      
      // Clean up
      if (signUpData.user?.id) {
        const { Client } = await import('pg');
        const client = new Client({
          connectionString: 'postgresql://postgres.zfbgdixbzezpxllkoyfc:Goldyear2023#@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
          ssl: { rejectUnauthorized: false }
        });
        await client.connect();
        await client.query(`DELETE FROM user_profiles WHERE id = $1;`, [signUpData.user.id]);
        await client.query(`DELETE FROM auth.users WHERE id = $1;`, [signUpData.user.id]);
        await client.end();
      }
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Test error:'), error.message);
  }
}

testFreshSignup();