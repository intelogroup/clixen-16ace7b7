// Flexible workflow activation script for jimkalinov@gmail.com
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
      const bodyData = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.write(bodyData);
    }
    
    req.end();
  });
}

function findUserWorkflows(allWorkflows, user) {
  const userId = user.id;
  const userEmail = user.email;
  const username = userEmail.split('@')[0]; // jimkalinov
  
  // Multiple search patterns for flexibility
  const searchPatterns = [
    `[USR-${userId}]`,        // Standard format: [USR-397a5dcc-fe59-4b1d-90a5-17a9d674e18d]
    `[USR-${username}]`,      // Username format: [USR-jimkalinov]
    userId,                   // Just the UUID
    username,                 // Just the username
    userEmail                 // Full email
  ];
  
  console.log('🔍 Searching for workflows with multiple patterns:');
  searchPatterns.forEach(pattern => console.log(`   - "${pattern}"`));
  
  const foundWorkflows = [];
  const matchedPatterns = [];
  
  for (const workflow of allWorkflows) {
    if (!workflow.name) continue;
    
    for (const pattern of searchPatterns) {
      if (workflow.name.includes(pattern)) {
        foundWorkflows.push(workflow);
        matchedPatterns.push(pattern);
        console.log(`   ✅ Match found: "${workflow.name}" (pattern: "${pattern}")`);
        break; // Don't match the same workflow multiple times
      }
    }
  }
  
  console.log(`\n📊 Search Results:`);
  console.log(`   - Total patterns searched: ${searchPatterns.length}`);
  console.log(`   - Workflows found: ${foundWorkflows.length}`);
  console.log(`   - Matched patterns: ${[...new Set(matchedPatterns)].join(', ')}`);
  
  return foundWorkflows;
}

async function main() {
  console.log('🚀 Starting FLEXIBLE workflow activation for jimkalinov@gmail.com');
  console.log('================================================================');

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

    if (usersResponse.status !== 200) {
      console.error('❌ Failed to fetch users from Supabase:', usersResponse.data);
      return;
    }

    const users = usersResponse.data.users || [];
    const user = users.find(u => u.email === 'jimkalinov@gmail.com');
    
    if (!user) {
      console.log('❌ User jimkalinov@gmail.com not found');
      return;
    }

    console.log(`✅ User found: ${user.email} (ID: ${user.id})`);

    // Step 2: Get workflows from n8n
    console.log('\n🔍 Fetching workflows from n8n...');
    const workflowsResponse = await makeRequest(`${N8N_API_URL}/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (workflowsResponse.status !== 200) {
      console.error('❌ Failed to fetch workflows from n8n:', workflowsResponse.data);
      return;
    }

    const allWorkflows = workflowsResponse.data.data || [];
    console.log(`✅ Found ${allWorkflows.length} total workflows in n8n`);

    // Step 3: Find user workflows with flexible matching
    console.log('\n🔍 Finding user workflows with flexible matching...');
    const userWorkflows = findUserWorkflows(allWorkflows, user);

    if (userWorkflows.length === 0) {
      console.log('\n❌ No workflows found for this user with any search pattern');
      console.log('\n📋 All available workflows:');
      allWorkflows.slice(0, 10).forEach((w, i) => {
        console.log(`   ${i+1}. ${w.name} (ID: ${w.id}, Active: ${w.active})`);
      });
      return;
    }

    // Display found workflows
    console.log('\n📋 User workflows found:');
    userWorkflows.forEach((workflow, index) => {
      console.log(`   ${index + 1}. ${workflow.name}`);
      console.log(`      - ID: ${workflow.id}`);
      console.log(`      - Active: ${workflow.active ? '✅ YES' : '❌ NO'}`);
      console.log(`      - Created: ${workflow.createdAt || 'Unknown'}`);
      console.log('');
    });

    // Step 4: Check activation status
    const inactiveWorkflows = userWorkflows.filter(w => !w.active);
    console.log(`📋 Status Summary:`);
    console.log(`   - Total workflows: ${userWorkflows.length}`);
    console.log(`   - Already active: ${userWorkflows.length - inactiveWorkflows.length}`);
    console.log(`   - Need activation: ${inactiveWorkflows.length}`);

    if (inactiveWorkflows.length === 0) {
      console.log('\n✅ All user workflows are already active! No action needed.');
      return;
    }

    // Step 5: Activate inactive workflows
    console.log(`\n🔄 Activating ${inactiveWorkflows.length} inactive workflows...`);
    const results = [];

    for (const workflow of inactiveWorkflows) {
      console.log(`\n🔄 Activating: ${workflow.name}`);
      console.log(`   - Workflow ID: ${workflow.id}`);
      
      try {
        // Use PATCH method to update workflow active status
        const activationResponse = await makeRequest(`${N8N_API_URL}/workflows/${workflow.id}`, {
          method: 'PATCH',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json'
          },
          body: { active: true }
        });

        if (activationResponse.status === 200) {
          console.log(`   ✅ Successfully activated: ${workflow.name}`);
          results.push({ 
            workflow: workflow.name, 
            id: workflow.id,
            status: 'success' 
          });
        } else {
          console.log(`   ❌ Failed to activate: ${workflow.name}`);
          console.log(`   📋 Response: ${activationResponse.status} - ${JSON.stringify(activationResponse.data)}`);
          results.push({ 
            workflow: workflow.name, 
            id: workflow.id,
            status: 'failed', 
            error: activationResponse.data 
          });
        }
      } catch (error) {
        console.log(`   ❌ Error activating ${workflow.name}: ${error.message}`);
        results.push({ 
          workflow: workflow.name, 
          id: workflow.id,
          status: 'failed', 
          error: error.message 
        });
      }

      // Small delay between activations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Final summary
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    console.log('\n================================================================');
    console.log('🎉 WORKFLOW ACTIVATION PROCESS COMPLETE!');
    console.log('================================================================');
    console.log(`📈 Final Results:`);
    console.log(`   🎯 User: ${user.email}`);
    console.log(`   📊 Total workflows found: ${userWorkflows.length}`);
    console.log(`   ✅ Successfully activated: ${successful}`);
    console.log(`   ❌ Failed to activate: ${failed}`);
    console.log(`   🔄 Overall success rate: ${userWorkflows.length > 0 ? Math.round((successful / inactiveWorkflows.length) * 100) : 0}%`);

    if (successful > 0) {
      console.log('\n✅ Successfully activated workflows:');
      results.filter(r => r.status === 'success').forEach(r => {
        console.log(`   • ${r.workflow} (ID: ${r.id})`);
      });
    }

    if (failed > 0) {
      console.log('\n❌ Failed activations:');
      results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`   • ${r.workflow}: ${JSON.stringify(r.error)}`);
      });
    }

    console.log('\n🏁 Script execution completed successfully!');

  } catch (error) {
    console.error('💥 Fatal error during execution:', error);
  }
}

// Execute the script
main().catch(console.error);