#!/usr/bin/env node

/**
 * Custom n8n MCP Server for Clixen
 * Provides enhanced n8n workflow management with user isolation and retry logic
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

class N8nMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'clixen-n8n-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.n8nConfig = {
      baseUrl: process.env.N8N_API_URL || 'http://18.221.12.50:5678/api/v1',
      apiKey: process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU',
      retryAttempts: 3,
      retryDelay: 1000,
    };

    this.setupToolHandlers();
  }

  async makeN8nRequest(method, endpoint, data = null, retries = 0) {
    try {
      const config = {
        method,
        url: `${this.n8nConfig.baseUrl}${endpoint}`,
        headers: {
          'X-N8N-API-KEY': this.n8nConfig.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      const isRetryable = error.code === 'ECONNREFUSED' || 
                         error.code === 'ETIMEDOUT' || 
                         (error.response && error.response.status >= 500);

      if (isRetryable && retries < this.n8nConfig.retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, this.n8nConfig.retryDelay * Math.pow(2, retries)));
        return this.makeN8nRequest(method, endpoint, data, retries + 1);
      }

      return {
        success: false,
        error: {
          code: error.code || 'UNKNOWN',
          message: error.message,
          status: error.response?.status,
          retries,
        }
      };
    }
  }

  generateUserPrefix(userId) {
    return `[USR-${userId}]`;
  }

  generateSecureWebhookPath(userId) {
    const userHash = Buffer.from(userId).toString('base64').substring(0, 8);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `webhook/${userHash}/${timestamp}/${random}`;
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'deploy_workflow',
          description: 'Deploy a workflow to n8n with user isolation and retry logic',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string', description: 'User ID for isolation' },
              workflowName: { type: 'string', description: 'Name of the workflow' },
              workflowData: { type: 'object', description: 'n8n workflow JSON data' }
            },
            required: ['userId', 'workflowName', 'workflowData']
          }
        },
        {
          name: 'list_user_workflows',
          description: 'List workflows for a specific user with user isolation',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string', description: 'User ID to filter workflows' }
            },
            required: ['userId']
          }
        },
        {
          name: 'execute_workflow',
          description: 'Execute a workflow with enhanced error handling',
          inputSchema: {
            type: 'object',
            properties: {
              workflowId: { type: 'string', description: 'ID of the workflow to execute' },
              data: { type: 'object', description: 'Input data for the workflow' }
            },
            required: ['workflowId']
          }
        },
        {
          name: 'check_n8n_health',
          description: 'Check n8n service health with detailed diagnostics',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'delete_user_workflow',
          description: 'Delete a workflow with user verification',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string', description: 'User ID for verification' },
              workflowId: { type: 'string', description: 'ID of the workflow to delete' }
            },
            required: ['userId', 'workflowId']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'check_n8n_health':
          return this.checkN8nHealth();
        
        case 'deploy_workflow':
          return this.deployWorkflow(request.params.arguments);
        
        case 'list_user_workflows':
          return this.listUserWorkflows(request.params.arguments);
        
        case 'execute_workflow':
          return this.executeWorkflow(request.params.arguments);
        
        case 'delete_user_workflow':
          return this.deleteUserWorkflow(request.params.arguments);
        
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
      }
    });
  }

  async checkN8nHealth() {
    const healthCheck = await this.makeN8nRequest('GET', '/workflows');
    
    if (healthCheck.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'healthy',
              message: 'n8n service is responding',
              workflowCount: healthCheck.data.data?.length || 0,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'unhealthy',
              error: healthCheck.error,
              message: 'n8n service is not responding properly',
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      };
    }
  }

  async deployWorkflow({ userId, workflowName, workflowData }) {
    const userPrefix = this.generateUserPrefix(userId);
    const prefixedName = `${userPrefix} ${workflowName}`;
    
    // Add user prefix to workflow name and ensure required fields
    const workflowWithPrefix = {
      name: prefixedName,
      nodes: workflowData.nodes || [],
      connections: workflowData.connections || {},
      settings: workflowData.settings || {},
      // Add user metadata comment in name or use available fields
      ...(workflowData.active !== undefined && { active: workflowData.active })
    };

    const result = await this.makeN8nRequest('POST', '/workflows', workflowWithPrefix);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            workflowId: result.success ? result.data.data.id : null,
            workflowName: prefixedName,
            userId,
            error: result.success ? null : result.error,
            timestamp: new Date().toISOString()
          }, null, 2)
        }
      ]
    };
  }

  async listUserWorkflows({ userId }) {
    const userPrefix = this.generateUserPrefix(userId);
    const result = await this.makeN8nRequest('GET', '/workflows');
    
    if (result.success) {
      const userWorkflows = result.data.data.filter(workflow => 
        workflow.name.startsWith(userPrefix)
      );
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              userId,
              workflowCount: userWorkflows.length,
              workflows: userWorkflows.map(wf => ({
                id: wf.id,
                name: wf.name.replace(userPrefix + ' ', ''), // Remove prefix for display
                active: wf.active,
                createdAt: wf.createdAt,
                updatedAt: wf.updatedAt
              }))
            }, null, 2)
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: result.error,
              userId
            }, null, 2)
          }
        ]
      };
    }
  }

  async executeWorkflow({ workflowId, data = {} }) {
    const result = await this.makeN8nRequest('POST', `/workflows/${workflowId}/execute`, data);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            workflowId,
            executionId: result.success ? result.data.data?.executionId : null,
            error: result.success ? null : result.error,
            timestamp: new Date().toISOString()
          }, null, 2)
        }
      ]
    };
  }

  async deleteUserWorkflow({ userId, workflowId }) {
    // First, verify the workflow belongs to the user
    const workflow = await this.makeN8nRequest('GET', `/workflows/${workflowId}`);
    
    if (!workflow.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'Workflow not found',
              workflowId,
              userId
            }, null, 2)
          }
        ]
      };
    }

    const userPrefix = this.generateUserPrefix(userId);
    if (!workflow.data.data.name.startsWith(userPrefix)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'Access denied: Workflow does not belong to user',
              workflowId,
              userId
            }, null, 2)
          }
        ]
      };
    }

    const result = await this.makeN8nRequest('DELETE', `/workflows/${workflowId}`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            workflowId,
            userId,
            error: result.success ? null : result.error,
            timestamp: new Date().toISOString()
          }, null, 2)
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Clixen n8n MCP server running on stdio');
  }
}

const server = new N8nMCPServer();
server.run().catch(console.error);