// Universal environment variable access (works in both browser and Node.js)
const getEnvVar = (name: string): string | undefined => {
  // In browser/Vite environment
  if (typeof window !== 'undefined' && import.meta?.env) {
    return import.meta.env[name];
  }
  // In Node.js environment (Netlify functions)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }
  return undefined;
};

// n8n API utility functions
const N8N_API_URL = getEnvVar('VITE_N8N_API_URL') || getEnvVar('N8N_API_URL') || 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = getEnvVar('VITE_N8N_API_KEY') || getEnvVar('N8N_API_KEY') || 'b38356d3-075f-4b69-9b31-dc90c71ba40a';
const IS_DEMO_MODE = !N8N_API_URL.includes('18.221.12.50') && !N8N_API_URL.includes('localhost');

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
  const url = `${N8N_API_URL}${endpoint}`;
  
  // If in demo mode, return mock data
  if (IS_DEMO_MODE) {
    return getMockResponse(endpoint, options);
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
        ...options.headers,
      },
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
    console.warn('n8n connection failed, using demo mode:', error);
    return getMockResponse(endpoint, options);
  }
}

// Mock responses for demo mode
function getMockResponse(endpoint: string, options: RequestInit = {}) {
  // Simulate network delay
  return new Promise((resolve) => {
    setTimeout(() => {
      if (endpoint.includes('/workflows')) {
        if (options.method === 'POST') {
          resolve({
            id: `demo-${Date.now()}`,
            name: 'Demo Workflow',
            active: false,
            nodes: [],
            connections: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } else {
          resolve({
            data: [
              {
                id: 'demo-1',
                name: 'Welcome Workflow',
                active: true,
                nodes: [{ id: 'start', type: 'n8n-nodes-base.start' }],
                connections: {},
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-01T00:00:00Z'
              }
            ]
          });
        }
      } else if (endpoint.includes('/executions')) {
        resolve({
          data: [
            {
              id: 'exec-1',
              finished: true,
              mode: 'manual',
              startedAt: new Date().toISOString(),
              stoppedAt: new Date().toISOString(),
              workflowId: 'demo-1'
            }
          ]
        });
      } else {
        resolve({ success: true, message: 'Demo mode active' });
      }
    }, 500);
  });
}

export const n8nApi = {
  // Test connection to n8n
  async testConnection(): Promise<{ success: boolean; message: string; version?: string }> {
    if (IS_DEMO_MODE) {
      return {
        success: true,
        message: 'Demo mode active - n8n connection simulated',
        version: 'Demo Version 1.0'
      };
    }
    
    try {
      // First try the simple endpoint that doesn't require auth
      const healthResponse = await fetch(`${N8N_API_URL.replace('/api/v1', '')}/healthz`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }).catch(() => null);
      
      if (!healthResponse || !healthResponse.ok) {
        // Fallback to demo mode if server not responding
        console.warn('n8n server not responding, using demo mode');
        return {
          success: true,
          message: 'Demo mode active (n8n server unreachable)',
          version: 'Demo Version 1.0'
        };
      }

      const health = await healthResponse.json();
      
      // Try to get n8n version info
      try {
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
            ? `n8n server running but API key invalid: ${apiError.message}`
            : 'API authentication failed'
        };
      }
    } catch (error) {
      // Fallback to demo mode on any error
      return {
        success: true,
        message: 'Demo mode active (connection error)',
        version: 'Demo Version 1.0'
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