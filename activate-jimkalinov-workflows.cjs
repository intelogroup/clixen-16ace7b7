// Simple Node.js script to activate workflows for jimkalinov@gmail.com
const https = require('https');
const http = require('http');

// Configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

// Simple HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 10000,
      ...options
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function main() {
  console.log('🚀 Starting workflow activation for jimkalinov@gmail.com');
  console.log('============================================================');

  try {
    // Step 1: Get users from Supabase Auth
    console.log('🔍 Fetching users from Supabase...');
    const usersResponse = await makeRequest(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 Supabase response status: ${usersResponse.status}`);

    if (usersResponse.status !== 200) {
      console.error('❌ Failed to fetch users from Supabase:', usersResponse.data);
      return;
    }

    const users = usersResponse.data.users || [];
    console.log(`✅ Found ${users.length} total users in Supabase`);

    const user = users.find(u => u.email === 'jimkalinov@gmail.com');
    
    if (!user) {
      console.log('❌ User jimkalinov@gmail.com not found in Supabase Auth');
      console.log('📋 Available users:');
      users.slice(0, 5).forEach(u => console.log(`   - ${u.email} (${u.id})`));
      return;
    }

    console.log(`✅ User found:`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Created: ${user.created_at}`);

    // Step 2: Get workflows from n8n
    console.log('\n🔍 Fetching workflows from n8n...');
    const workflowsResponse = await makeRequest(`${N8N_API_URL}/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 n8n response status: ${workflowsResponse.status}`);

    if (workflowsResponse.status !== 200) {
      console.error('❌ Failed to fetch workflows from n8n:', workflowsResponse.data);
      return;
    }

    const allWorkflows = workflowsResponse.data.data || [];
    console.log(`✅ Found ${allWorkflows.length} total workflows in n8n`);

    // Step 3: Filter user workflows using USR prefix
    const userPrefix = `[USR-${user.id}]`;
    console.log(`🔍 Looking for workflows with prefix: ${userPrefix}`);
    
    const userWorkflows = allWorkflows.filter(workflow => 
      workflow.name && workflow.name.startsWith(userPrefix)
    );

    console.log(`\n📊 User Workflow Analysis:`);
    console.log(`   - User ID: ${user.id}`);
    console.log(`   - Prefix search: ${userPrefix}`);
    console.log(`   - Found ${userWorkflows.length} user workflows`);

    if (userWorkflows.length === 0) {
      console.log('\n🔍 No workflows found with exact prefix. Searching for similar patterns...');
      
      // Try alternative search patterns
      const partialMatches = allWorkflows.filter(workflow => 
        workflow.name && (
          workflow.name.includes(user.id) || 
          workflow.name.includes(user.email.split('@')[0]) ||
          workflow.name.toLowerCase().includes('jimkalinov')
        )
      );
      
      if (partialMatches.length > 0) {
        console.log(`📋 Found ${partialMatches.length} potentially related workflows:`);
        partialMatches.forEach(w => console.log(`   - ${w.name} (ID: ${w.id}, Active: ${w.active})`));
      } else {
        console.log('ℹ️ No workflows found for this user.');
      }
      
      return;
    }

    // Display all user workflows
    console.log('\n📋 User workflows found:');
    userWorkflows.forEach((workflow, index) => {
      console.log(`   ${index + 1}. ${workflow.name}`);
      console.log(`      - ID: ${workflow.id}`);
      console.log(`      - Active: ${workflow.active ? '✅' : '❌'}`);
      console.log(`      - Created: ${workflow.createdAt || 'Unknown'}`);
      console.log('');
    });

    // Step 4: Find inactive workflows
    const inactiveWorkflows = userWorkflows.filter(w => !w.active);
    console.log(`📋 Status Summary:`);
    console.log(`   - Total workflows: ${userWorkflows.length}`);
    console.log(`   - Already active: ${userWorkflows.length - inactiveWorkflows.length}`);
    console.log(`   - Need activation: ${inactiveWorkflows.length}`);

    if (inactiveWorkflows.length === 0) {
      console.log('✅ All user workflows are already active!');
      return;
    }

    // Step 5: Activate inactive workflows
    console.log(`\n🔄 Activating ${inactiveWorkflows.length} inactive workflows...`);
    const results = [];

    for (const workflow of inactiveWorkflows) {
      console.log(`\n🔄 Activating: ${workflow.name} (ID: ${workflow.id})`);
      
      try {
        const activationResponse = await makeRequest(`${N8N_API_URL}/workflows/${workflow.id}/activate`, {
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json'
          }
        });

        if (activationResponse.status === 200) {
          console.log(`✅ Successfully activated: ${workflow.name}`);
          results.push({ workflow: workflow.name, status: 'success' });
        } else {
          console.log(`❌ Failed to activate: ${workflow.name}`);
          console.log(`   Error: ${activationResponse.status} - ${JSON.stringify(activationResponse.data)}`);
          results.push({ workflow: workflow.name, status: 'failed', error: activationResponse.data });
        }
      } catch (error) {
        console.log(`❌ Error activating ${workflow.name}: ${error.message}`);
        results.push({ workflow: workflow.name, status: 'failed', error: error.message });
      }

      // Small delay between activations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Final summary
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    console.log('\n============================================================');
    console.log('🎉 Workflow activation process complete!');
    console.log(`📈 Final Results:`);
    console.log(`   ✅ Successfully activated: ${successful}`);
    console.log(`   ❌ Failed to activate: ${failed}`);

    if (failed > 0) {
      console.log('\n❌ Failed activations:');
      results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`   - ${r.workflow}: ${JSON.stringify(r.error)}`);
      });
    }

    console.log('\n🏁 Script execution completed.');

  } catch (error) {
    console.error('💥 Fatal error during execution:', error);
  }
}

// Execute the script
main().catch(console.error);