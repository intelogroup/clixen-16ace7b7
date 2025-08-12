/**
 * Shared n8n API Client
 * Centralized n8n API operations and configuration
 */

// N8n API configuration
const N8N_API_URL = Deno.env.get('N8N_API_URL') || 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = Deno.env.get('N8N_API_KEY');

if (!N8N_API_KEY) {
  throw new Error('N8N_API_KEY environment variable is required');
}

export const n8nConfig = {
  apiUrl: N8N_API_URL,
  apiKey: N8N_API_KEY,
  baseUrl: N8N_API_URL.replace('/api/v1', ''),
} as const;

/**
 * Make n8n API request with standard error handling
 */
export async function makeN8nRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  const url = `${N8N_API_URL}${endpoint}`;
  
  const requestOptions: RequestInit = {
    method,
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
    },
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n API Error ${response.status}: ${errorText}`);
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

/**
 * Get workflow details from n8n
 */
export async function getN8nWorkflow(workflowId: string): Promise<any> {
  return await makeN8nRequest(`/workflows/${workflowId}`);
}

/**
 * Create workflow in n8n
 */
export async function createN8nWorkflow(workflowData: any): Promise<any> {
  return await makeN8nRequest('/workflows', 'POST', workflowData);
}

/**
 * Activate/deactivate workflow in n8n
 */
export async function setN8nWorkflowStatus(workflowId: string, active: boolean): Promise<any> {
  const endpoint = active ? `/workflows/${workflowId}/activate` : `/workflows/${workflowId}/deactivate`;
  return await makeN8nRequest(endpoint, 'POST');
}

/**
 * Get workflow executions from n8n
 */
export async function getN8nExecutions(workflowId: string, limit = 10): Promise<any> {
  return await makeN8nRequest(`/executions?workflowId=${workflowId}&limit=${limit}`);
}

/**
 * Delete workflow from n8n
 */
export async function deleteN8nWorkflow(workflowId: string): Promise<void> {
  await makeN8nRequest(`/workflows/${workflowId}`, 'DELETE');
}

/**
 * Test n8n connectivity
 */
export async function testN8nConnection(): Promise<{
  healthy: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    await makeN8nRequest('/workflows?limit=1');
    
    return {
      healthy: true,
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown n8n error'
    };
  }
}

/**
 * Extract webhook URLs from n8n workflow nodes
 */
export function extractWebhookUrls(workflowJson: any): string[] {
  const webhookUrls: string[] = [];
  
  if (!workflowJson.nodes || !Array.isArray(workflowJson.nodes)) {
    return webhookUrls;
  }
  
  workflowJson.nodes.forEach((node: any) => {
    if (node.type === 'n8n-nodes-base.webhook' && node.parameters?.path) {
      const path = node.parameters.path.startsWith('/') 
        ? node.parameters.path 
        : `/${node.parameters.path}`;
      webhookUrls.push(`${n8nConfig.baseUrl}/webhook${path}`);
    }
  });
  
  return webhookUrls;
}

/**
 * Generate workflow health score based on recent executions
 */
export async function calculateWorkflowHealth(workflowId: string): Promise<{
  healthScore: number;
  issues: string[];
}> {
  try {
    const executions = await getN8nExecutions(workflowId, 10);
    
    if (!executions.data || executions.data.length === 0) {
      return {
        healthScore: 100, // No executions yet
        issues: []
      };
    }
    
    const recentExecutions = executions.data;
    const successfulExecutions = recentExecutions.filter((exec: any) => exec.status === 'success');
    const failedExecutions = recentExecutions.filter((exec: any) => 
      exec.status === 'error' || exec.status === 'failed'
    );
    
    const healthScore = Math.round((successfulExecutions.length / recentExecutions.length) * 100);
    const issues = failedExecutions.map((exec: any) => 
      `Execution failed: ${exec.error || 'Unknown error'}`
    );
    
    return {
      healthScore,
      issues
    };
  } catch (error) {
    return {
      healthScore: 0,
      issues: [`Could not fetch execution data: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}