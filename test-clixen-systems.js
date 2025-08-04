import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testSupabaseBasic() {
  console.log('🔍 Testing Basic Supabase Connection...');
  
  try {
    // Simple auth test
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error && error.message !== 'JWT expired') {
      console.log('⚠️  Auth check:', error.message);
    }
    
    // Try to access a known table
    const { data, error: tableError } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);
      
    if (tableError) {
      console.log('❌ Conversations table:', tableError.message);
      return false;
    }
    
    console.log('✅ Supabase connection working!');
    console.log(`📊 Conversations table accessible (${data.length} records found)`);
    return true;
    
  } catch (err) {
    console.error('❌ Supabase error:', err.message);
    return false;
  }
}

async function testN8nAPI() {
  console.log('\n🎯 Testing n8n API Connection...');
  
  const n8nApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';
  const n8nUrl = 'http://18.221.12.50:5678';
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    // Test health endpoint first
    const healthResponse = await fetch(`${n8nUrl}/healthz`, {
      timeout: 5000
    });
    
    if (!healthResponse.ok) {
      console.log(`❌ n8n health check failed: ${healthResponse.status}`);
      return false;
    }
    
    console.log('✅ n8n service is healthy');
    
    // Test API with credentials
    const apiResponse = await fetch(`${n8nUrl}/api/v1/credentials`, {
      headers: {
        'Authorization': `Bearer ${n8nApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    if (!apiResponse.ok) {
      console.log(`❌ n8n API failed: ${apiResponse.status} ${apiResponse.statusText}`);
      const errorText = await apiResponse.text();
      console.log('Error details:', errorText);
      return false;
    }
    
    const credentials = await apiResponse.json();
    console.log(`✅ n8n API working - Found ${credentials.data.length} credentials`);
    return true;
    
  } catch (err) {
    console.log(`❌ n8n connection error: ${err.message}`);
    return false;
  }
}

async function testFrontendURL() {
  console.log('\n🌐 Testing Frontend URL...');
  
  const frontendUrl = 'http://18.221.12.50';
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(frontendUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Clixen-Test-Agent'
      }
    });
    
    if (!response.ok) {
      console.log(`❌ Frontend not accessible: ${response.status}`);
      return false;
    }
    
    const html = await response.text();
    const hasReact = html.includes('react') || html.includes('React');
    const hasVite = html.includes('vite') || html.includes('Vite');
    
    console.log('✅ Frontend is accessible');
    console.log(`📊 Contains React: ${hasReact ? 'Yes' : 'No'}`);
    console.log(`📊 Contains Vite: ${hasVite ? 'Yes' : 'No'}`);
    
    return true;
    
  } catch (err) {
    console.log(`❌ Frontend error: ${err.message}`);
    return false;
  }
}

async function runFullTest() {
  console.log('🚀 Clixen Frontend System Test\n');
  
  const results = {
    supabase: await testSupabaseBasic(),
    n8n: await testN8nAPI(),
    frontend: await testFrontendURL()
  };
  
  console.log('\n📊 Complete Test Results:');
  console.log(`Supabase Backend: ${results.supabase ? '✅ OPERATIONAL' : '❌ FAILED'}`);
  console.log(`n8n API Service: ${results.n8n ? '✅ OPERATIONAL' : '❌ FAILED'}`);
  console.log(`Frontend App: ${results.frontend ? '✅ ACCESSIBLE' : '❌ FAILED'}`);
  
  const allPassing = Object.values(results).every(r => r);
  
  if (allPassing) {
    console.log('\n🎉 ALL SYSTEMS OPERATIONAL! Clixen app ready for full testing.');
  } else {
    console.log('\n⚠️  Some systems need attention. Check individual test results above.');
  }
  
  return results;
}

runFullTest();