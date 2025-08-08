#!/usr/bin/env node

/**
 * Test MCP Integration Only
 */

import { spawn } from 'child_process';
import fs from 'fs';

// Set environment variables for MCP
process.env.SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

console.log('🔌 Testing MCP Integration with n8n...');

const testWorkflow = {
  name: "MCP Test Math Calculator " + Date.now(),
  nodes: [
    {
      id: "webhook-node",
      name: "Webhook",
      type: "n8n-nodes-base.webhook",
      position: [200, 300],
      parameters: {
        path: "mcp-math",
        httpMethod: "POST"
      }
    },
    {
      id: "function-node",
      name: "Math Function",
      type: "n8n-nodes-base.function",
      position: [500, 300],
      parameters: {
        functionCode: `
const { a, b, operation } = $input.first().json;
let result;
switch(operation) {
  case 'add': result = a + b; break;
  case 'subtract': result = a - b; break;
  case 'multiply': result = a * b; break;
  case 'divide': result = b !== 0 ? a / b : 'Error: Division by zero'; break;
  default: result = 'Error: Invalid operation';
}
return [{
  json: {
    input: { a, b, operation },
    result,
    timestamp: new Date().toISOString(),
    message: \`\${a} \${operation} \${b} = \${result}\`
  }
}];`
      }
    },
    {
      id: "response-node",
      name: "Send Response",
      type: "n8n-nodes-base.respondToWebhook",
      position: [800, 300],
      parameters: {
        respondWith: "json",
        responseBody: "={{ $json }}"
      }
    }
  ],
  connections: {
    "Webhook": {
      main: [[{ node: "Math Function", type: "main", index: 0 }]]
    },
    "Math Function": {
      main: [[{ node: "Send Response", type: "main", index: 0 }]]
    }
  },
  settings: {},
  staticData: {}
};

function testMCPTools() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting MCP server...');
    
    const mcpProcess = spawn('node', ['./backend/mcp/n8n-integration-server.js'], {
      stdio: 'pipe',
      env: process.env
    });

    let output = '';
    let serverStarted = false;

    const sendMCPCommand = (command) => {
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: command
      };
      
      console.log(`📤 Sending MCP command: ${command.name}`);
      mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    };

    mcpProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      console.log(`📡 MCP: ${chunk.trim()}`);
      
      if (chunk.includes('started successfully') && !serverStarted) {
        serverStarted = true;
        
        // Test sequence
        setTimeout(() => {
          console.log('\n1️⃣ Testing connection...');
          sendMCPCommand({ name: 'test-n8n-connection', arguments: {} });
        }, 1000);
        
        setTimeout(() => {
          console.log('\n2️⃣ Testing workflow validation...');
          sendMCPCommand({ name: 'validate-workflow', arguments: { workflow: testWorkflow } });
        }, 3000);
        
        setTimeout(() => {
          console.log('\n3️⃣ Testing workflow deployment...');
          sendMCPCommand({ 
            name: 'deploy-workflow', 
            arguments: { 
              workflow: testWorkflow, 
              activate: true,
              userId: 'test-user-123'
            } 
          });
        }, 5000);
        
        setTimeout(() => {
          console.log('\n4️⃣ Getting health status...');
          sendMCPCommand({ name: 'get-n8n-health', arguments: {} });
        }, 7000);
        
        // End test after 10 seconds
        setTimeout(() => {
          mcpProcess.kill();
          resolve({
            success: true,
            output: output.trim(),
            serverStarted: true
          });
        }, 10000);
      }
    });

    mcpProcess.stderr.on('data', (data) => {
      console.error(`🚨 MCP Error: ${data.toString().trim()}`);
    });

    mcpProcess.on('error', (error) => {
      console.error('❌ MCP process error:', error.message);
      reject({
        success: false,
        error: error.message
      });
    });

    mcpProcess.on('close', (code) => {
      console.log(`🔚 MCP process closed with code ${code}`);
      if (!serverStarted) {
        reject({
          success: false,
          error: `MCP server failed to start (exit code: ${code})`
        });
      }
    });

    // Timeout fallback
    setTimeout(() => {
      if (!serverStarted) {
        mcpProcess.kill();
        reject({
          success: false,
          error: 'MCP server start timeout'
        });
      }
    }, 15000);
  });
}

async function runTest() {
  try {
    const result = await testMCPTools();
    
    console.log('\n✅ MCP Test Results:');
    console.log('====================');
    console.log(`Success: ${result.success}`);
    console.log(`Server Started: ${result.serverStarted}`);
    
    // Save results
    fs.writeFileSync('./mcp-test-results.json', JSON.stringify(result, null, 2));
    console.log('💾 Results saved to mcp-test-results.json');
    
    return result;
    
  } catch (error) {
    console.error('\n❌ MCP Test Failed:');
    console.error('===================');
    console.error(error);
    
    fs.writeFileSync('./mcp-test-results.json', JSON.stringify(error, null, 2));
    
    return error;
  }
}

runTest().then(() => {
  console.log('\n🏁 MCP test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});