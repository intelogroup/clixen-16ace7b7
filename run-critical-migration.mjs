#!/usr/bin/env node

/**
 * Critical Database Migration Runner
 * Fixes missing columns that are blocking production
 * Date: August 13, 2025
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('🚀 Starting Critical Database Migration');
  console.log('================================');

  try {
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
    
    // Split migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      if (statement.includes('ALTER TABLE') || statement.includes('CREATE INDEX') || statement.includes('COMMENT ON')) {
        try {
          // Use Supabase RPC to execute raw SQL
          const { error } = await supabase.rpc('exec_sql', { 
            query: statement + ';' 
          }).single();

          if (error) {
            // Try direct approach if RPC doesn't exist
            const { data, error: directError } = await supabase
              .from('mvp_workflows')
              .select('*')
              .limit(1);
            
            if (!directError) {
              console.log(`⚠️  RPC not available, using alternative approach`);
              // Since we can't run raw SQL through Supabase client, we need to document this
              console.log(`📋 Statement needs manual execution: ${statement.substring(0, 50)}...`);
              errorCount++;
            }
          } else {
            console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
            successCount++;
          }
        } catch (err) {
          console.log(`⚠️  Skipped (may already exist): ${statement.substring(0, 50)}...`);
          errorCount++;
        }
      }
    }

    // Verify the table structure
    console.log('\n🔍 Verifying table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('mvp_workflows')
      .select('*')
      .limit(1);

    if (!tableError) {
      if (tableInfo && tableInfo.length > 0) {
        const columns = Object.keys(tableInfo[0]);
        console.log('\n✅ Current mvp_workflows columns:');
        columns.forEach(col => console.log(`  - ${col}`));
        
        // Check for critical columns
        const requiredColumns = ['webhook_url', 'execution_count', 'last_execution_at'];
        const missingColumns = requiredColumns.filter(col => !columns.includes(col));
        
        if (missingColumns.length > 0) {
          console.log('\n⚠️  Missing columns that need manual addition:');
          missingColumns.forEach(col => console.log(`  - ${col}`));
          
          console.log('\n📋 Manual SQL to run in Supabase SQL Editor:');
          console.log('```sql');
          missingColumns.forEach(col => {
            if (col === 'webhook_url') {
              console.log(`ALTER TABLE mvp_workflows ADD COLUMN webhook_url TEXT;`);
            } else if (col === 'execution_count') {
              console.log(`ALTER TABLE mvp_workflows ADD COLUMN execution_count INTEGER DEFAULT 0;`);
            } else if (col === 'last_execution_at') {
              console.log(`ALTER TABLE mvp_workflows ADD COLUMN last_execution_at TIMESTAMP WITH TIME ZONE;`);
            }
          });
          console.log('```');
        } else {
          console.log('\n✅ All required columns are present!');
        }
      }
    } else {
      console.error('❌ Could not verify table structure:', tableError.message);
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  Successful operations: ${successCount}`);
    console.log(`  Skipped/Manual needed: ${errorCount}`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some operations require manual execution in Supabase SQL Editor');
      console.log('Go to: https://supabase.com/dashboard/project/zfbgdixbzezpxllkoyfc/sql/new');
      console.log('And run the SQL statements shown above');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});