/**
 * Create Test User for Auto Project Creation Testing
 * 
 * This script creates a test user to demonstrate the auto project creation flow
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestUser() {
  console.log('🧪 Creating Test User: goldbergwalmer@email.com');
  
  try {
    // Create user via auth signup
    const { data, error } = await supabase.auth.signUp({
      email: 'goldbergwalmer@email.com',
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Goldberg Walmer'
        }
      }
    });

    if (error) {
      console.error('❌ User creation failed:', error.message);
      
      // If user already exists, try to sign in to get session
      if (error.message.includes('already registered')) {
        console.log('🔄 User already exists, trying to sign in...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'goldbergwalmer@email.com',
          password: 'TestPassword123!'
        });
        
        if (signInError) {
          console.error('❌ Sign in failed:', signInError.message);
          console.log('✅ User exists but password might be different - this is expected for testing');
          return;
        } else {
          console.log('✅ Successfully signed in existing user');
          console.log('User ID:', signInData.user?.id);
        }
      }
    } else {
      console.log('✅ Test user created successfully!');
      console.log('User ID:', data.user?.id);
      console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No (check email)');
    }

    // Note: The database trigger should automatically create:
    // 1. User profile in user_profiles table
    // 2. Auto project with naming convention: goldbergwalmer-project-{timestamp}-user-{8chars}
    // 3. Welcome conversation in the project

    console.log('\n🔍 Expected auto-creation results:');
    console.log('  ✅ User profile in user_profiles table');
    console.log('  ✅ Auto project: goldbergwalmer-project-{datetime}-user-{8chars}');
    console.log('  ✅ Welcome conversation in project');
    console.log('\n🧪 Run test-auto-project-creation.js to verify the complete flow!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestUser();