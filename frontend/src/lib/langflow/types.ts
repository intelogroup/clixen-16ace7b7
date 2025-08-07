/**
 * Langflow Integration Types
 * Comprehensive type definitions for the Clixen-Langflow integration system
 */

// Core Langflow Types
export interface LangflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    type: string;
    node: {
      base_classes: string[];
      description: string;
      display_name: string;
      documentation: string;
      custom_fields?: Record<string, any>;
      template: Record<string, LangflowTemplate>;
    };
  };
}

export interface LangflowTemplate {
  type: string;
  required: boolean;
  placeholder?: string;
  list?: boolean;
  show: boolean;
  multiline?: boolean;
  value?: any;
  display_name: string;
  advanced: boolean;
  dynamic: boolean;
  info: string;
}

export interface LangflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: any;
}

export interface LangflowFlow {
  description: string;
  name: string;
  id?: string;
  data: {
    edges: LangflowEdge[];
    nodes: LangflowNode[];
    viewport?: { x: number; y: number; zoom: number };
  };
  is_component: boolean;
  updated_at?: string;
  folder_id?: string;
  endpoint_name?: string;
}

// Agent Tool Integration Types
export interface AgentToolDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'database' | 'api' | 'auth' | 'n8n' | 'ai' | 'testing' | 'devops';
  icon: string;
  color: string;
  inputs: AgentToolInput[];
  outputs: AgentToolOutput[];
  capabilities: string[];
  requirements: string[];
  complexity: 'low' | 'medium' | 'high';
  estimatedExecutionTime: number; // in seconds
  langflowNodeType: string;
}

export interface AgentToolInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file';
  required: boolean;
  description: string;
  placeholder?: string;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
}

export interface AgentToolOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
}

export interface AgentToolExecutionContext {
  toolId: string;
  inputs: Record<string, any>;
  executionId: string;
  userId: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface AgentToolExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  metadata?: Record<string, any>;
  logs?: string[];
  warnings?: string[];
}

// Workflow Templates
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'crud-api' | 'complex-integration' | 'rapid-prototype' | 'automation' | 'data-processing';
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
  thumbnail?: string;
  langflowFlow: LangflowFlow;
  requiredServices: string[];
  variables: WorkflowTemplateVariable[];
  instructions: string[];
}

export interface WorkflowTemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  description: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
}

// Execution and Monitoring
export interface WorkflowExecution {
  id: string;
  userId: string;
  flowId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  error?: string;
  logs: WorkflowExecutionLog[];
  metadata?: Record<string, any>;
}

export interface WorkflowExecutionLog {
  id: string;
  executionId: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  nodeId?: string;
  data?: any;
}

// Visual Builder Types
export interface VisualBuilderState {
  flow: LangflowFlow;
  selectedNodeId?: string;
  selectedEdgeId?: string;
  mode: 'view' | 'edit' | 'debug';
  zoom: number;
  viewport: { x: number; y: number };
  isExecuting: boolean;
  executionResults?: Record<string, any>;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface DragItem {
  type: 'agent-tool';
  toolDefinition: AgentToolDefinition;
}

// API Response Types
export interface LangflowAPIResponse<T = any> {
  message: string;
  detail?: T;
}

export interface LangflowFlowResponse extends LangflowAPIResponse {
  detail: LangflowFlow;
}

export interface LangflowExecutionResponse extends LangflowAPIResponse {
  detail: {
    run_id: string;
    status: string;
    outputs?: Record<string, any>;
  };
}

// Configuration Types
export interface LangflowConfig {
  apiUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  batchSize: number;
}

export interface LangflowIntegrationConfig {
  enabled: boolean;
  autoSave: boolean;
  debugMode: boolean;
  maxExecutionTime: number; // in seconds
  maxConcurrentExecutions: number;
  defaultModelSelection: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo';
  features: {
    visualBuilder: boolean;
    templateLibrary: boolean;
    realTimeExecution: boolean;
    collaborativeEditing: boolean;
  };
}

// Event Types for Real-time Updates
export interface LangflowEvent {
  type: 'execution_start' | 'execution_progress' | 'execution_complete' | 'execution_error' | 'node_update';
  executionId: string;
  data?: any;
  timestamp: Date;
}

// Database Schema Types (for Supabase integration)
export interface LangflowWorkflowRecord {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  langflow_data: LangflowFlow;
  template_id?: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  execution_count: number;
  last_execution_at?: string;
  metadata?: Record<string, any>;
}

export interface LangflowExecutionRecord {
  id: string;
  workflow_id: string;
  user_id: string;
  status: WorkflowExecution['status'];
  started_at: string;
  completed_at?: string;
  duration?: number;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  error_message?: string;
  logs: WorkflowExecutionLog[];
  cost_attribution?: {
    ai_tokens: number;
    execution_time: number;
    api_calls: number;
  };
}

export interface LangflowTemplateRecord {
  id: string;
  name: string;
  description: string;
  category: WorkflowTemplate['category'];
  difficulty: WorkflowTemplate['difficulty'];
  template_data: WorkflowTemplate;
  usage_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  tags: string[];
}

// Analytics and Metrics
export interface LangflowAnalytics {
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  popularTemplates: Array<{ id: string; name: string; count: number }>;
  errorStats: Array<{ error: string; count: number }>;
  costMetrics: {
    totalAITokens: number;
    totalExecutionTime: number;
    totalAPICalls: number;
    estimatedCost: number;
  };
}

// Error Types
export class LangflowError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'LangflowError';
  }
}

export class AgentToolExecutionError extends Error {
  constructor(
    message: string,
    public toolId: string,
    public executionContext: AgentToolExecutionContext,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AgentToolExecutionError';
  }
}