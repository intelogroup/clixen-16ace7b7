import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { authenticate, verifyOwnership, logAuthEvent } from '../_shared/auth.ts';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createValidationErrorResponse,
  createAuthErrorResponse,
  ApiResponse
} from '../_shared/responses.ts';
import { validate, WORKFLOW_GENERATION_RULES, validateWorkflowJSON, validateUUID } from '../_shared/validation.ts';
import { supabase } from '../_shared/supabase.ts';
import { 
  makeN8nRequest, 
  createN8nWorkflow, 
  setN8nWorkflowStatus, 
  getN8nWorkflow,
  getN8nExecutions,
  extractWebhookUrls,
  calculateWorkflowHealth,
  n8nConfig 
} from '../_shared/n8n.ts';

// Types for Workflow API
interface Workflow {
  id?: string;
  user_id?: string;
  project_id: string;
  name: string;
  description?: string;
  n8n_workflow_id?: string;
  n8n_workflow_json: any;
  original_prompt: string;
  status: 'draft' | 'validated' | 'deployed' | 'failed' | 'archived';
  version: number;
  deployment_status: 'not_deployed' | 'deploying' | 'deployed' | 'failed' | 'updating';
  deployment_url?: string;
  deployment_error?: string;
  last_deployed_at?: string;
  execution_count?: number;
  last_execution_at?: string;
  avg_execution_time_ms?: number;
  created_at?: string;
  updated_at?: string;
}

interface GenerateWorkflowRequest {
  prompt: string;
  project_id: string;
  name?: string;
  description?: string;
}

interface DeployWorkflowRequest {
  activate?: boolean;
  test_data?: any;
}

interface WorkflowStatus {
  workflow_id: string;
  n8n_workflow_id?: string;
  status: string;
  deployment_status: string;
  deployment_url?: string;
  last_deployed_at?: string;
  execution_count: number;
  last_execution_at?: string;
  health_score?: number;
  validation_issues?: string[];
  webhook_urls?: string[];
}

// All shared utilities are now imported from shared modules

// Authentication is now handled by shared auth utilities

// Get OpenAI API key
const getOpenAIKey = async (userId?: string): Promise<string | null> => {
  try {
    // Try user-specific key first
    if (userId) {
      const { data, error } = await supabase
        .from('api_keys')
        .select('openai_api_key')
        .eq('user_id', userId)
        .single();
      
      if (!error && data?.openai_api_key) {
        return data.openai_api_key;
      }
    }
    
    // Fallback to environment or database
    const envKey = Deno.env.get('OPENAI_API_KEY');
    if (envKey) {
      return envKey;
    }
    
    const { data, error } = await supabase
      .from('api_configurations')
      .select('api_key')
      .eq('service_name', 'openai')
      .eq('is_active', true)
      .single();
    
    return data?.api_key || null;
  } catch (error) {
    console.error('Error getting OpenAI key:', error);
    return null;
  }
};

// n8n API operations now handled by shared n8n utilities

