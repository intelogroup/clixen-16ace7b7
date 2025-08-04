#!/usr/bin/env node

/**
 * Run AI Chat System migration directly on Supabase
 */

import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

// Configuration
const connectionString = 'postgresql://postgres.zfbgdixbzezpxllkoyfc:Goldyear2023%23@aws-0-us-east-2.pooler.supabase.com:5432/postgres';

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔗 Connecting to database...');
    await client.connect();

    console.log('📁 Reading migration file...');
    const migrationSQL = fs.readFileSync('./supabase/migrations/20250804_ai_chat_system.sql', 'utf8');

    console.log('🚀 Executing migration...');
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');

    // Test the tables were created
    console.log('🧪 Testing table creation...');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('ai_chat_sessions', 'ai_chat_messages', 'ai_agent_states', 'openai_configurations')
      ORDER BY table_name;
    `);

    console.log('📊 Created tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Check if the stored functions were created
    const functionsResult = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('create_chat_session', 'get_conversation_history', 'process_multi_agent_chat')
      ORDER BY routine_name;
    `);

    console.log('🔧 Created functions:');
    functionsResult.rows.forEach(row => {
      console.log(`  - ${row.routine_name}()`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Tables may already exist - this is okay');
    } else {
      process.exit(1);
    }
  } finally {
    await client.end();
    console.log('🔒 Database connection closed');
  }
}

runMigration();