import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// Memory management and worker lifecycle
class WorkerPool {
  private static instance: WorkerPool;
  private workers: Map<string, any> = new Map();
  private lastCleanup = Date.now();
  private readonly CLEANUP_INTERVAL = 300000; // 5 minutes
  private readonly MAX_WORKERS = 10;
  private readonly WORKER_TTL = 600000; // 10 minutes

  static getInstance(): WorkerPool {
    if (!WorkerPool.instance) {
      WorkerPool.instance = new WorkerPool();
    }
    return WorkerPool.instance;
  }

  getWorker(workerId: string, factory: () => any): any {
    this.cleanupStaleWorkers();
    
    if (!this.workers.has(workerId)) {
      if (this.workers.size >= this.MAX_WORKERS) {
        this.evictOldestWorker();
      }
      
      const worker = {
        instance: factory(),
        created: Date.now(),
        lastUsed: Date.now()
      };
      this.workers.set(workerId, worker);
      console.log(`🔧 [WorkerPool] Created worker: ${workerId}`);
    }
    
    const worker = this.workers.get(workerId)!;
    worker.lastUsed = Date.now();
    return worker.instance;
  }

  private cleanupStaleWorkers(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.CLEANUP_INTERVAL) return;
    
    const staleWorkers: string[] = [];
    for (const [workerId, worker] of this.workers.entries()) {
      if (now - worker.lastUsed > this.WORKER_TTL) {
        staleWorkers.push(workerId);
      }
    }
    
    staleWorkers.forEach(workerId => {
      this.workers.delete(workerId);
      console.log(`🧹 [WorkerPool] Cleaned up stale worker: ${workerId}`);
    });
    
    this.lastCleanup = now;
  }

  private evictOldestWorker(): void {
    let oldestWorkerId = '';
    let oldestTime = Date.now();
    
    for (const [workerId, worker] of this.workers.entries()) {
      if (worker.lastUsed < oldestTime) {
        oldestTime = worker.lastUsed;
        oldestWorkerId = workerId;
      }
    }
    
    if (oldestWorkerId) {
      this.workers.delete(oldestWorkerId);
      console.log(`♻️ [WorkerPool] Evicted oldest worker: ${oldestWorkerId}`);
    }
  }

  cleanup(): void {
    this.workers.clear();
    console.log('🧹 [WorkerPool] Full cleanup completed');
  }
}

// Circuit breaker implementation
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private readonly maxFailures: number;
  private readonly timeout: number;
  private readonly resetTimeout: number;

  constructor(maxFailures = 5, timeout = 30000, resetTimeout = 60000) {
    this.maxFailures = maxFailures;
    this.timeout = timeout;
    this.resetTimeout = resetTimeout;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
        console.log('🔄 [CircuitBreaker] Transitioning to half-open');
      } else {
        throw new Error('Circuit breaker is open - service temporarily unavailable');
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), this.timeout)
        )
      ]);
      
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.maxFailures) {
      this.state = 'open';
      console.warn(`⚠️ [CircuitBreaker] Circuit opened after ${this.failures} failures`);
    }
  }

  getState(): string {
    return this.state;
  }
}

// Resource monitor for edge functions
class ResourceMonitor {
  private static instance: ResourceMonitor;
  private memoryUsage: number[] = [];
  private cpuUsage: number[] = [];
  private readonly MAX_SAMPLES = 10;

  static getInstance(): ResourceMonitor {
    if (!ResourceMonitor.instance) {
      ResourceMonitor.instance = new ResourceMonitor();
    }
    return ResourceMonitor.instance;
  }

  recordMemoryUsage(): void {
    const memInfo = Deno.memoryUsage();
    const usage = memInfo.heapUsed / 1024 / 1024; // MB
    
    this.memoryUsage.push(usage);
    if (this.memoryUsage.length > this.MAX_SAMPLES) {
      this.memoryUsage.shift();
    }
    
    if (usage > 100) { // 100MB threshold
      console.warn(`⚠️ [ResourceMonitor] High memory usage: ${usage.toFixed(2)}MB`);
    }
  }

  getAverageMemoryUsage(): number {
    if (this.memoryUsage.length === 0) return 0;
    return this.memoryUsage.reduce((a, b) => a + b, 0) / this.memoryUsage.length;
  }

  shouldScale(): boolean {
    const avgMemory = this.getAverageMemoryUsage();
    return avgMemory > 80; // Scale if average > 80MB
  }
}

// Simple rate limiting system (Redis-like functionality)
class EdgeRateLimiter {
  private static instance: EdgeRateLimiter;
  private limits: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly USER_LIMIT = 10; // requests per minute
  private readonly API_LIMIT = 30;  // OpenAI requests per minute
  private readonly WINDOW_MS = 60000; // 1 minute

  static getInstance(): EdgeRateLimiter {
    if (!EdgeRateLimiter.instance) {
      EdgeRateLimiter.instance = new EdgeRateLimiter();
    }
    return EdgeRateLimiter.instance;
  }

  async checkLimit(key: string, limit: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const record = this.limits.get(key);

    if (!record || now >= record.resetTime) {
      // Reset or create new window
      this.limits.set(key, { count: 0, resetTime: now + this.WINDOW_MS });
      return { allowed: true, remaining: limit - 1, resetTime: now + this.WINDOW_MS };
    }

    if (record.count >= limit) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }

    // Increment counter
    record.count++;
    this.limits.set(key, record);

    return { 
      allowed: true, 
      remaining: limit - record.count, 
      resetTime: record.resetTime 
    };
  }

  async recordRequest(key: string): Promise<void> {
    const record = this.limits.get(key);
    if (record) {
      record.count++;
      this.limits.set(key, record);
    }
  }

  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, record] of this.limits.entries()) {
      if (now >= record.resetTime) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.limits.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 [EdgeRateLimiter] Cleaned up ${expiredKeys.length} expired keys`);
    }
  }
}

// Initialize global instances
const workerPool = WorkerPool.getInstance();
const openAICircuitBreaker = new CircuitBreaker(3, 25000, 60000);
const n8nCircuitBreaker = new CircuitBreaker(5, 15000, 30000);
const resourceMonitor = ResourceMonitor.getInstance();
const edgeRateLimiter = EdgeRateLimiter.getInstance();

// Types for multi-agent system
interface AgentConfig {
  type: 'orchestrator' | 'workflow_designer' | 'deployment' | 'system';
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent_type?: string;
  metadata?: Record<string, any>;
}

interface MultiAgentResponse {
  response: string;
  agent_type: string;
  message_id: string;
  processing_time: number;
  tokens_used?: number;
  conversation_context?: Record<string, any>;
  next_agent?: string;
  workflow_progress?: Record<string, any>;
}

// N8N API integration functions
const N8N_API_URL = Deno.env.get('N8N_API_URL') || 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = Deno.env.get('N8N_API_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

const makeN8nRequest = async (
  endpoint: string,
  method = 'GET',
  body?: any
): Promise<any> => {
  const url = `${N8N_API_URL}${endpoint}`;
  
  return await n8nCircuitBreaker.execute(async () => {
    console.log(`🔄 [N8N] Making ${method} request to ${endpoint} (Circuit: ${n8nCircuitBreaker.getState()})`);
    
    // Progressive timeout strategy for n8n
    const timeoutMs = n8nCircuitBreaker.getState() === 'closed' ? 15000 : 
                     n8nCircuitBreaker.getState() === 'half-open' ? 10000 : 8000;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn(`⏰ [N8N] Request timed out after ${timeoutMs/1000}s`);
    }, timeoutMs);
    
    const requestOptions: RequestInit = {
      method,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'Clixen/1.0',
      },
      signal: controller.signal,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        const errorMsg = `n8n API Error ${response.status}: ${errorText}`;
        
        // Categorize errors for circuit breaker
        if (response.status >= 500) {
          throw new Error(`SERVER_ERROR: ${errorMsg}`);
        } else if (response.status === 429) {
          throw new Error(`RATE_LIMIT: ${errorMsg}`);
        } else {
          throw new Error(`CLIENT_ERROR: ${errorMsg}`);
        }
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('TIMEOUT: n8n request timed out');
      }
      throw fetchError;
    }
  });
};

// Create n8n workflow from agent specification
const createN8nWorkflow = async (workflowSpec: any): Promise<any> => {
  try {
    console.log('🔧 [N8N] Creating workflow:', workflowSpec.name);
    const response = await makeN8nRequest('/workflows', 'POST', workflowSpec);
    console.log('✅ [N8N] Workflow created successfully:', response.id);
    return response;
  } catch (error) {
    console.error('❌ [N8N] Failed to create workflow:', error);
    throw error;
  }
};

// Activate n8n workflow
const activateN8nWorkflow = async (workflowId: string): Promise<any> => {
  try {
    console.log('🚀 [N8N] Activating workflow:', workflowId);
    const response = await makeN8nRequest(`/workflows/${workflowId}/activate`, 'POST');
    console.log('✅ [N8N] Workflow activated successfully');
    return response;
  } catch (error) {
    console.error('❌ [N8N] Failed to activate workflow:', error);
    throw error;
  }
};

// Test n8n workflow
const testN8nWorkflow = async (workflowId: string, testData?: any): Promise<any> => {
  try {
    console.log('🧪 [N8N] Testing workflow:', workflowId);
    const response = await makeN8nRequest(`/workflows/${workflowId}/execute`, 'POST', { data: testData });
    console.log('✅ [N8N] Workflow test completed');
    return response;
  } catch (error) {
    console.error('❌ [N8N] Failed to test workflow:', error);
    throw error;
  }
};

// Validate n8n workflow structure
const validateWorkflow = async (workflowId: string): Promise<{
  valid: boolean;
  issues: string[];
  score: number;
}> => {
  try {
    console.log('🔍 [N8N] Validating workflow:', workflowId);
    const workflow = await makeN8nRequest(`/workflows/${workflowId}`);
    
    const issues: string[] = [];
    let score = 100;
    
    // Check basic structure
    if (!workflow.nodes || workflow.nodes.length === 0) {
      issues.push('Workflow has no nodes');
      score -= 50;
    }
    
    if (!workflow.connections || Object.keys(workflow.connections).length === 0) {
      issues.push('Workflow has no connections between nodes');
      score -= 30;
    }
    
    // Check for trigger nodes
    const hasTrigger = workflow.nodes?.some((node: any) => 
      node.type === 'n8n-nodes-base.webhook' ||
      node.type === 'n8n-nodes-base.cron' ||
      node.type === 'n8n-nodes-base.start'
    );
    
    if (!hasTrigger) {
      issues.push('Workflow needs a trigger node (Webhook, Cron, or Start)');
      score -= 40;
    }
    
    // Check for orphaned nodes
    const nodeNames = new Set(workflow.nodes?.map((n: any) => n.name) || []);
    const connectedNodes = new Set();
    
    Object.values(workflow.connections || {}).forEach((connections: any) => {
      if (connections.main) {
        connections.main.forEach((outputGroup: any[]) => {
          outputGroup.forEach((connection: any) => {
            connectedNodes.add(connection.node);
          });
        });
      }
    });
    
    const orphanedNodes = [...nodeNames].filter(name => !connectedNodes.has(name) && name !== workflow.nodes?.find((n: any) => hasTrigger && (n.type === 'n8n-nodes-base.webhook' || n.type === 'n8n-nodes-base.cron' || n.type === 'n8n-nodes-base.start'))?.name);
    
    if (orphanedNodes.length > 0) {
      issues.push(`Found ${orphanedNodes.length} unconnected nodes`);
      score -= orphanedNodes.length * 5;
    }
    
    console.log(`✅ [N8N] Workflow validation completed - Score: ${Math.max(0, score)}/100`);
    
    return {
      valid: issues.length === 0,
      issues,
      score: Math.max(0, score)
    };
  } catch (error) {
    console.error('❌ [N8N] Failed to validate workflow:', error);
    return {
      valid: false,
      issues: [`Validation failed: ${error.message}`],
      score: 0
    };
  }
};

// Extract webhook URLs from workflow
const extractWebhookUrls = (workflow: any): string[] => {
  const baseUrl = N8N_API_URL.replace('/api/v1', '');
  const webhookUrls: string[] = [];
  
  if (workflow.nodes) {
    workflow.nodes.forEach((node: any) => {
      if (node.type === 'n8n-nodes-base.webhook' && node.parameters?.path) {
        const path = node.parameters.path.startsWith('/') ? node.parameters.path : `/${node.parameters.path}`;
        webhookUrls.push(`${baseUrl}/webhook${path}`);
      }
    });
  }
  
  return webhookUrls;
};

// Perform health check on workflow
const performHealthCheck = async (workflowId: string): Promise<{
  score: number;
  issues: string[];
  recommendations: string[];
}> => {
  try {
    console.log('🏥 [N8N] Performing health check on workflow:', workflowId);
    
    const workflow = await makeN8nRequest(`/workflows/${workflowId}`);
    const executions = await makeN8nRequest(`/executions?workflowId=${workflowId}&limit=10`);
    
    let score = 100;
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check if workflow is active
    if (!workflow.active) {
      issues.push('Workflow is not active');
      score -= 20;
      recommendations.push('Activate the workflow to start processing requests');
    }
    
    // Check execution history if available
    if (executions.data && executions.data.length > 0) {
      const recentExecutions = executions.data.slice(0, 10);
      const failedExecutions = recentExecutions.filter((exec: any) => 
        exec.status === 'error' || exec.status === 'crashed' || !exec.finished
      );
      
      const failureRate = failedExecutions.length / recentExecutions.length;
      
      if (failureRate > 0.5) {
        issues.push(`High failure rate: ${Math.round(failureRate * 100)}%`);
        score -= 40;
        recommendations.push('Review recent execution logs and fix failing nodes');
      } else if (failureRate > 0.2) {
        issues.push(`Moderate failure rate: ${Math.round(failureRate * 100)}%`);
        score -= 20;
        recommendations.push('Monitor execution logs for intermittent issues');
      }
      
      // Check for long-running executions
      const longRunning = recentExecutions.filter((exec: any) => {
        if (!exec.startedAt || !exec.stoppedAt) return false;
        const duration = new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime();
        return duration > 300000; // 5 minutes
      });
      
      if (longRunning.length > 0) {
        issues.push(`${longRunning.length} executions took longer than 5 minutes`);
        score -= 15;
        recommendations.push('Consider optimizing slow nodes or adding timeouts');
      }
    }
    
    // Check node configuration
    const nodeIssues = workflow.nodes?.filter((node: any) => {
      return !node.parameters || Object.keys(node.parameters).length === 0;
    }) || [];
    
    if (nodeIssues.length > 0) {
      issues.push(`${nodeIssues.length} nodes have empty configurations`);
      score -= nodeIssues.length * 5;
      recommendations.push('Review and configure all workflow nodes');
    }
    
    console.log(`✅ [N8N] Health check completed - Score: ${Math.max(0, score)}/100`);
    
    return {
      score: Math.max(0, score),
      issues,
      recommendations
    };
  } catch (error) {
    console.error('❌ [N8N] Health check failed:', error);
    return {
      score: 0,
      issues: [`Health check failed: ${error.message}`],
      recommendations: ['Check workflow configuration and n8n connectivity']
    };
  }
};

// Enhanced error handling and rollback mechanisms
interface DeploymentState {
  workflow_id?: string;
  rollback_data?: any;
  deployment_steps: string[];
  errors: string[];
  timestamp: number;
}

const deploymentStates = new Map<string, DeploymentState>();

const createDeploymentCheckpoint = async (sessionId: string, workflowId: string): Promise<string> => {
  const checkpointId = `checkpoint-${Date.now()}-${sessionId}`;
  
  try {
    // Get current workflow state
    const currentWorkflow = await makeN8nRequest(`/workflows/${workflowId}`);
    
    deploymentStates.set(checkpointId, {
      workflow_id: workflowId,
      rollback_data: currentWorkflow,
      deployment_steps: ['checkpoint_created'],
      errors: [],
      timestamp: Date.now()
    });
    
    console.log(`💾 [CHECKPOINT] Created deployment checkpoint: ${checkpointId}`);
    return checkpointId;
  } catch (error) {
    console.error('❌ [CHECKPOINT] Failed to create checkpoint:', error);
    throw new Error(`Failed to create deployment checkpoint: ${error.message}`);
  }
};

const rollbackDeployment = async (checkpointId: string, reason: string): Promise<{
  success: boolean;
  actions: string[];
  errors: string[];
}> => {
  const actions: string[] = [];
  const errors: string[] = [];
  
  try {
    const deploymentState = deploymentStates.get(checkpointId);
    if (!deploymentState) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }
    
    console.log(`🔄 [ROLLBACK] Starting rollback for reason: ${reason}`);
    
    // Step 1: Deactivate current workflow if active
    if (deploymentState.workflow_id) {
      try {
        const currentWorkflow = await makeN8nRequest(`/workflows/${deploymentState.workflow_id}`);
        if (currentWorkflow.active) {
          await makeN8nRequest(`/workflows/${deploymentState.workflow_id}/deactivate`, 'POST');
          actions.push('Deactivated current workflow');
        }
      } catch (error) {
        errors.push(`Failed to deactivate workflow: ${error.message}`);
      }
    }
    
    // Step 2: Restore previous state if available
    if (deploymentState.rollback_data) {
      try {
        await makeN8nRequest(`/workflows/${deploymentState.workflow_id}`, 'PUT', deploymentState.rollback_data);
        actions.push('Restored workflow to previous state');
      } catch (error) {
        errors.push(`Failed to restore workflow: ${error.message}`);
      }
    }
    
    // Step 3: Clean up deployment state
    deploymentStates.delete(checkpointId);
    actions.push('Cleaned up deployment state');
    
    console.log(`✅ [ROLLBACK] Completed rollback with ${actions.length} successful actions and ${errors.length} errors`);
    
    return {
      success: errors.length === 0,
      actions,
      errors
    };
  } catch (error) {
    errors.push(`Rollback failed: ${error.message}`);
    return {
      success: false,
      actions,
      errors
    };
  }
};

const safeWorkflowDeployment = async (
  workflowId: string, 
  sessionId: string, 
  userId: string
): Promise<{
  success: boolean;
  checkpointId?: string;
  results: any;
  errors: string[];
}> => {
  let checkpointId: string | undefined;
  const errors: string[] = [];
  
  try {
    // Step 1: Create deployment checkpoint
    checkpointId = await createDeploymentCheckpoint(sessionId, workflowId);
    
    // Step 2: Validate workflow
    const validation = await validateWorkflow(workflowId);
    if (!validation.valid) {
      // Minor issues are warnings, major issues trigger rollback
      const majorIssues = validation.issues.filter(issue => 
        issue.includes('no nodes') || issue.includes('no connections') || issue.includes('no trigger')
      );
      
      if (majorIssues.length > 0) {
        await rollbackDeployment(checkpointId, `Validation failed: ${majorIssues.join(', ')}`);
        throw new Error(`Critical validation errors: ${majorIssues.join(', ')}`);
      }
    }
    
    // Step 3: Activate workflow with monitoring
    await activateN8nWorkflow(workflowId);
    
    // Step 4: Wait for activation confirmation
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const workflowDetails = await makeN8nRequest(`/workflows/${workflowId}`);
    if (!workflowDetails.active) {
      throw new Error('Workflow activation was not confirmed');
    }
    
    // Step 5: Perform health check
    const healthCheck = await performHealthCheck(workflowId);
    if (healthCheck.score < 50) {
      errors.push(`Low health score: ${healthCheck.score}/100`);
      errors.push(...healthCheck.issues);
    }
    
    // Step 6: Test workflow if possible
    let testResults = null;
    try {
      testResults = await testN8nWorkflow(workflowId, { test: true, user_id: userId });
    } catch (testError) {
      // Test failures are warnings, not critical errors
      errors.push(`Test execution failed: ${testError.message}`);
    }
    
    // Step 7: Extract webhook URLs
    const webhookUrls = extractWebhookUrls(workflowDetails);
    
    const results = {
      workflow_id: workflowId,
      status: 'deployed_and_active',
      activation_time: new Date().toISOString(),
      webhook_urls: webhookUrls,
      health_score: healthCheck.score,
      validation: validation,
      test_results: testResults,
      checkpoint_id: checkpointId
    };
    
    return {
      success: true,
      checkpointId,
      results,
      errors
    };
    
  } catch (error) {
    console.error('❌ [SAFE-DEPLOY] Deployment failed:', error);
    
    // Attempt rollback if checkpoint exists
    if (checkpointId) {
      try {
        const rollbackResult = await rollbackDeployment(checkpointId, error.message);
        errors.push(`Deployment failed and rollback ${rollbackResult.success ? 'succeeded' : 'failed'}`);
        if (!rollbackResult.success) {
          errors.push(...rollbackResult.errors);
        }
      } catch (rollbackError) {
        errors.push(`Rollback also failed: ${rollbackError.message}`);
      }
    }
    
    errors.push(error.message);
    
    return {
      success: false,
      checkpointId,
      results: {
        workflow_id: workflowId,
        status: 'deployment_failed',
        error: error.message
      },
      errors
    };
  }
};

// Agent system prompts
const AGENT_PROMPTS = {
  orchestrator: `You are the Orchestrator Agent in a multi-agent AI system for workflow automation. Your role is to:
1. Understand user requirements and intentions
2. Coordinate with specialist agents (WorkflowDesigner, Deployment)
3. Manage conversation flow and context
4. Provide comprehensive responses to users
5. Detect when OAuth integrations are needed and guide users appropriately
6. Keep track of workflow development phases (understanding → design → deployment)

Always maintain context across conversations and coordinate with other agents when needed.`,

  workflow_designer: `You are the Workflow Designer Agent specializing in n8n workflow creation. Your expertise includes:
1. Deep knowledge of n8n nodes and their configurations
2. Best practices for workflow architecture and performance
3. Integration patterns with various APIs and services
4. Error handling and retry logic in workflows
5. Workflow optimization for scalability and maintainability
6. Security considerations for workflow credentials

IMPORTANT: When creating workflows, you must generate complete, valid n8n workflow JSON structures that can be deployed immediately to n8n. Include all required fields: name, nodes, connections, active status, settings, and staticData.

Create efficient, maintainable, and secure n8n workflows based on user requirements.`,

  deployment: `You are the Deployment Agent responsible for safely deploying workflows to production. Your responsibilities include:
1. Validating workflow configurations before deployment
2. Managing deployment rollbacks if issues occur
3. Monitoring post-deployment health and performance
4. Ensuring security compliance and credential management
5. Coordinating with n8n API for safe deployment processes
6. Providing deployment status updates and error handling
7. Creating and activating real workflows in n8n

IMPORTANT: You have access to the n8n API and must actually create, deploy, and activate workflows, not just simulate the process.

Always prioritize safety and reliability in deployment processes.`,

  system: `You are the System Agent handling error recovery, logging, and system-level operations. Your role includes:
1. Error handling and recovery coordination
2. System health monitoring and alerts
3. Logging and debugging support
4. Performance monitoring and optimization suggestions
5. Security incident response and validation
6. Cross-agent communication facilitation

Focus on system reliability and comprehensive error handling.`
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Function to retrieve API key from secure database or environment
const getApiKey = async (serviceName: string, userId?: string): Promise<string | null> => {
  try {
    // For OpenAI, get user-specific key first
    if (serviceName === 'openai' && userId) {
      console.log(`🔑 [API-KEY] Retrieving user's OpenAI API key for user ${userId}`);
      
      const { data, error } = await supabase
        .from('api_keys')
        .select('openai_api_key')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`⚠️  [API-KEY] No OpenAI key found for user ${userId}`);
        } else {
          console.error(`❌ [API-KEY] Error retrieving user's OpenAI key:`, error);
        }
      } else if (data?.openai_api_key) {
        console.log(`✅ [API-KEY] Successfully retrieved user's OpenAI key`);
        return data.openai_api_key;
      }
    }
    
    // Fallback to environment variable (for development and Edge Function secrets)
    const envVarName = `${serviceName.toUpperCase()}_API_KEY`;
    const envKey = Deno.env.get(envVarName);
    
    if (envKey) {
      console.log(`🔑 [API-KEY] Retrieved ${serviceName} key from environment variable`);
      return envKey;
    }
    
    console.log(`🔑 [API-KEY] Retrieving ${serviceName} API key from database`);
    
    const { data, error } = await supabase
      .from('api_configurations')
      .select('api_key')
      .eq('service_name', serviceName)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error(`❌ [API-KEY] Error retrieving ${serviceName} key:`, error);
      return null;
    }
    
    if (!data?.api_key) {
      console.warn(`⚠️  [API-KEY] No active ${serviceName} key found in database`);
      return null;
    }
    
    console.log(`✅ [API-KEY] Successfully retrieved ${serviceName} key from database`);
    
    // Log API key access for audit
    await supabase.rpc('log_api_key_access', {
      p_service_name: serviceName,
      p_action: 'accessed',
      p_edge_function_name: 'ai-chat-system'
    }).catch(err => console.warn('Failed to log API key access:', err));
    
    return data.api_key;
  } catch (error) {
    console.error(`❌ [API-KEY] Exception retrieving ${serviceName} key:`, error);
    return null;
  }
};

// Agent configuration
const getAgentConfig = (agentType: string): AgentConfig => {
  const baseConfig = {
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 4000,
  };

  switch (agentType) {
    case 'orchestrator':
      return {
        ...baseConfig,
        type: 'orchestrator',
        temperature: 0.8,
        systemPrompt: AGENT_PROMPTS.orchestrator,
      };
    case 'workflow_designer':
      return {
        ...baseConfig,
        type: 'workflow_designer',
        temperature: 0.6,
        maxTokens: 6000,
        systemPrompt: AGENT_PROMPTS.workflow_designer,
      };
    case 'deployment':
      return {
        ...baseConfig,
        type: 'deployment',
        temperature: 0.5,
        systemPrompt: AGENT_PROMPTS.deployment,
      };
    default:
      return {
        ...baseConfig,
        type: 'system',
        temperature: 0.3,
        systemPrompt: AGENT_PROMPTS.system,
      };
  }
};

// Get conversation history with context
const getConversationHistory = async (sessionId: string, userId: string, limit = 10): Promise<ChatMessage[]> => {
  try {
    const { data: messages, error } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }

    return messages?.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      agent_type: msg.agent_type,
      metadata: msg.metadata,
    })) || [];
  } catch (error) {
    console.error('Error in getConversationHistory:', error);
    return [];
  }
};

