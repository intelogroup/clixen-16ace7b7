/**
 * Test Workflow Generation and n8n Integration
 * This script tests our AI agents against the real n8n engine
 */

const { WorkflowDesignerAgent } = require('./dist/lib/agents/WorkflowDesignerAgent.js');

async function testWorkflowGeneration() {
  console.log('🤖 Testing AI Workflow Generation against n8n Engine...\n');

  // Sample requirements for testing
  const testRequirements = [
    {
      type: 'trigger',
      description: 'Create a webhook that accepts POST requests with user data',
      priority: 'high'
    },
    {
      type: 'validation',
      description: 'Validate incoming user email and phone number',
      priority: 'high'
    },
    {
      type: 'transformation',
      description: 'Transform user data into standard format',
      priority: 'medium'
    },
    {
      type: 'storage',
      description: 'Store processed data in Supabase database',
      priority: 'high'
    },
    {
      type: 'notification',
      description: 'Send confirmation email to user',
      priority: 'medium'
    }
  ];

  try {
    // Initialize agent context (mock)
    const context = {
      conversationId: 'test-conversation',
      userId: 'test-user',
      session: { memories: [] },
      n8nApi: null, // Would be real API client in production
      supabaseClient: null, // Would be real Supabase client
      currentWorkflow: null,
      agentStates: new Map(),
      eventEmitter: {
        emit: (event, data) => console.log(`📡 Event: ${event}`, data),
        on: () => {},
        removeListener: () => {}
      }
    };

    // Create WorkflowDesignerAgent
    const agent = new WorkflowDesignerAgent(context);

    console.log('✅ Agent initialized successfully');
    console.log('🎯 Capabilities:', agent.getCapabilities());

    // Test workflow design
    console.log('\n🔧 Designing workflow...');
    const workflowSpec = await agent.designWorkflow(testRequirements);

    console.log('\n📋 Generated Workflow Specification:');
    console.log('Name:', workflowSpec.name);
    console.log('Nodes:', workflowSpec.nodes.length);
    console.log('Has Connections:', Object.keys(workflowSpec.connections || {}).length > 0);

    // Display the complete workflow JSON
    console.log('\n📄 Complete n8n Workflow JSON:');
    console.log('```json');
    console.log(JSON.stringify(workflowSpec, null, 2));
    console.log('```');

    // Test validation
    console.log('\n🔍 Validating workflow design...');
    const validation = await agent.validateDesign(workflowSpec);

    console.log('Validation Results:');
    console.log('✅ Valid:', validation.isValid);
    console.log('❌ Errors:', validation.errors.length);
    console.log('⚠️  Warnings:', validation.warnings.length);
    console.log('💡 Suggestions:', validation.suggestions.length);

    if (validation.errors.length > 0) {
      console.log('\nErrors:');
      validation.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (validation.warnings.length > 0) {
      console.log('\nWarnings:');
      validation.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (validation.suggestions.length > 0) {
      console.log('\nSuggestions:');
      validation.suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
    }

    console.log('\n🎉 Test completed successfully!');
    return workflowSpec;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Function to test n8n deployment
async function testN8nDeployment(workflowSpec) {
  console.log('\n🚀 Testing n8n API Deployment...');
  
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';
  const n8nUrl = 'http://18.221.12.50:5678/api/v1';

  const fetch = require('node-fetch');

  try {
    // Test n8n connection first
    console.log('🔗 Testing n8n API connection...');
    const healthResponse = await fetch(`${n8nUrl}/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!healthResponse.ok) {
      throw new Error(`n8n API not accessible: ${healthResponse.status} ${healthResponse.statusText}`);
    }

    console.log('✅ n8n API connection successful');

    // Attempt to create workflow
    console.log('📤 Deploying workflow to n8n...');
    
    const deployResponse = await fetch(`${n8nUrl}/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflowSpec)
    });

    const deployResult = await deployResponse.text();
    
    if (deployResponse.ok) {
      console.log('✅ Workflow deployed successfully!');
      console.log('Response:', JSON.parse(deployResult));
    } else {
      console.log('❌ Deployment failed:');
      console.log('Status:', deployResponse.status, deployResponse.statusText);
      console.log('Response:', deployResult);
      
      // Try to parse and analyze error
      try {
        const errorData = JSON.parse(deployResult);
        console.log('Error details:', errorData);
        return { success: false, error: errorData };
      } catch (parseError) {
        console.log('Raw error response:', deployResult);
        return { success: false, error: deployResult };
      }
    }

  } catch (error) {
    console.error('❌ n8n deployment test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run tests if called directly
if (require.main === module) {
  testWorkflowGeneration()
    .then(workflowSpec => testN8nDeployment(workflowSpec))
    .then(result => {
      console.log('\n🎯 Final Result:', result?.success ? 'SUCCESS' : 'FAILED');
      process.exit(result?.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Critical test failure:', error);
      process.exit(1);
    });
}

module.exports = { testWorkflowGeneration, testN8nDeployment };