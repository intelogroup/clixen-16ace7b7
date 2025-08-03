import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const N8N_API_URL = Deno.env.get('N8N_API_URL') || 'https://n8n.clixen.com/api/v1';
const N8N_API_KEY = Deno.env.get('N8N_API_KEY')!;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Request schema
const GenerateWorkflowRequestSchema = z.object({
  userId: z.string().uuid(),
  intent: z.string().min(10).max(500),
  retryCount: z.number().default(0),
});

// GPT System prompt for workflow generation
const SYSTEM_PROMPT = `You are an expert n8n workflow builder. Generate valid n8n workflow JSON based on user requirements.

IMPORTANT RULES:
1. Use only basic n8n nodes for MVP: Webhook, HTTP Request, Set, If, Code, Schedule
2. Maximum 8 nodes for free users
3. Always start with a trigger node (Webhook or Schedule)
4. Generate valid JSON that matches n8n workflow schema
5. Include proper connections between nodes
6. Use simple, clear node names

Response format: Return ONLY valid JSON, no explanation text.

Example structure:
{
  "name": "User Intent Workflow",
  "nodes": [...],
  "connections": {...},
  "settings": {"executionOrder": "v1"}
}`;

// Generate workflow using GPT
async function generateWorkflowWithGPT(intent: string, nodeLimit: number = 8): Promise<any> {
  const userPrompt = `Create an n8n workflow for: "${intent}"
Requirements:
- Maximum ${nodeLimit} nodes
- Use only basic nodes (Webhook, HTTP Request, Set, If, Code, Schedule)
- Include test webhook if applicable
- Make it production-ready`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`GPT API error: ${response.statusText}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// Validate workflow JSON
function validateWorkflow(workflow: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!workflow.name) errors.push('Missing workflow name');
  if (!workflow.nodes || !Array.isArray(workflow.nodes)) errors.push('Missing or invalid nodes');
  if (!workflow.connections || typeof workflow.connections !== 'object') errors.push('Missing connections');

  // Check node count
  if (workflow.nodes && workflow.nodes.length > 8) {
    errors.push('Too many nodes (max 8 for free tier)');
  }

  // Check for trigger node
  const hasTrigger = workflow.nodes?.some((node: any) => 
    node.type?.includes('trigger') || 
    node.type === 'n8n-nodes-base.webhook' ||
    node.type === 'n8n-nodes-base.schedule'
  );
  
  if (!hasTrigger) {
    errors.push('Workflow must have a trigger node');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Deploy workflow to n8n
async function deployToN8n(workflow: any, userId: string): Promise<{ id: string; webhookUrl?: string }> {
  // Add metadata tags
  workflow.tags = [
    `user:${userId}`,
    `clixen:${crypto.randomUUID()}`,
    'mvp',
    new Date().toISOString().split('T')[0],
  ];

  const response = await fetch(`${N8N_API_URL}/workflows`, {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(workflow),
  });

  if (!response.ok) {
    throw new Error(`n8n API error: ${response.statusText}`);
  }

  const data = await response.json();

  // Activate the workflow
  await fetch(`${N8N_API_URL}/workflows/${data.id}`, {
    method: 'PATCH',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ active: true }),
  });

  // Extract webhook URL if present
  const webhookNode = workflow.nodes.find((n: any) => n.type === 'n8n-nodes-base.webhook');
  const webhookUrl = webhookNode 
    ? `https://n8n.clixen.com/webhook/${data.id}/${webhookNode.id}`
    : undefined;

  return {
    id: data.id,
    webhookUrl,
  };
}

// Test workflow execution
async function testWorkflow(workflowId: string, webhookUrl?: string): Promise<boolean> {
  if (!webhookUrl) return true; // Skip test if no webhook

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
    });

    return response.ok;
  } catch (error) {
    console.error('Workflow test failed:', error);
    return false;
  }
}

// Main handler
serve(async (req) => {
  try {
    // Parse request
    const body = await req.json();
    const request = GenerateWorkflowRequestSchema.parse(body);

    // Check user quota
    const { data: profile } = await supabase
      .from('profiles')
      .select('workflow_quota, subscription_tier')
      .eq('id', request.userId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    const { count: workflowCount } = await supabase
      .from('user_workflows')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', request.userId);

    if ((workflowCount || 0) >= profile.workflow_quota) {
      return new Response(JSON.stringify({ error: 'Workflow quota exceeded' }), { status: 403 });
    }

    let workflow;
    let validationResult;
    let attempts = 0;
    const maxAttempts = 3;

    // Generation and validation loop
    while (attempts < maxAttempts) {
      attempts++;

      try {
        // Generate workflow
        workflow = await generateWorkflowWithGPT(request.intent, 8);
        
        // Add timestamp to name
        workflow.name = `${request.intent.slice(0, 30)}_${Date.now()}`;

        // Validate
        validationResult = validateWorkflow(workflow);

        if (validationResult.valid) {
          break;
        }

        // Log validation errors
        await supabase.from('workflow_errors').insert({
          user_id: request.userId,
          intent: request.intent,
          error_message: validationResult.errors.join(', '),
          error_type: 'validation',
          attempt_number: attempts,
          workflow_json: workflow,
        });

      } catch (error) {
        console.error(`Generation attempt ${attempts} failed:`, error);
        
        await supabase.from('workflow_errors').insert({
          user_id: request.userId,
          intent: request.intent,
          error_message: error.message,
          error_type: 'generation',
          attempt_number: attempts,
        });
      }
    }

    if (!validationResult?.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to generate valid workflow after 3 attempts',
          details: validationResult?.errors,
        }),
        { status: 400 }
      );
    }

    // Deploy to n8n
    const deployment = await deployToN8n(workflow, request.userId);

    // Test the workflow
    const testResult = await testWorkflow(deployment.id, deployment.webhookUrl);

    // Save to database
    const { data: savedWorkflow, error: saveError } = await supabase
      .from('user_workflows')
      .insert({
        user_id: request.userId,
        workflow_id: deployment.id,
        name: workflow.name,
        description: `Generated from: ${request.intent}`,
        intent: request.intent,
        status: testResult ? 'active' : 'deployed',
        node_count: workflow.nodes.length,
        webhook_url: deployment.webhookUrl,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save workflow:', saveError);
    }

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        workflow: {
          id: savedWorkflow?.id,
          n8nId: deployment.id,
          name: workflow.name,
          webhookUrl: deployment.webhookUrl,
          tested: testResult,
          nodeCount: workflow.nodes.length,
        },
        message: testResult
          ? 'Workflow created and tested successfully!'
          : 'Workflow created successfully. Test pending.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Generate workflow error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});