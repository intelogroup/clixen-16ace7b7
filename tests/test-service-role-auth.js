#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import chalk from 'chalk';

const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

// Create service role client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testServiceRoleAuth() {
  console.log(chalk.blue.bold('\n🔐 Testing Service Role Authentication\n'));
  
  const testEmail = `service_test_${Date.now()}@clixen.app`;
  const testPassword = 'Test123!@#';
  
  console.log(chalk.cyan('Test Email:', testEmail));
  
  // First, check database connection and trigger
  const pgClient = new Client({
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.zfbgdixbzezpxllkoyfc',
    password: 'Goldyear2023#',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await pgClient.connect();
    console.log(chalk.green('✅ Database connected'));
    
    // Check trigger exists
    const triggerResult = await pgClient.query(`
      SELECT COUNT(*) as count 
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.relname = 'users' 
      AND n.nspname = 'auth'
      AND t.tgname = 'on_auth_user_created';
    `);
    
    const triggerExists = triggerResult.rows[0].count > 0;
    console.log(chalk.cyan('Trigger exists:', triggerExists));
    
    // Check handle_new_user function
    const functionResult = await pgClient.query(`
      SELECT COUNT(*) as count 
      FROM pg_proc 
      WHERE proname = 'handle_new_user';
    `);
    
    const functionExists = functionResult.rows[0].count > 0;
    console.log(chalk.cyan('Function exists:', functionExists));
    
    // Check user_profiles table
    const tableResult = await pgClient.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_profiles';
    `);
    
    const tableExists = tableResult.rows[0].count > 0;
    console.log(chalk.cyan('user_profiles table exists:', tableExists));
    
    await pgClient.end();
    
  } catch (error) {
    console.error(chalk.red('❌ Database check failed:'), error.message);
  }
  
  // Try creating user with admin API
  console.log(chalk.yellow('\n📝 Attempting user creation with admin API...'));
  
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Service Test User'
      }
    });
    
    if (error) {
      console.error(chalk.red('❌ Admin API error:'), error.message);
      console.error('Error details:', error);
      
      // Try alternative approach - direct auth signup
      console.log(chalk.yellow('\n📝 Trying alternative approach...'));
      
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            full_name: 'Service Test User'
          }
        }
      });
      
      if (signupError) {
        console.error(chalk.red('❌ Signup error:'), signupError.message);
      } else {
        console.log(chalk.green('✅ Alternative signup successful!'));
        console.log('User ID:', signupData.user?.id);
        
        // Clean up
        if (signupData.user?.id) {
          await supabase.auth.admin.deleteUser(signupData.user.id);
          console.log(chalk.gray('🧹 Test user cleaned up'));
        }
      }
      
    } else {
      console.log(chalk.green('✅ User created successfully!'));
      console.log('User ID:', data.user?.id);
      console.log('Email:', data.user?.email);
      
      // Check if profile was created
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) {
        console.error(chalk.red('❌ Profile not created:'), profileError.message);
      } else {
        console.log(chalk.green('✅ User profile created:'), profile);
      }
      
      // Clean up
      await supabase.from('user_profiles').delete().eq('id', data.user.id);
      await supabase.auth.admin.deleteUser(data.user.id);
      console.log(chalk.gray('🧹 Test data cleaned up'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Unexpected error:'), error);
  }
}

testServiceRoleAuth();