// Store message in database
const storeMessage = async (
  sessionId: string,
  userId: string,
  content: string,
  role: 'user' | 'assistant',
  agentType?: string,
  metadata?: Record<string, any>
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        content,
        role,
        agent_type: agentType,
        metadata: metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error storing message:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error in storeMessage:', error);
    return null;
  }
};

// Update agent state
const updateAgentState = async (
  sessionId: string,
  userId: string,
  agentType: string,
  state: Record<string, any>
): Promise<void> => {
  try {
    await supabase
      .from('ai_agent_states')
      .upsert({
        session_id: sessionId,
        user_id: userId,
        agent_type: agentType,
        state,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'session_id,user_id,agent_type'
      });
  } catch (error) {
    console.error('Error updating agent state:', error);
  }
};

// Get agent state
const getAgentState = async (
  sessionId: string,
  userId: string,
  agentType: string
): Promise<Record<string, any>> => {
  try {
    const { data, error } = await supabase
      .from('ai_agent_states')
      .select('state')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('agent_type', agentType)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting agent state:', error);
      return {};
    }

    return data?.state || {};
  } catch (error) {
    console.error('Error in getAgentState:', error);
    return {};
  }
};

// Call OpenAI API with agent-specific configuration and circuit breaker
const callOpenAI = async (
  messages: ChatMessage[],
  agentConfig: AgentConfig,
  userId?: string,
  stream = false
): Promise<{ response: string; tokensUsed: number }> => {
  console.log(`🤖 [OPENAI] Starting API call with agent: ${agentConfig.type}`);
  
  // Record resource usage
  resourceMonitor.recordMemoryUsage();
  
  // Validate user ID format
  if (userId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.warn(`⚠️ [OPENAI] Invalid UUID format for user_id: ${userId}`);
      // Continue with the request but log the warning
    } else {
      console.log(`✅ [OPENAI] Valid UUID format for user_id: ${userId}`);
    }
  }
  
  // Get OpenAI API key from database (user-specific or fallback) with worker pool
  const apiKeyWorkerId = `api-key-${userId || 'default'}`;
  const openaiApiKey = await workerPool.getWorker(apiKeyWorkerId, () => getApiKey('openai', userId));
  
  if (!openaiApiKey) {
    console.error('❌ [OPENAI] No API key available - user needs to configure their OpenAI API key');
    return {
      response: '⚠️ **OpenAI API Key Required**\n\nTo use the AI workflow assistant, you need to configure your OpenAI API key in your account settings.\n\n**How to get started:**\n1. Get your API key from [OpenAI](https://platform.openai.com/api-keys)\n2. Add it in your account settings\n3. Start creating amazing workflows!\n\nYour API key is stored securely and never shared.',
      tokensUsed: 0,
    };
  }
  
  const systemMessage = {
    role: 'system' as const,
    content: agentConfig.systemPrompt,
  };

  const openaiMessages = [
    systemMessage,
    ...messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
  ];

  const requestBody = {
    model: agentConfig.model,
    messages: openaiMessages,
    max_tokens: agentConfig.maxTokens,
    temperature: agentConfig.temperature,
    stream,
  };

  // Use circuit breaker for OpenAI API calls
  return await openAICircuitBreaker.execute(async () => {
    console.log(`🔄 [OPENAI] Making API request to ${agentConfig.model} (Circuit: ${openAICircuitBreaker.getState()})`);
    
    // Progressive timeout strategy: 15s, 20s, 25s based on circuit breaker state
    const timeoutMs = openAICircuitBreaker.getState() === 'closed' ? 25000 : 
                     openAICircuitBreaker.getState() === 'half-open' ? 20000 : 15000;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn(`⏰ [OPENAI] API call timed out after ${timeoutMs/1000}s`);
    }, timeoutMs);
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Clixen/1.0',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [OPENAI] API error: ${response.status} - ${errorText}`);
        
        // Throw specific errors for circuit breaker
        if (response.status === 429) {
          throw new Error(`RATE_LIMIT: ${errorText}`);
        } else if (response.status >= 500) {
          throw new Error(`SERVER_ERROR: ${errorText}`);
        } else {
          throw new Error(`CLIENT_ERROR: ${errorText}`);
        }
      }

      const data = await response.json();
      const tokensUsed = data.usage?.total_tokens || 0;
      
      console.log(`✅ [OPENAI] API call successful - tokens: ${tokensUsed}, circuit: ${openAICircuitBreaker.getState()}`);
      
      return {
        response: data.choices[0]?.message?.content || 'No response generated',
        tokensUsed,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('TIMEOUT: Request timed out');
      }
      throw fetchError;
    }
  }).catch(error => {
    console.error('❌ [OPENAI] Circuit breaker caught error:', error);
    
    // Enhanced error handling with specific messages
    let errorMessage = 'I encountered an error processing your request. Please try again.';
    
    if (error.name === 'AbortError') {
      errorMessage = '⏰ The AI request timed out. Please try again with a shorter message or check your connection.';
    } else if (error.message.includes('401') || error.message.includes('API key')) {
      errorMessage = '🔑 Invalid or expired OpenAI API key. Please check your API key configuration.';
    } else if (error.message.includes('429')) {
      errorMessage = '📊 OpenAI API rate limit exceeded. Please wait a moment and try again.';
    } else if (error.message.includes('quota')) {
      errorMessage = '💳 OpenAI API quota exceeded. Please check your usage limits or billing.';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = '🌐 Network error connecting to OpenAI. Please check your connection and try again.';
    }
    
    return {
      response: errorMessage,
      tokensUsed: 0,
    };
  }
};

