#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client with service role key (if available) or anon key
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or API key in environment variables');
  process.exit(1);
}

console.log('🔧 Initializing Supabase client...');
console.log(`📍 URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('📄 Reading migration file...');
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '002_oauth_and_api_management.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute`);

    // Note: Supabase JS client doesn't support raw SQL execution directly
    // We'll need to use the Supabase Dashboard or CLI with proper credentials
    
    console.log('\n⚠️  Direct SQL execution requires database credentials.');
    console.log('\n📝 Alternative approaches:');
    console.log('1. Use Supabase Dashboard SQL Editor:');
    console.log(`   https://supabase.com/dashboard/project/zfbgdixbzezpxllkoyfc/sql`);
    console.log('\n2. Copy and paste the migration SQL from:');
    console.log(`   ${migrationPath}`);
    console.log('\n3. Or use the Supabase CLI with database password:');
    console.log('   supabase db push --db-url "postgresql://postgres:[password]@aws-0-us-east-2.pooler.supabase.com:5432/postgres"');
    
    // Let's at least check if the tables already exist
    console.log('\n🔍 Checking if tables already exist...');
    
    const tables = ['user_oauth_tokens', 'api_usage', 'api_quotas', 'oauth_flow_states'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && error.code === '42P01') {
        console.log(`   ❌ Table '${table}' does not exist`);
      } else if (error) {
        console.log(`   ⚠️  Error checking '${table}': ${error.message}`);
      } else {
        console.log(`   ✅ Table '${table}' already exists`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runMigration();