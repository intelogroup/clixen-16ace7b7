import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'aws-0-us-east-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.zfbgdixbzezpxllkoyfc',
  password: 'Goldyear2023#',
  ssl: { rejectUnauthorized: false }
});

async function validateMVPSchema() {
  try {
    await client.connect();
    console.log('🚀 Connected to Supabase PostgreSQL');
    
    console.log('\n📋 MVP Schema Validation Report');
    console.log('=====================================');
    
    // Check for required MVP tables
    const requiredTables = [
      'user_profiles',
      'projects', 
      'mvp_workflows',
      'mvp_chat_sessions',
      'mvp_chat_messages',
      'deployments',
      'telemetry_events'
    ];
    
    console.log('\n🔍 Checking MVP Tables:');
    
    for (const tableName of requiredTables) {
      try {
        const result = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        
        if (result.rows.length > 0) {
          console.log(`✅ ${tableName} (${result.rows.length} columns)`);
        } else {
          console.log(`❌ ${tableName} - Missing`);
        }
      } catch (error) {
        console.log(`❌ ${tableName} - Error: ${error.message}`);
      }
    }
    
    // Check RLS status
    console.log('\n🔒 Checking RLS Status:');
    const rlsResult = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = ANY($1)
    `, [requiredTables]);
    
    rlsResult.rows.forEach(row => {
      const status = row.rowsecurity ? '✅ Enabled' : '⚠️  Disabled';
      console.log(`${status} ${row.tablename}`);
    });
    
    // Check for critical functions
    console.log('\n⚙️  Checking Core Functions:');
    const criticalFunctions = [
      'create_user_profile',
      'get_or_create_default_project',
      'update_updated_at'
    ];
    
    for (const funcName of criticalFunctions) {
      try {
        const result = await client.query(`
          SELECT routine_name 
          FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND routine_name = $1
        `, [funcName]);
        
        if (result.rows.length > 0) {
          console.log(`✅ ${funcName}()`);
        } else {
          console.log(`❌ ${funcName}() - Missing`);
        }
      } catch (error) {
        console.log(`❌ ${funcName}() - Error`);
      }
    }
    
    // Check existing data
    console.log('\n📊 Data Summary:');
    
    const dataTables = ['user_profiles', 'projects', 'mvp_workflows', 'telemetry_events'];
    for (const table of dataTables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`${table}: ${result.rows[0].count} records`);
      } catch (error) {
        console.log(`${table}: Table not accessible or doesn't exist`);
      }
    }
    
    // Check indexes
    console.log('\n📈 Index Summary:');
    const indexResult = await client.query(`
      SELECT 
        i.relname as index_name,
        t.relname as table_name
      FROM pg_class t, pg_class i, pg_index ix
      WHERE t.oid = ix.indrelid
      AND i.oid = ix.indexrelid
      AND t.relname = ANY($1)
      AND i.relname LIKE 'idx_%'
    `, [requiredTables]);
    
    const indexesByTable = {};
    indexResult.rows.forEach(row => {
      if (!indexesByTable[row.table_name]) indexesByTable[row.table_name] = 0;
      indexesByTable[row.table_name]++;
    });
    
    requiredTables.forEach(table => {
      const count = indexesByTable[table] || 0;
      console.log(`${table}: ${count} performance indexes`);
    });
    
    // Test basic functionality
    console.log('\n🧪 Testing Basic Functionality:');
    
    // Test if user profiles table can be queried
    try {
      await client.query('SELECT 1 FROM user_profiles LIMIT 1');
      console.log('✅ user_profiles table accessible');
    } catch (error) {
      console.log('❌ user_profiles table not accessible:', error.message);
    }
    
    // Test if projects table exists
    try {
      await client.query('SELECT 1 FROM projects LIMIT 1');
      console.log('✅ projects table accessible');
    } catch (error) {
      console.log('❌ projects table not accessible:', error.message);
    }
    
    // Test function call
    try {
      const testResult = await client.query('SELECT update_updated_at()');
      console.log('✅ Core functions callable');
    } catch (error) {
      console.log('❌ Function test failed:', error.message);
    }
    
    // Generate compatibility report
    console.log('\n📋 MVP Compatibility Summary:');
    console.log('=====================================');
    
    const tablesExist = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ANY($1)
    `, [requiredTables]);
    
    const tableCount = parseInt(tablesExist.rows[0].count);
    const completionPercentage = Math.round((tableCount / requiredTables.length) * 100);
    
    console.log(`Core Tables: ${tableCount}/${requiredTables.length} (${completionPercentage}%)`);
    
    if (completionPercentage >= 80) {
      console.log('🎉 MVP Schema Implementation: READY FOR DEVELOPMENT');
      console.log('✅ Sufficient schema components available');
      console.log('🚀 Frontend can connect to database');
    } else if (completionPercentage >= 60) {
      console.log('⚠️  MVP Schema Implementation: PARTIALLY READY');
      console.log('🔧 Some components need attention');
    } else {
      console.log('❌ MVP Schema Implementation: NEEDS WORK');
      console.log('🛠️  Major schema components missing');
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (tableCount < requiredTables.length) {
      console.log('1. Run individual CREATE TABLE statements for missing tables');
      console.log('2. Use Supabase dashboard to create tables manually if needed');
    }
    
    if (indexResult.rows.length < 10) {
      console.log('3. Add performance indexes for better query performance');
    }
    
    console.log('4. Verify RLS policies are properly configured');
    console.log('5. Test frontend connectivity with the current schema');
    
  } catch (error) {
    console.error('💥 Validation failed:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

validateMVPSchema();