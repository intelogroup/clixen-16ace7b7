/**
 * API Operations Client
 * Provides a TypeScript interface for the API Operations Edge Function
 * Integrates with multi-agent system for workflow management
 */

import { supabase } from '../supabase';

export interface N8nWorkflow {
  id?: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  settings?: any;
  staticData?: any;
  tags?: string[];
  meta?: any;
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
  status: 'new' | 'running' | 'success' | 'error' | 'waiting' | 'crashed';
  data?: any;
}

export interface BatchOperation {
  operation: 'create' | 'update' | 'delete' | 'execute' | 'toggle';
  workflowId?: string;
  data?: any;
}

export interface BatchOperationResult {
  operation: string;
  workflowId?: string;
  success: boolean;
  data?: any;
  error?: string;
}

export interface BatchResponse {
  success: boolean;
  results: BatchOperationResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    processing_time: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  user_tier: string;
  timestamp: string;
  error?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded';
  n8n: boolean;
  database: boolean;
  timestamp: string;
}

export class ApiOperationsError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiOperationsError';
  }
}

export class ApiOperationsClient {
  private baseUrl: string;
  private getAuthToken: () => Promise<string | null>;

  constructor() {
    // Auto-detect environment
    const isProduction = window.location.hostname.includes('netlify.app');
    this.baseUrl = isProduction 
      ? `${window.location.origin}/.netlify/functions/api-operations`
      : 'https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/api-operations';
    
    this.getAuthToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    };
  }

  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = await this.getAuthToken();
    
    if (!token) {
      throw new ApiOperationsError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, requestOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new ApiOperationsError(
          data.error || `HTTP ${response.status}`,
          response.status,
          data.code
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiOperationsError) {
        throw error;
      }
      
      // Network or parsing errors
      throw new ApiOperationsError(
        `Request failed: ${error.message}`,
        0,
        'NETWORK_ERROR'
      );
    }
  }

  // Health check
  async getHealth(): Promise<HealthStatus> {
    const response = await fetch(`${this.baseUrl}/health`);
    return await response.json();
  }

  // Workflow operations
  async getWorkflows(): Promise<N8nWorkflow[]> {
    const response = await this.makeRequest<N8nWorkflow[]>('/workflows');
    return response.data;
  }

  async getWorkflow(workflowId: string): Promise<N8nWorkflow> {
    const response = await this.makeRequest<N8nWorkflow>(`/workflows/${workflowId}`);
    return response.data;
  }

  async createWorkflow(workflow: N8nWorkflow): Promise<N8nWorkflow> {
    const response = await this.makeRequest<N8nWorkflow>('/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
    return response.data;
  }

  async updateWorkflow(workflowId: string, updates: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    const response = await this.makeRequest<N8nWorkflow>(`/workflows/${workflowId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data;
  }

  async deleteWorkflow(workflowId: string): Promise<boolean> {
    const response = await this.makeRequest<boolean>(`/workflows/${workflowId}`, {
      method: 'DELETE',
    });
    return response.data;
  }

  async toggleWorkflow(workflowId: string, active: boolean): Promise<N8nWorkflow> {
    const response = await this.makeRequest<N8nWorkflow>(`/workflows/${workflowId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ active }),
    });
    return response.data;
  }

  async executeWorkflow(workflowId: string, data?: any): Promise<any> {
    const response = await this.makeRequest(`/workflows/${workflowId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
    return response.data;
  }

  // Execution operations
  async getExecutions(workflowId?: string, limit = 20): Promise<N8nExecution[]> {
    const params = new URLSearchParams();
    if (workflowId) params.set('workflowId', workflowId);
    if (limit) params.set('limit', limit.toString());
    
    const endpoint = `/executions${params.toString() ? `?${params}` : ''}`;
    const response = await this.makeRequest<N8nExecution[]>(endpoint);
    return response.data;
  }

  // Batch operations
  async executeBatch(operations: BatchOperation[]): Promise<BatchResponse> {
    const response = await this.makeRequest<BatchResponse>('/batch', {
      method: 'POST',
      body: JSON.stringify({ operations }),
    });
    return response.data;
  }

  // Utility methods for multi-agent integration
  async deployWorkflowSafely(workflow: N8nWorkflow): Promise<{
    success: boolean;
    workflowId?: string;
    error?: string;
  }> {
    try {
      // Step 1: Create workflow (inactive)
      const inactiveWorkflow = { ...workflow, active: false };
      const created = await this.createWorkflow(inactiveWorkflow);
      
      // Step 2: Validate workflow structure
      if (!created.id || !created.nodes || created.nodes.length === 0) {
        throw new Error('Created workflow is invalid or empty');
      }
      
      // Step 3: Activate if originally intended to be active
      if (workflow.active) {
        await this.toggleWorkflow(created.id, true);
      }
      
      return {
        success: true,
        workflowId: created.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof ApiOperationsError ? error.message : error.message,
      };
    }
  }

  async validateWorkflowBeforeExecution(workflowId: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    try {
      const workflow = await this.getWorkflow(workflowId);
      const issues: string[] = [];
      
      // Basic validation checks
      if (!workflow.nodes || workflow.nodes.length === 0) {
        issues.push('Workflow has no nodes');
      }
      
      if (!workflow.connections || Object.keys(workflow.connections).length === 0) {
        issues.push('Workflow has no connections between nodes');
      }
      
      // Check for start node
      const hasStartNode = workflow.nodes.some(node => 
        node.type === 'n8n-nodes-base.start' || 
        node.type === 'n8n-nodes-base.webhook' ||
        node.type === 'n8n-nodes-base.cron'
      );
      
      if (!hasStartNode) {
        issues.push('Workflow needs a trigger node (Start, Webhook, or Cron)');
      }
      
      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error) {
      return {
        valid: false,
        issues: [`Failed to validate workflow: ${error.message}`],
      };
    }
  }

  async getWorkflowMetrics(workflowId: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecutionTime?: string;
  }> {
    try {
      const executions = await this.getExecutions(workflowId, 100);
      
      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(e => e.status === 'success').length;
      const failedExecutions = executions.filter(e => e.status === 'error' || e.status === 'crashed').length;
      
      // Calculate average execution time for finished executions
      const finishedExecutions = executions.filter(e => e.finished && e.startedAt && e.stoppedAt);
      const totalTime = finishedExecutions.reduce((sum, exec) => {
        const duration = new Date(exec.stoppedAt!).getTime() - new Date(exec.startedAt).getTime();
        return sum + duration;
      }, 0);
      
      const averageExecutionTime = finishedExecutions.length > 0 
        ? totalTime / finishedExecutions.length 
        : 0;
      
      const lastExecutionTime = executions.length > 0 
        ? executions[0].startedAt 
        : undefined;
      
      return {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        averageExecutionTime,
        lastExecutionTime,
      };
    } catch (error) {
      throw new ApiOperationsError(
        `Failed to get workflow metrics: ${error.message}`,
        500,
        'METRICS_ERROR'
      );
    }
  }

  // Error handling utilities
  isRateLimited(error: any): boolean {
    return error instanceof ApiOperationsError && error.status === 429;
  }

  isAuthenticationError(error: any): boolean {
    return error instanceof ApiOperationsError && error.status === 401;
  }

  isNetworkError(error: any): boolean {
    return error instanceof ApiOperationsError && error.code === 'NETWORK_ERROR';
  }
}

// Singleton instance
export const apiOperationsClient = new ApiOperationsClient();