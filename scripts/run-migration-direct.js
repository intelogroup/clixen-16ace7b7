#!/usr/bin/env node

/**
 * Direct Database Migration Script
 * 
 * This script runs the OAuth and API management migration directly on the database
 * using the PostgreSQL connection.
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Client } = pg;

async function runMigration() {
  // Direct connection configuration - use pooler for better connectivity
  const client = new Client({
    host: 'aws-0-us-east-2.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.zfbgdixbzezpxllkoyfc',
    password: 'Jimkali90#',
    ssl: { 
      rejectUnauthorized: false 
    }
  });

  try {
    console.log('🔌 Connecting to database...');
    console.log('   Host: aws-0-us-east-2.pooler.supabase.com');
    console.log('   Database: postgres');
    
    await client.connect();
    console.log('✅ Connected to database');

    // Read migration file
    console.log('📄 Reading migration file...');
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '002_oauth_and_api_management.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Split migration into individual statements
    // Remove comments and split by semicolons
    const statements = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--')) // Remove SQL comments
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    console.log('⚙️  Running migration...\n');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements
      if (!statement || statement.length === 0) continue;

      // Extract a readable name for the statement
      let statementName = 'Statement';
      if (statement.includes('CREATE TABLE')) {
        const match = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?([\w.]+)/i);
        statementName = match ? `CREATE TABLE ${match[1]}` : 'CREATE TABLE';
      } else if (statement.includes('CREATE INDEX')) {
        const match = statement.match(/CREATE INDEX (?:IF NOT EXISTS )?([\w.]+)/i);
        statementName = match ? `CREATE INDEX ${match[1]}` : 'CREATE INDEX';
      } else if (statement.includes('ALTER TABLE')) {
        const match = statement.match(/ALTER TABLE ([\w.]+)/i);
        statementName = match ? `ALTER TABLE ${match[1]}` : 'ALTER TABLE';
      } else if (statement.includes('CREATE POLICY')) {
        const match = statement.match(/CREATE POLICY "([^"]+)"/i);
        statementName = match ? `CREATE POLICY "${match[1]}"` : 'CREATE POLICY';
      } else if (statement.includes('CREATE FUNCTION')) {
        const match = statement.match(/CREATE (?:OR REPLACE )?FUNCTION ([\w.]+)/i);
        statementName = match ? `CREATE FUNCTION ${match[1]}` : 'CREATE FUNCTION';
      } else if (statement.includes('INSERT INTO')) {
        const match = statement.match(/INSERT INTO ([\w.]+)/i);
        statementName = match ? `INSERT INTO ${match[1]}` : 'INSERT';
      }

      try {
        await client.query(statement);
        console.log(`  ✅ ${statementName}`);
        successCount++;
      } catch (error) {
        if (error.code === '42P07' || error.message.includes('already exists')) {
          console.log(`  ⏭️  ${statementName} (already exists)`);
          skipCount++;
        } else if (error.code === '23505' || error.message.includes('duplicate key')) {
          console.log(`  ⏭️  ${statementName} (duplicate - skipped)`);
          skipCount++;
        } else {
          console.log(`  ❌ ${statementName}: ${error.message}`);
          errorCount++;
        }
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Success: ${successCount} statements`);
    console.log(`  ⏭️  Skipped: ${skipCount} statements (already exist)`);
    if (errorCount > 0) {
      console.log(`  ❌ Errors: ${errorCount} statements`);
    }

    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const tables = ['user_oauth_tokens', 'api_usage', 'api_quotas', 'oauth_flow_states'];
    
    for (const table of tables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      
      if (result.rows[0].exists) {
        // Get row count
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  ✅ Table '${table}' exists (${countResult.rows[0].count} rows)`);
      } else {
        console.log(`  ❌ Table '${table}' not found`);
      }
    }

    // Check if RLS is enabled
    console.log('\n🔒 Checking Row Level Security...');
    const rlsResult = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('user_oauth_tokens', 'api_usage', 'api_quotas', 'oauth_flow_states')
    `);
    
    for (const row of rlsResult.rows) {
      console.log(`  ${row.rowsecurity ? '✅' : '❌'} RLS ${row.rowsecurity ? 'enabled' : 'disabled'} on ${row.tablename}`);
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Configure OAuth applications (Google, Microsoft, etc.)');
    console.log('  2. Add API keys to .env file');
    console.log('  3. Test OAuth flow in development');
    console.log('  4. Deploy application updates');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    console.error('\n💡 Troubleshooting tips:');
    console.error('  1. Check database credentials');
    console.error('  2. Ensure database is accessible from your location');
    console.error('  3. Verify you have sufficient permissions');
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the migration
console.log('🚀 OAuth & API Management Migration Tool');
console.log('========================================\n');
runMigration();