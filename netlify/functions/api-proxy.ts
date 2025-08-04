/**
 * Main API Proxy - Netlify Function
 * Handles all API requests with auth, rate limiting, and routing
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { webhookGateway } from '../../src/lib/services/WebhookGateway';
import { executionMonitor } from '../../src/lib/services/ExecutionMonitor';
import { costAttribution } from '../../src/lib/services/CostAttribution';
import { modelDecisionEngine } from '../../src/lib/services/ModelDecisionEngine';

// Initialize Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for admin operations
);

// Rate limiting cache (in-memory for function lifecycle)
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

/**
 * Main handler for all API requests
 */
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS for CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    // Extract path and method
    const path = event.path.replace('/.netlify/functions/api-proxy', '');
    const method = event.httpMethod;

    // 1. Authenticate user
    const token = event.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No authorization token provided' }),
      };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired token' }),
      };
    }

    // 2. Check rate limiting
    if (!checkRateLimit(user.id)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
      };
    }

    // 3. Check user quota
    const hasQuota = await costAttribution.checkQuota(user.id);
    if (!hasQuota) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Quota exceeded. Please upgrade your plan.',
          usage: await costAttribution.getUserUsageStats(user.id),
        }),
      };
    }

    // 4. Route to appropriate handler
    const body = event.body ? JSON.parse(event.body) : {};
    
    let response: any;
    switch (true) {
      // Workflow generation
      case path === '/workflows/generate' && method === 'POST':
        response = await handleWorkflowGeneration(user.id, body);
        break;

      // Workflow execution
      case path === '/workflows/execute' && method === 'POST':
        response = await handleWorkflowExecution(user.id, body);
        break;

      // Webhook handling
      case path.startsWith('/webhook/') && method === 'POST':
        response = await handleWebhook(user.id, path, body, event.headers);
        break;

      // Get user executions
      case path === '/executions' && method === 'GET':
        response = await executionMonitor.getUserExecutions(user.id);
        break;

      // Get usage stats
      case path === '/usage' && method === 'GET':
        response = await costAttribution.getUserUsageStats(user.id);
        break;

      // Get billing report
      case path === '/billing' && method === 'GET':
        const startDate = new Date(event.queryStringParameters?.start || new Date().setDate(1));
        const endDate = new Date(event.queryStringParameters?.end || new Date());
        response = await costAttribution.generateBillingReport(user.id, startDate, endDate);
        break;

      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Endpoint not found' }),
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (error: any) {
    console.error('API Proxy Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};

/**
 * Simple in-memory rate limiting
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimitCache.get(userId);
  const WINDOW_MS = 60000; // 1 minute
  const MAX_REQUESTS = 100; // 100 requests per minute

  if (!limit || limit.resetTime < now) {
    rateLimitCache.set(userId, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }

  if (limit.count >= MAX_REQUESTS) {
    return false;
  }

  limit.count++;
  return true;
}

/**
 * Handle workflow generation request
 */
async function handleWorkflowGeneration(userId: string, body: any) {
  const { request, tier = 'free', preference = 'balanced' } = body;

  // Get AI model recommendation
  const recommendation = modelDecisionEngine.getRecommendation(request, tier, preference);

  // Generate workflow using recommended model
  // This would call your OrchestratorAgent
  const workflow = {
    model: recommendation.model,
    complexity: recommendation.complexity,
    estimatedCost: recommendation.estimatedCost,
    // Add actual workflow generation here
  };

  return workflow;
}

/**
 * Handle workflow execution request
 */
async function handleWorkflowExecution(userId: string, body: any) {
  const { workflowId, data } = body;

  // Start monitoring
  const executionId = crypto.randomUUID();
  await executionMonitor.startMonitoring(executionId, workflowId, userId);

  // Trigger n8n execution (would be async)
  // For Netlify, we'll return immediately and poll status
  triggerN8nExecution(workflowId, data, executionId);

  return {
    executionId,
    status: 'queued',
    message: 'Workflow execution started. Poll /executions/{id} for status.',
  };
}

/**
 * Handle webhook request
 */
async function handleWebhook(userId: string, path: string, body: any, headers: any) {
  // Extract workflowId from path
  const pathParts = path.split('/');
  const workflowId = pathParts[pathParts.length - 1];

  return await webhookGateway.handleWebhook({
    userId,
    workflowId,
    payload: body,
    headers,
    signature: headers['x-webhook-signature'],
  });
}

/**
 * Trigger n8n execution (fire and forget for serverless)
 */
async function triggerN8nExecution(workflowId: string, data: any, executionId: string) {
  const n8nUrl = process.env.VITE_N8N_API_URL;
  const n8nApiKey = process.env.VITE_N8N_API_KEY;

  try {
    await fetch(`${n8nUrl}/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey!,
      },
      body: JSON.stringify({ 
        body: { 
          ...data, 
          __executionId: executionId 
        } 
      }),
    });
  } catch (error) {
    console.error('Failed to trigger n8n execution:', error);
  }
}