/**
 * Inspect Database Schema
 * 
 * Check the current database structure to understand what tables and columns exist
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectSchema() {
  console.log('🔍 Inspecting Database Schema\n');

  const tables = ['projects', 'workflows', 'conversations', 'user_profiles'];

  for (const table of tables) {
    console.log(`📋 Table: ${table}`);
    console.log('─'.repeat(50));

    try {
      // Get a sample record to see the structure
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ Error accessing ${table}:`, error.message);
        if (error.message.includes('does not exist')) {
          console.log(`   → Table "${table}" does not exist in database`);
        }
      } else {
        if (data && data.length > 0) {
          console.log('✅ Sample record structure:');
          const record = data[0];
          Object.keys(record).forEach(key => {
            console.log(`   ${key}: ${typeof record[key]} ${Array.isArray(record[key]) ? '(array)' : ''}`);
          });
        } else {
          console.log('✅ Table exists but is empty');
          console.log('   Columns: Unable to determine from empty table');
        }
      }
    } catch (err) {
      console.log(`❌ Unexpected error with ${table}:`, err.message);
    }

    console.log(''); // Empty line between tables
  }

  // Check what tables actually exist by trying common ones
  console.log('🔎 Checking for alternative table names...\n');

  const alternativeNames = [
    'mvp_projects', 
    'mvp_workflows', 
    'mvp_conversations',
    'ai_chat_messages',
    'users', 
    'profiles'
  ];

  for (const altTable of alternativeNames) {
    try {
      const { data, error } = await supabase
        .from(altTable)
        .select('*')
        .limit(1);

      if (!error) {
        console.log(`✅ Found table: ${altTable}`);
        if (data && data.length > 0) {
          console.log('   Sample columns:', Object.keys(data[0]).join(', '));
        } else {
          console.log('   Table is empty');
        }
      }
    } catch (err) {
      // Table doesn't exist, skip silently
    }
  }
}

inspectSchema();