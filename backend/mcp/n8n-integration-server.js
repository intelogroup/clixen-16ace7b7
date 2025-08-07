#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const N8N_API_URL = process.env.N8N_API_URL || 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

// n8n Node Types Registry - Updated with latest n8n node types
const N8N_NODE_REGISTRY = {
  // Core trigger nodes
  'n8n-nodes-base.webhook': {
    category: 'trigger',
    displayName: 'Webhook',
    description: 'Receive HTTP requests and trigger workflows',
    icon: 'webhook',
    properties: ['path', 'httpMethod', 'responseMode', 'options']
  },
  'n8n-nodes-base.cron': {
    category: 'trigger',
    displayName: 'Schedule',
    description: 'Trigger workflows on a schedule',
    icon: 'clock',
    properties: ['rule', 'timezone']
  },
  'n8n-nodes-base.manualTrigger': {
    category: 'trigger',
    displayName: 'Manual Trigger',
    description: 'Manually trigger workflow execution',
    icon: 'play',
    properties: []
  },

  // Core utility nodes
  'n8n-nodes-base.set': {
    category: 'utility',
    displayName: 'Set',
    description: 'Set node properties and data',
    icon: 'cog',
    properties: ['values', 'options']
  },
  'n8n-nodes-base.if': {
    category: 'utility',
    displayName: 'IF',
    description: 'Conditional logic branching',
    icon: 'split',
    properties: ['conditions', 'combineOperation']
  },
  'n8n-nodes-base.switch': {
    category: 'utility',
    displayName: 'Switch',
    description: 'Route data based on multiple conditions',
    icon: 'split',
    properties: ['mode', 'rules', 'options']
  },
  'n8n-nodes-base.function': {
    category: 'utility',
    displayName: 'Function',
    description: 'Execute custom JavaScript code',
    icon: 'code',
    properties: ['functionCode']
  },
  'n8n-nodes-base.functionItem': {
    category: 'utility',
    displayName: 'Function Item',
    description: 'Execute JavaScript on each item',
    icon: 'code',
    properties: ['functionCode']
  },

  // HTTP and API nodes
  'n8n-nodes-base.httpRequest': {
    category: 'network',
    displayName: 'HTTP Request',
    description: 'Make HTTP requests to external APIs',
    icon: 'globe',
    properties: ['url', 'requestMethod', 'headers', 'body', 'options']
  },
  'n8n-nodes-base.respondToWebhook': {
    category: 'network',
    displayName: 'Respond to Webhook',
    description: 'Send response back to webhook caller',
    icon: 'webhook',
    properties: ['respondWith', 'responseBody', 'options']
  },

  // Communication nodes
  'n8n-nodes-base.slack': {
    category: 'communication',
    displayName: 'Slack',
    description: 'Send messages and interact with Slack',
    icon: 'slack',
    properties: ['authentication', 'resource', 'operation']
  },
  'n8n-nodes-base.gmail': {
    category: 'communication',
    displayName: 'Gmail',
    description: 'Send and manage Gmail emails',
    icon: 'gmail',
    properties: ['authentication', 'resource', 'operation']
  },
  'n8n-nodes-base.microsoftOutlook': {
    category: 'communication',
    displayName: 'Microsoft Outlook',
    description: 'Send and manage Outlook emails',
    icon: 'microsoft',
    properties: ['authentication', 'resource', 'operation']
  },

  // Productivity nodes
  'n8n-nodes-base.googleSheets': {
    category: 'productivity',
    displayName: 'Google Sheets',
    description: 'Read and write Google Sheets data',
    icon: 'googleSheets',
    properties: ['authentication', 'resource', 'operation']
  },
  'n8n-nodes-base.notion': {
    category: 'productivity',
    displayName: 'Notion',
    description: 'Interact with Notion databases and pages',
    icon: 'notion',
    properties: ['authentication', 'resource', 'operation']
  },
  'n8n-nodes-base.airtable': {
    category: 'productivity',
    displayName: 'Airtable',
    description: 'Read and write Airtable data',
    icon: 'airtable',
    properties: ['authentication', 'resource', 'operation']
  },

  // Database nodes
  'n8n-nodes-base.postgres': {
    category: 'database',
    displayName: 'Postgres',
    description: 'Execute PostgreSQL queries',
    icon: 'postgres',
    properties: ['credentials', 'operation', 'query']
  },
  'n8n-nodes-base.mysql': {
    category: 'database',
    displayName: 'MySQL',
    description: 'Execute MySQL queries',
    icon: 'mysql',
    properties: ['credentials', 'operation', 'query']
  },
  'n8n-nodes-base.supabase': {
    category: 'database',
    displayName: 'Supabase',
    description: 'Interact with Supabase database',
    icon: 'supabase',
    properties: ['authentication', 'resource', 'operation']
  }
};

