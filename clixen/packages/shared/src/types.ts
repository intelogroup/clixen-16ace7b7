// Clixen Shared Types

import { z } from 'zod';

// User types
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  created_at: z.string().datetime(),
  subscription_tier: z.enum(['free', 'pro', 'enterprise']).default('free'),
  workflow_quota: z.number().default(10),
  node_limit: z.number().default(8),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// Workflow types
export const WorkflowIntentSchema = z.object({
  userId: z.string().uuid(),
  intent: z.string().min(10).max(500),
  context: z.object({
    previousErrors: z.array(z.string()).optional(),
    retryCount: z.number().default(0),
  }).optional(),
});

export type WorkflowIntent = z.infer<typeof WorkflowIntentSchema>;

// n8n Node types
export const N8nNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  typeVersion: z.number(),
  position: z.tuple([z.number(), z.number()]),
  parameters: z.record(z.any()),
  credentials: z.record(z.any()).optional(),
  disabled: z.boolean().optional(),
});

export type N8nNode = z.infer<typeof N8nNodeSchema>;

// n8n Connection types
export const N8nConnectionSchema = z.object({
  node: z.string(),
  type: z.enum(['main']),
  index: z.number(),
});

export const N8nConnectionItemSchema = z.array(
  z.object({
    node: z.string(),
    type: z.enum(['main']),
    index: z.number(),
  })
);

// n8n Workflow types
export const N8nWorkflowSchema = z.object({
  name: z.string(),
  nodes: z.array(N8nNodeSchema),
  connections: z.record(
    z.string(),
    z.record(
      z.string(),
      z.array(z.array(N8nConnectionSchema))
    )
  ),
  active: z.boolean().default(false),
  settings: z.object({
    executionOrder: z.enum(['v0', 'v1']).default('v1'),
  }).optional(),
  tags: z.array(z.string()).optional(),
});

export type N8nWorkflow = z.infer<typeof N8nWorkflowSchema>;

// Clixen Workflow metadata
export const ClixenWorkflowSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  n8nWorkflowId: z.string().optional(),
  name: z.string(),
  description: z.string(),
  intent: z.string(),
  status: z.enum(['draft', 'deploying', 'active', 'failed', 'archived']),
  nodeCount: z.number(),
  lastRun: z.string().datetime().optional(),
  successRate: z.number().min(0).max(100).optional(),
  totalExecutions: z.number().default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ClixenWorkflow = z.infer<typeof ClixenWorkflowSchema>;

// Workflow generation response
export const WorkflowGenerationResponseSchema = z.object({
  success: z.boolean(),
  workflow: ClixenWorkflowSchema.optional(),
  n8nJson: N8nWorkflowSchema.optional(),
  error: z.string().optional(),
  retryable: z.boolean().default(false),
  debugInfo: z.object({
    gptTokensUsed: z.number().optional(),
    generationTime: z.number().optional(),
    validationErrors: z.array(z.string()).optional(),
  }).optional(),
});

export type WorkflowGenerationResponse = z.infer<typeof WorkflowGenerationResponseSchema>;

// Error tracking
export const WorkflowErrorSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  workflowId: z.string().optional(),
  intent: z.string(),
  errorMessage: z.string(),
  errorType: z.enum(['generation', 'validation', 'deployment', 'execution']),
  attemptNumber: z.number(),
  workflowJson: z.any().optional(),
  stackTrace: z.string().optional(),
  created_at: z.string().datetime(),
});

export type WorkflowError = z.infer<typeof WorkflowErrorSchema>;

// API Response types
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      message: z.string(),
      code: z.string().optional(),
      details: z.any().optional(),
    }).optional(),
    metadata: z.object({
      timestamp: z.string().datetime(),
      requestId: z.string().uuid(),
      version: z.string(),
    }).optional(),
  });

// GPT Prompt types
export const GPTPromptSchema = z.object({
  systemPrompt: z.string(),
  userPrompt: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().default(4000),
  model: z.enum(['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']).default('gpt-4'),
});

export type GPTPrompt = z.infer<typeof GPTPromptSchema>;

// Test data generation types
export const TestDataSchema = z.object({
  workflowId: z.string(),
  testType: z.string(),
  testData: z.record(z.any()),
  expectedResult: z.any().optional(),
});

export type TestData = z.infer<typeof TestDataSchema>;

// MCP validation types
export const MCPValidationRequestSchema = z.object({
  nodes: z.array(z.string()),
  credentials: z.array(z.string()).optional(),
});

export const MCPValidationResponseSchema = z.object({
  valid: z.boolean(),
  availableNodes: z.array(z.string()),
  missingNodes: z.array(z.string()),
  availableCredentials: z.array(z.string()).optional(),
  missingCredentials: z.array(z.string()).optional(),
});

export type MCPValidationRequest = z.infer<typeof MCPValidationRequestSchema>;
export type MCPValidationResponse = z.infer<typeof MCPValidationResponseSchema>;