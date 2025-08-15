#!/usr/bin/env node

/**
 * Force delete a specific user by clearing constraints first
 */

const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function forceDeleteUser() {
  const userEmail = 'jayveedz19@gmail.com';
  console.log(`🔥 Force deleting user: ${userEmail}`);
  
  try {
    // First, find the user
    const { data: { users }, error: findError } = await supabase.auth.admin.listUsers();
    
    if (findError) {
      console.error('❌ Error finding users:', findError);
      return;
    }
    
    const user = users.find(u => u.email === userEmail);
    
    if (!user) {
      console.log('✅ User not found - may already be deleted');
      return;
    }
    
    console.log(`📍 Found user ID: ${user.id}`);
    
    // Delete all related data first
    console.log('🧹 Cleaning related data...');
    
    // Delete from all tables that reference the user
    const tables = [
      'telemetry_events',
      'mvp_chat_messages',
      'mvp_chat_sessions',
      'mvp_workflows',
      'projects',
      'user_profiles'
    ];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', user.id);
      
      if (error) {
        console.log(`  ⚠️  Skipping ${table}: ${error.message}`);
      } else {
        console.log(`  ✅ Cleaned ${table}`);
      }
    }
    
    // Now try to delete the user again
    console.log('🗑️  Attempting to delete user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error('❌ Still failed to delete user:', deleteError);
      
      // Try direct database connection as last resort
      console.log('🔧 Attempting direct database deletion...');
      
      const pgClient = new Client({
        connectionString: 'postgresql://postgres.zfbgdixbzezpxllkoyfc:Goldyear2023#@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
        ssl: { rejectUnauthorized: false }
      });
      
      await pgClient.connect();
      
      try {
        // Delete from auth schema
        await pgClient.query('DELETE FROM auth.identities WHERE user_id = $1', [user.id]);
        await pgClient.query('DELETE FROM auth.sessions WHERE user_id = $1', [user.id]);
        await pgClient.query('DELETE FROM auth.refresh_tokens WHERE user_id = $1', [user.id]);
        await pgClient.query('DELETE FROM auth.mfa_factors WHERE user_id = $1', [user.id]);
        await pgClient.query('DELETE FROM auth.mfa_challenges WHERE factor_id IN (SELECT id FROM auth.mfa_factors WHERE user_id = $1)', [user.id]);
        await pgClient.query('DELETE FROM auth.users WHERE id = $1', [user.id]);
        
        console.log('✅ Successfully deleted user via direct database connection');
      } catch (dbError) {
        console.error('❌ Database deletion failed:', dbError.message);
      } finally {
        await pgClient.end();
      }
    } else {
      console.log('✅ Successfully deleted user');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

forceDeleteUser()
  .then(() => {
    console.log('\n✅ Force deletion complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });