/**
 * Langflow Client
 * Handles all communication with Langflow API and flow management
 */

import { 
  LangflowFlow, 
  LangflowConfig, 
  LangflowAPIResponse,
  LangflowFlowResponse,
  LangflowExecutionResponse,
  LangflowError,
  WorkflowExecution,
  LangflowEvent
} from './types';
import { env } from '../config/environment';

export class LangflowClient {
  private static instance: LangflowClient;
  private config: LangflowConfig;
  private eventListeners: Map<string, ((event: LangflowEvent) => void)[]> = new Map();
  private eventSource: EventSource | null = null;

  private constructor(config?: Partial<LangflowConfig>) {
    this.config = {
      apiUrl: config?.apiUrl || 'http://localhost:7860/api/v1',
      apiKey: config?.apiKey,
      timeout: config?.timeout || 30000,
      retryAttempts: config?.retryAttempts || 3,
      batchSize: config?.batchSize || 10,
      ...config
    };
    
    this.initializeEventStream();
  }

  public static getInstance(config?: Partial<LangflowConfig>): LangflowClient {
    if (!LangflowClient.instance) {
      LangflowClient.instance = new LangflowClient(config);
    }
    return LangflowClient.instance;
  }

  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      defaultHeaders['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    let lastError: Error;
    
    // Retry logic
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        
        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new LangflowError(
            errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
            `HTTP_${response.status}`,
            errorData
          );
        }

        const data = await response.json();
        return data;
        
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof LangflowError) {
          throw error;
        }
        
        if (attempt === this.config.retryAttempts) {
          break;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new LangflowError(
      `Request failed after ${this.config.retryAttempts + 1} attempts: ${lastError.message}`,
      'REQUEST_FAILED',
      { originalError: lastError }
    );
  }

  // Flow Management
  public async createFlow(flow: Omit<LangflowFlow, 'id'>): Promise<LangflowFlow> {
    try {
      const response: LangflowFlowResponse = await this.makeRequest('/flows', {
        method: 'POST',
        body: JSON.stringify(flow),
      });
      
      return response.detail;
    } catch (error) {
      throw new LangflowError(
        `Failed to create flow: ${error.message}`,
        'FLOW_CREATE_FAILED',
        { flow, originalError: error }
      );
    }
  }

  public async updateFlow(flowId: string, flow: Partial<LangflowFlow>): Promise<LangflowFlow> {
    try {
      const response: LangflowFlowResponse = await this.makeRequest(`/flows/${flowId}`, {
        method: 'PATCH',
        body: JSON.stringify(flow),
      });
      
      return response.detail;
    } catch (error) {
      throw new LangflowError(
        `Failed to update flow ${flowId}: ${error.message}`,
        'FLOW_UPDATE_FAILED',
        { flowId, flow, originalError: error }
      );
    }
  }

  public async getFlow(flowId: string): Promise<LangflowFlow> {
    try {
      const response: LangflowFlowResponse = await this.makeRequest(`/flows/${flowId}`);
      return response.detail;
    } catch (error) {
      throw new LangflowError(
        `Failed to get flow ${flowId}: ${error.message}`,
        'FLOW_GET_FAILED',
        { flowId, originalError: error }
      );
    }
  }

  public async deleteFlow(flowId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/flows/${flowId}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      throw new LangflowError(
        `Failed to delete flow ${flowId}: ${error.message}`,
        'FLOW_DELETE_FAILED',
        { flowId, originalError: error }
      );
    }
  }

  public async listFlows(limit?: number, offset?: number): Promise<LangflowFlow[]> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      
      const response = await this.makeRequest(`/flows?${params.toString()}`);
      return response.flows || [];
    } catch (error) {
      throw new LangflowError(
        `Failed to list flows: ${error.message}`,
        'FLOW_LIST_FAILED',
        { originalError: error }
      );
    }
  }

  // Flow Execution
  public async executeFlow(
    flowId: string, 
    inputs?: Record<string, any>,
    outputType: 'chat' | 'any' = 'any'
  ): Promise<{ runId: string; outputs?: Record<string, any> }> {
    try {
      const payload = {
        input_value: inputs?.message || '',
        input_type: 'chat',
        output_type: outputType,
        tweaks: inputs?.tweaks || {},
        ...inputs
      };

      const response: LangflowExecutionResponse = await this.makeRequest(`/flows/${flowId}/run`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return {
        runId: response.detail.run_id,
        outputs: response.detail.outputs
      };
    } catch (error) {
      throw new LangflowError(
        `Failed to execute flow ${flowId}: ${error.message}`,
        'FLOW_EXECUTE_FAILED',
        { flowId, inputs, originalError: error }
      );
    }
  }

  public async getExecutionStatus(runId: string): Promise<{
    status: string;
    outputs?: Record<string, any>;
    error?: string;
  }> {
    try {
      const response = await this.makeRequest(`/runs/${runId}`);
      return {
        status: response.status,
        outputs: response.outputs,
        error: response.error
      };
    } catch (error) {
      throw new LangflowError(
        `Failed to get execution status for run ${runId}: ${error.message}`,
        'EXECUTION_STATUS_FAILED',
        { runId, originalError: error }
      );
    }
  }

  public async cancelExecution(runId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/runs/${runId}/cancel`, {
        method: 'POST',
      });
      return true;
    } catch (error) {
      throw new LangflowError(
        `Failed to cancel execution ${runId}: ${error.message}`,
        'EXECUTION_CANCEL_FAILED',
        { runId, originalError: error }
      );
    }
  }

  // Streaming Execution (Server-Sent Events)
  public async executeFlowStream(
    flowId: string,
    inputs?: Record<string, any>,
    onMessage?: (data: any) => void,
    onError?: (error: Error) => void
  ): Promise<string> {
    try {
      // Start execution
      const { runId } = await this.executeFlow(flowId, inputs);
      
      // Set up streaming
      if (onMessage || onError) {
        this.streamExecutionUpdates(runId, onMessage, onError);
      }
      
      return runId;
    } catch (error) {
      if (onError) onError(error as Error);
      throw error;
    }
  }

  private streamExecutionUpdates(
    runId: string,
    onMessage?: (data: any) => void,
    onError?: (error: Error) => void
  ): void {
    const eventSource = new EventSource(`${this.config.apiUrl}/runs/${runId}/stream`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
        
        // Emit internal event
        this.emitEvent({
          type: 'execution_progress',
          executionId: runId,
          data,
          timestamp: new Date()
        });
      } catch (error) {
        if (onError) onError(error as Error);
      }
    };
    
    eventSource.onerror = (error) => {
      eventSource.close();
      if (onError) onError(new Error('Stream connection error'));
      
      this.emitEvent({
        type: 'execution_error',
        executionId: runId,
        data: { error: 'Stream connection error' },
        timestamp: new Date()
      });
    };
  }

  // Component and Template Management
  public async getAvailableComponents(): Promise<any[]> {
    try {
      const response = await this.makeRequest('/components');
      return response.components || [];
    } catch (error) {
      throw new LangflowError(
        `Failed to get available components: ${error.message}`,
        'COMPONENTS_GET_FAILED',
        { originalError: error }
      );
    }
  }

  public async validateFlow(flow: LangflowFlow): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const response = await this.makeRequest('/flows/validate', {
        method: 'POST',
        body: JSON.stringify(flow),
      });
      
      return {
        isValid: response.is_valid,
        errors: response.errors || [],
        warnings: response.warnings || []
      };
    } catch (error) {
      throw new LangflowError(
        `Failed to validate flow: ${error.message}`,
        'FLOW_VALIDATE_FAILED',
        { flow, originalError: error }
      );
    }
  }

  // Event System
  private initializeEventStream(): void {
    // Set up global event stream for real-time updates
    try {
      this.eventSource = new EventSource(`${this.config.apiUrl}/events`);
      
      this.eventSource.onmessage = (event) => {
        try {
          const eventData: LangflowEvent = JSON.parse(event.data);
          this.emitEvent(eventData);
        } catch (error) {
          console.warn('Failed to parse event data:', error);
        }
      };
      
      this.eventSource.onerror = (error) => {
        console.warn('Event stream error:', error);
        // Attempt to reconnect after a delay
        setTimeout(() => this.initializeEventStream(), 5000);
      };
    } catch (error) {
      console.warn('Failed to initialize event stream:', error);
    }
  }

  public addEventListener(eventType: string, callback: (event: LangflowEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  public removeEventListener(eventType: string, callback: (event: LangflowEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: LangflowEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }

  // Health and Configuration
  public async healthCheck(): Promise<{
    status: string;
    version?: string;
    uptime?: number;
  }> {
    try {
      const response = await this.makeRequest('/health');
      return response;
    } catch (error) {
      throw new LangflowError(
        `Health check failed: ${error.message}`,
        'HEALTH_CHECK_FAILED',
        { originalError: error }
      );
    }
  }

  public getConfig(): Readonly<LangflowConfig> {
    return { ...this.config };
  }

  public updateConfig(config: Partial<LangflowConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Cleanup
  public destroy(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.eventListeners.clear();
  }
}

// Export singleton with default configuration
export const langflowClient = LangflowClient.getInstance({
  apiUrl: env.get().isDevelopment 
    ? 'http://localhost:7860/api/v1' 
    : 'https://langflow.clixen.ai/api/v1',
  timeout: 60000, // Increased timeout for complex workflows
  retryAttempts: 2
});