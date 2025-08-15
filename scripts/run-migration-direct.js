const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.zfbgdixbzezpxllkoyfc',
    password: 'Goldyear2023#',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🔗 Connected to Supabase database');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../backend/supabase/migrations/20250815_workflow_assignments.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Running workflow assignments migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration completed successfully');

    // Verify the table was created
    const { rows } = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'workflow_assignments'
      ORDER BY ordinal_position;
    `);

    console.log('📊 workflow_assignments table structure:');
    rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Check if our test workflow assignment was inserted
    const { rows: assignments } = await client.query(`
      SELECT workflow_id, user_id, project_id, folder_id, status, assigned_at
      FROM workflow_assignments 
      WHERE workflow_id = 'D3G2NGeMagzEDzhA';
    `);

    if (assignments.length > 0) {
      console.log('✅ Test workflow assignment found:');
      console.log(`  - Workflow: ${assignments[0].workflow_id}`);
      console.log(`  - User: ${assignments[0].user_id}`);
      console.log(`  - Project: ${assignments[0].project_id}`);
      console.log(`  - Folder: ${assignments[0].folder_id}`);
      console.log(`  - Status: ${assignments[0].status}`);
    } else {
      console.log('⚠️ Test workflow assignment not found - may need to be created');
    }

    await client.end();
    console.log('🎉 Migration and verification completed');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();