// Final comprehensive workflow activation script for jimkalinov@gmail.com
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
  
  return foundWorkflows;
}

function analyzeWorkflowTriggers(workflow) {
  const triggerTypes = [
    'n8n-nodes-base.webhook',
    'n8n-nodes-base.trigger',
    'n8n-nodes-base.cronTrigger', 
    'n8n-nodes-base.intervalTrigger',
    'n8n-nodes-base.httpRequestTrigger'
  ];
  
  const manualTriggers = ['n8n-nodes-base.manualTrigger'];
  
  const triggers = workflow.nodes?.filter(node => 
    triggerTypes.includes(node.type)
  ) || [];
  
  const manualNodes = workflow.nodes?.filter(node => 
    manualTriggers.includes(node.type)
  ) || [];
  
  return {
    hasActiveTriggers: triggers.length > 0,
    hasManualOnly: manualNodes.length > 0 && triggers.length === 0,
    triggerCount: triggers.length,
    manualCount: manualNodes.length,
    triggerTypes: triggers.map(t => t.type),
    canBeActivated: triggers.length > 0
  };
}

async function main() {
  console.log('🎯 COMPREHENSIVE WORKFLOW ACTIVATION FOR jimkalinov@gmail.com');
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

    console.log(`✅ User found: ${user.email}`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Created: ${user.created_at}`);
    console.log(`   - Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);

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

    // Step 3: Find user workflows
    console.log('\n🔍 Finding user workflows with flexible matching...');
    const userWorkflows = findUserWorkflows(allWorkflows, user);

    if (userWorkflows.length === 0) {
      console.log('\n❌ No workflows found for this user');
      console.log('\n📋 Available workflows in n8n:');
      allWorkflows.slice(0, 10).forEach((w, i) => {
        console.log(`   ${i+1}. ${w.name} (ID: ${w.id}, Active: ${w.active})`);
      });
      return;
    }

    // Step 4: Analyze workflows
    console.log('\n📋 WORKFLOW ANALYSIS');
    console.log('================================');
    
    const analysisResults = [];
    
    for (const [index, workflow] of userWorkflows.entries()) {
      console.log(`\n${index + 1}. ${workflow.name}`);
      console.log(`   - ID: ${workflow.id}`);
      console.log(`   - Active: ${workflow.active ? '✅ YES' : '❌ NO'}`);
      console.log(`   - Created: ${workflow.createdAt || 'Unknown'}`);
      console.log(`   - Node count: ${workflow.nodes?.length || 0}`);
      
      // Analyze triggers
      const analysis = analyzeWorkflowTriggers(workflow);
      console.log(`   - Trigger analysis:`);
      console.log(`     • Can be activated: ${analysis.canBeActivated ? '✅ YES' : '❌ NO'}`);
      console.log(`     • Active triggers: ${analysis.triggerCount}`);
      console.log(`     • Manual triggers: ${analysis.manualCount}`);
      if (analysis.triggerTypes.length > 0) {
        console.log(`     • Trigger types: ${analysis.triggerTypes.join(', ')}`);
      }
      if (analysis.hasManualOnly) {
        console.log(`     • ⚠️  Has manual trigger only - cannot be activated`);
      }
      
      analysisResults.push({
        workflow,
        analysis
      });
    }

    // Step 5: Activation process
    console.log('\n⚡ ACTIVATION PROCESS');
    console.log('================================');
    
    const activatableWorkflows = analysisResults.filter(r => 
      r.analysis.canBeActivated && !r.workflow.active
    );
    
    const alreadyActive = analysisResults.filter(r => r.workflow.active);
    const nonActivatable = analysisResults.filter(r => !r.analysis.canBeActivated);
    
    console.log(`📊 Workflow Status Summary:`);
    console.log(`   - Total workflows: ${userWorkflows.length}`);
    console.log(`   - Already active: ${alreadyActive.length}`);
    console.log(`   - Can be activated: ${activatableWorkflows.length}`);
    console.log(`   - Cannot be activated: ${nonActivatable.length}`);
    
    if (alreadyActive.length > 0) {
      console.log(`\n✅ Already active workflows:`);
      alreadyActive.forEach(r => {
        console.log(`   • ${r.workflow.name}`);
      });
    }
    
    if (nonActivatable.length > 0) {
      console.log(`\n⚠️  Workflows that cannot be activated (manual triggers only):`);
      nonActivatable.forEach(r => {
        console.log(`   • ${r.workflow.name}`);
        console.log(`     Reason: Only has manual trigger nodes`);
      });
    }

    if (activatableWorkflows.length === 0) {
      console.log('\n🎯 No workflows need activation or can be activated.');
      return;
    }

    // Step 6: Activate eligible workflows
    console.log(`\n🔄 Activating ${activatableWorkflows.length} eligible workflows...`);
    const activationResults = [];

    for (const result of activatableWorkflows) {
      const workflow = result.workflow;
      console.log(`\n🔄 Activating: ${workflow.name}`);
      console.log(`   - Workflow ID: ${workflow.id}`);
      
      try {
        const activationResponse = await makeRequest(`${N8N_API_URL}/workflows/${workflow.id}/activate`, {
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json'
          }
        });

        if (activationResponse.status === 200) {
          console.log(`   ✅ Successfully activated!`);
          activationResults.push({ 
            workflow: workflow.name, 
            id: workflow.id,
            status: 'success' 
          });
        } else {
          console.log(`   ❌ Failed to activate`);
          console.log(`   📋 Error: ${JSON.stringify(activationResponse.data)}`);
          activationResults.push({ 
            workflow: workflow.name, 
            id: workflow.id,
            status: 'failed', 
            error: activationResponse.data 
          });
        }
      } catch (error) {
        console.log(`   ❌ Activation error: ${error.message}`);
        activationResults.push({ 
          workflow: workflow.name, 
          id: workflow.id,
          status: 'failed', 
          error: error.message 
        });
      }

      // Small delay between activations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Final comprehensive summary
    const successful = activationResults.filter(r => r.status === 'success').length;
    const failed = activationResults.filter(r => r.status === 'failed').length;

    console.log('\n================================================================');
    console.log('🏆 COMPREHENSIVE ACTIVATION SUMMARY');
    console.log('================================================================');
    console.log(`👤 User: ${user.email}`);
    console.log(`🆔 User ID: ${user.id}`);
    console.log(`📊 Total workflows found: ${userWorkflows.length}`);
    console.log(`✅ Already active: ${alreadyActive.length}`);
    console.log(`⚡ Successfully activated: ${successful}`);
    console.log(`❌ Failed to activate: ${failed}`);
    console.log(`⚠️  Cannot be activated: ${nonActivatable.length} (manual triggers only)`);
    
    const totalActivated = alreadyActive.length + successful;
    const successRate = userWorkflows.length > 0 ? Math.round((totalActivated / userWorkflows.length) * 100) : 0;
    console.log(`🎯 Overall activation rate: ${successRate}% (${totalActivated}/${userWorkflows.length})`);

    if (successful > 0) {
      console.log('\n✅ Successfully activated workflows:');
      activationResults.filter(r => r.status === 'success').forEach(r => {
        console.log(`   • ${r.workflow} (ID: ${r.id})`);
      });
    }

    if (failed > 0) {
      console.log('\n❌ Failed activations:');
      activationResults.filter(r => r.status === 'failed').forEach(r => {
        console.log(`   • ${r.workflow}: ${JSON.stringify(r.error)}`);
      });
    }

    if (nonActivatable.length > 0) {
      console.log('\n💡 Recommendations for non-activatable workflows:');
      console.log('   • Manual trigger workflows need to be executed manually');
      console.log('   • Consider adding webhook, cron, or interval triggers for automation');
      console.log('   • These workflows can still be executed via API or UI');
    }

    console.log('\n🎉 Workflow activation process completed successfully!');

  } catch (error) {
    console.error('💥 Fatal error during execution:', error);
  }
}

// Execute the script
main().catch(console.error);