// Workflow validation utilities
class WorkflowValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];
  }

  reset() {
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];
  }

  validateWorkflow(workflow) {
    this.reset();

    // Basic structure validation
    this.validateBasicStructure(workflow);
    
    // Node validation
    this.validateNodes(workflow.nodes || []);
    
    // Connection validation
    this.validateConnections(workflow.nodes || [], workflow.connections || {});
    
    // Workflow logic validation
    this.validateWorkflowLogic(workflow);

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      suggestions: this.suggestions
    };
  }

  validateBasicStructure(workflow) {
    if (!workflow.name || typeof workflow.name !== 'string') {
      this.errors.push('Workflow name is required and must be a string');
    }

    if (workflow.name && workflow.name.length > 255) {
      this.errors.push('Workflow name cannot exceed 255 characters');
    }

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      this.errors.push('Workflow must have a nodes array');
      return;
    }

    if (workflow.nodes.length === 0) {
      this.errors.push('Workflow must have at least one node');
    }

    if (workflow.nodes.length > 50) {
      this.warnings.push('Large workflow detected. Consider breaking into smaller workflows for better maintainability');
    }
  }

  validateNodes(nodes) {
    const nodeIds = new Set();
    let hasTrigger = false;

    for (const node of nodes) {
      // Check required fields
      if (!node.id) {
        this.errors.push(`Node missing ID: ${node.name || 'unknown'}`);
        continue;
      }

      if (!node.name) {
        this.errors.push(`Node missing name: ${node.id}`);
      }

      if (!node.type) {
        this.errors.push(`Node missing type: ${node.name || node.id}`);
        continue;
      }

      // Check for duplicate IDs
      if (nodeIds.has(node.id)) {
        this.errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);

      // Validate node type
      const nodeInfo = N8N_NODE_REGISTRY[node.type];
      if (!nodeInfo) {
        this.warnings.push(`Unknown or uncommon node type: ${node.type} in node ${node.name}`);
      }

      // Check for trigger nodes
      if (nodeInfo && nodeInfo.category === 'trigger') {
        hasTrigger = true;
      }

      // Validate position
      if (!node.position || !Array.isArray(node.position) || node.position.length !== 2) {
        this.warnings.push(`Node ${node.name} has invalid position coordinates`);
      }

      // Type-specific validation
      this.validateNodeParameters(node, nodeInfo);
    }

    if (!hasTrigger) {
      this.warnings.push('Workflow should have at least one trigger node to execute automatically');
    }
  }

  validateNodeParameters(node, nodeInfo) {
    if (!node.parameters) {
      this.warnings.push(`Node ${node.name} has no parameters configured`);
      return;
    }

    // Type-specific parameter validation
    switch (node.type) {
      case 'n8n-nodes-base.httpRequest':
        if (!node.parameters.url) {
          this.errors.push(`HTTP Request node ${node.name} missing URL parameter`);
        } else {
          try {
            new URL(node.parameters.url);
          } catch {
            this.errors.push(`HTTP Request node ${node.name} has invalid URL format`);
          }
        }
        break;

      case 'n8n-nodes-base.webhook':
        if (!node.parameters.path) {
          this.suggestions.push(`Webhook node ${node.name} should specify a path parameter`);
        }
        break;

      case 'n8n-nodes-base.function':
      case 'n8n-nodes-base.functionItem':
        if (!node.parameters.functionCode) {
          this.errors.push(`Function node ${node.name} missing JavaScript code`);
        } else {
          // Basic JavaScript syntax check
          try {
            new Function(node.parameters.functionCode);
          } catch (error) {
            this.errors.push(`Function node ${node.name} has invalid JavaScript syntax: ${error.message}`);
          }
        }
        break;

      case 'n8n-nodes-base.cron':
        if (!node.parameters.rule) {
          this.errors.push(`Schedule node ${node.name} missing cron rule`);
        }
        break;
    }
  }

  validateConnections(nodes, connections) {
    const nodeIds = new Set(nodes.map(node => node.id));

    for (const [sourceNodeId, connection] of Object.entries(connections)) {
      if (!nodeIds.has(sourceNodeId)) {
        this.errors.push(`Connection from unknown node: ${sourceNodeId}`);
        continue;
      }

      if (connection.main && Array.isArray(connection.main)) {
        for (const outputConnections of connection.main) {
          if (Array.isArray(outputConnections)) {
            for (const targetConnection of outputConnections) {
              if (!nodeIds.has(targetConnection.node)) {
                this.errors.push(`Connection to unknown node: ${targetConnection.node} from ${sourceNodeId}`);
              }
            }
          }
        }
      }
    }
  }

  validateWorkflowLogic(workflow) {
    const nodes = workflow.nodes || [];
    const connections = workflow.connections || {};

    // Check for unreachable nodes
    const reachableNodes = this.findReachableNodes(nodes, connections);
    const unreachableNodes = nodes.filter(node => !reachableNodes.has(node.id));
    
    if (unreachableNodes.length > 0) {
      this.warnings.push(`Unreachable nodes found: ${unreachableNodes.map(n => n.name).join(', ')}`);
    }

    // Check for circular dependencies
    if (this.hasCircularDependencies(nodes, connections)) {
      this.errors.push('Circular dependencies detected in workflow');
    }

    // Performance suggestions
    if (nodes.length > 20) {
      this.suggestions.push('Consider breaking large workflows into smaller, reusable workflows');
    }

    const httpNodes = nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest');
    if (httpNodes.length > 10) {
      this.suggestions.push('High number of HTTP requests detected. Consider batching or caching strategies');
    }
  }

  findReachableNodes(nodes, connections) {
    const reachable = new Set();
    const triggerNodes = nodes.filter(node => {
      const nodeInfo = N8N_NODE_REGISTRY[node.type];
      return nodeInfo && nodeInfo.category === 'trigger';
    });

    // BFS from trigger nodes
    const queue = triggerNodes.map(node => node.id);
    
    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (reachable.has(nodeId)) continue;
      
      reachable.add(nodeId);
      
      const connection = connections[nodeId];
      if (connection && connection.main) {
        for (const outputConnections of connection.main) {
          if (Array.isArray(outputConnections)) {
            for (const target of outputConnections) {
              if (!reachable.has(target.node)) {
                queue.push(target.node);
              }
            }
          }
        }
      }
    }

    return reachable;
  }

  hasCircularDependencies(nodes, connections) {
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (nodeId) => {
      if (recursionStack.has(nodeId)) return true; // Cycle detected
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const connection = connections[nodeId];
      if (connection && connection.main) {
        for (const outputConnections of connection.main) {
          if (Array.isArray(outputConnections)) {
            for (const target of outputConnections) {
              if (dfs(target.node)) return true;
            }
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  }
}

// n8n API Client
class N8nApiClient {
  constructor() {
    this.apiUrl = N8N_API_URL;
    this.apiKey = N8N_API_KEY;
    this.validator = new WorkflowValidator();
  }

  async makeRequest(endpoint, method = 'GET', body = null) {
    const url = `${this.apiUrl}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        let parsedError;
        try {
          parsedError = JSON.parse(errorText);
        } catch {
          parsedError = { message: errorText };
        }
        
        throw new Error(`n8n API Error ${response.status}: ${parsedError.message || errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error(`n8n API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.makeRequest('/workflows?limit=1');
      return { success: true, message: 'n8n connection successful' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getNodeTypes() {
    try {
      const nodeTypes = await this.makeRequest('/node-types');
      return { success: true, nodeTypes };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async validateWorkflow(workflow) {
    const validation = this.validator.validateWorkflow(workflow);
    
    return {
      success: validation.valid,
      validation,
      timestamp: new Date().toISOString()
    };
  }

  async deployWorkflow(workflow, activate = false) {
    try {
      // First validate the workflow
      const validation = await this.validateWorkflow(workflow);
      
      if (!validation.success) {
        return {
          success: false,
          error: 'Workflow validation failed',
          validation: validation.validation
        };
      }

      // Deploy to n8n
      const deploymentPayload = {
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections || {},
        active: activate,
        settings: workflow.settings || {},
        staticData: workflow.staticData || {}
      };

      const response = await this.makeRequest('/workflows', 'POST', deploymentPayload);

      return {
        success: true,
        workflowId: response.id.toString(),
        n8nResponse: response,
        validation: validation.validation
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getExecutions(workflowId, limit = 10) {
    try {
      const endpoint = workflowId 
        ? `/executions?workflowId=${workflowId}&limit=${limit}`
        : `/executions?limit=${limit}`;
      
      const response = await this.makeRequest(endpoint);
      
      return {
        success: true,
        executions: response.data || response,
        count: response.count || (response.data ? response.data.length : 0)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async activateWorkflow(workflowId) {
    try {
      const response = await this.makeRequest(`/workflows/${workflowId}/activate`, 'POST');
      return {
        success: true,
        active: response.active,
        workflowId: response.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deactivateWorkflow(workflowId) {
    try {
      const response = await this.makeRequest(`/workflows/${workflowId}/deactivate`, 'POST');
      return {
        success: true,
        active: response.active,
        workflowId: response.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteWorkflow(workflowId) {
    try {
      await this.makeRequest(`/workflows/${workflowId}`, 'DELETE');
      return {
        success: true,
        workflowId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getWorkflowHealth() {
    try {
      // Check n8n service health
      const healthUrl = this.apiUrl.replace('/api/v1', '/healthz');
      const response = await fetch(healthUrl, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      return {
        success: response.ok,
        status: response.status,
        healthy: response.ok,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// MCP Server implementation
class N8nIntegrationMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'n8n-integration',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.n8nClient = new N8nApiClient();
    this.supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'test-n8n-connection',
          description: 'Test connection to n8n instance and verify API access',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'get-node-types',
          description: 'Get available n8n node types and their metadata',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'Filter by node category (trigger, utility, network, etc.)',
                optional: true
              }
            },
            required: [],
          },
        },
        {
          name: 'validate-workflow',
          description: 'Comprehensive workflow validation with detailed feedback',
          inputSchema: {
            type: 'object',
            properties: {
              workflow: {
                type: 'object',
                description: 'Complete n8n workflow JSON object to validate'
              }
            },
            required: ['workflow'],
          },
        },
        {
          name: 'deploy-workflow',
          description: 'Deploy workflow to n8n instance with validation',
          inputSchema: {
            type: 'object',
            properties: {
              workflow: {
                type: 'object',
                description: 'Complete n8n workflow JSON object'
              },
              activate: {
                type: 'boolean',
                description: 'Whether to activate workflow after deployment',
                default: false
              },
              userId: {
                type: 'string',
                description: 'User ID for database tracking'
              }
            },
            required: ['workflow'],
          },
        },
        {
          name: 'get-workflow-executions',
          description: 'Get execution history for workflows',
          inputSchema: {
            type: 'object',
            properties: {
              workflowId: {
                type: 'string',
                description: 'n8n workflow ID to get executions for',
                optional: true
              },
              limit: {
                type: 'number',
                description: 'Maximum number of executions to retrieve',
                default: 10
              }
            },
            required: [],
          },
        },
        {
          name: 'manage-workflow',
          description: 'Activate, deactivate, or delete workflows',
          inputSchema: {
            type: 'object',
            properties: {
              workflowId: {
                type: 'string',
                description: 'n8n workflow ID'
              },
              action: {
                type: 'string',
                description: 'Action to perform',
                enum: ['activate', 'deactivate', 'delete']
              }
            },
            required: ['workflowId', 'action'],
          },
        },
        {
          name: 'get-n8n-health',
          description: 'Check n8n service health and connectivity',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'store-workflow',
          description: 'Store workflow in Supabase database with metadata',
          inputSchema: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'User ID'
              },
              projectId: {
                type: 'string',
                description: 'Project ID'
              },
              workflow: {
                type: 'object',
                description: 'Workflow data'
              },
              originalPrompt: {
                type: 'string',
                description: 'Original user prompt that generated this workflow'
              }
            },
            required: ['userId', 'projectId', 'workflow', 'originalPrompt'],
          },
        }
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'test-n8n-connection':
            return await this.handleTestConnection();
          
          case 'get-node-types':
            return await this.handleGetNodeTypes(args.category);
          
          case 'validate-workflow':
            return await this.handleValidateWorkflow(args.workflow);
          
          case 'deploy-workflow':
            return await this.handleDeployWorkflow(args.workflow, args.activate, args.userId);
          
          case 'get-workflow-executions':
            return await this.handleGetExecutions(args.workflowId, args.limit);
          
          case 'manage-workflow':
            return await this.handleManageWorkflow(args.workflowId, args.action);
          
          case 'get-n8n-health':
            return await this.handleGetHealth();
          
          case 'store-workflow':
            return await this.handleStoreWorkflow(args.userId, args.projectId, args.workflow, args.originalPrompt);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    });
  }

  async handleTestConnection() {
    const result = await this.n8nClient.testConnection();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ...result,
            apiUrl: N8N_API_URL,
            timestamp: new Date().toISOString()
          }, null, 2)
        }
      ]
    };
  }

  async handleGetNodeTypes(category) {
    let nodeTypes = { ...N8N_NODE_REGISTRY };
    
    if (category) {
      nodeTypes = Object.fromEntries(
        Object.entries(nodeTypes).filter(([_, info]) => info.category === category)
      );
    }

    // Try to get live node types from n8n if possible
    const liveResult = await this.n8nClient.getNodeTypes();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            registry: nodeTypes,
            liveData: liveResult.success ? liveResult.nodeTypes : null,
            filteredBy: category || 'none',
            count: Object.keys(nodeTypes).length
          }, null, 2)
        }
      ]
    };
  }

  async handleValidateWorkflow(workflow) {
    const result = await this.n8nClient.validateWorkflow(workflow);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  async handleDeployWorkflow(workflow, activate = false, userId) {
    const result = await this.n8nClient.deployWorkflow(workflow, activate);
    
    // Store deployment record in database if successful
    if (result.success && userId) {
      try {
        await this.supabaseClient
          .from('deployments')
          .insert({
            user_id: userId,
            n8n_workflow_id: result.workflowId,
            deployment_version: 1,
            status: 'deployed',
            n8n_response: result.n8nResponse,
            completed_at: new Date().toISOString()
          });
      } catch (dbError) {
        console.error('Failed to store deployment record:', dbError);
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  async handleGetExecutions(workflowId, limit = 10) {
    const result = await this.n8nClient.getExecutions(workflowId, limit);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  async handleManageWorkflow(workflowId, action) {
    let result;
    
    switch (action) {
      case 'activate':
        result = await this.n8nClient.activateWorkflow(workflowId);
        break;
      case 'deactivate':
        result = await this.n8nClient.deactivateWorkflow(workflowId);
        break;
      case 'delete':
        result = await this.n8nClient.deleteWorkflow(workflowId);
        break;
      default:
        throw new Error(`Invalid action: ${action}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  async handleGetHealth() {
    const result = await this.n8nClient.getWorkflowHealth();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  async handleStoreWorkflow(userId, projectId, workflow, originalPrompt) {
    try {
      const { data, error } = await this.supabaseClient
        .from('mvp_workflows')
        .insert({
          user_id: userId,
          project_id: projectId,
          name: workflow.name,
          description: workflow.description || 'Generated workflow',
          n8n_workflow_json: workflow,
          original_prompt: originalPrompt,
          status: 'validated'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              workflowId: data.id,
              message: 'Workflow stored successfully'
            }, null, 2)
          }
        ]
      };

    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('n8n Integration MCP Server started successfully');
  }
}

// Start the server
const server = new N8nIntegrationMCPServer();
server.start().catch((error) => {
  console.error('Failed to start n8n Integration MCP server:', error);
  process.exit(1);
});