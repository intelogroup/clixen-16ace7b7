#!/usr/bin/env node

/**
 * Check AI Chat System tables in Supabase
 */

import pg from 'pg';

const { Client } = pg;

// Configuration
const connectionString = 'postgresql://postgres.zfbgdixbzezpxllkoyfc:Goldyear2023%23@aws-0-us-east-2.pooler.supabase.com:5432/postgres';

async function checkTables() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔗 Connecting to database...');
    await client.connect();

    console.log('📊 Checking AI chat tables...');
    const tablesResult = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name IN ('ai_chat_sessions', 'ai_chat_messages', 'ai_agent_states', 'openai_configurations')
      ORDER BY table_name, ordinal_position;
    `);

    if (tablesResult.rows.length === 0) {
      console.log('❌ No AI chat tables found');
      return;
    }

    let currentTable = '';
    tablesResult.rows.forEach(row => {
      if (row.table_name !== currentTable) {
        currentTable = row.table_name;
        console.log(`\n🔧 Table: ${currentTable}`);
      }
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    console.log('\n🔐 Checking RLS policies...');
    const policiesResult = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename IN ('ai_chat_sessions', 'ai_chat_messages', 'ai_agent_states', 'openai_configurations')
      ORDER BY tablename, policyname;
    `);

    if (policiesResult.rows.length > 0) {
      console.log('📋 RLS Policies:');
      policiesResult.rows.forEach(row => {
        console.log(`  - ${row.tablename}.${row.policyname}: ${row.cmd} (${row.permissive})`);
      });
    } else {
      console.log('⚠️  No RLS policies found');
    }

    console.log('\n🧪 Testing table access...');
    try {
      const countResult = await client.query('SELECT COUNT(*) FROM ai_chat_sessions');
      console.log(`✅ ai_chat_sessions: ${countResult.rows[0].count} rows`);
    } catch (error) {
      console.log(`❌ ai_chat_sessions: ${error.message}`);
    }

    try {
      const countResult = await client.query('SELECT COUNT(*) FROM ai_chat_messages');
      console.log(`✅ ai_chat_messages: ${countResult.rows[0].count} rows`);
    } catch (error) {
      console.log(`❌ ai_chat_messages: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('🔒 Database connection closed');
  }
}

checkTables();