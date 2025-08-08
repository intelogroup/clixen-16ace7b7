import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

// Configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

// Test credentials
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

console.log('🔐 COMPREHENSIVE AUTHENTICATION TEST SUITE');
console.log('==========================================\n');

// Initialize clients
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// PostgreSQL client for direct database tests
const { Client } = pg;
const pgClient = new Client({
  host: 'aws-0-us-east-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.zfbgdixbzezpxllkoyfc',
  password: 'Goldyear2023#',
  ssl: { rejectUnauthorized: false }
});

async function testSupabaseConnection() {
  console.log('🌐 Test 1: Supabase Connection');
  console.log('================================');
  
  try {
    const { data, error } = await anonClient.auth.getSession();
    if (error) {
      console.log('❌ Connection failed:', error.message);
      return false;
    }
    console.log('✅ Supabase connection successful');
    console.log('  URL:', SUPABASE_URL);
    console.log('  Anon key prefix:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n🗄️  Test 2: Direct Database Connection');
  console.log('======================================');
  
  try {
    await pgClient.connect();
    console.log('✅ PostgreSQL connection successful');
    
    // Test basic query
    const result = await pgClient.query('SELECT current_user, current_database(), version()');
    console.log('  Current user:', result.rows[0].current_user);
    console.log('  Database:', result.rows[0].current_database);
    console.log('  PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    
    return true;
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testUserAuthentication() {
  console.log('\n🔑 Test 3: User Authentication');
  console.log('===============================');
  
  try {
    // Test sign in with existing credentials
    console.log('Testing sign in with test credentials...');
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (error) {
      console.log('❌ Authentication failed:', error.message);
      return false;
    }
    
    if (!data.user) {
      console.log('❌ No user data returned');
      return false;
    }
    
    console.log('✅ Authentication successful');
    console.log('  User ID:', data.user.id);
    console.log('  Email:', data.user.email);
    console.log('  Email confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
    console.log('  Last sign in:', data.user.last_sign_in_at);
    console.log('  Session token prefix:', data.session?.access_token?.substring(0, 20) + '...');
    
    // Test getting current session
    const { data: sessionData, error: sessionError } = await anonClient.auth.getSession();
    if (sessionError) {
      console.log('⚠️  Session retrieval error:', sessionError.message);
    } else {
      console.log('✅ Session retrieval successful');
      console.log('  Session user ID:', sessionData.session?.user?.id);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Authentication test failed:', error.message);
    return false;
  }
}

async function testDatabaseSchema() {
  console.log('\n📋 Test 4: Database Schema Validation');
  console.log('=====================================');
  
  try {
    // Check for auth-related tables
    const authTables = await pgClient.query(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'auth'
      ORDER BY table_name
    `);
    
    console.log('Auth schema tables:');
    authTables.rows.forEach(row => {
      console.log(`  - ${row.table_name} (${row.table_type})`);
    });
    
    // Check for user-related tables in public schema
    const publicTables = await pgClient.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%user%' OR table_name LIKE '%profile%')
      ORDER BY table_name
    `);
    
    console.log('\nUser-related tables in public schema:');
    if (publicTables.rows.length === 0) {
      console.log('  - No user tables found');
    } else {
      publicTables.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    }
    
    // Check for MVP tables
    const mvpTables = ['projects', 'mvp_workflows', 'mvp_chat_sessions', 'mvp_chat_messages'];
    console.log('\nMVP core tables:');
    
    for (const tableName of mvpTables) {
      try {
        const result = await pgClient.query(`
          SELECT COUNT(*) as count FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        `, [tableName]);
        
        if (parseInt(result.rows[0].count) > 0) {
          console.log(`  ✅ ${tableName}`);
        } else {
          console.log(`  ❌ ${tableName} - Missing`);
        }
      } catch (error) {
        console.log(`  ❌ ${tableName} - Error checking`);
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Schema validation failed:', error.message);
    return false;
  }
}

async function testRLS() {
  console.log('\n🔒 Test 5: Row Level Security (RLS)');
  console.log('===================================');
  
  try {
    // Check RLS status on key tables
    const rlsResult = await pgClient.query(`
      SELECT 
        tablename,
        rowsecurity,
        CASE WHEN rowsecurity THEN 'Enabled' ELSE 'Disabled' END as status
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('user_profiles', 'projects', 'mvp_workflows', 'mvp_chat_sessions')
      ORDER BY tablename
    `);
    
    console.log('RLS Status:');
    rlsResult.rows.forEach(row => {
      const icon = row.rowsecurity ? '✅' : '⚠️ ';
      console.log(`  ${icon} ${row.tablename}: ${row.status}`);
    });
    
    // Check for RLS policies
    const policiesResult = await pgClient.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `);
    
    console.log('\nRLS Policies:');
    if (policiesResult.rows.length === 0) {
      console.log('  - No RLS policies found');
    } else {
      let currentTable = '';
      policiesResult.rows.forEach(row => {
        if (row.tablename !== currentTable) {
          console.log(`\n  ${row.tablename}:`);
          currentTable = row.tablename;
        }
        console.log(`    - ${row.policyname} (${row.cmd})`);
      });
    }
    
    return true;
  } catch (error) {
    console.log('❌ RLS check failed:', error.message);
    return false;
  }
}

async function testEdgeFunctions() {
  console.log('\n⚡ Test 6: Edge Functions');
  console.log('=========================');
  
  try {
    // Test health check function
    console.log('Testing health-check function...');
    const { data: healthData, error: healthError } = await anonClient.functions.invoke('health-check');
    
    if (healthError) {
      console.log('❌ Health check failed:', healthError.message);
    } else {
      console.log('✅ Health check successful');
      console.log('  Response:', JSON.stringify(healthData, null, 2));
    }
    
    // Test projects API
    console.log('\nTesting projects-api function...');
    const { data: projectsData, error: projectsError } = await anonClient.functions.invoke('projects-api', {
      body: { action: 'list' }
    });
    
    if (projectsError) {
      console.log('❌ Projects API test failed:', projectsError.message);
    } else {
      console.log('✅ Projects API accessible');
      console.log('  Response type:', typeof projectsData);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Edge functions test failed:', error.message);
    return false;
  }
}

async function testN8nIntegration() {
  console.log('\n🔌 Test 7: n8n Integration');
  console.log('===========================');
  
  const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
  const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';
  
  try {
    console.log('Testing n8n API connectivity...');
    const response = await fetch(`${N8N_API_URL}/workflows`, {
      headers: {
        'Authorization': `Bearer ${N8N_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ n8n API connection successful');
      console.log(`  Workflows count: ${data.data?.length || 0}`);
      console.log('  API URL:', N8N_API_URL);
    } else {
      console.log('❌ n8n API connection failed:', response.status, response.statusText);
    }
    
    return response.ok;
  } catch (error) {
    console.log('❌ n8n integration test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('Starting comprehensive authentication tests...\n');
  
  const results = {
    supabaseConnection: false,
    databaseConnection: false,
    userAuthentication: false,
    databaseSchema: false,
    rls: false,
    edgeFunctions: false,
    n8nIntegration: false
  };
  
  try {
    results.supabaseConnection = await testSupabaseConnection();
    results.databaseConnection = await testDatabaseConnection();
    results.userAuthentication = await testUserAuthentication();
    results.databaseSchema = await testDatabaseSchema();
    results.rls = await testRLS();
    results.edgeFunctions = await testEdgeFunctions();
    results.n8nIntegration = await testN8nIntegration();
    
  } catch (error) {
    console.log('❌ Test suite failed:', error.message);
  }
  
  // Summary
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('=======================');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
    console.log(`${icon} ${testName}`);
  });
  
  console.log(`\n📈 Overall Score: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED - Authentication system is fully functional!');
  } else if (passed >= total * 0.8) {
    console.log('⚠️  Most tests passed - Minor issues detected');
  } else {
    console.log('❌ Several tests failed - Authentication system needs attention');
  }
  
  console.log('\n💡 Recommendations:');
  if (!results.userAuthentication) {
    console.log('- Verify test credentials are correct');
    console.log('- Check if user account exists and is confirmed');
  }
  if (!results.databaseSchema) {
    console.log('- Run database migrations to create missing tables');
  }
  if (!results.rls) {
    console.log('- Configure Row Level Security policies for data protection');
  }
  if (!results.edgeFunctions) {
    console.log('- Deploy Edge Functions to Supabase');
  }
  if (!results.n8nIntegration) {
    console.log('- Check n8n server status and API key configuration');
  }
}

// Execute tests
runAllTests()
  .then(() => {
    console.log('\n🏁 Test suite completed');
  })
  .catch((error) => {
    console.error('💥 Test suite failed:', error);
  })
  .finally(async () => {
    try {
      await pgClient.end();
      console.log('🔌 Database connection closed');
    } catch (error) {
      // Ignore cleanup errors
    }
  });
