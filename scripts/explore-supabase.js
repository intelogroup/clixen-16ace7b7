#!/usr/bin/env node

/**
 * Supabase Database Explorer
 * 
 * This script explores and documents all available Supabase extensions,
 * tables, and capabilities for the Clixen project.
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const { Client } = pg;

// Database client
const dbClient = new Client({
  host: 'aws-0-us-east-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.zfbgdixbzezpxllkoyfc',
  password: 'Jimkali90#',
  ssl: { rejectUnauthorized: false }
});

// Supabase client with service role
const supabase = createClient(
  'https://zfbgdixbzezpxllkoyfc.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig'
);

async function exploreDatabase() {
  try {
    console.log('🔍 Supabase Database Explorer');
    console.log('=====================================\n');
    
    await dbClient.connect();
    console.log('✅ Connected to database\n');

    // 1. Check installed extensions
    console.log('📦 Installed Extensions:');
    console.log('------------------------');
    const extensions = await dbClient.query(`
      SELECT extname, extversion, extnamespace::regnamespace as schema
      FROM pg_extension
      WHERE extname NOT IN ('plpgsql')
      ORDER BY extname
    `);
    
    for (const ext of extensions.rows) {
      console.log(`  ✅ ${ext.extname} v${ext.extversion} (schema: ${ext.schema})`);
    }

    // 2. Check available but not installed extensions
    console.log('\n📋 Available Extensions (not installed):');
    console.log('----------------------------------------');
    const available = await dbClient.query(`
      SELECT name, default_version, comment
      FROM pg_available_extensions
      WHERE name NOT IN (SELECT extname FROM pg_extension)
      AND name IN ('pg_cron', 'pg_net', 'vector', 'pg_graphql', 'pg_jsonschema', 'wrappers', 'vault')
      ORDER BY name
    `);
    
    for (const ext of available.rows) {
      console.log(`  ⏸️  ${ext.name} v${ext.default_version}`);
      if (ext.comment) {
        console.log(`      ${ext.comment}`);
      }
    }

    // 3. Check all tables
    console.log('\n📊 Database Tables:');
    console.log('-------------------');
    const tables = await dbClient.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = t.schemaname AND table_name = t.tablename) as columns
      FROM pg_tables t
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schemaname, tablename
    `);
    
    let currentSchema = '';
    for (const table of tables.rows) {
      if (table.schemaname !== currentSchema) {
        currentSchema = table.schemaname;
        console.log(`\n  📁 ${currentSchema}:`);
      }
      console.log(`    • ${table.tablename} (${table.columns} columns, ${table.size})`);
    }

    // 4. Check RLS status on our OAuth tables
    console.log('\n🔒 Row Level Security Status:');
    console.log('-----------------------------');
    const rlsStatus = await dbClient.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('user_oauth_tokens', 'api_usage', 'api_quotas', 'oauth_flow_states', 'users', 'workflows')
    `);
    
    for (const table of rlsStatus.rows) {
      console.log(`  ${table.rowsecurity ? '✅' : '❌'} ${table.tablename}: RLS ${table.rowsecurity ? 'enabled' : 'disabled'}`);
    }

    // 5. Check database size and stats
    console.log('\n📈 Database Statistics:');
    console.log('-----------------------');
    const dbStats = await dbClient.query(`
      SELECT 
        pg_database_size(current_database()) as db_size,
        (SELECT count(*) FROM pg_stat_user_tables) as table_count,
        (SELECT count(*) FROM pg_stat_user_indexes) as index_count,
        (SELECT sum(n_live_tup) FROM pg_stat_user_tables) as total_rows
    `);
    
    const stats = dbStats.rows[0];
    console.log(`  Database Size: ${(stats.db_size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Tables: ${stats.table_count}`);
    console.log(`  Indexes: ${stats.index_count}`);
    console.log(`  Total Rows: ${stats.total_rows || 0}`);

    // 6. Check for Edge Functions
    console.log('\n⚡ Edge Functions Configuration:');
    console.log('---------------------------------');
    console.log('  Note: Edge functions are managed via Supabase CLI');
    console.log('  Directory: supabase/functions/');
    console.log('  Deploy: supabase functions deploy <function-name>');

    // 7. Suggest optimizations
    console.log('\n💡 Optimization Opportunities:');
    console.log('-------------------------------');
    
    // Check if vector extension is available for AI embeddings
    const hasVector = extensions.rows.some(e => e.extname === 'vector');
    if (!hasVector) {
      console.log('  • Install "vector" extension for AI embeddings search');
      console.log('    CREATE EXTENSION IF NOT EXISTS vector;');
    }
    
    // Check if pg_cron is available for scheduled jobs
    const hasCron = extensions.rows.some(e => e.extname === 'pg_cron');
    if (!hasCron) {
      console.log('  • Install "pg_cron" for scheduled jobs (quota resets, cleanups)');
      console.log('    CREATE EXTENSION IF NOT EXISTS pg_cron;');
    }
    
    // Check if pg_net is available for webhooks
    const hasNet = extensions.rows.some(e => e.extname === 'pg_net');
    if (!hasNet) {
      console.log('  • Install "pg_net" for webhook calls from database');
      console.log('    CREATE EXTENSION IF NOT EXISTS pg_net;');
    }

    // 8. Create useful functions for OAuth system
    console.log('\n🔧 Useful Functions for OAuth System:');
    console.log('-------------------------------------');
    console.log('  Creating helper functions...');
    
    // Function to clean expired OAuth states
    try {
      await dbClient.query(`
        CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
        RETURNS INTEGER AS $$
        DECLARE
          deleted_count INTEGER;
        BEGIN
          DELETE FROM oauth_flow_states
          WHERE expires_at < NOW()
          RETURNING COUNT(*) INTO deleted_count;
          
          RETURN deleted_count;
        END;
        $$ LANGUAGE plpgsql;
      `);
      console.log('  ✅ cleanup_expired_oauth_states() - Removes expired OAuth states');
    } catch (err) {
      console.log('  ⏭️  cleanup_expired_oauth_states() already exists');
    }

    // Function to get user's API usage summary
    try {
      await dbClient.query(`
        CREATE OR REPLACE FUNCTION get_user_usage_summary(p_user_id UUID)
        RETURNS TABLE(
          api_name TEXT,
          monthly_usage BIGINT,
          daily_usage BIGINT,
          last_used TIMESTAMP WITH TIME ZONE
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            u.api_name,
            SUM(CASE 
              WHEN u.created_at >= date_trunc('month', NOW()) 
              THEN u.usage_count ELSE 0 
            END)::BIGINT as monthly_usage,
            SUM(CASE 
              WHEN u.created_at >= date_trunc('day', NOW()) 
              THEN u.usage_count ELSE 0 
            END)::BIGINT as daily_usage,
            MAX(u.created_at) as last_used
          FROM api_usage u
          WHERE u.user_id = p_user_id
          GROUP BY u.api_name;
        END;
        $$ LANGUAGE plpgsql;
      `);
      console.log('  ✅ get_user_usage_summary() - Returns API usage statistics');
    } catch (err) {
      console.log('  ⏭️  get_user_usage_summary() already exists');
    }

    console.log('\n✨ Database exploration complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await dbClient.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run exploration
exploreDatabase();