// Determine which agent should handle the request
const determineAgent = (userMessage: string, conversationHistory: ChatMessage[]): string => {
  const message = userMessage.toLowerCase();
  
  // Check for deployment-related keywords
  if (message.includes('deploy') || message.includes('publish') || message.includes('production') || 
      message.includes('live') || message.includes('activate workflow')) {
    return 'deployment';
  }
  
  // Check for workflow design keywords
  if (message.includes('workflow') || message.includes('automation') || message.includes('n8n') ||
      message.includes('trigger') || message.includes('node') || message.includes('api integration')) {
    return 'workflow_designer';
  }
  
  // Check for error/system keywords
  if (message.includes('error') || message.includes('debug') || message.includes('not working') ||
      message.includes('failed') || message.includes('issue')) {
    return 'system';
  }
  
  // Default to orchestrator for general conversations and coordination
  return 'orchestrator';
};

// Process multi-agent chat
const processMultiAgentChat = async (
  sessionId: string,
  userId: string,
  userMessage: string,
  requestedAgent?: string
): Promise<MultiAgentResponse> => {
  const startTime = Date.now();
  
  try {
    // Store user message
    await storeMessage(sessionId, userId, userMessage, 'user');
    
    // Get conversation history
    const conversationHistory = await getConversationHistory(sessionId, userId, 10);
    
    // Determine which agent should handle this request
    const agentType = requestedAgent || determineAgent(userMessage, conversationHistory);
    const agentConfig = getAgentConfig(agentType);
    
    // Get current agent state
    const agentState = await getAgentState(sessionId, userId, agentType);
    
    // Add agent state context to the conversation if it exists
    const contextualMessages = [...conversationHistory];
    if (Object.keys(agentState).length > 0) {
      contextualMessages.push({
        role: 'system',
        content: `Previous agent state: ${JSON.stringify(agentState)}`,
      });
    }
    
    // Add current user message
    contextualMessages.push({
      role: 'user',
      content: userMessage,
    });
    
    // Call OpenAI with agent-specific configuration
    const { response, tokensUsed } = await callOpenAI(contextualMessages, agentConfig, userId);
    
    // Enhanced workflow processing based on agent type
    let workflowResults: any = {};
    let enhancedResponse = response;
    
    // Handle workflow creation for workflow_designer agent
    if (agentType === 'workflow_designer' && response.includes('```json')) {
      try {
        console.log('🔄 [AGENT] Workflow designer processing workflow creation');
        
        // Extract JSON workflow from response
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          const workflowSpec = JSON.parse(jsonMatch[1]);
          
          // Validate required fields
          if (workflowSpec.name && workflowSpec.nodes && workflowSpec.connections) {
            console.log('📋 [AGENT] Valid workflow specification found, creating n8n workflow...');
            
            // Create workflow in n8n
            const createdWorkflow = await createN8nWorkflow(workflowSpec);
            workflowResults = {
              workflow_id: createdWorkflow.id,
              workflow_name: createdWorkflow.name,
              node_count: workflowSpec.nodes.length,
              status: 'created',
              n8n_url: `http://18.221.12.50:5678/workflow/${createdWorkflow.id}`
            };
            
            enhancedResponse = response + `\n\n🎉 **Workflow Created Successfully!**\n\n` +
              `- **Workflow ID**: ${createdWorkflow.id}\n` +
              `- **Name**: ${createdWorkflow.name}\n` +
              `- **Nodes**: ${workflowSpec.nodes.length} nodes configured\n` +
              `- **Status**: Created and ready for activation\n` +
              `- **View in n8n**: http://18.221.12.50:5678/workflow/${createdWorkflow.id}\n\n` +
              `Would you like me to activate this workflow and make it live?`;
          }
        }
      } catch (error) {
        console.error('❌ [AGENT] Failed to create workflow:', error);
        workflowResults = {
          status: 'error',
          error: error.message
        };
        enhancedResponse = response + `\n\n⚠️ **Workflow Creation Failed**: ${error.message}\n\nPlease check the workflow specification and try again.`;
      }
    }
    
    // Handle workflow deployment for deployment agent
    if (agentType === 'deployment' && agentState.workflow_id) {
      console.log('🚀 [AGENT] Deployment agent starting safe deployment:', agentState.workflow_id);
      
      // Use safe deployment mechanism with rollback capability
      const deploymentResult = await safeWorkflowDeployment(
        agentState.workflow_id,
        sessionId,
        userId
      );
      
      if (deploymentResult.success) {
        workflowResults = deploymentResult.results;
        
        let responseText = `\n\n✅ **Deployment Successful!**\n\n` +
          `- **Workflow ID**: ${deploymentResult.results.workflow_id}\n` +
          `- **Status**: Active and running\n` +
          `- **Health Score**: ${deploymentResult.results.health_score}/100\n` +
          `- **Deployed**: ${deploymentResult.results.activation_time}\n` +
          `- **View in n8n**: http://18.221.12.50:5678/workflow/${deploymentResult.results.workflow_id}\n`;
          
        if (deploymentResult.results.webhook_urls?.length > 0) {
          responseText += `\n**Webhook URLs:**\n`;
          deploymentResult.results.webhook_urls.forEach((url: string) => {
            responseText += `- ${url}\n`;
          });
        }
        
        if (deploymentResult.results.validation?.issues?.length > 0) {
          responseText += `\n**Validation Warnings:**\n`;
          deploymentResult.results.validation.issues.forEach((issue: string) => {
            responseText += `- ${issue}\n`;
          });
        }
        
        if (deploymentResult.errors.length > 0) {
          responseText += `\n**Warnings:**\n`;
          deploymentResult.errors.forEach(error => {
            responseText += `- ${error}\n`;
          });
        }
        
        responseText += `\n🎉 Your workflow is now live and ready to process requests!`;
        responseText += `\n\n**Rollback Checkpoint**: Created (ID: ${deploymentResult.checkpointId})`;
        
        enhancedResponse = response + responseText;
      } else {
        workflowResults = deploymentResult.results;
        workflowResults.errors = deploymentResult.errors;
        
        let errorText = `\n\n❌ **Deployment Failed**\n\n`;
        errorText += `- **Workflow ID**: ${agentState.workflow_id}\n`;
        errorText += `- **Status**: Deployment failed\n`;
        
        if (deploymentResult.errors.length > 0) {
          errorText += `\n**Error Details:**\n`;
          deploymentResult.errors.forEach(error => {
            errorText += `- ${error}\n`;
          });
        }
        
        if (deploymentResult.checkpointId) {
          errorText += `\n**Rollback**: Attempted (Checkpoint: ${deploymentResult.checkpointId})`;
        }
        
        errorText += `\n\nPlease review the issues above and try deploying again.`;
        
        enhancedResponse = response + errorText;
      }
    }
    
    // Store AI response with workflow results
    const messageId = await storeMessage(
      sessionId,
      userId,
      enhancedResponse,
      'assistant',
      agentType,
      {
        tokens_used: tokensUsed,
        processing_time: Date.now() - startTime,
        model: agentConfig.model,
        workflow_results: workflowResults
      }
    );
    
    // Update agent state based on the conversation and workflow results
    const updatedState = {
      ...agentState,
      last_interaction: new Date().toISOString(),
      conversation_phase: agentType === 'orchestrator' ? 'coordination' : 'specialized_task',
      context_summary: userMessage.substring(0, 200),
      workflow_id: workflowResults.workflow_id || agentState.workflow_id,
      workflow_status: workflowResults.status || agentState.workflow_status,
    };
    
    await updateAgentState(sessionId, userId, agentType, updatedState);
    
    // Update session timestamp
    await supabase
      .from('ai_chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId);
    
    // Determine if another agent should be involved
    let nextAgent: string | undefined;
    if (agentType === 'orchestrator' && (
      response.toLowerCase().includes('workflow') || 
      response.toLowerCase().includes('automation')
    )) {
      nextAgent = 'workflow_designer';
    } else if (agentType === 'workflow_designer' && (
      workflowResults.workflow_id || response.toLowerCase().includes('deploy')
    )) {
      nextAgent = 'deployment';
    }
    
    return {
      response: enhancedResponse,
      agent_type: agentType,
      message_id: messageId || 'unknown',
      processing_time: Date.now() - startTime,
      tokens_used: tokensUsed,
      conversation_context: updatedState,
      next_agent: nextAgent,
      workflow_progress: {
        phase: agentType === 'workflow_designer' ? 'design' : 
               agentType === 'deployment' ? 'deployment' : 'coordination',
        status: workflowResults.status || 'in_progress',
        workflow_id: workflowResults.workflow_id,
        details: workflowResults
      },
    };
    
  } catch (error) {
    console.error('Error in processMultiAgentChat:', error);
    
    // Store error message
    const errorMessage = `I apologize, but I encountered an error processing your request: ${error.message}. Please try again.`;
    const messageId = await storeMessage(sessionId, userId, errorMessage, 'assistant', 'system');
    
    return {
      response: errorMessage,
      agent_type: 'system',
      message_id: messageId || 'error',
      processing_time: Date.now() - startTime,
      tokens_used: 0,
    };
  }
};

