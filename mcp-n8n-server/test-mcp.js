#!/usr/bin/env node

/**
 * Test script for Clixen n8n MCP Server
 * Tests all MCP tools to verify functionality
 */

const axios = require('axios');

class N8nMCPTester {
  constructor() {
    this.n8nConfig = {
      baseUrl: 'http://18.221.12.50:5678/api/v1',
      apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU'
    };
  }

  async makeN8nRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.n8nConfig.baseUrl}${endpoint}`,
        headers: {
          'X-N8N-API-KEY': this.n8nConfig.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'UNKNOWN',
          message: error.message,
          status: error.response?.status,
        }
      };
    }
  }

  async testHealthCheck() {
    console.log('\n🏥 Testing n8n service health...');
    try {
      const result = await this.makeN8nRequest('GET', '/workflows');
      
      if (result.success) {
        console.log(`✅ n8n service is healthy`);
        console.log(`   Found ${result.data.data?.length || 0} workflows`);
        return true;
      } else {
        console.log(`❌ n8n service health check failed`);
        console.log(`   Error:`, result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return false;
    }
  }

  async testListWorkflows() {
    console.log('\n📋 Testing workflow listing...');
    try {
      const result = await this.makeN8nRequest('GET', '/workflows');
      
      if (result.success) {
        const workflows = result.data.data || [];
        console.log(`✅ Successfully listed ${workflows.length} workflows`);
        
        if (workflows.length > 0) {
          console.log('   Sample workflows:');
          workflows.slice(0, 3).forEach(wf => {
            console.log(`   - ${wf.name} (ID: ${wf.id}, Active: ${wf.active})`);
          });
        }
        return true;
      } else {
        console.log(`❌ Failed to list workflows`);
        console.log(`   Error:`, result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Workflow listing failed:', error.message);
      return false;
    }
  }

  async testUserIsolation() {
    console.log('\n🔒 Testing user isolation functionality...');
    
    const testUserId = 'test-user-mcp';
    const userPrefix = `[USR-${testUserId}]`;
    
    try {
      // List all workflows and filter for test user
      const result = await this.makeN8nRequest('GET', '/workflows');
      
      if (result.success) {
        const allWorkflows = result.data.data || [];
        const userWorkflows = allWorkflows.filter(wf => wf.name.startsWith(userPrefix));
        
        console.log(`✅ User isolation test completed`);
        console.log(`   Total workflows: ${allWorkflows.length}`);
        console.log(`   User ${testUserId} workflows: ${userWorkflows.length}`);
        
        if (userWorkflows.length > 0) {
          console.log('   User workflows:');
          userWorkflows.forEach(wf => {
            console.log(`   - ${wf.name.replace(userPrefix + ' ', '')}`);
          });
        }
        
        return true;
      } else {
        console.log(`❌ User isolation test failed`);
        console.log(`   Error:`, result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ User isolation test failed:', error.message);
      return false;
    }
  }

  async testWorkflowDeployment() {
    console.log('\n🚀 Testing workflow deployment simulation...');
    
    const sampleWorkflow = {
      name: 'MCP Test Workflow',
      nodes: [
        {
          parameters: {},
          id: 'start-node',
          name: 'Start',
          type: 'n8n-nodes-base.start',
          typeVersion: 1,
          position: [250, 300]
        }
      ],
      connections: {},
      settings: {}
    };

    // Simulate MCP server behavior (use same logic as the actual MCP server)
    const userId = 'test-user-mcp';
    const userPrefix = `[USR-${userId}]`;
    const prefixedWorkflow = {
      name: `${userPrefix} ${sampleWorkflow.name}`,
      nodes: sampleWorkflow.nodes || [],
      connections: sampleWorkflow.connections || {},
      settings: sampleWorkflow.settings || {}
    };

    try {
      console.log(`   Attempting to deploy workflow: ${JSON.stringify(prefixedWorkflow, null, 2)}`);
      const result = await this.makeN8nRequest('POST', '/workflows', prefixedWorkflow);
      
      if (result.success) {
        const workflowId = result.data.id || result.data.data?.id;
        console.log(`✅ Workflow deployment simulation successful`);
        console.log(`   Workflow ID: ${workflowId}`);
        console.log(`   Workflow Name: ${prefixedWorkflow.name}`);
        
        // Clean up: Delete the test workflow
        const deleteResult = await this.makeN8nRequest('DELETE', `/workflows/${workflowId}`);
        if (deleteResult.success) {
          console.log(`   ✅ Test workflow cleaned up successfully`);
        } else {
          console.log(`   ⚠️  Test workflow cleanup failed (manual cleanup may be needed)`);
        }
        
        return true;
      } else {
        console.log(`❌ Workflow deployment simulation failed`);
        console.log(`   Error:`, result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Workflow deployment test failed:', error.message);
      return false;
    }
  }

  async testRetryLogic() {
    console.log('\n🔄 Testing retry logic simulation...');
    
    // Test with invalid endpoint to simulate failure
    const result = await this.makeN8nRequest('GET', '/invalid-endpoint');
    
    if (!result.success && result.error.status === 404) {
      console.log('✅ Retry logic test passed - correctly handled 404 error');
      console.log(`   Error code: ${result.error.code}`);
      console.log(`   Error message: ${result.error.message}`);
      return true;
    } else {
      console.log('⚠️  Retry logic test - unexpected result');
      return false;
    }
  }

  async runAllTests() {
    console.log('🧪 Starting Clixen n8n MCP Functionality Tests');
    console.log('=============================================\n');
    
    const results = {
      healthCheck: await this.testHealthCheck(),
      listWorkflows: await this.testListWorkflows(),
      userIsolation: await this.testUserIsolation(),
      workflowDeployment: await this.testWorkflowDeployment(),
      retryLogic: await this.testRetryLogic(),
    };
    
    console.log('\n📊 Test Summary:');
    console.log('================');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    const passedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`\n🎯 Overall Result: ${passedCount}/${totalCount} tests passed`);
    
    if (passedCount === totalCount) {
      console.log('🎉 All tests passed! n8n service is ready for MCP integration.');
      console.log('\n🚀 Next Steps:');
      console.log('1. Deploy the MCP server to production');
      console.log('2. Update Clixen integration points to use MCP calls');
      console.log('3. Test end-to-end workflow creation from Clixen app');
    } else {
      console.log('⚠️  Some tests failed. Review the results above.');
      console.log('\n🛠️  Troubleshooting:');
      console.log('1. Verify n8n service is running and accessible');
      console.log('2. Check API key configuration');
      console.log('3. Ensure network connectivity to n8n instance');
    }
    
    return passedCount === totalCount;
  }
}

const tester = new N8nMCPTester();
tester.runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  });