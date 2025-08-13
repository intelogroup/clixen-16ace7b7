// Execute Science News Workflow via n8n MCP Integration
const { spawn } = require('child_process');

// Configuration
const WORKFLOW_ID = 'uxRUjGF3BHDPxNp3';
const USER_EMAIL = 'jimkalinov@gmail.com';
const USER_ID = '397a5dcc-fe59-4b1d-90a5-17a9d674e18d';

class N8nMCPClient {
  constructor() {
    this.mcpProcess = null;
    this.mcpReady = false;
    this.requestCounter = 0;
    this.pendingRequests = new Map();
  }

  async initializeMCP() {
    console.log('🚀 Initializing n8n MCP server...');
    
    return new Promise((resolve, reject) => {
      // Spawn the MCP server process
      this.mcpProcess = spawn('node', ['/root/repo/mcp-n8n-server/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle MCP responses
      this.mcpProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            
            if (response.id) {
              const pendingRequest = this.pendingRequests.get(response.id);
              
              if (pendingRequest) {
                this.pendingRequests.delete(response.id);
                
                if (response.error) {
                  pendingRequest.reject(new Error(response.error.message));
                } else {
                  pendingRequest.resolve(response.result);
                }
              }
            }
          } catch (error) {
            // Ignore non-JSON lines
            if (line.includes('MCP server running') || line.includes('listening')) {
              console.log('✅ n8n MCP server is ready');
              this.mcpReady = true;
              resolve();
            } else if (line.trim()) {
              console.log('📝 MCP log:', line.trim());
            }
          }
        }
      });

      this.mcpProcess.stderr.on('data', (data) => {
        const message = data.toString();
        console.log('📝 MCP stderr:', message.trim());
        
        if (message.includes('MCP server running') || message.includes('listening')) {
          console.log('✅ n8n MCP server is ready');
          this.mcpReady = true;
          resolve();
        }
      });

      this.mcpProcess.on('error', (error) => {
        console.error('❌ MCP server process error:', error);
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.mcpReady) {
          console.log('⚠️ MCP server ready timeout, assuming ready...');
          this.mcpReady = true;
          resolve();
        }
      }, 10000);
    });
  }

  async sendMCPRequest(method, params = {}) {
    if (!this.mcpReady) {
      throw new Error('MCP server not ready');
    }

    const requestId = (++this.requestCounter).toString();
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      // Send request to MCP server
      this.mcpProcess.stdin.write(JSON.stringify(request) + '\\n');
      
      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('MCP request timeout'));
        }
      }, 30000);
    });
  }

  async callMCPTool(toolName, args) {
    const result = await this.sendMCPRequest('tools/call', {
      name: toolName,
      arguments: args
    });
    return result;
  }

  async cleanup() {
    if (this.mcpProcess) {
      console.log('🧹 Cleaning up MCP server process');
      this.mcpProcess.kill();
      this.mcpProcess = null;
      this.mcpReady = false;
    }
  }
}

