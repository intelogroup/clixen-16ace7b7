// n8n API utility functions
const N8N_API_URL = import.meta.env.VITE_N8N_API_URL || 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = import.meta.env.VITE_N8N_API_KEY || 'b38356d3-075f-4b69-9b31-dc90c71ba40a';

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
    
    // Network or parsing errors
    throw new N8nApiError(
      `Failed to connect to n8n: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export const n8nApi = {
  // Test connection to n8n
  async testConnection(): Promise<{ success: boolean; message: string; version?: string }> {
    try {
      // First try the simple endpoint that doesn't require auth
      const healthResponse = await fetch(`${N8N_API_URL.replace('/api/v1', '')}/healthz`);
      
      if (!healthResponse.ok) {
        return {
          success: false,
          message: `n8n server not responding (${healthResponse.status})`
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
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
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