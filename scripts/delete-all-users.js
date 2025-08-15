#!/usr/bin/env node

/**
 * Script to delete all users from Supabase Auth
 * This will clean up the authentication system for testing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteAllUsers() {
  console.log('🗑️  Starting user deletion process...');
  console.log('📍 Supabase URL:', supabaseUrl);
  
  try {
    // List all users using admin API
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('✅ No users found in the database');
      return;
    }

    console.log(`📊 Found ${users.length} user(s) to delete`);
    
    // Delete each user
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const user of users) {
      try {
        console.log(`  🔄 Deleting user: ${user.email} (${user.id})`);
        
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.error(`  ❌ Failed to delete user ${user.email}:`, deleteError.message);
          failedCount++;
        } else {
          console.log(`  ✅ Successfully deleted user: ${user.email}`);
          deletedCount++;
        }
      } catch (error) {
        console.error(`  ❌ Error deleting user ${user.email}:`, error.message);
        failedCount++;
      }
    }

    // Clean up related data from other tables
    console.log('\n🧹 Cleaning up related data...');
    
    // Clean projects table
    const { error: projectsError } = await supabase
      .from('projects')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except placeholder
    
    if (projectsError) {
      console.log('  ⚠️  Could not clean projects table:', projectsError.message);
    } else {
      console.log('  ✅ Cleaned projects table');
    }

    // Clean workflows table
    const { error: workflowsError } = await supabase
      .from('mvp_workflows')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (workflowsError) {
      console.log('  ⚠️  Could not clean workflows table:', workflowsError.message);
    } else {
      console.log('  ✅ Cleaned workflows table');
    }

    // Clean chat sessions table
    const { error: sessionsError } = await supabase
      .from('mvp_chat_sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (sessionsError) {
      console.log('  ⚠️  Could not clean chat sessions table:', sessionsError.message);
    } else {
      console.log('  ✅ Cleaned chat sessions table');
    }

    // Clean telemetry events
    const { error: telemetryError } = await supabase
      .from('telemetry_events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (telemetryError) {
      console.log('  ⚠️  Could not clean telemetry table:', telemetryError.message);
    } else {
      console.log('  ✅ Cleaned telemetry table');
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`  ✅ Successfully deleted: ${deletedCount} user(s)`);
    if (failedCount > 0) {
      console.log(`  ❌ Failed to delete: ${failedCount} user(s)`);
    }
    console.log('\n✨ User cleanup complete!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the deletion
deleteAllUsers()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });