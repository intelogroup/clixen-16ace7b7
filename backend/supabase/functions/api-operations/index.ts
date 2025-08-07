import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// Types for API operations
interface N8nWorkflow {
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

interface N8nExecution {
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

interface ApiUsageRecord {
  user_id: string;
  api_name: string;
  endpoint: string;
  usage_count: number;
  tokens_used?: number;
  cost_units?: number;
  metadata?: Record<string, any>;
}

interface BatchOperation {
  operation: 'create' | 'update' | 'delete' | 'execute' | 'toggle';
  workflowId?: string;
  data?: any;
}

interface BatchResponse {
  success: boolean;
  results: Array<{
    operation: string;
    workflowId?: string;
    success: boolean;
    data?: any;
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    processing_time: number;
  };
}

interface RateLimitConfig {
  requests_per_minute: number;
  requests_per_hour: number;
  burst_limit: number;
}

// Initialize clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const n8nApiUrl = Deno.env.get('N8N_API_URL') || 'http://18.221.12.50:5678/api/v1';
const n8nApiKey = Deno.env.get('N8N_API_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Rate limiting configuration per user tier
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    requests_per_minute: 10,
    requests_per_hour: 100,
    burst_limit: 15,
  },
  pro: {
    requests_per_minute: 30,
    requests_per_hour: 1000,
    burst_limit: 50,
  },
  enterprise: {
    requests_per_minute: 100,
    requests_per_hour: 10000,
    burst_limit: 200,
  },
};

// In-memory rate limiting cache (upgrade to Redis for production)
const rateLimitCache = new Map<string, { count: number; resetTime: number; burst: number }>();

// Utility functions
const logApiUsage = async (
  userId: string,
  apiName: string,
  endpoint: string,
  usageCount = 1,
  tokensUsed = 0,
  costUnits = 0,
  metadata: Record<string, any> = {}
): Promise<void> => {
  try {
    await supabase
      .from('api_usage')
      .insert({
        user_id: userId,
        api_name: apiName,
        endpoint,
        usage_count: usageCount,
        tokens_used: tokensUsed,
        cost_units: costUnits,
        metadata,
      });
  } catch (error) {
    console.error('Error logging API usage:', error);
  }
};

const getUserTier = async (userId: string): Promise<string> => {
  try {
    // Check if user has a subscription or tier setting
    const { data: user, error } = await supabase
      .from('auth.users')
      .select('raw_user_meta_data')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return 'free'; // Default tier
    }

    return user.raw_user_meta_data?.tier || 'free';
  } catch (error) {
    console.error('Error getting user tier:', error);
    return 'free';
  }
};

const checkRateLimit = async (userId: string, tier: string): Promise<{ allowed: boolean; resetTime: number }> => {
  const limits = RATE_LIMITS[tier] || RATE_LIMITS.free;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const key = `${userId}:${Math.floor(now / windowMs)}`;
  
  const current = rateLimitCache.get(key) || { count: 0, resetTime: now + windowMs, burst: 0 };
  
  // Check if within limits
  if (current.count >= limits.requests_per_minute && current.burst >= limits.burst_limit) {
    return { allowed: false, resetTime: current.resetTime };
  }
  
  // Update counters
  current.count++;
  if (current.count > limits.requests_per_minute) {
    current.burst++;
  }
  
  rateLimitCache.set(key, current);
  
  // Clean up old entries
  for (const [cacheKey, value] of rateLimitCache.entries()) {
    if (value.resetTime < now) {
      rateLimitCache.delete(cacheKey);
    }
  }
  
  return { allowed: true, resetTime: current.resetTime };
};

const makeN8nRequest = async (
  endpoint: string,
  method = 'GET',
  body?: any,
  headers: Record<string, string> = {}
): Promise<any> => {
  const url = `${n8nApiUrl}${endpoint}`;
  
  const requestOptions: RequestInit = {
    method,
    headers: {
      'X-N8N-API-KEY': n8nApiKey,
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      let parsedError;
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        parsedError = { message: errorText };
      }
      
      throw new Error(`n8n API Error ${response.status}: ${parsedError.message || errorText}`);
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
};

// Workflow operations
const getWorkflows = async (userId: string): Promise<N8nWorkflow[]> => {
  try {
    const response = await makeN8nRequest('/workflows');
    await logApiUsage(userId, 'n8n', '/workflows', 1, 0, 0.001);
    return response.data || response;
  } catch (error) {
    throw new Error(`Failed to fetch workflows: ${error.message}`);
  }
};

const getWorkflow = async (userId: string, workflowId: string): Promise<N8nWorkflow> => {
  try {
    const response = await makeN8nRequest(`/workflows/${workflowId}`);
    await logApiUsage(userId, 'n8n', `/workflows/${workflowId}`, 1, 0, 0.001);
    return response;
  } catch (error) {
    throw new Error(`Failed to fetch workflow ${workflowId}: ${error.message}`);
  }
};

const createWorkflow = async (userId: string, workflow: N8nWorkflow): Promise<N8nWorkflow> => {
  try {
    const response = await makeN8nRequest('/workflows', 'POST', workflow);
    await logApiUsage(userId, 'n8n', '/workflows', 1, 0, 0.005, { operation: 'create', workflow_name: workflow.name });
    return response;
  } catch (error) {
    throw new Error(`Failed to create workflow: ${error.message}`);
  }
};

const updateWorkflow = async (userId: string, workflowId: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> => {
  try {
    const response = await makeN8nRequest(`/workflows/${workflowId}`, 'PUT', workflow);
    await logApiUsage(userId, 'n8n', `/workflows/${workflowId}`, 1, 0, 0.003, { operation: 'update' });
    return response;
  } catch (error) {
    throw new Error(`Failed to update workflow ${workflowId}: ${error.message}`);
  }
};

const deleteWorkflow = async (userId: string, workflowId: string): Promise<boolean> => {
  try {
    await makeN8nRequest(`/workflows/${workflowId}`, 'DELETE');
    await logApiUsage(userId, 'n8n', `/workflows/${workflowId}`, 1, 0, 0.002, { operation: 'delete' });
    return true;
  } catch (error) {
    throw new Error(`Failed to delete workflow ${workflowId}: ${error.message}`);
  }
};

const toggleWorkflow = async (userId: string, workflowId: string, active: boolean): Promise<N8nWorkflow> => {
  try {
    const endpoint = active ? `/workflows/${workflowId}/activate` : `/workflows/${workflowId}/deactivate`;
    const response = await makeN8nRequest(endpoint, 'POST');
    await logApiUsage(userId, 'n8n', endpoint, 1, 0, 0.002, { operation: active ? 'activate' : 'deactivate' });
    return response;
  } catch (error) {
    throw new Error(`Failed to ${active ? 'activate' : 'deactivate'} workflow ${workflowId}: ${error.message}`);
  }
};

const executeWorkflow = async (userId: string, workflowId: string, data?: any): Promise<any> => {
  try {
    const response = await makeN8nRequest(`/workflows/${workflowId}/execute`, 'POST', { data });
    await logApiUsage(userId, 'n8n', `/workflows/${workflowId}/execute`, 1, 0, 0.01, { 
      operation: 'execute',
      execution_mode: 'manual'
    });
    return response;
  } catch (error) {
    throw new Error(`Failed to execute workflow ${workflowId}: ${error.message}`);
  }
};

const getExecutions = async (userId: string, workflowId?: string, limit = 20): Promise<N8nExecution[]> => {
  try {
    const endpoint = workflowId 
      ? `/executions?workflowId=${workflowId}&limit=${limit}`
      : `/executions?limit=${limit}`;
    
    const response = await makeN8nRequest(endpoint);
    await logApiUsage(userId, 'n8n', '/executions', 1, 0, 0.001);
    return response.data || response;
  } catch (error) {
    throw new Error(`Failed to fetch executions: ${error.message}`);
  }
};

// Batch operations
const processBatchOperations = async (userId: string, operations: BatchOperation[]): Promise<BatchResponse> => {
  const startTime = Date.now();
  const results: BatchResponse['results'] = [];
  let successful = 0;
  let failed = 0;

  for (const operation of operations) {
    try {
      let result: any;
      
      switch (operation.operation) {
        case 'create':
          result = await createWorkflow(userId, operation.data);
          break;
        case 'update':
          result = await updateWorkflow(userId, operation.workflowId!, operation.data);
          break;
        case 'delete':
          result = await deleteWorkflow(userId, operation.workflowId!);
          break;
        case 'execute':
          result = await executeWorkflow(userId, operation.workflowId!, operation.data);
          break;
        case 'toggle':
          result = await toggleWorkflow(userId, operation.workflowId!, operation.data?.active || false);
          break;
        default:
          throw new Error(`Unknown operation: ${operation.operation}`);
      }

      results.push({
        operation: operation.operation,
        workflowId: operation.workflowId,
        success: true,
        data: result,
      });
      successful++;
    } catch (error) {
      results.push({
        operation: operation.operation,
        workflowId: operation.workflowId,
        success: false,
        error: error.message,
      });
      failed++;
    }
  }

  // Log batch operation usage
  await logApiUsage(userId, 'n8n', '/batch', operations.length, 0, operations.length * 0.005, {
    operation: 'batch',
    total_operations: operations.length,
    successful,
    failed,
  });

  return {
    success: failed === 0,
    results,
    summary: {
      total: operations.length,
      successful,
      failed,
      processing_time: Date.now() - startTime,
    },
  };
};

// Health check endpoint
const healthCheck = async (): Promise<{ status: string; n8n: boolean; database: boolean; timestamp: string }> => {
  let n8nHealthy = false;
  let dbHealthy = false;

  try {
    // Check n8n health
    await makeN8nRequest('/workflows?limit=1');
    n8nHealthy = true;
  } catch (error) {
    console.error('n8n health check failed:', error);
  }

  try {
    // Check database connection
    const { error } = await supabase.from('api_usage').select('id').limit(1);
    dbHealthy = !error;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  return {
    status: n8nHealthy && dbHealthy ? 'healthy' : 'degraded',
    n8n: n8nHealthy,
    database: dbHealthy,
    timestamp: new Date().toISOString(),
  };
};

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Health check endpoint
    if (path.endsWith('/health') && method === 'GET') {
      const health = await healthCheck();
      return new Response(
        JSON.stringify(health),
        { 
          status: health.status === 'healthy' ? 200 : 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract user ID from headers (should be set by authentication middleware)
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user from Supabase auth
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = user.id;
    const userTier = await getUserTier(userId);
    
    // Check rate limits
    const { allowed, resetTime } = await checkRateLimit(userId, userTier);
    if (!allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          reset_time: resetTime,
          tier: userTier,
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
          }
        }
      );
    }

    // Parse request body for POST/PUT/PATCH requests
    let body: any = {};
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        body = await req.json();
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    let response: any;

    // Handle special n8n-request action (for direct API proxying)
    if (body.action === 'n8n-request') {
      try {
        const { endpoint, method: reqMethod = 'GET', data } = body;
        response = await makeN8nRequest(endpoint, reqMethod, data);
        await logApiUsage(userId, 'n8n', endpoint, 1, 0, 0.001, { operation: 'proxy' });
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `n8n proxy error: ${error.message}`,
            timestamp: new Date().toISOString(),
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }
    // Route handling
    else if (path.endsWith('/workflows') && method === 'GET') {
      response = await getWorkflows(userId);
    } else if (path.match(/\/workflows\/[^\/]+$/) && method === 'GET') {
      const workflowId = path.split('/').pop()!;
      response = await getWorkflow(userId, workflowId);
    } else if (path.endsWith('/workflows') && method === 'POST') {
      response = await createWorkflow(userId, body);
    } else if (path.match(/\/workflows\/[^\/]+$/) && method === 'PUT') {
      const workflowId = path.split('/').pop()!;
      response = await updateWorkflow(userId, workflowId, body);
    } else if (path.match(/\/workflows\/[^\/]+$/) && method === 'DELETE') {
      const workflowId = path.split('/').pop()!;
      response = await deleteWorkflow(userId, workflowId);
    } else if (path.match(/\/workflows\/[^\/]+\/toggle$/) && method === 'POST') {
      const workflowId = path.split('/')[path.split('/').length - 2];
      response = await toggleWorkflow(userId, workflowId, body.active);
    } else if (path.match(/\/workflows\/[^\/]+\/execute$/) && method === 'POST') {
      const workflowId = path.split('/')[path.split('/').length - 2];
      response = await executeWorkflow(userId, workflowId, body.data);
    } else if (path.endsWith('/executions') && method === 'GET') {
      const workflowId = url.searchParams.get('workflowId') || undefined;
      const limit = parseInt(url.searchParams.get('limit') || '20');
      response = await getExecutions(userId, workflowId, limit);
    } else if (path.endsWith('/batch') && method === 'POST') {
      if (!Array.isArray(body.operations)) {
        return new Response(
          JSON.stringify({ error: 'Operations array is required for batch processing' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      response = await processBatchOperations(userId, body.operations);
    } else {
      return new Response(
        JSON.stringify({ error: 'Endpoint not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: response,
        user_tier: userTier,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('API operations error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      }),
      { 
        status: error.message?.includes('Authentication') ? 401 : 
               error.message?.includes('Rate limit') ? 429 : 
               error.message?.includes('not found') ? 404 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
