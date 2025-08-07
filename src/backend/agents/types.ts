/**
 * Backend Development Orchestrator Types
 * Defines interfaces for coordinating backend development agents
 * Based on Clixen MVP Specification - Simple GPT→n8n pipeline
 */

export interface AgentTask {
  id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  dependencies: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'blocked';
  assignedTo?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  estimatedHours?: number;
  actualHours?: number;
}

export interface BackendDomain {
  name: string;
  description: string;
  dependencies: string[];
  tasks: AgentTask[];
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
  priority: number;
}

export interface MVP_Requirements {
  // Core MVP Features (from spec)
  authentication: {
    provider: 'supabase-auth';
    method: 'email-password';
    features: ['signup', 'signin', 'session-management'];
  };
  
  persistence: {
    database: 'supabase-postgresql';
    tables: ['users', 'projects', 'workflows', 'executions'];
    features: ['project-dashboard', 'workflow-history'];
  };
  
  workflowEngine: {
    processor: 'gpt-based';
    generator: 'n8n-json';
    integration: 'n8n-mcp';
    features: ['natural-language-parsing', 'workflow-validation', 'deployment'];
  };
  
  deployment: {
    target: 'n8n-rest-api';
    features: ['workflow-publish', 'status-tracking'];
  };
  
  telemetry: {
    events: ['workflow-creation', 'deployment', 'user-signin', 'errors'];
    storage: 'supabase';
  };
}

export interface AgentCapabilities {
  canExecuteParallel: boolean;
  requiresDatabase: boolean;
  requiresExternalAPIs: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  mvpCritical: boolean;
}

export interface DevelopmentPhase {
  name: string;
  description: string;
  domains: BackendDomain[];
  prerequisites: string[];
  deliverables: string[];
  acceptanceCriteria: string[];
}

export interface OrchestrationState {
  currentPhase: string;
  activeTasks: AgentTask[];
  completedTasks: AgentTask[];
  blockedTasks: AgentTask[];
  overallProgress: number;
  estimatedCompletion: Date;
  risksAndBlockers: string[];
}

export interface AgentConfig {
  name: string;
  domain: string;
  capabilities: AgentCapabilities;
  maxConcurrentTasks: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface BackendAgent {
  config: AgentConfig;
  executeTask(task: AgentTask): Promise<AgentTaskResult>;
  validatePrerequisites(): Promise<boolean>;
  estimateTask(task: AgentTask): Promise<number>; // hours
  getStatus(): AgentStatus;
}

export interface AgentTaskResult {
  taskId: string;
  status: 'success' | 'failure' | 'partial';
  output?: any;
  errors?: string[];
  warnings?: string[];
  nextTasks?: AgentTask[];
  rollbackInstructions?: string[];
}

export interface AgentStatus {
  agentId: string;
  currentTask?: string;
  queueLength: number;
  isHealthy: boolean;
  lastHeartbeat: Date;
  performanceMetrics: {
    tasksCompleted: number;
    averageTaskTime: number;
    errorRate: number;
  };
}

export interface MVPValidationResult {
  isCompliant: boolean;
  violations: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

// Database Schema Types (from MVP Spec)
export interface DatabaseSchema {
  users: {
    id: string;
    email: string;
    created_at: Date;
    last_sign_in: Date;
  };
  
  projects: {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    created_at: Date;
    updated_at: Date;
  };
  
  workflows: {
    id: string;
    project_id: string;
    name: string;
    description?: string;
    json_payload: object;
    version: number;
    status: 'draft' | 'deployed' | 'failed';
    created_at: Date;
    deployed_at?: Date;
  };
  
  executions: {
    id: string;
    workflow_id: string;
    status: 'success' | 'failed' | 'running';
    started_at: Date;
    finished_at?: Date;
    error_message?: string;
  };
  
  telemetry_events: {
    id: string;
    user_id?: string;
    event_type: string;
    event_data: object;
    created_at: Date;
  };
}

// API Endpoint Types (from MVP Spec)
export interface APIEndpoints {
  auth: {
    'POST /auth/signup': { email: string; password: string };
    'POST /auth/signin': { email: string; password: string };
    'POST /auth/signout': {};
    'GET /auth/user': {};
  };
  
  projects: {
    'GET /projects': {};
    'POST /projects': { name: string; description?: string };
    'GET /projects/:id': {};
    'PUT /projects/:id': { name?: string; description?: string };
    'DELETE /projects/:id': {};
  };
  
  workflows: {
    'GET /projects/:projectId/workflows': {};
    'POST /projects/:projectId/workflows': { prompt: string };
    'GET /workflows/:id': {};
    'POST /workflows/:id/deploy': {};
    'GET /workflows/:id/executions': {};
  };
}

export interface SpecialistAgentDomains {
  database: 'DatabaseArchitectAgent';
  api: 'APIServerAgent';
  auth: 'AuthenticationAgent';
  n8n: 'N8NIntegrationAgent';
  ai: 'AIProcessingAgent';
  testing: 'TestingAgent';
  devops: 'DevOpsAgent';
}