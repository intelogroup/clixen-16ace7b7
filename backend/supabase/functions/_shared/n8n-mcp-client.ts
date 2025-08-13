/**
 * n8n MCP Client Integration for Clixen
 * Provides seamless integration with the custom n8n MCP server
 * Replaces direct REST API calls with enhanced MCP functionality
 */

import { spawn } from 'https://deno.land/std@0.168.0/node/child_process.ts';
import { Buffer } from 'https://deno.land/std@0.168.0/node/buffer.ts';

interface MCPRequest {
  jsonrpc: string;
  id: string;
  method: string;
  params: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

interface MCPToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

/**
 * Enhanced n8n Client with MCP Integration
 * Maintains compatibility with existing EnhancedN8nClient interface
 * while providing superior reliability and user isolation
 */
export class N8nMCPClient {
  private mcpProcess: any = null;
  private mcpReady = false;
  private requestCounter = 0;
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  
  constructor(private enableMCP: boolean = true) {
    if (this.enableMCP) {
      this.initializeMCP();
    }
  }

  /**
   * Initialize MCP server process
   */
  private async initializeMCP(): Promise<void> {
    try {
      console.log('🚀 [MCP] Initializing n8n MCP server...');
      
      // Spawn the MCP server process
      this.mcpProcess = spawn('node', ['/root/repo/mcp-n8n-server/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle MCP responses
      this.mcpProcess.stdout.on('data', (data: any) => {
        const lines = data.toString().split('\n').filter((line: string) => line.trim());
        
        for (const line of lines) {
          try {
            const response: MCPResponse = JSON.parse(line);
            const pendingRequest = this.pendingRequests.get(response.id);
            
            if (pendingRequest) {
              this.pendingRequests.delete(response.id);
              
              if (response.error) {
                pendingRequest.reject(new Error(response.error.message));
              } else {
                pendingRequest.resolve(response.result);
              }
            }
          } catch (error) {
            // Ignore non-JSON lines (like debug output)
            if (!line.includes('MCP server running')) {
              console.log('🔍 [MCP] Non-JSON output:', line);
            }
          }
        }
      });

      this.mcpProcess.stderr.on('data', (data: any) => {
        const message = data.toString();
        if (message.includes('MCP server running')) {
          console.log('✅ [MCP] n8n MCP server is ready');
          this.mcpReady = true;
        } else {
          console.log('📝 [MCP] Server log:', message.trim());
        }
      });

      this.mcpProcess.on('error', (error: any) => {
        console.error('❌ [MCP] Server process error:', error);
        this.mcpReady = false;
      });

      this.mcpProcess.on('exit', (code: number) => {
        console.log(`🔚 [MCP] Server process exited with code ${code}`);
        this.mcpReady = false;
      });

      // Wait for server to be ready
      await this.waitForMCPReady();
      
    } catch (error) {
      console.error('❌ [MCP] Failed to initialize MCP server:', error);
      this.enableMCP = false; // Fall back to REST API
    }
  }

  /**
   * Wait for MCP server to be ready
   */
  private async waitForMCPReady(timeout = 10000): Promise<void> {
    const startTime = Date.now();
    
    while (!this.mcpReady && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!this.mcpReady) {
      throw new Error('MCP server failed to start within timeout');
    }
  }

  /**
   * Send request to MCP server
   */
  private async sendMCPRequest(method: string, params: any = {}): Promise<any> {
    if (!this.enableMCP || !this.mcpReady) {
      throw new Error('MCP server not available');
    }

    const requestId = (++this.requestCounter).toString();
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      // Send request to MCP server
      this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
      
      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('MCP request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Call MCP tool
   */
  private async callMCPTool(toolCall: MCPToolCall): Promise<MCPToolResponse> {
    const result = await this.sendMCPRequest('tools/call', toolCall);
    return result;
  }

  /**
   * Enhanced workflow deployment with MCP
   * Maintains compatibility with existing interface
   */
  async deployWorkflow(
    workflow: any, 
    userIntent?: string, 
    maxRetries: number = 2,
    userId?: string
  ): Promise<{ success: boolean; workflowId?: string; error?: string; webhookUrl?: string }> {
    
    if (this.enableMCP && this.mcpReady) {
      return this.deployWorkflowViaMCP(workflow, userIntent, maxRetries, userId);
    } else {
      console.log('⚠️ [MCP] Falling back to REST API deployment');
      return this.deployWorkflowViaREST(workflow, userIntent, maxRetries);
    }
  }

  /**
   * Deploy workflow via MCP (preferred method)
   */
  private async deployWorkflowViaMCP(
    workflow: any,
    userIntent?: string,
    maxRetries: number = 2,
    userId?: string
  ): Promise<{ success: boolean; workflowId?: string; error?: string; webhookUrl?: string }> {
    
    if (!userId) {
      console.warn('⚠️ [MCP] No userId provided for MCP deployment, user isolation will not be applied');
      userId = 'anonymous-' + Date.now().toString().substring(-8);
    }

    console.log(`🚀 [MCP] Deploying workflow via MCP for user ${userId.substring(0, 8)}***`);

    try {
      const response = await this.callMCPTool({
        name: 'deploy_workflow',
        arguments: {
          userId,
          workflowName: workflow.name || 'Untitled Workflow',
          workflowData: workflow
        }
      });

      const result = JSON.parse(response.content[0].text);
      
      if (result.success) {
        console.log(`✅ [MCP] Workflow deployed successfully: ${result.workflowId}`);
        
        // Generate webhook URL if workflow has webhook trigger
        let webhookUrl = null;
        const webhookNode = workflow.nodes?.find((node: any) => 
          node.type === 'n8n-nodes-base.webhook'
        );
        
        if (webhookNode?.parameters?.path) {
          webhookUrl = `http://18.221.12.50:5678/webhook/${webhookNode.parameters.path}`;
        }
        
        return {
          success: true,
          workflowId: result.workflowId,
          webhookUrl
        };
      } else {
        console.error(`❌ [MCP] Workflow deployment failed: ${result.error}`);
        return {
          success: false,
          error: result.error || 'Unknown MCP deployment error'
        };
      }
    } catch (error) {
      console.error('❌ [MCP] MCP deployment error:', error);
      
      // Fall back to REST API on MCP failure
      console.log('🔄 [MCP] Falling back to REST API due to MCP error');
      return this.deployWorkflowViaREST(workflow, userIntent, maxRetries);
    }
  }

  /**
   * Deploy workflow via REST API (fallback method)
   */
  private async deployWorkflowViaREST(
    workflow: any,
    userIntent?: string,
    maxRetries: number = 2
  ): Promise<{ success: boolean; workflowId?: string; error?: string; webhookUrl?: string }> {
    
    const N8N_API_URL = Deno.env.get('N8N_API_URL') || 'http://18.221.12.50:5678/api/v1';
    const N8N_API_KEY = Deno.env.get('N8N_API_KEY');
    
    if (!N8N_API_KEY) {
      return {
        success: false,
        error: 'N8N_API_KEY not configured'
      };
    }

    console.log('🔧 [REST] Deploying workflow via REST API fallback');

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // Deploy to n8n
        const deployResponse = await fetch(`${N8N_API_URL}/workflows`, {
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(workflow)
        });

        if (!deployResponse.ok) {
          const errorText = await deployResponse.text();
          throw new Error(`n8n API Error ${deployResponse.status}: ${errorText}`);
        }

        const deployment = await deployResponse.json();
        console.log(`✅ [REST] Workflow deployed! ID: ${deployment.id}`);

        // Activate workflow
        const activateResponse = await fetch(`${N8N_API_URL}/workflows/${deployment.id}/activate`, {
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json',
          }
        });

        if (activateResponse.ok) {
          console.log('✅ [REST] Workflow activated');
        }

        // Find webhook URL
        const webhookNode = workflow.nodes?.find((node: any) => 
          node.type === 'n8n-nodes-base.webhook'
        );
        
        let webhookUrl = null;
        if (webhookNode?.parameters?.path) {
          webhookUrl = `http://18.221.12.50:5678/webhook/${webhookNode.parameters.path}`;
        }

        return {
          success: true,
          workflowId: deployment.id,
          webhookUrl
        };

      } catch (error) {
        console.error(`❌ [REST] Deployment attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries + 1) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    }

    return {
      success: false,
      error: 'All deployment attempts failed'
    };
  }

  /**
   * List user workflows via MCP
   */
  async listUserWorkflows(userId: string): Promise<{ success: boolean; workflows?: any[]; error?: string }> {
    if (!this.enableMCP || !this.mcpReady) {
      console.log('⚠️ [MCP] MCP not available, using REST API for listing workflows');
      return this.listWorkflowsViaREST();
    }

    try {
      console.log(`📋 [MCP] Listing workflows for user ${userId.substring(0, 8)}***`);
      
      const response = await this.callMCPTool({
        name: 'list_user_workflows',
        arguments: { userId }
      });

      const result = JSON.parse(response.content[0].text);
      
      if (result.success) {
        console.log(`✅ [MCP] Found ${result.workflowCount} workflows for user`);
        return {
          success: true,
          workflows: result.workflows
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to list workflows'
        };
      }
    } catch (error) {
      console.error('❌ [MCP] Error listing workflows:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List workflows via REST API (fallback)
   */
  private async listWorkflowsViaREST(): Promise<{ success: boolean; workflows?: any[]; error?: string }> {
    const N8N_API_URL = Deno.env.get('N8N_API_URL') || 'http://18.221.12.50:5678/api/v1';
    const N8N_API_KEY = Deno.env.get('N8N_API_KEY');
    
    if (!N8N_API_KEY) {
      return {
        success: false,
        error: 'N8N_API_KEY not configured'
      };
    }

    try {
      const response = await fetch(`${N8N_API_URL}/workflows`, {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`n8n API Error ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        workflows: data.data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute workflow via MCP
   */
  async executeWorkflow(workflowId: string, data: any = {}): Promise<{ success: boolean; executionId?: string; error?: string }> {
    if (!this.enableMCP || !this.mcpReady) {
      console.log('⚠️ [MCP] MCP not available for workflow execution');
      return { success: false, error: 'MCP not available' };
    }

    try {
      const response = await this.callMCPTool({
        name: 'execute_workflow',
        arguments: { workflowId, data }
      });

      const result = JSON.parse(response.content[0].text);
      return {
        success: result.success,
        executionId: result.executionId,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check n8n health via MCP
   */
  async checkHealth(): Promise<{ healthy: boolean; message?: string; workflowCount?: number }> {
    if (!this.enableMCP || !this.mcpReady) {
      return { healthy: false, message: 'MCP not available' };
    }

    try {
      const response = await this.callMCPTool({
        name: 'check_n8n_health',
        arguments: {}
      });

      const result = JSON.parse(response.content[0].text);
      return {
        healthy: result.status === 'healthy',
        message: result.message,
        workflowCount: result.workflowCount
      };
    } catch (error) {
      return {
        healthy: false,
        message: error.message
      };
    }
  }

  /**
   * Delete user workflow via MCP
   */
  async deleteUserWorkflow(userId: string, workflowId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.enableMCP || !this.mcpReady) {
      return { success: false, error: 'MCP not available' };
    }

    try {
      const response = await this.callMCPTool({
        name: 'delete_user_workflow',
        arguments: { userId, workflowId }
      });

      const result = JSON.parse(response.content[0].text);
      return {
        success: result.success,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up MCP resources
   */
  async cleanup(): Promise<void> {
    if (this.mcpProcess) {
      console.log('🧹 [MCP] Cleaning up MCP server process');
      this.mcpProcess.kill();
      this.mcpProcess = null;
      this.mcpReady = false;
    }
  }

  /**
   * Get MCP status
   */
  getMCPStatus(): { enabled: boolean; ready: boolean; processRunning: boolean } {
    return {
      enabled: this.enableMCP,
      ready: this.mcpReady,
      processRunning: this.mcpProcess !== null
    };
  }
}