/**
 * Database Schema Check and Fix
 * Checks existing database schema and adds missing columns
 */

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

// Configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

// Direct database connection
const DATABASE_URL = 'postgresql://postgres.zfbgdixbzezpxllkoyfc:Goldyear2023#@aws-0-us-east-2.pooler.supabase.com:5432/postgres';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { Client } = pg;

async function checkAndFixDatabaseSchema() {
  console.log('🔍 Database Schema Analysis and Fix\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database directly');

    // Step 1: Check what tables exist
    console.log('\n📋 Checking existing tables...');
    const tablesResult = await client.query(`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`Found ${tablesResult.rows.length} tables in public schema:`);
    tablesResult.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

    // Step 2: Check projects table structure if it exists
    const projectsTableExists = tablesResult.rows.some(t => t.table_name === 'projects');
    
    if (projectsTableExists) {
      console.log('\n📊 Analyzing projects table structure...');
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'projects' AND table_schema = 'public'
        ORDER BY ordinal_position;
      `);

      console.log('Current projects table columns:');
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });

      // Check if status column exists
      const hasStatusColumn = columnsResult.rows.some(col => col.column_name === 'status');
      
      if (!hasStatusColumn) {
        console.log('\n🔧 Adding missing status column...');
        try {
          await client.query(`
            ALTER TABLE projects 
            ADD COLUMN status VARCHAR(50) DEFAULT 'active' NOT NULL;
          `);
          console.log('✅ Status column added successfully');
        } catch (error) {
          console.log(`❌ Failed to add status column: ${error.message}`);
        }
      } else {
        console.log('\n✅ Status column already exists');
      }

    } else {
      console.log('\n🏗️ Projects table does not exist, creating it...');
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS projects (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            status VARCHAR(50) DEFAULT 'active' NOT NULL,
            settings JSONB DEFAULT '{}' NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );

          -- Enable RLS
          ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

          -- Create RLS policies
          CREATE POLICY "Users can manage their own projects" ON projects
            FOR ALL USING (auth.uid() = user_id);

          -- Create updated_at trigger
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = now();
            RETURN NEW;
          END;
          $$ language 'plpgsql';

          CREATE TRIGGER update_projects_updated_at
            BEFORE UPDATE ON projects
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

          -- Create index for performance
          CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
          CREATE INDEX IF NOT EXISTS projects_created_at_idx ON projects(created_at DESC);
        `);
        console.log('✅ Projects table created successfully with all constraints and policies');
      } catch (error) {
        console.log(`❌ Failed to create projects table: ${error.message}`);
      }
    }

    // Step 3: Test basic project operations
    console.log('\n🧪 Testing basic project operations...');
    
    // Sign in first
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'jayveedz19@gmail.com',
      password: 'Goldyear2023#'
    });

    if (authError) {
      console.log(`❌ Auth failed: ${authError.message}`);
    } else {
      console.log('✅ Authenticated successfully');

      // Test create project
      const testProject = {
        name: `Test Project ${Date.now()}`,
        description: 'Schema test project',
        status: 'active'
      };

      const { data: projectData, error: createError } = await supabase
        .from('projects')
        .insert([testProject])
        .select()
        .single();

      if (createError) {
        console.log(`❌ Project creation failed: ${createError.message}`);
        console.log(`   Code: ${createError.code}, Details: ${createError.details}`);
      } else {
        console.log('✅ Project creation successful');
        console.log(`   Project ID: ${projectData.id}`);
        console.log(`   Project Name: ${projectData.name}`);

        // Test project listing
        const { data: projects, error: listError } = await supabase
          .from('projects')
          .select('*')
          .limit(5);

        if (listError) {
          console.log(`❌ Project listing failed: ${listError.message}`);
        } else {
          console.log(`✅ Project listing successful - found ${projects.length} projects`);
        }

        // Clean up test project
        const { error: deleteError } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectData.id);

        if (deleteError) {
          console.log(`⚠️  Failed to clean up test project: ${deleteError.message}`);
        } else {
          console.log('✅ Test project cleaned up');
        }
      }
    }

    // Step 4: Check other MVP tables
    console.log('\n📋 Checking other MVP tables...');
    const expectedTables = ['user_profiles', 'mvp_workflows', 'mvp_chat_sessions', 'mvp_chat_messages', 'deployments', 'telemetry_events'];
    
    expectedTables.forEach(tableName => {
      const exists = tablesResult.rows.some(t => t.table_name === tableName);
      console.log(`  ${tableName}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    });

  } catch (error) {
    console.error(`💥 Error: ${error.message}`);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the check
checkAndFixDatabaseSchema()
  .then(() => {
    console.log('\n🏁 Database schema check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Schema check failed:', error);
    process.exit(1);
  });

export { checkAndFixDatabaseSchema };