// Create or get chat session
const getOrCreateSession = async (userId: string, sessionId?: string): Promise<string> => {
  if (sessionId) {
    // Verify session exists and belongs to user
    const { data: existingSession } = await supabase
      .from('ai_chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();
    
    if (existingSession) {
      return sessionId;
    }
  }
  
  // Create new session
  const { data: newSession, error } = await supabase
    .from('ai_chat_sessions')
    .insert({
      user_id: userId,
      title: 'New AI Chat',
      is_active: true,
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }
  
  return newSession.id;
};

// Main request handler with resource monitoring
serve(async (req) => {
  const requestStart = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);
  
  console.log(`🚀 [${requestId}] Starting request: ${req.method} ${req.url}`);
  
  // Record initial resource usage
  resourceMonitor.recordMemoryUsage();
  const initialMemory = resourceMonitor.getAverageMemoryUsage();
  
  // Cleanup handler to run at the end of request
  const cleanup = () => {
    const duration = Date.now() - requestStart;
    const finalMemory = resourceMonitor.getAverageMemoryUsage();
    const memoryDelta = finalMemory - initialMemory;
    
    console.log(`✅ [${requestId}] Request completed: ${duration}ms, memory: ${finalMemory.toFixed(1)}MB (Δ${memoryDelta > 0 ? '+' : ''}${memoryDelta.toFixed(1)}MB)`);
    
    // Trigger cleanup if memory usage is high
    if (resourceMonitor.shouldScale()) {
      console.log('🧹 [ResourceMonitor] High memory usage detected, triggering cleanup');
      workerPool.cleanup();
    }
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    cleanup();
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Verify request method
    if (req.method !== 'POST') {
      cleanup();
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const { 
      message, 
      session_id, 
      agent_type, 
      user_id,
      stream = false 
    } = body;
    
    // Validate required fields
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required and must be a string' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Rate limiting check
    const userLimitCheck = await edgeRateLimiter.checkLimit(`user:${user_id}`, edgeRateLimiter['USER_LIMIT']);
    if (!userLimitCheck.allowed) {
      console.warn(`🚫 [${requestId}] Rate limit exceeded for user: ${user_id}`);
      cleanup();
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please wait before trying again.',
          retryAfter: Math.ceil((userLimitCheck.resetTime - Date.now()) / 1000),
          remaining: userLimitCheck.remaining
        }),
        { 
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': userLimitCheck.remaining.toString(),
            'X-RateLimit-Reset': userLimitCheck.resetTime.toString(),
            'Retry-After': Math.ceil((userLimitCheck.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    console.log(`✅ [${requestId}] Rate limit check passed: ${userLimitCheck.remaining} remaining`);
    
    // Cleanup stale rate limit entries periodically
    if (Math.random() < 0.1) { // 10% chance to trigger cleanup
      edgeRateLimiter.cleanup();
    }
    
    // Validate UUID format for user_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id)) {
      console.warn(`⚠️ [REQUEST] Invalid UUID format for user_id: ${user_id}`);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid user ID format - must be a valid UUID',
          details: 'The user_id parameter must be in UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Log request for debugging
    console.log(`📝 [REQUEST] Processing chat request:`, {
      user_id,
      agent_type: agent_type || 'auto',
      message_length: message.length,
      has_session_id: !!session_id
    });
    
    // Get or create session
    const sessionId = await getOrCreateSession(user_id, session_id);
    
    // Process the chat with multi-agent system
    const result = await processMultiAgentChat(
      sessionId,
      user_id,
      message,
      agent_type
    );
    
    // Add session_id to response
    const response = {
      ...result,
      session_id: sessionId,
    };
    
    cleanup();
    return new Response(
      JSON.stringify({
        ...response,
        metadata: {
          ...response.metadata,
          processing_duration: Date.now() - requestStart,
          memory_usage: resourceMonitor.getAverageMemoryUsage(),
          circuit_states: {
            openai: openAICircuitBreaker.getState(),
            n8n: n8nCircuitBreaker.getState()
          }
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error(`❌ [${requestId}] Edge function error:`, error);
    
    cleanup();
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        response: 'I apologize, but I encountered an unexpected error. Please try again. If this continues, please check the console for detailed error information.',
        agent_type: 'system',
        message_id: 'error',
        processing_time: Date.now() - requestStart,
        tokens_used: 0,
        metadata: {
          error_type: error.name,
          circuit_states: {
            openai: openAICircuitBreaker.getState(),
            n8n: n8nCircuitBreaker.getState()
          },
          memory_usage: resourceMonitor.getAverageMemoryUsage()
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});