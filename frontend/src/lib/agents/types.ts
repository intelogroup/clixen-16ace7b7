// Agent system types and interfaces
export interface AgentMessage {
  id: string;
  fromAgent: string;
  toAgent: string | 'broadcast';
  type: 'task' | 'result' | 'error' | 'status' | 'question';
  payload: any;
  timestamp: number;
  conversationId: string;
}

export interface AgentContext {
  conversationId: string;
  userId: string;
  userRequirements: WorkflowRequirement[];
  currentWorkflow?: WorkflowSpec;
  agentStates: Record<string, AgentState>;
  executionHistory: ExecutionStep[];
  validationResults: ValidationResult[];
  sharedMemory: Record<string, any>;
}

export interface WorkflowRequirement {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'integration';
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  parameters?: Record<string, any>;
}

export interface WorkflowSpec {
  id: string;
  name: string;
  description: string;
  nodes: N8nNode[];
  connections: N8nConnection[];
  triggers: TriggerSpec[];
  integrations: IntegrationSpec[];
  errorHandling: ErrorHandlingSpec;
  testing: TestingSpec;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, string>;
}

export interface N8nConnection {
  [sourceNode: string]: {
    main: Array<Array<{
      node: string;
      type: string;
      index: number;
    }>>;
  };
}

export interface TriggerSpec {
  type: 'webhook' | 'schedule' | 'manual' | 'email' | 'database';
  config: Record<string, any>;
  security?: SecurityConfig;
}

export interface IntegrationSpec {
  service: string;
  authType: 'oauth' | 'apikey' | 'basic' | 'custom';
  credentials: Record<string, any>;
  endpoints: string[];
  rateLimit?: RateLimitConfig;
}

export interface ErrorHandlingSpec {
  retryAttempts: number;
  fallbackActions: string[];
  notifications: NotificationConfig[];
  logging: LoggingConfig;
}

export interface TestingSpec {
  unitTests: TestCase[];
  integrationTests: TestCase[];
  performanceTests: PerformanceTest[];
  mockData: Record<string, any>;
}

export interface TestCase {
  id: string;
  name: string;
  input: any;
  expectedOutput: any;
  assertions: Assertion[];
}

export interface PerformanceTest {
  id: string;
  name: string;
  maxExecutionTime: number;
  maxMemoryUsage: number;
  concurrentExecutions: number;
}

export interface Assertion {
  type: 'equals' | 'contains' | 'exists' | 'type' | 'range';
  field: string;
  value: any;
}

export interface SecurityConfig {
  authentication: boolean;
  ipWhitelist?: string[];
  rateLimit?: RateLimitConfig;
  encryption?: EncryptionConfig;
}

export interface RateLimitConfig {
  requests: number;
  window: number; // seconds
  burst?: number;
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: string;
  keyRotation: number; // days
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  recipients: string[];
  conditions: string[];
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  destinations: ('console' | 'file' | 'database' | 'external')[];
  retention: number; // days
}

export interface AgentState {
  id: string;
  name: string;
  status: 'idle' | 'thinking' | 'working' | 'waiting' | 'error' | 'completed';
  currentTask?: string;
  progress: number; // 0-100
  lastUpdate: number;
  metadata: Record<string, any>;
}

export interface ExecutionStep {
  id: string;
  agentId: string;
  action: string;
  input: any;
  output?: any;
  error?: string;
  duration: number;
  timestamp: number;
}

export interface ValidationResult {
  id: string;
  type: 'syntax' | 'logic' | 'security' | 'performance' | 'integration';
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: Record<string, any>;
  suggestions?: string[];
}

export interface AgentCapability {
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  reliability: number; // 0-1
}

export interface AgentConfig {
  id: string;
  name: string;
  type: 'orchestrator' | 'specialist' | 'monitor';
  capabilities: AgentCapability[];
  model: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3-sonnet';
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  tools: string[];
  fallbackAgent?: string;
}

export interface ConversationState {
  id: string;
  userId: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  startedAt: number;
  lastActivity: number;
  messages: ChatMessage[];
  context: AgentContext;
  activeAgents: string[];
  completedTasks: string[];
  currentPhase: WorkflowPhase;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
  agentId?: string;
}

export type WorkflowPhase = 
  | 'understanding'
  | 'planning' 
  | 'designing'
  | 'building'
  | 'testing'
  | 'deploying'
  | 'monitoring'
  | 'completed'
  | 'failed';

export interface PhaseConfig {
  phase: WorkflowPhase;
  requiredAgents: string[];
  exitCriteria: string[];
  timeoutMs: number;
  retryCount: number;
}