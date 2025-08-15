#!/usr/bin/env node

import fetch from 'node-fetch';
import { Client } from 'pg';
import chalk from 'chalk';

const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

async function directAuthTest() {
  console.log(chalk.blue.bold('\n🔬 Direct Auth API Test'));
  console.log(chalk.blue('=' .repeat(60)));
  
  const timestamp = Date.now();
  const testEmail = `direct_${timestamp}@test.com`;
  const testPassword = 'Test123!@#';
  
  console.log(chalk.cyan(`\nTest Email: ${testEmail}`));
  
  // First, check database schema is ready
  const client = new Client({
    connectionString: 'postgresql://postgres.zfbgdixbzezpxllkoyfc:Goldyear2023#@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    // Check trigger status
    const triggerCheck = await client.query(`
      SELECT 
        t.tgname as trigger_name,
        t.tgenabled as enabled,
        p.proname as function_name
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE c.relname = 'users' AND n.nspname = 'auth'
      AND t.tgname = 'on_auth_user_created';
    `);
    
    console.log(chalk.yellow('\n📋 Database Check:'));
    if (triggerCheck.rows.length > 0) {
      console.log(chalk.green('✅ Trigger exists:', triggerCheck.rows[0].trigger_name));
      console.log(chalk.green('✅ Function:', triggerCheck.rows[0].function_name));
      console.log(chalk.green('✅ Enabled:', triggerCheck.rows[0].enabled === 'O' ? 'Yes' : 'No'));
    } else {
      console.log(chalk.red('❌ Trigger not found!'));
    }
    
    // Try signup via API
    console.log(chalk.yellow('\n📡 Attempting signup via API...'));
    
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
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
          full_name: 'Direct Test User'
        }
      })
    });
    
    const responseData = await response.json();
    
    console.log(chalk.cyan('\n📊 Response:'));
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(responseData, null, 2));
    
    if (response.ok && responseData.user) {
      console.log(chalk.green('\n✅ Signup successful!'));
      console.log('User ID:', responseData.user.id);
      
      // Check if profile was created
      const profileCheck = await client.query(`
        SELECT id, email, created_at 
        FROM user_profiles 
        WHERE id = $1;
      `, [responseData.user.id]);
      
      if (profileCheck.rows.length > 0) {
        console.log(chalk.green('✅ User profile created automatically!'));
        console.log('Profile:', profileCheck.rows[0]);
      } else {
        console.log(chalk.red('❌ User profile NOT created'));
      }
      
      // Clean up test data
      await client.query(`DELETE FROM user_profiles WHERE id = $1;`, [responseData.user.id]);
      await client.query(`DELETE FROM auth.users WHERE id = $1;`, [responseData.user.id]);
      console.log(chalk.gray('\n🧹 Test data cleaned up'));
      
    } else {
      console.log(chalk.red('\n❌ Signup failed!'));
      
      // Check if this is a Supabase service issue
      if (response.status === 500) {
        console.log(chalk.red('\n🚨 Server Error (500) - Possible causes:'));
        console.log('1. Trigger function is failing');
        console.log('2. Database connection issues');
        console.log('3. Supabase service issues');
        
        // Try to get more info from logs
        const logsQuery = await client.query(`
          SELECT 
            schemaname,
            tablename,
            n_tup_ins as insert_attempts
          FROM pg_stat_user_tables 
          WHERE tablename IN ('users', 'user_profiles')
          ORDER BY tablename;
        `);
        
        console.log(chalk.yellow('\n📊 Table Statistics:'));
        logsQuery.rows.forEach(row => {
          console.log(`${row.tablename}: ${row.insert_attempts} insert attempts`);
        });
      }
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Test error:'), error.message);
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
  } finally {
    await client.end();
  }
  
  console.log(chalk.blue('\n' + '=' .repeat(60)));
}

directAuthTest();