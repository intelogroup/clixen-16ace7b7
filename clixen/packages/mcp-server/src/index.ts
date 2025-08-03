import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'mcp-server.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Configuration
const N8N_API_URL = process.env.N8N_API_URL || 'http://localhost:5678/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

// n8n API client
class N8nApiClient {
  private headers: Record<string, string>;

  constructor() {
    this.headers = {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
    };
  }

  async getAvailableNodes(): Promise<string[]> {
    try {
      const response = await axios.get(`${N8N_API_URL}/node-types`, {
        headers: this.headers,
      });
      return response.data.data.map((node: any) => node.name);
    } catch (error) {
      logger.error('Failed to fetch available nodes:', error);
      return [];
    }
  }

  async getCredentialTypes(): Promise<string[]> {
    try {
      const response = await axios.get(`${N8N_API_URL}/credential-types`, {
        headers: this.headers,
      });
      return response.data.data.map((cred: any) => cred.name);
    } catch (error) {
      logger.error('Failed to fetch credential types:', error);
      return [];
    }
  }

  async createWorkflow(workflow: any): Promise<{ id: string; success: boolean }> {
    try {
      const response = await axios.post(
        `${N8N_API_URL}/workflows`,
        workflow,
        { headers: this.headers }
      );
      return {
        id: response.data.id,
        success: true,
      };
    } catch (error) {
      logger.error('Failed to create workflow:', error);
      return {
        id: '',
        success: false,
      };
    }
  }

  async activateWorkflow(id: string): Promise<boolean> {
    try {
      await axios.patch(
        `${N8N_API_URL}/workflows/${id}`,
        { active: true },
        { headers: this.headers }
      );
      return true;
    } catch (error) {
      logger.error('Failed to activate workflow:', error);
      return false;
    }
  }

  async testWorkflow(id: string, testData?: any): Promise<any> {
    try {
      const response = await axios.post(
        `${N8N_API_URL}/workflows/${id}/execute`,
        { workflowData: testData },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to test workflow:', error);
      return null;
    }
  }
}

// MCP Server implementation
class ClixenMCPServer {
  private server: Server;
  private n8nClient: N8nApiClient;

  constructor() {
    this.server = new Server(
      {
        name: 'clixen-n8n-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.n8nClient = new N8nApiClient();
    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'validate-nodes',
          description: 'Validate if requested n8n nodes are available',
          inputSchema: {
            type: 'object',
            properties: {
              nodes: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of n8n node types to validate',
              },
            },
            required: ['nodes'],
          },
        },
        {
          name: 'validate-credentials',
          description: 'Validate if requested credential types are available',
          inputSchema: {
            type: 'object',
            properties: {
              credentials: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of credential types to validate',
              },
            },
            required: ['credentials'],
          },
        },
        {
          name: 'enhanced-feasibility-check',
          description: 'Check if a workflow intent is feasible with available nodes and credentials',
          inputSchema: {
            type: 'object',
            properties: {
              intent: {
                type: 'string',
                description: 'Natural language description of the workflow',
              },
              requiredNodes: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of required node types',
              },
              requiredCredentials: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of required credential types',
                optional: true,
              },
            },
            required: ['intent', 'requiredNodes'],
          },
        },
        {
          name: 'deploy-workflow',
          description: 'Deploy a workflow to n8n',
          inputSchema: {
            type: 'object',
            properties: {
              workflow: {
                type: 'object',
                description: 'n8n workflow JSON',
              },
              activate: {
                type: 'boolean',
                description: 'Whether to activate the workflow immediately',
                default: true,
              },
            },
            required: ['workflow'],
          },
        },
        {
          name: 'test-workflow',
          description: 'Test a deployed workflow with sample data',
          inputSchema: {
            type: 'object',
            properties: {
              workflowId: {
                type: 'string',
                description: 'ID of the workflow to test',
              },
              testData: {
                type: 'object',
                description: 'Test data to send to the workflow',
                optional: true,
              },
            },
            required: ['workflowId'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (!args) {
        throw new Error('Tool arguments are required');
      }

      switch (name) {
        case 'validate-nodes': {
          const availableNodes = await this.n8nClient.getAvailableNodes();
          const requestedNodes = (args.nodes as string[]) || [];
          const missingNodes = requestedNodes.filter(
            (node) => !availableNodes.includes(node)
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  valid: missingNodes.length === 0,
                  availableNodes: availableNodes.filter((node) =>
                    requestedNodes.includes(node)
                  ),
                  missingNodes,
                  totalAvailable: availableNodes.length,
                }),
              },
            ],
          };
        }

        case 'validate-credentials': {
          const availableCredentials = await this.n8nClient.getCredentialTypes();
          const requestedCredentials = (args.credentials as string[]) || [];
          const missingCredentials = requestedCredentials.filter(
            (cred) => !availableCredentials.includes(cred)
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  valid: missingCredentials.length === 0,
                  availableCredentials: availableCredentials.filter((cred) =>
                    requestedCredentials.includes(cred)
                  ),
                  missingCredentials,
                }),
              },
            ],
          };
        }

        case 'enhanced-feasibility-check': {
          const intent = (args.intent as string) || '';
          const requiredNodes = (args.requiredNodes as string[]) || [];
          const requiredCredentials = (args.requiredCredentials as string[]) || [];

          const availableNodes = await this.n8nClient.getAvailableNodes();
          const availableCredentials = await this.n8nClient.getCredentialTypes();

          const missingNodes = requiredNodes.filter(
            (node) => !availableNodes.includes(node)
          );
          const missingCredentials = requiredCredentials.filter(
            (cred) => !availableCredentials.includes(cred)
          );

          const feasible = missingNodes.length === 0 && missingCredentials.length === 0;

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  feasible,
                  intent,
                  nodeCheck: {
                    required: requiredNodes,
                    missing: missingNodes,
                    available: requiredNodes.filter((node) =>
                      availableNodes.includes(node)
                    ),
                  },
                  credentialCheck: {
                    required: requiredCredentials,
                    missing: missingCredentials,
                    available: requiredCredentials.filter((cred) =>
                      availableCredentials.includes(cred)
                    ),
                  },
                  recommendation: feasible
                    ? 'Workflow is feasible with current setup'
                    : `Missing components: ${[...missingNodes, ...missingCredentials].join(', ')}`,
                }),
              },
            ],
          };
        }

        case 'deploy-workflow': {
          const workflow = args.workflow;
          const activate = (args.activate as boolean) !== false;

          const result = await this.n8nClient.createWorkflow(workflow);

          if (result.success && activate) {
            await this.n8nClient.activateWorkflow(result.id);
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: result.success,
                  workflowId: result.id,
                  activated: activate && result.success,
                }),
              },
            ],
          };
        }

        case 'test-workflow': {
          const workflowId = (args.workflowId as string) || '';
          const testData = args.testData || {};

          const result = await this.n8nClient.testWorkflow(workflowId, testData);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: result !== null,
                  executionId: result?.id,
                  status: result?.status,
                  data: result?.data,
                }),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Clixen MCP Server started successfully');
  }
}

// Start the server
const server = new ClixenMCPServer();
server.start().catch((error) => {
  logger.error('Failed to start MCP server:', error);
  process.exit(1);
});