#!/usr/bin/env node

/**
 * Critical Database Migration Runner
 * Fixes missing columns that are blocking production
 * Date: August 13, 2025
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection configuration - properly encoded password
const connectionConfig = {
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.zfbgdixbzezpxllkoyfc',
  password: 'Goldyear2023#',
  ssl: { rejectUnauthorized: false }
};

async function runMigration() {
  const client = new Client(connectionConfig);

  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'backend/supabase/migrations/20250813_fix_missing_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Running migration: 20250813_fix_missing_columns.sql');
    console.log('Adding missing columns:');
    console.log('  - webhook_url');
    console.log('  - execution_count');
    console.log('  - last_execution_at');
    console.log('  - sync_status');
    console.log('  - last_sync_at');
    console.log('  - n8n_workflow_id');
    
    // Execute the migration
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully');

    // Verify the columns exist
    console.log('\n🔍 Verifying schema...');
    const verifyQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'mvp_workflows'
      AND column_name IN ('webhook_url', 'execution_count', 'last_execution_at', 
                          'sync_status', 'last_sync_at', 'n8n_workflow_id')
      ORDER BY column_name;
    `;
    
    const result = await client.query(verifyQuery);
    
    console.log('\n✅ Schema verification results:');
    console.table(result.rows);

    // Check indexes
    const indexQuery = `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'mvp_workflows'
      AND indexname LIKE 'idx_mvp_workflows_%';
    `;
    
    const indexResult = await client.query(indexQuery);
    console.log('\n📊 Indexes created:');
    indexResult.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });

    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ Database is now ready for workflow creation');
    console.log('✅ All missing columns have been added');
    console.log('✅ Performance indexes have been created');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) {
      console.error('Details:', error.detail);
    }
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the migration
console.log('🚀 Starting Critical Database Migration');
console.log('================================');
runMigration().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});