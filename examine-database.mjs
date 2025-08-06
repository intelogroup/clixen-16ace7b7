#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function examineDatabase() {
  console.log('🔍 Examining Database Schema...\n');

  try {
    // Test connection
    console.log('1. Testing connection...');
    const { data: healthData, error: healthError } = await supabase
      .from('workflows')
      .select('count')
      .limit(1);
    
    if (healthError && !healthError.message.includes('relation "workflows" does not exist')) {
      console.error('❌ Database connection failed:', healthError.message);
      return;
    }
    console.log('✅ Database connection successful');

    // Get all tables
    console.log('\n2. Getting table list...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_list')
      .single();

    if (tablesError) {
      console.log('⚠️ RPC function not available, trying direct query...');
      
      // Get tables using information_schema
      const { data: schemaData, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .order('table_name');

      if (schemaError) {
        console.error('❌ Cannot access table schema:', schemaError.message);
        return;
      }

      console.log('📊 Available tables:');
      schemaData?.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    }

    // Check specific important tables
    console.log('\n3. Checking key tables...');
    const keyTables = [
      'profiles',
      'ai_chat_sessions', 
      'ai_chat_messages',
      'workflows',
      'workflow_executions',
      'api_configurations',
      'user_oauth_tokens'
    ];

    for (const tableName of keyTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`  ❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`  ✅ ${tableName}: ${count} records`);
        }
      } catch (err) {
        console.log(`  ❌ ${tableName}: ${err.message}`);
      }
    }

    // Check authentication
    console.log('\n4. Checking authentication...');
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Auth check failed:', authError.message);
    } else {
      console.log(`✅ Authentication working: ${authData.users.length} users`);
    }

    console.log('\n🎯 Database examination complete!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

examineDatabase();
