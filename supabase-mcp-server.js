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
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

// Supabase API client
class SupabaseApiClient {
  constructor() {
    this.anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  async testConnection() {
    try {
      const { data: user, error } = await this.anonClient.auth.getUser();
      return { success: !error, error: error?.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async listUsers() {
    try {
      const { data, error } = await this.serviceClient.auth.admin.listUsers();
      if (error) throw error;
      return { success: true, users: data.users, count: data.users.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createUser(email, password, userData = {}) {
    try {
      const { data, error } = await this.serviceClient.auth.admin.createUser({
        email,
        password,
        user_metadata: userData,
        email_confirm: true
      });
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteUser(userId) {
    try {
      const { error } = await this.serviceClient.auth.admin.deleteUser(userId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signInUser(email, password) {
    try {
      const { data, error } = await this.anonClient.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return { success: true, user: data.user, session: data.session };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      const { error } = await this.anonClient.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getDatabaseHealth() {
    try {
      // Try to execute a simple query to test database connectivity
      const { data, error } = await this.serviceClient
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(1);
      
      return { 
        success: !error, 
        error: error?.message,
        connectionWorking: true
      };
    } catch (error) {
      return { success: false, error: error.message, connectionWorking: false };
    }
  }
}

// MCP Server implementation
class SupabaseMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'supabase-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.supabaseClient = new SupabaseApiClient();
    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'test-connection',
          description: 'Test Supabase connection and authentication',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'list-users',
          description: 'List all users in the Supabase authentication system',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'create-user',
          description: 'Create a new user in Supabase',
          inputSchema: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
                description: 'User email address',
              },
              password: {
                type: 'string',
                description: 'User password',
              },
              userData: {
                type: 'object',
                description: 'Additional user metadata',
                optional: true,
              },
            },
            required: ['email', 'password'],
          },
        },
        {
          name: 'delete-user',
          description: 'Delete a user from Supabase',
          inputSchema: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'User ID to delete',
              },
            },
            required: ['userId'],
          },
        },
        {
          name: 'sign-in-user',
          description: 'Sign in a user with email and password',
          inputSchema: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
                description: 'User email address',
              },
              password: {
                type: 'string',
                description: 'User password',
              },
            },
            required: ['email', 'password'],
          },
        },
        {
          name: 'sign-out',
          description: 'Sign out the current user',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'database-health',
          description: 'Check database connectivity and health',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (!args) {
        args = {};
      }

      switch (name) {
        case 'test-connection': {
          const result = await this.supabaseClient.testConnection();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  ...result,
                  url: SUPABASE_URL,
                  timestamp: new Date().toISOString(),
                }),
              },
            ],
          };
        }

        case 'list-users': {
          const result = await this.supabaseClient.listUsers();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result),
              },
            ],
          };
        }

        case 'create-user': {
          const email = args.email || '';
          const password = args.password || '';
          const userData = args.userData || {};
          
          const result = await this.supabaseClient.createUser(email, password, userData);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result),
              },
            ],
          };
        }

        case 'delete-user': {
          const userId = args.userId || '';
          const result = await this.supabaseClient.deleteUser(userId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result),
              },
            ],
          };
        }

        case 'sign-in-user': {
          const email = args.email || '';
          const password = args.password || '';
          
          const result = await this.supabaseClient.signInUser(email, password);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: result.success,
                  error: result.error,
                  hasUser: !!result.user,
                  hasSession: !!result.session,
                }),
              },
            ],
          };
        }

        case 'sign-out': {
          const result = await this.supabaseClient.signOut();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result),
              },
            ],
          };
        }

        case 'database-health': {
          const result = await this.supabaseClient.getDatabaseHealth();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result),
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
    console.log('Supabase MCP Server started successfully');
  }
}

// Start the server
const server = new SupabaseMCPServer();
server.start().catch((error) => {
  console.error('Failed to start Supabase MCP server:', error);
  process.exit(1);
});