// Generate workflow using OpenAI
const generateWorkflowFromPrompt = async (
  prompt: string,
  userId: string
): Promise<{ workflowJson: any; name: string; description: string }> => {
  const openaiKey = await getOpenAIKey(userId);
  
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured. Please add your OpenAI API key to continue.');
  }

  const systemPrompt = `You are an expert n8n workflow designer. Given a user's natural language description, create a complete, valid n8n workflow JSON structure.

CRITICAL REQUIREMENTS:
1. Return ONLY a valid JSON object - no markdown, no explanations
2. Include ALL required fields: name, nodes, connections, active, settings, staticData
3. Use realistic node configurations with proper parameters
4. Include proper error handling and sensible defaults
5. Ensure nodes are properly connected with valid connection objects

The workflow should be immediately deployable to n8n without modification.`;

  const userPrompt = `Create an n8n workflow for: ${prompt}

Requirements:
- Make it production-ready with error handling
- Use appropriate trigger nodes (Webhook, Cron, or Manual)
- Include descriptive names for all nodes
- Add proper data transformations where needed
- Ensure all connections are valid

Return the complete workflow JSON:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API Error: ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response generated from OpenAI');
    }

    // Extract JSON from response
    let workflowJson;
    try {
      // Try to parse as direct JSON first
      workflowJson = JSON.parse(aiResponse);
    } catch {
      // Try to extract JSON from markdown
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        workflowJson = JSON.parse(jsonMatch[1]);
      } else {
        // Try to find JSON object in the response
        const jsonStart = aiResponse.indexOf('{');
        const jsonEnd = aiResponse.lastIndexOf('}') + 1;
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          workflowJson = JSON.parse(aiResponse.substring(jsonStart, jsonEnd));
        } else {
          throw new Error('Could not extract valid JSON from AI response');
        }
      }
    }

    // Validate required fields
    if (!workflowJson.name || !workflowJson.nodes || !workflowJson.connections) {
      throw new Error('Generated workflow missing required fields (name, nodes, connections)');
    }

    // Generate name and description from prompt if not provided
    const name = workflowJson.name || `Workflow for: ${prompt.substring(0, 50)}...`;
    const description = workflowJson.meta?.description || `Auto-generated workflow: ${prompt}`;

    return {
      workflowJson,
      name,
      description
    };

  } catch (error) {
    console.error('Error generating workflow:', error);
    throw new Error(`Failed to generate workflow: ${error.message}`);
  }
};

// Create workflow in database
const createWorkflow = async (
  userId: string,
  projectId: string,
  workflowData: {
    name: string;
    description?: string;
    n8n_workflow_json: any;
    original_prompt: string;
  }
): Promise<Workflow> => {
  try {
    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or access denied');
    }

    const { data: workflow, error } = await supabase
      .from('mvp_workflows')
      .insert({
        user_id: userId,
        project_id: projectId,
        name: workflowData.name,
        description: workflowData.description || null,
        n8n_workflow_json: workflowData.n8n_workflow_json,
        original_prompt: workflowData.original_prompt,
        status: 'draft',
        version: 1,
        deployment_status: 'not_deployed'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating workflow:', error);
      throw new Error(`Failed to create workflow: ${error.message}`);
    }

    // Log telemetry
    await supabase
      .from('telemetry_events')
      .insert({
        user_id: userId,
        event_type: 'workflow_generated',
        event_category: 'workflow',
        project_id: projectId,
        workflow_id: workflow.id,
        event_data: {
          workflow_name: workflowData.name,
          prompt_length: workflowData.original_prompt.length,
          node_count: workflowData.n8n_workflow_json.nodes?.length || 0
        },
        success: true
      })
      .catch(err => console.warn('Failed to log telemetry:', err));

    return workflow;

  } catch (error) {
    console.error('Error in createWorkflow:', error);
    throw error;
  }
};

// Deploy workflow to n8n
const deployWorkflow = async (
  userId: string, 
  workflowId: string,
  options: DeployWorkflowRequest = {}
): Promise<{
  n8n_workflow_id: string;
  deployment_url?: string;
  webhook_urls?: string[];
  status: string;
}> => {
  try {
    // Get workflow from database
    const { data: workflow, error } = await supabase
      .from('mvp_workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single();

    if (error || !workflow) {
      throw new Error('Workflow not found or access denied');
    }

    // Update deployment status to deploying
    await supabase
      .from('mvp_workflows')
      .update({ deployment_status: 'deploying' })
      .eq('id', workflowId);

    try {
      // Create workflow in n8n
      const n8nWorkflow = await createN8nWorkflow(workflow.n8n_workflow_json);
      
      if (!n8nWorkflow.id) {
        throw new Error('n8n did not return workflow ID');
      }

      // Activate if requested
      if (options.activate !== false) {
        await setN8nWorkflowStatus(n8nWorkflow.id, true);
      }

      // Extract webhook URLs using shared utility
      const webhookUrls = extractWebhookUrls(workflow.n8n_workflow_json);

      // Update workflow in database
      const updateData: any = {
        n8n_workflow_id: n8nWorkflow.id,
        deployment_status: 'deployed',
        status: 'deployed',
        last_deployed_at: new Date().toISOString(),
        deployment_url: `${n8nConfig.baseUrl}/workflow/${n8nWorkflow.id}`,
        deployment_error: null
      };

      await supabase
        .from('mvp_workflows')
        .update(updateData)
        .eq('id', workflowId);

      // Create deployment record
      await supabase
        .from('deployments')
        .insert({
          user_id: userId,
          workflow_id: workflowId,
          n8n_workflow_id: n8nWorkflow.id,
          deployment_version: workflow.version,
          status: 'deployed',
          n8n_response: n8nWorkflow,
          deployment_url: updateData.deployment_url,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - Date.parse(workflow.updated_at)
        })
        .catch(err => console.warn('Failed to create deployment record:', err));

      // Log telemetry
      await supabase
        .from('telemetry_events')
        .insert({
          user_id: userId,
          event_type: 'workflow_deployed',
          event_category: 'deployment',
          project_id: workflow.project_id,
          workflow_id: workflowId,
          event_data: {
            n8n_workflow_id: n8nWorkflow.id,
            webhook_count: webhookUrls.length,
            activated: options.activate !== false
          },
          success: true
        })
        .catch(err => console.warn('Failed to log telemetry:', err));

      // Update user deployment count
      await supabase.rpc('increment_user_deployments', { user_uuid: userId })
        .catch(err => console.warn('Failed to update deployment count:', err));

      return {
        n8n_workflow_id: n8nWorkflow.id,
        deployment_url: updateData.deployment_url,
        webhook_urls: webhookUrls,
        status: 'deployed'
      };

    } catch (deployError) {
      // Update workflow with deployment error
      await supabase
        .from('mvp_workflows')
        .update({ 
          deployment_status: 'failed',
          deployment_error: deployError.message
        })
        .eq('id', workflowId);

      // Log deployment error
      await supabase
        .from('telemetry_events')
        .insert({
          user_id: userId,
          event_type: 'workflow_deployment_failed',
          event_category: 'error',
          project_id: workflow.project_id,
          workflow_id: workflowId,
          event_data: {
            error: deployError.message
          },
          success: false,
          error_message: deployError.message
        })
        .catch(err => console.warn('Failed to log telemetry:', err));

      throw deployError;
    }

  } catch (error) {
    console.error('Error in deployWorkflow:', error);
    throw error;
  }
};

// Get workflow status
const getWorkflowStatus = async (userId: string, workflowId: string): Promise<WorkflowStatus> => {
  try {
    const { data: workflow, error } = await supabase
      .from('mvp_workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single();

    if (error || !workflow) {
      throw new Error('Workflow not found or access denied');
    }

    const status: WorkflowStatus = {
      workflow_id: workflowId,
      n8n_workflow_id: workflow.n8n_workflow_id,
      status: workflow.status,
      deployment_status: workflow.deployment_status,
      deployment_url: workflow.deployment_url,
      last_deployed_at: workflow.last_deployed_at,
      execution_count: workflow.execution_count || 0,
      last_execution_at: workflow.last_execution_at
    };

    // Get additional data from n8n if deployed
    if (workflow.n8n_workflow_id && workflow.deployment_status === 'deployed') {
      try {
        // Get workflow details from n8n
        const n8nWorkflow = await getN8nWorkflow(workflow.n8n_workflow_id);
        
        // Calculate workflow health using shared utility
        const { healthScore, issues } = await calculateWorkflowHealth(workflow.n8n_workflow_id);
        
        status.health_score = healthScore;
        if (issues.length > 0) {
          status.validation_issues = issues;
        }

        // Extract webhook URLs using shared utility
        status.webhook_urls = extractWebhookUrls(n8nWorkflow);

      } catch (n8nError) {
        console.warn('Could not fetch additional status from n8n:', n8nError);
        status.validation_issues = ['Could not connect to n8n for detailed status'];
      }
    }

    return status;

  } catch (error) {
    console.error('Error in getWorkflowStatus:', error);
    throw error;
  }
};

// Get workflow details
const getWorkflow = async (userId: string, workflowId: string): Promise<Workflow> => {
  try {
    const { data: workflow, error } = await supabase
      .from('mvp_workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single();

    if (error || !workflow) {
      throw new Error('Workflow not found or access denied');
    }

    return workflow;
  } catch (error) {
    console.error('Error in getWorkflow:', error);
    throw error;
  }
};

// Input validation is now handled by shared validation utilities

// Main request handler
serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);
  
  console.log(`🚀 [WORKFLOWS-API-${requestId}] ${req.method} ${req.url}`);

  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Authenticate user using shared utility
    const { user, error: authError } = await authenticate(req);
    if (authError || !user) {
      return createAuthErrorResponse(authError || 'Authentication failed');
    }

    const userId = user.id;
    let response: ApiResponse;
    let statusCode = 200;

    // Route handling
    if (pathSegments.length >= 2 && pathSegments[0] === 'workflows') {
      if (pathSegments[1] === 'generate' && req.method === 'POST') {
        // POST /workflows/generate - Generate workflow from prompt
        const body = await req.json();
        const validation = validate(body, WORKFLOW_GENERATION_RULES);
        
        if (!validation.isValid) {
          return createValidationErrorResponse('request', validation.errors.join(', '));
        }

        // Generate workflow using AI
        const generated = await generateWorkflowFromPrompt(body.prompt, userId);
        
        // Create workflow in database
        const workflow = await createWorkflow(userId, validation.sanitizedData.project_id, {
          name: validation.sanitizedData.name || generated.name,
          description: validation.sanitizedData.description || generated.description,
          n8n_workflow_json: generated.workflowJson,
          original_prompt: validation.sanitizedData.prompt
        });

        return createSuccessResponse({
          workflow,
          generated_name: generated.name,
          generated_description: generated.description,
          node_count: generated.workflowJson.nodes?.length || 0
        }, 'Workflow generated successfully', 201);

      } else if (pathSegments.length === 3 && pathSegments[2] === 'deploy' && req.method === 'POST') {
        // POST /workflows/{id}/deploy - Deploy workflow
        const workflowId = pathSegments[1];
        const body = await req.json().catch(() => ({}));
        
        const deployResult = await deployWorkflow(userId, workflowId, body);
        
        return createSuccessResponse(deployResult, 'Workflow deployed successfully');

      } else if (pathSegments.length === 3 && pathSegments[2] === 'status' && req.method === 'GET') {
        // GET /workflows/{id}/status - Get workflow status
        const workflowId = pathSegments[1];
        
        const status = await getWorkflowStatus(userId, workflowId);
        
        return createSuccessResponse(status);

      } else if (pathSegments.length === 2 && req.method === 'GET') {
        // GET /workflows/{id} - Get workflow details
        const workflowId = pathSegments[1];
        
        const workflow = await getWorkflow(userId, workflowId);
        
        return createSuccessResponse(workflow);

      } else {
        return createErrorResponse('Endpoint not found', 404);
      }
    } else {
      return createErrorResponse('Endpoint not found', 404);
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [WORKFLOWS-API-${requestId}] Error after ${processingTime}ms:`, error);
    
    // Determine appropriate error response
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return createErrorResponse(error.message, 404);
    } else if (error.message.includes('Validation') || error.message.includes('required')) {
      return createErrorResponse(error.message, 400);
    } else if (error.message.includes('OpenAI') || error.message.includes('API key')) {
      return createErrorResponse(error.message, 400);
    }

    // Log error telemetry
    try {
      const { user } = await authenticate(req);
      if (user) {
        await supabase
          .from('telemetry_events')
          .insert({
            user_id: user.id,
            event_type: 'api_error',
            event_category: 'error',
            event_data: {
              endpoint: 'workflows-api',
              method: req.method,
              error: error.message
            },
            duration_ms: processingTime,
            success: false,
            error_message: error.message
          })
          .catch(err => console.warn('Failed to log error telemetry:', err));
      }
    } catch (telemetryError) {
      console.warn('Failed to log error telemetry:', telemetryError);
    }

    return createErrorResponse('Internal server error', 500);
  }
});