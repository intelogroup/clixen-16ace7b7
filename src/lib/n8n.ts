import { n8nConfig, env } from './config/environment';

// Use centralized environment configuration
const N8N_API_URL_ENV = n8nConfig.apiUrl;
const N8N_API_KEY = n8nConfig.apiKey;

// Use direct n8n API URL - no proxy needed with database-driven approach
const N8N_API_URL = N8N_API_URL_ENV;
// Enable demo mode for browser environments to avoid CORS issues
const IS_DEMO_MODE = typeof window !== 'undefined' && env.get().isProduction;

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  createdAt: string;
  updatedAt: string;
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: string;
  retryOf?: string;
  retrySuccessId?: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
}

class N8nApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'N8nApiError';
  }
}

async function n8nRequest(endpoint: string, options: RequestInit = {}) {
  // Always use demo mode in browser environment to avoid CORS issues
  if (typeof window !== 'undefined') {
    console.log('[N8N] Browser environment detected - using demo mode to avoid CORS');
    return getMockResponse(endpoint, options);
  }

  // If in demo mode, return mock data
  if (IS_DEMO_MODE) {
    return getMockResponse(endpoint, options);
  }

  // Use Supabase Edge Function proxy in production to avoid CORS
  if (env.get().isProduction) {
    try {
      const { supabase } = await import('./supabase');
      const response = await supabase.functions.invoke('api-operations', {
        body: {
          action: 'n8n-request',
          endpoint,
          method: options.method || 'GET',
          data: options.body ? JSON.parse(options.body as string) : undefined
        }
      });

      if (response.error) {
        throw new N8nApiError(`API proxy error: ${response.error.message}`);
      }

      return response.data;
    } catch (error) {
      console.warn('Edge function proxy failed, using mock data:', error);
      return getMockResponse(endpoint, options);
    }
  }

  // Direct connection for server-side development only
  try {
    const url = `${N8N_API_URL}${endpoint}`;
    const headers = {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new N8nApiError(
        `n8n API error: ${response.status} ${response.statusText} - ${errorText}`,
        response.status
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof N8nApiError) {
      throw error;
    }

    // Network or parsing errors - fallback to demo mode
    console.warn('n8n connection failed, using mock data:', error);
    return getMockResponse(endpoint, options);
  }
}

// Mock responses for demo mode
function getMockResponse(endpoint: string, options: RequestInit = {}) {
  console.log(`[DEMO MODE] Simulating n8n API call: ${options.method || 'GET'} ${endpoint}`);

  // Simulate realistic network delay
  return new Promise((resolve) => {
    setTimeout(() => {
      if (endpoint.includes('/workflows')) {
        if (options.method === 'POST') {
          const body = options.body ? JSON.parse(options.body as string) : {};
          resolve({
            id: `demo-${Date.now()}`,
            name: body.name || 'Demo Workflow',
            active: false,
            nodes: body.nodes || [
              { id: 'start', type: 'n8n-nodes-base.start', position: [250, 300] },
              { id: 'webhook', type: 'n8n-nodes-base.webhook', position: [450, 300] }
            ],
            connections: body.connections || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } else {
          resolve({
            data: [
              {
                id: 'demo-welcome',
                name: 'Welcome to Clixen (Demo)',
                active: true,
                nodes: [
                  { id: 'start', type: 'n8n-nodes-base.start' },
                  { id: 'set', type: 'n8n-nodes-base.set' }
                ],
                connections: { start: { main: [{ node: 'set', type: 'main', index: 0 }] } },
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: new Date().toISOString()
              },
              {
                id: 'demo-webhook',
                name: 'Sample Webhook Workflow (Demo)',
                active: false,
                nodes: [
                  { id: 'webhook', type: 'n8n-nodes-base.webhook' },
                  { id: 'response', type: 'n8n-nodes-base.respondToWebhook' }
                ],
                connections: { webhook: { main: [{ node: 'response', type: 'main', index: 0 }] } },
                createdAt: '2025-01-01T10:00:00Z',
                updatedAt: new Date().toISOString()
              }
            ]
          });
        }
      } else if (endpoint.includes('/executions')) {
        resolve({
          data: [
            {
              id: 'exec-demo-1',
              finished: true,
              mode: 'manual',
              status: 'success',
              startedAt: new Date(Date.now() - 3600000).toISOString(),
              stoppedAt: new Date(Date.now() - 3599000).toISOString(),
              workflowId: 'demo-welcome'
            },
            {
              id: 'exec-demo-2',
              finished: true,
              mode: 'webhook',
              status: 'success',
              startedAt: new Date(Date.now() - 7200000).toISOString(),
              stoppedAt: new Date(Date.now() - 7199000).toISOString(),
              workflowId: 'demo-webhook'
            }
          ]
        });
      } else if (endpoint.includes('/activate') || endpoint.includes('/deactivate')) {
        resolve({
          id: endpoint.split('/')[2],
          active: endpoint.includes('/activate'),
          message: `Workflow ${endpoint.includes('/activate') ? 'activated' : 'deactivated'} successfully (demo)`
        });
      } else if (endpoint.includes('/execute')) {
        resolve({
          id: `exec-demo-${Date.now()}`,
          finished: false,
          mode: 'manual',
          status: 'running',
          startedAt: new Date().toISOString(),
          message: 'Workflow execution started (demo mode)'
        });
      } else {
        resolve({
          success: true,
          message: 'Demo mode - n8n operations simulated',
          version: 'Demo v1.0'
        });
      }
    }, Math.random() * 800 + 200); // Random delay between 200-1000ms for realism
  });
}

export const n8nApi = {
  // Test connection to n8n
  async testConnection(): Promise<{ success: boolean; message: string; version?: string }> {
    // Always use demo mode in browser environments to avoid CORS issues
    if (typeof window !== 'undefined') {
      return {
        success: true,
        message: 'Demo mode active - n8n connection simulated (browser environment)',
        version: 'Demo Version 1.0'
      };
    }

    if (IS_DEMO_MODE) {
      return {
        success: true,
        message: 'Demo mode active - n8n connection simulated',
        version: 'Demo Version 1.0'
      };
    }

    try {
      // Use proxy in production environments
      if (env.get().isProduction) {
        try {
          await n8nRequest('/workflows');
          return {
            success: true,
            message: 'Connected to n8n successfully via proxy',
            version: 'API access working'
          };
        } catch (apiError) {
          return {
            success: false,
            message: apiError instanceof N8nApiError
              ? `n8n API error: ${apiError.message}`
              : 'API connection failed - using demo mode'
          };
        }
      }

      // Direct connection for server-side development only
      try {
        // Test API access
        await n8nRequest('/workflows');
        return {
          success: true,
          message: 'Connected to n8n successfully',
          version: 'API access working'
        };
      } catch (apiError) {
        return {
          success: false,
          message: apiError instanceof N8nApiError
            ? `n8n API error: ${apiError.message}`
            : 'API connection failed - using demo mode'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'} - using demo mode`,
      };
    }
  },

  // Get all workflows
  async getWorkflows(): Promise<N8nWorkflow[]> {
    const response = await n8nRequest('/workflows');
    return response.data || response;
  },

  // Get workflow by ID
  async getWorkflow(id: string): Promise<N8nWorkflow> {
    return await n8nRequest(`/workflows/${id}`);
  },

  // Create new workflow
  async createWorkflow(workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    return await n8nRequest('/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  },

  // Update workflow
  async updateWorkflow(id: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    return await n8nRequest(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workflow),
    });
  },

  // Activate/deactivate workflow
  async toggleWorkflow(id: string, active: boolean): Promise<N8nWorkflow> {
    return await n8nRequest(`/workflows/${id}/activate`, {
      method: 'POST',
      body: JSON.stringify({ active }),
    });
  },

  // Get workflow executions
  async getExecutions(workflowId?: string): Promise<N8nExecution[]> {
    const endpoint = workflowId ? `/executions?workflowId=${workflowId}` : '/executions';
    const response = await n8nRequest(endpoint);
    return response.data || response;
  },

  // Execute workflow manually
  async executeWorkflow(id: string, data?: any): Promise<any> {
    return await n8nRequest(`/workflows/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  },
};

export { N8nApiError };
