#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Supabase configuration from CLAUDE.md
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkDatabaseState() {
  console.log('🔍 [DB-CHECK] Database State Report');
  console.log('=================================');
  console.log(`🌐 URL: ${SUPABASE_URL}`);
  console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
  console.log('');

  // Check auth users
  try {
    const { data, error } = await serviceClient.auth.admin.listUsers();
    
    if (error) {
      console.log('❌ Auth users error:', error.message);
    } else {
      console.log(`👥 AUTH USERS: ${data.users.length} total`);
      data.users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (ID: ${user.id.substring(0, 8)}...)`);
        console.log(`      Created: ${user.created_at}`);
        console.log(`      Confirmed: ${!!user.email_confirmed_at}`);
        console.log(`      Last sign in: ${user.last_sign_in_at || 'Never'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.log('💥 Auth users error:', error.message);
  }

  // Check MVP tables
  const mvpTables = ['projects', 'workflows', 'conversations'];
  
  for (const tableName of mvpTables) {
    try {
      const { data, error, count } = await serviceClient
        .from(tableName)
        .select('*', { count: 'exact' });

      console.log(`📊 TABLE: ${tableName.toUpperCase()}`);
      
      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ Rows: ${count || 0}`);
        
        if (data && data.length > 0) {
          console.log(`   📝 Recent entries (last 2):`);
          data.slice(-2).forEach((row, index) => {
            console.log(`      ${index + 1}. ${JSON.stringify(row, null, 6)}`);
          });
        } else {
          console.log(`   📝 No data found`);
        }
      }
      console.log('');
    } catch (error) {
      console.log(`💥 ${tableName} error:`, error.message);
      console.log('');
    }
  }
}

checkDatabaseState().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});