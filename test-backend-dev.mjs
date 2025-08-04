#!/usr/bin/env node

async function testBackend() {
  console.log('=== Testing Backend in Development Mode ===\n');
  
  // Test Supabase connectivity
  console.log('1. Testing Supabase Connection:');
  try {
    const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
    
    const response = await fetch(`${supabaseUrl}/rest/v1/conversations?select=*&limit=1`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Supabase connected successfully');
      console.log(`   Conversations found: ${data.length}`);
    } else {
      console.log('❌ Supabase connection failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Supabase error:', error.message);
  }
  
  // Test n8n connectivity
  console.log('\n2. Testing n8n Connection (EC2: 18.221.12.50):');
  try {
    const n8nUrl = 'http://18.221.12.50:5678';
    const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';
    
    const healthResponse = await fetch(`${n8nUrl}/healthz`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ n8n health check passed:', healthData);
    }
    
    const workflowsResponse = await fetch(`${n8nUrl}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': apiKey
      }
    });
    
    if (workflowsResponse.ok) {
      const workflows = await workflowsResponse.json();
      console.log('✅ n8n API connected successfully');
      console.log(`   Found ${workflows.data?.length || 0} workflows`);
      if (workflows.data?.length > 0) {
        console.log('   Sample workflow:', workflows.data[0].name);
      }
    } else {
      console.log('❌ n8n API connection failed:', workflowsResponse.status);
    }
  } catch (error) {
    console.log('❌ n8n error:', error.message);
  }
  
  // Test local dev server API
  console.log('\n3. Testing Local Dev Server:');
  try {
    const response = await fetch('http://localhost:3000/');
    if (response.ok) {
      console.log('✅ Dev server is running on port 3000');
      const html = await response.text();
      console.log('   Response type: HTML');
      console.log('   Title:', html.match(/<title>(.*?)<\/title>/)?.[1]);
    }
  } catch (error) {
    console.log('❌ Dev server error:', error.message);
  }
  
  // Test database connection
  console.log('\n4. Testing Database Connection:');
  try {
    const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';
    
    // Test users table
    const usersResponse = await fetch('https://zfbgdixbzezpxllkoyfc.supabase.co/rest/v1/profiles?select=*&limit=1', {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });
    
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      console.log('✅ Database connected successfully');
      console.log(`   Profiles found: ${users.length}`);
    }
    
    // Test workflows table
    const workflowsResponse = await fetch('https://zfbgdixbzezpxllkoyfc.supabase.co/rest/v1/workflows?select=*&limit=1', {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });
    
    if (workflowsResponse.ok) {
      const workflows = await workflowsResponse.json();
      console.log(`   Workflows found: ${workflows.length}`);
    }
  } catch (error) {
    console.log('❌ Database error:', error.message);
  }
  
  // Test Multi-Agent System readiness
  console.log('\n5. Testing Multi-Agent System Requirements:');
  
  // Check if OpenAI key is configured
  const openaiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (openaiKey && openaiKey !== 'your-openai-api-key-here') {
    console.log('✅ OpenAI API key configured');
  } else {
    console.log('⚠️  OpenAI API key not configured (required for AI agents)');
  }
  
  // Check agent files exist
  const agentFiles = [
    'src/lib/agents/BaseAgent.ts',
    'src/lib/agents/OrchestratorAgent.ts',
    'src/lib/agents/WorkflowDesignerAgent.ts',
    'src/lib/agents/DeploymentAgent.ts',
    'src/lib/agents/AgentCoordinator.ts'
  ];
  
  console.log('   Agent system files:');
  for (const file of agentFiles) {
    try {
      const fs = await import('fs/promises');
      await fs.access(file);
      console.log(`   ✅ ${file}`);
    } catch {
      console.log(`   ❌ ${file} not found`);
    }
  }
  
  console.log('\n=== Summary ===');
  console.log('Development environment is partially configured.');
  console.log('To enable full functionality:');
  console.log('1. Add your OpenAI API key to .env file');
  console.log('2. Ensure all backend services are accessible');
  console.log('3. Check CORS settings for production deployment');
}

testBackend().catch(console.error);