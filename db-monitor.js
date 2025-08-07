#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Supabase configuration from CLAUDE.md
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

// Create both anon and service clients
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class DatabaseMonitor {
  constructor() {
    this.lastState = {};
  }

  async getTableSchema() {
    console.log('📊 [DB-MONITOR] Fetching database schema...\n');
    
    try {
      const { data: tables, error } = await serviceClient
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      if (error) {
        console.error('❌ Schema query error:', error.message);
        return [];
      }

      return tables.map(t => t.table_name);
    } catch (error) {
      console.error('💥 Schema fetch error:', error.message);
      return [];
    }
  }

  async getTableData(tableName) {
    try {
      const { data, error, count } = await serviceClient
        .from(tableName)
        .select('*', { count: 'exact' });

      if (error) {
        return { error: error.message, count: 0, data: [] };
      }

      return { data: data || [], count: count || 0 };
    } catch (error) {
      return { error: error.message, count: 0, data: [] };
    }
  }

  async getAuthUsers() {
    console.log('👥 [DB-MONITOR] Fetching auth users...');
    
    try {
      const { data, error } = await serviceClient.auth.admin.listUsers();
      
      if (error) {
        console.error('❌ Auth users error:', error.message);
        return [];
      }

      return data.users.map(user => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata
      }));
    } catch (error) {
      console.error('💥 Auth users fetch error:', error.message);
      return [];
    }
  }

  async getInitialState() {
    console.log('🔍 [DB-MONITOR] Getting initial database state...\n');
    
    const tables = await this.getTableSchema();
    console.log('📋 Available tables:', tables.length > 0 ? tables.join(', ') : 'None found');
    
    // Get auth users
    const authUsers = await this.getAuthUsers();
    console.log(`👥 Auth users: ${authUsers.length} users`);
    
    if (authUsers.length > 0) {
      console.log('   Users:');
      authUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.id.substring(0, 8)}...) [Confirmed: ${!!user.email_confirmed_at}]`);
      });
    }
    console.log('');

    // MVP Core tables to monitor
    const mvpTables = ['projects', 'workflows', 'conversations'];
    const tableStates = {};

    for (const tableName of mvpTables) {
      console.log(`📊 [DB-MONITOR] Checking table: ${tableName}`);
      const result = await this.getTableData(tableName);
      
      if (result.error) {
        console.log(`   ❌ Error: ${result.error}`);
        tableStates[tableName] = { error: result.error, count: 0 };
      } else {
        console.log(`   ✅ Rows: ${result.count}`);
        if (result.data.length > 0) {
          console.log(`   📝 Sample data:`, JSON.stringify(result.data[0], null, 2).substring(0, 200) + '...');
        }
        tableStates[tableName] = { 
          count: result.count, 
          data: result.data,
          lastChecked: new Date().toISOString()
        };
      }
      console.log('');
    }

    this.lastState = {
      authUsers,
      tables: tableStates,
      timestamp: new Date().toISOString()
    };

    return this.lastState;
  }

  async checkForChanges() {
    console.log('🔄 [DB-MONITOR] Checking for database changes...\n');
    
    const newAuthUsers = await this.getAuthUsers();
    const mvpTables = ['projects', 'workflows', 'conversations'];
    const changes = [];

    // Check auth users changes
    if (newAuthUsers.length !== this.lastState.authUsers.length) {
      changes.push(`👥 Auth users changed: ${this.lastState.authUsers.length} → ${newAuthUsers.length}`);
    }

    // Check table changes
    for (const tableName of mvpTables) {
      const result = await this.getTableData(tableName);
      const oldCount = this.lastState.tables[tableName]?.count || 0;
      const newCount = result.count || 0;
      
      if (oldCount !== newCount) {
        changes.push(`📊 ${tableName}: ${oldCount} → ${newCount} rows`);
        
        if (result.data.length > 0) {
          console.log(`   📝 Latest ${tableName} data:`, JSON.stringify(result.data.slice(-2), null, 2));
        }
      }
      
      // Update state
      this.lastState.tables[tableName] = {
        count: newCount,
        data: result.data,
        lastChecked: new Date().toISOString()
      };
    }

    // Update auth users state
    this.lastState.authUsers = newAuthUsers;
    this.lastState.timestamp = new Date().toISOString();

    if (changes.length > 0) {
      console.log('🚨 [DB-MONITOR] CHANGES DETECTED:');
      changes.forEach(change => console.log(`   ${change}`));
      console.log('');
    } else {
      console.log('✅ [DB-MONITOR] No changes detected');
      console.log('');
    }

    return changes;
  }

  printCurrentState() {
    console.log('📊 [DB-MONITOR] Current Database State Summary:');
    console.log(`   👥 Auth Users: ${this.lastState.authUsers?.length || 0}`);
    
    if (this.lastState.tables) {
      Object.entries(this.lastState.tables).forEach(([tableName, state]) => {
        if (state.error) {
          console.log(`   ❌ ${tableName}: ${state.error}`);
        } else {
          console.log(`   📊 ${tableName}: ${state.count} rows`);
        }
      });
    }
    console.log(`   🕐 Last updated: ${this.lastState.timestamp}`);
    console.log('');
  }
}

// Main execution
async function main() {
  console.log('🚀 [DB-MONITOR] Starting Supabase Database Monitor\n');
  console.log(`🌐 Connected to: ${SUPABASE_URL}\n`);
  
  const monitor = new DatabaseMonitor();
  
  // Get initial state
  await monitor.getInitialState();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ [DB-MONITOR] Initial database state captured!');
  console.log('🔄 Ready to monitor changes during user journey testing');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Keep monitoring alive with periodic checks
  console.log('⏰ [DB-MONITOR] Starting periodic monitoring (every 10 seconds)...\n');
  
  setInterval(async () => {
    await monitor.checkForChanges();
  }, 10000);
  
  // Also provide manual check function
  global.checkNow = () => monitor.checkForChanges();
  global.showState = () => monitor.printCurrentState();
  
  console.log('💡 [DB-MONITOR] Available commands:');
  console.log('   - checkNow() - Manual change check');
  console.log('   - showState() - Show current state summary');
  console.log('   - Ctrl+C to exit\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 [DB-MONITOR] Fatal error:', error);
    process.exit(1);
  });
}

export { DatabaseMonitor };