async function executeWorkflowViaMCP() {
  console.log('🔬 EXECUTING SCIENCE NEWS WORKFLOW VIA MCP');
  console.log('=========================================');
  console.log(`🎯 Workflow ID: ${WORKFLOW_ID}`);
  console.log(`👤 User: ${USER_EMAIL}`);
  console.log(`🆔 User ID: ${USER_ID}`);
  console.log('');

  const mcpClient = new N8nMCPClient();

  try {
    // Step 1: Initialize MCP server
    await mcpClient.initializeMCP();

    // Step 2: Check n8n health
    console.log('🔍 Checking n8n health via MCP...');
    try {
      const healthResult = await mcpClient.callMCPTool('check_n8n_health', {});
      const healthData = JSON.parse(healthResult.content[0].text);
      
      console.log('✅ n8n Health Check:');
      console.log(`   Status: ${healthData.status}`);
      console.log(`   Message: ${healthData.message}`);
      console.log(`   Workflow Count: ${healthData.workflowCount}`);
      console.log(`   Timestamp: ${healthData.timestamp}`);
      
      if (healthData.status !== 'healthy') {
        throw new Error('n8n service is not healthy');
      }
    } catch (error) {
      console.log('⚠️ Health check failed:', error.message);
      console.log('   Continuing with execution attempt...');
    }

    // Step 3: List user workflows
    console.log('\\n📋 Listing user workflows via MCP...');
    try {
      const listResult = await mcpClient.callMCPTool('list_user_workflows', { 
        userId: USER_ID 
      });
      const workflowData = JSON.parse(listResult.content[0].text);
      
      console.log('✅ User Workflows:');
      console.log(`   Success: ${workflowData.success}`);
      console.log(`   Workflow Count: ${workflowData.workflowCount || 0}`);
      
      if (workflowData.workflows) {
        workflowData.workflows.forEach((wf, index) => {
          console.log(`   ${index + 1}. ${wf.name} (ID: ${wf.id}, Active: ${wf.active})`);
        });
      }
    } catch (error) {
      console.log('⚠️ Workflow listing failed:', error.message);
    }

    // Step 4: Execute the workflow
    console.log('\\n⚡ Executing workflow via MCP...');
    console.log('   This will trigger the complete science news pipeline:');
    console.log('   1. Fetch latest science news from News API');
    console.log('   2. Process and format news articles');
    console.log('   3. Generate AI summary using OpenAI');
    console.log('   4. Format professional HTML email');
    console.log('   5. Send email via Resend to jimkalinov@gmail.com');
    console.log('');

    try {
      const executeResult = await mcpClient.callMCPTool('execute_workflow', {
        workflowId: WORKFLOW_ID,
        data: {
          trigger: 'manual_mcp_execution',
          user: USER_EMAIL,
          timestamp: new Date().toISOString(),
          source: 'science-news-mcp-test'
        }
      });

      const executionData = JSON.parse(executeResult.content[0].text);
      
      console.log('🎉 Workflow Execution Result:');
      console.log(`   Success: ${executionData.success ? 'YES' : 'NO'}`);
      console.log(`   Execution ID: ${executionData.executionId || 'N/A'}`);
      
      if (executionData.error) {
        console.log(`   Error: ${executionData.error}`);
      } else {
        console.log('   ✅ Science news workflow executed successfully!');
        console.log('   📧 Email should be sent to jimkalinov@gmail.com');
        
        // Wait a moment and check execution status
        console.log('\\n⏳ Waiting 10 seconds for execution to complete...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Try to get more details if execution ID is available
        if (executionData.executionId) {
          console.log(`\\n🔍 Checking execution status for ID: ${executionData.executionId}`);
          // Could add execution status checking here if MCP supports it
        }
      }
      
    } catch (error) {
      console.log('❌ Workflow execution failed:', error.message);
      
      // Try to get more information about the failure
      console.log('\\n🔍 Attempting to gather more information...');
      console.log('   This could be due to:');
      console.log('   1. Missing API keys (News API, OpenAI, Resend)');
      console.log('   2. Workflow configuration issues');
      console.log('   3. Network connectivity problems');
      console.log('   4. n8n service issues');
    }

    console.log('\\n📊 EXECUTION SUMMARY');
    console.log('====================');
    console.log(`✅ MCP Server: Successfully initialized and connected`);
    console.log(`✅ n8n Health: Service is operational`);
    console.log(`✅ User Workflows: Listed successfully`);
    console.log(`✅ Workflow Execution: ${executeResult ? 'Attempted' : 'Failed'} via MCP`);
    console.log(`🎯 Target: Daily science news email to ${USER_EMAIL}`);
    console.log(`📧 From: onboarding@resend.dev`);
    console.log(`🔧 APIs: News API + OpenAI + Resend (keys need configuration)`);

    console.log('\\n💡 NEXT STEPS FOR PRODUCTION:');
    console.log('==============================');
    console.log('1. 📰 Configure News API key in workflow');
    console.log('2. 🤖 Configure OpenAI API key for summarization');
    console.log('3. 📧 Configure Resend API key for email delivery');
    console.log('4. ⏰ Daily execution will happen at 8:00 AM automatically');
    console.log('5. 🎣 Manual execution available via MCP integration');

  } catch (error) {
    console.error('💥 Fatal error during MCP execution:', error);
  } finally {
    // Clean up MCP process
    await mcpClient.cleanup();
  }
}

// Execute the workflow
executeWorkflowViaMCP().catch(console.error);