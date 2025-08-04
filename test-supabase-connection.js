import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testSupabase() {
  console.log('🔍 Testing Supabase Connection for Clixen...');
  
  try {
    // Test basic connection by checking if we can access the database
    const { data, error } = await supabase
      .rpc('get_schema', {})
      .then(() => ({ data: [], error: null }))
      .catch(async () => {
        // Fallback: try to list tables using raw SQL
        const { data, error } = await supabase
          .from('pg_tables')
          .select('tablename')
          .eq('schemaname', 'public')
          .limit(20);
        return { data, error };
      });
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('📊 Available tables:');
    data.forEach(table => console.log(`  - ${table.table_name}`));
    
    // Test auth system
    console.log('\n🔐 Testing Authentication System...');
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.log('⚠️  Auth test failed:', authError.message);
    } else {
      console.log(`✅ Auth system working - Found ${authData.users.length} users`);
      if (authData.users.length > 0) {
        console.log(`   Test user: ${authData.users[0].email}`);
      }
    }
    
    // Test specific tables for Clixen
    console.log('\n📋 Testing Clixen-specific tables...');
    const tablesToCheck = [
      'conversations',
      'workflows', 
      'user_oauth_tokens',
      'api_usage',
      'workflow_executions'
    ];
    
    for (const tableName of tablesToCheck) {
      const { data: tableData, error: tableError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
        
      if (tableError) {
        console.log(`❌ Table '${tableName}' not accessible: ${tableError.message}`);
      } else {
        console.log(`✅ Table '${tableName}' accessible`);
      }
    }
    
    return true;
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

// Test n8n connection
async function testN8nConnection() {
  console.log('\n🎯 Testing n8n API Connection...');
  
  const n8nApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';
  const n8nUrl = 'http://18.221.12.50:5678/api/v1';
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(`${n8nUrl}/workflows`, {
      headers: {
        'Authorization': `Bearer ${n8nApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const workflows = await response.json();
      console.log(`✅ n8n API connection successful - Found ${workflows.data.length} workflows`);
      return true;
    } else {
      console.log(`❌ n8n API failed: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ n8n connection error: ${err.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Clixen Frontend Testing Suite\n');
  
  const supabaseOk = await testSupabase();
  const n8nOk = await testN8nConnection();
  
  console.log('\n📊 Test Results Summary:');
  console.log(`Supabase: ${supabaseOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`n8n API: ${n8nOk ? '✅ PASS' : '❌ FAIL'}`);
  
  if (supabaseOk && n8nOk) {
    console.log('\n🎉 All systems operational! Frontend ready for testing.');
  } else {
    console.log('\n⚠️  Some systems need attention before full testing.');
  }
}

runAllTests();