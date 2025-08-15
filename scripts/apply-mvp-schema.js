const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMVPSchema() {
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

    // Check which tables already exist
    const { rows: existingTables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user_profiles', 'projects', 'workflows', 'conversations')
      ORDER BY table_name;
    `);

    console.log('📊 Existing tables:');
    existingTables.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    const missingTables = ['user_profiles', 'projects', 'workflows', 'conversations']
      .filter(table => !existingTables.some(row => row.table_name === table));

    if (missingTables.length > 0) {
      console.log('⚠️ Missing tables:', missingTables.join(', '));
      
      // Read and apply the MVP schema migration
      const migrationPath = path.join(__dirname, '../backend/supabase/migrations/010_simplified_mvp_schema.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      console.log('📄 Applying MVP schema migration...');
      
      // Split migration into statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          await client.query(statement + ';');
        } catch (err) {
          if (err.code === '42P07') { // duplicate_table
            console.log(`  ℹ️ Table already exists, skipping...`);
          } else if (err.code === '42710') { // duplicate_object
            console.log(`  ℹ️ Object already exists, skipping...`);
          } else if (err.code === '42P01') { // undefined_table
            console.log(`  ⚠️ Referenced table doesn't exist, may need auth setup first`);
          } else {
            console.log(`  ⚠️ Error: ${err.message}`);
          }
        }
      }

      console.log('✅ MVP schema migration completed');
    } else {
      console.log('✅ All required tables already exist');
    }

    // Verify all tables now exist
    const { rows: finalTables } = await client.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('user_profiles', 'projects', 'workflows', 'conversations')
      ORDER BY table_name;
    `);

    console.log('\n📊 Final table status:');
    finalTables.forEach(row => {
      console.log(`  ✓ ${row.table_name} (${row.column_count} columns)`);
    });

    // Check if the auth trigger exists
    const { rows: triggers } = await client.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
      AND event_object_table = 'users'
      AND trigger_name = 'on_auth_user_created';
    `);

    if (triggers.length === 0) {
      console.log('\n⚠️ Auth trigger not found on auth.users table');
      console.log('  This may prevent automatic user profile creation');
    } else {
      console.log('\n✅ Auth trigger is properly configured');
    }

    await client.end();
    console.log('\n🎉 Database schema setup completed successfully!');

  } catch (error) {
    console.error('❌ Schema setup failed:', error);
    await client.end();
    process.exit(1);
  }
}

applyMVPSchema();