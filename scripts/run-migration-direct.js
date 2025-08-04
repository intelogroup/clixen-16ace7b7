import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const { Client } = pg;

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

async function executeMigration() {
  // Use the pooler connection string for better performance
  const connectionString = `postgresql://postgres.zfbgdixbzezpxllkoyfc:${encodeURIComponent('Jimkali90#')}@aws-0-us-east-2.pooler.supabase.com:5432/postgres`;
  
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🚀 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Read the core migration SQL file (without extensions)
    const migrationPath = path.join(__dirname, 'core-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Executing migration SQL...');
    console.log(`📋 Migration size: ${migrationSQL.length} characters`);
    
    // Set the search path to public schema
    await client.query('SET search_path TO public');
    
    // Execute the entire migration as one transaction
    await client.query('BEGIN');
    
    try {
      // Execute the migration
      const result = await client.query(migrationSQL);
      console.log('✅ Migration executed successfully!');
      
      await client.query('COMMIT');
      console.log('✅ Transaction committed!');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Migration failed, rolled back:', error.message);
      throw error;
    }
    
    // Test the installation
    console.log('\n🔍 Testing migration results...');
    
    // Check for workflow_executions table
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%workflow%'
    `);
    
    console.log('📋 Workflow tables created:', tablesResult.rows.map(r => r.table_name));
    
    // Check for extensions
    const extensionsResult = await client.query(`
      SELECT extname 
      FROM pg_extension 
      WHERE extname IN ('pgmq', 'pg_cron', 'pg_net')
    `);
    
    console.log('🧩 Extensions installed:', extensionsResult.rows.map(r => r.extname));
    
    // Check for custom functions
    const functionsResult = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name LIKE 'pgmq_%'
    `);
    
    console.log('⚙️  Custom functions created:', functionsResult.rows.map(r => r.routine_name));
    
    // Check for queues (this might fail if pgmq isn't enabled)
    try {
      const queuesResult = await client.query(`
        SELECT queue_name FROM pgmq.queue WHERE queue_name LIKE '%workflow%'
      `);
      console.log('📬 Queues created:', queuesResult.rows.map(r => r.queue_name));
    } catch (queueError) {
      console.log('⚠️  Queue check failed (pgmq might not be enabled):', queueError.message);
    }
    
    // Test basic queue functionality
    try {
      const testResult = await client.query(`SELECT pgmq_create_queue('test_queue')`);
      console.log('✅ Queue functionality test passed');
      
      // Clean up test queue
      await client.query(`SELECT pgmq.drop_queue('test_queue')`);
    } catch (testError) {
      console.log('⚠️  Queue functionality test failed:', testError.message);
    }
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    
    // If it's an extension error, provide helpful guidance
    if (error.message.includes('extension') || error.message.includes('pgmq')) {
      console.log('\n💡 Extension Installation Guide:');
      console.log('1. Go to https://supabase.com/dashboard/project/zfbgdixbzezpxllkoyfc/settings/database');
      console.log('2. Navigate to Extensions');
      console.log('3. Enable these extensions:');
      console.log('   - pgmq (Message Queue)');
      console.log('   - pg_cron (Scheduled Jobs)');
      console.log('   - pg_net (HTTP Client)');
      console.log('4. Re-run this migration script');
    }
    
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
executeMigration();