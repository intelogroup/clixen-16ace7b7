import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { WorkflowIsolationManager } from '../_shared/workflow-isolation.ts';
import { supabase } from '../_shared/supabase.ts';
import { smartWorkflowGenerator, UserContext } from '../_shared/smart-workflow-generator.ts';
import { errorFeedbackLoop, DeploymentError } from '../_shared/error-feedback-loop.ts';
import { N8nMCPClient } from '../_shared/n8n-mcp-client.ts';

/**
 * AI Chat Simple - MVP Implementation
 * 
 * This Edge Function implements the MVP specification exactly:
 * 1. Simple GPT-based processing (NOT multi-agent orchestration)
 * 2. Natural language → intermediate specification conversion
 * 3. n8n workflow generation when requirements are complete
 * 4. Natural language guidance with clarifying questions
 * 5. Feasibility checks and validation
 * 
 * Replaces the complex multi-agent system with a streamlined approach
 * focused on the core MVP requirements.
 */

// Supabase client is now imported from shared utilities

// N8n API configuration
const N8N_API_URL = Deno.env.get('N8N_API_URL') || 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = Deno.env.get('N8N_API_KEY');
if (!N8N_API_KEY) {
  throw new Error('N8N_API_KEY environment variable is required');
}

// System prompt for MVP workflow creation
const SYSTEM_PROMPT = `You are Clixen, an intelligent workflow automation assistant. You're helpful, conversational, and adaptable.

CORE BEHAVIOR:
- Answer questions naturally and helpfully
- Be conversational and context-aware
- Only focus on workflow creation when the user clearly wants automation
- Remember previous conversation context
- Don't force every conversation toward workflow creation

WHEN TO CREATE WORKFLOWS:
- User explicitly mentions automation, workflows, or n8n
- User describes repetitive tasks they want automated
- User asks for help with triggers, webhooks, or integrations
- User confirms they want to proceed with workflow creation

WHEN NOT TO FORCE WORKFLOWS:
- User is asking general questions (like math, testing, casual chat)
- User is testing the system
- User hasn't indicated they want automation
- Conversation is exploratory or educational

CONVERSATION FLOW FOR WORKFLOWS:
1. **UNDERSTANDING**: Listen to what the user wants to automate
2. **CLARIFYING**: Ask specific questions only if needed for workflow creation
3. **CONFIRMING**: Summarize the complete plan before building
4. **BUILDING**: Generate the n8n workflow JSON

BE INTELLIGENT:
- Use conversation history to avoid repetitive questions
- Understand context and intent
- Provide direct answers when appropriate
- Be helpful beyond just workflow creation
- Remember what the user has already told you

EXAMPLES:
- If user asks "what is 2+3", just answer "5" - don't force workflow creation
- If user says "send email every morning", then discuss automation
- If user is testing, acknowledge and be helpful
- Build on previous conversation rather than starting over`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface WorkflowSpec {
  trigger: {
    type: string;
    description: string;
    parameters: Record<string, any>;
  };
  actions: Array<{
    type: string;
    description: string;
    parameters: Record<string, any>;
  }>;
  integrations: string[];
  complexity: 'simple' | 'moderate' | 'complex';
}

// Function to get OpenAI API key
const getOpenAIApiKey = async (userId?: string): Promise<string | null> => {
  try {
    // Try user-specific key first
    if (userId) {
      const { data, error } = await supabase
        .from('api_keys')
        .select('openai_api_key')
        .eq('user_id', userId)
        .single();
      
      if (data?.openai_api_key && !error) {
        return data.openai_api_key;
      }
    }
    
    // Fallback to environment variable
    const envKey = Deno.env.get('OPENAI_API_KEY');
    if (envKey) {
      return envKey;
    }
    
    // Try database configuration
    const { data, error } = await supabase
      .from('api_configurations')
      .select('api_key')
      .eq('service_name', 'openai')
      .eq('is_active', true)
      .single();
    
    if (error || !data?.api_key) {
      return null;
    }
    
    return data.api_key;
  } catch (error) {
    console.error('Error getting OpenAI API key:', error);
    return null;
  }
};

// Function to call OpenAI API with timeout protection
const callOpenAI = async (
  messages: ChatMessage[],
  userId?: string,
  model = 'gpt-3.5-turbo',
  maxTokens = 1000,
  temperature = 0.7
): Promise<{ response: string; tokensUsed: number }> => {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`🤖 [OpenAI] [${requestId}] Starting API call:`, {
    model,
    maxTokens,
    messageCount: messages.length,
    userId: userId?.substring(0, 8) + '***'
  });

  const apiKey = await getOpenAIApiKey(userId);
  
  if (!apiKey) {
    console.log(`❌ [OpenAI] [${requestId}] No API key configured`);
    return {
      response: '⚠️ **OpenAI API Key Required**\n\nTo use the AI workflow assistant, you need to configure your OpenAI API key in your account settings.\n\n**How to get started:**\n1. Get your API key from [OpenAI](https://platform.openai.com/api-keys)\n2. Add it in your account settings\n3. Start creating amazing workflows!\n\nYour API key is stored securely and never shared.',
      tokensUsed: 0
    };
  }

  console.log(`✅ [OpenAI] [${requestId}] API key configured, making request...`);

  // Set up timeout protection
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.error(`⏰ [OpenAI] [${requestId}] Request timed out after 45 seconds`);
    controller.abort();
  }, 45000); // 45 second timeout

  const startTime = Date.now();

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature
      })
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    console.log(`⚡ [OpenAI] [${requestId}] Request completed in ${duration}ms`);

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ [OpenAI] [${requestId}] API error:`, { status: response.status, error: errorData });
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log(`✅ [OpenAI] [${requestId}] Response received:`, {
      tokensUsed: data.usage?.total_tokens || 0,
      responseLength: data.choices[0]?.message?.content?.length || 0
    });
    
    return {
      response: data.choices[0]?.message?.content || 'No response generated',
      tokensUsed: data.usage?.total_tokens || 0
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    
    if (error.name === 'AbortError') {
      console.error(`⏰ [OpenAI] [${requestId}] Request aborted due to timeout after ${duration}ms`);
      return {
        response: '⏰ **Request Timed Out**\n\nI apologize, but the AI request took too long to process (over 45 seconds). This might be due to:\n\n- High API load\n- Complex request processing\n- Network connectivity issues\n\nPlease try again with a simpler request, or wait a moment and retry.',
        tokensUsed: 0
      };
    }

    console.error(`❌ [OpenAI] [${requestId}] API call failed after ${duration}ms:`, error);
    
    // User-friendly error messages
    let errorMessage = 'I encountered an error processing your request. Please try again.';
    
    if (error.message.includes('401')) {
      errorMessage = '🔑 Invalid OpenAI API key. Please check your API key configuration.';
    } else if (error.message.includes('429')) {
      errorMessage = '📊 OpenAI API rate limit exceeded. Please wait a moment and try again.';
    } else if (error.message.includes('quota')) {
      errorMessage = '💳 OpenAI API quota exceeded. Please check your usage limits or billing.';
    }
    
    return {
      response: errorMessage,
      tokensUsed: 0
    };
  }
};

// Function to extract workflow specification from conversation
const extractWorkflowSpec = (conversationText: string): WorkflowSpec | null => {
  try {
    // Simple keyword-based extraction (can be enhanced with AI)
    const text = conversationText.toLowerCase();
    
    let trigger = { type: 'unknown', description: '', parameters: {} };
    const actions: Array<{ type: string; description: string; parameters: Record<string, any> }> = [];
    const integrations: string[] = [];
    
    // Detect trigger types with better pattern matching
    if (text.includes('webhook') || text.includes('http')) {
      trigger = { type: 'webhook', description: 'HTTP webhook trigger', parameters: {} };
    } else if (text.includes('schedule') || text.includes('cron') || text.includes('daily') || text.includes('hourly') ||
               text.includes('every minute') || text.includes('every hour') || text.includes('every day') ||
               text.match(/every \d+ (minute|hour|day)/) || text.includes('at 10 pm') || text.includes('morning')) {
      trigger = { type: 'cron', description: 'Scheduled trigger', parameters: {} };
    } else if (text.includes('email') && text.includes('receive')) {
      trigger = { type: 'email_trigger', description: 'Email trigger', parameters: {} };
    } else if (text.includes('manual') || text.includes('click') || text.includes('button') || text.includes('auto trigger')) {
      trigger = { type: 'manual', description: 'Manual trigger', parameters: {} };
    }
    
    // Detect actions with better pattern matching
    if (text.includes('send email') || text.includes('email notification') ||
        text.includes('via email') || text.includes('gmail')) {
      actions.push({ type: 'email_send', description: 'Send email', parameters: {} });
      integrations.push('email');
    }

    if (text.includes('slack') && text.includes('message')) {
      actions.push({ type: 'slack', description: 'Send Slack message', parameters: {} });
      integrations.push('slack');
    }

    if (text.includes('http request') || text.includes('api call')) {
      actions.push({ type: 'http_request', description: 'Make HTTP request', parameters: {} });
      integrations.push('webhook');
    }

    if (text.includes('google sheets') || text.includes('spreadsheet')) {
      actions.push({ type: 'google_sheets', description: 'Update Google Sheets', parameters: {} });
      integrations.push('google_sheets');
    }

    // Handle calculation/computation tasks
    if (text.includes('calculate') || text.includes('result') || text.match(/\d+\s*[*+\-/]\s*\d+/)) {
      actions.push({ type: 'function', description: 'Perform calculation', parameters: {} });
      integrations.push('computation');
    }

    // Handle general "send" actions
    if (text.includes('send') && !actions.length) {
      actions.push({ type: 'send_data', description: 'Send data/result', parameters: {} });
      integrations.push('notification');
    }
    
    // Assess complexity
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (actions.length > 3 || integrations.length > 2) {
      complexity = 'complex';
    } else if (actions.length > 1 || integrations.length > 1) {
      complexity = 'moderate';
    }
    
    // Only return spec if we have minimum requirements
    if (trigger.type !== 'unknown' && actions.length > 0) {
      return {
        trigger,
        actions,
        integrations: [...new Set(integrations)],
        complexity
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting workflow spec:', error);
    return null;
  }
};

// JSON Healing and Validation System
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  healed?: any;
}

const healAndValidateJSON = async (jsonString: string, retries = 3): Promise<ValidationResult> => {
  console.log('🔧 Starting JSON healing process...');
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Try to parse as-is
      const parsed = JSON.parse(jsonString);
      
      // Basic structure validation
      if (parsed && typeof parsed === 'object' && parsed.nodes && Array.isArray(parsed.nodes)) {
        console.log(`✅ JSON parsed successfully on attempt ${attempt}`);
        return { valid: true, errors: [], warnings: [], healed: parsed };
      } else {
        throw new Error('Invalid workflow structure - missing nodes array');
      }
    } catch (error) {
      console.log(`❌ JSON parse failed on attempt ${attempt}: ${error.message}`);
      
      if (attempt < retries) {
        console.log('🩹 Attempting to heal JSON...');
        
        // Common healing patterns
        jsonString = jsonString
          // Remove markdown code blocks
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          // Fix trailing commas
          .replace(/,(\s*[}\]])/g, '$1')
          // Fix missing quotes around property names
          .replace(/(\w+):/g, '"$1":')
          // Fix single quotes to double quotes
          .replace(/'/g, '"')
          // Remove comments
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '')
          // Fix common escape issues
          .replace(/\\n/g, '\\n')
          .replace(/\\t/g, '\\t');
          
        // Try AI-based healing for complex cases
        if (attempt === retries - 1) {
          try {
            const healingPrompt = `Fix this malformed JSON to be valid n8n workflow JSON. Return ONLY the corrected JSON:

${jsonString}`;
            
            const { response } = await callOpenAI([
              { role: 'system', content: 'You are a JSON healing expert. Fix malformed JSON and return only valid JSON.' },
              { role: 'user', content: healingPrompt }
            ], undefined, 'gpt-3.5-turbo', 1000, 0.1);
            
            jsonString = response.trim();
            console.log('🤖 AI healing applied');
          } catch (aiError) {
            console.log('❌ AI healing failed:', aiError.message);
          }
        }
      }
    }
  }
  
  return {
    valid: false,
    errors: ['Failed to heal JSON after all attempts'],
    warnings: ['Consider regenerating the workflow']
  };
};


// Function to generate n8n workflow using smart generator (99% reliability)
const generateN8nWorkflow = async (spec: WorkflowSpec, userId?: string, conversationHistory?: ChatMessage[]): Promise<any> => {
  console.log('[generateN8nWorkflow] Using Smart Workflow Generator for 99% reliability');
  
  // Extract user intent from conversation
  const userIntent = conversationHistory?.map(m => m.content).join(' ') || 
                    `${spec.trigger.description} -> ${spec.actions.map(a => a.description).join(' and ')}`;
  
  // Create user context
  const userContext: UserContext = {
    userId,
    projectId: null, // TODO: Get from session
    preferences: {
      complexity: spec.complexity,
      integrations: spec.integrations
    }
  };

  // Use smart generator with template-first approach
  const result = await smartWorkflowGenerator.generateReliableWorkflow(
    userIntent,
    spec,
    userContext
  );

  if (result.success && result.workflow) {
    console.log(`[generateN8nWorkflow] ✅ Smart generation successful (confidence: ${result.confidence})`);
    return result.workflow;
  } else {
    console.log(`[generateN8nWorkflow] ❌ Smart generation failed, falling back to legacy method`);
    // Fallback to original method if smart generator fails
    return await generateN8nWorkflowLegacy(spec, userId);
  }
};

// Legacy generation method (fallback)
const generateN8nWorkflowLegacy = async (spec: WorkflowSpec, userId?: string): Promise<any> => {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Generate a complete n8n workflow JSON based on this specification. 

CRITICAL: Generate ONLY valid JSON. Follow this exact structure:

{
  "name": "Workflow Name",
  "nodes": [
    {
      "id": "unique-node-id-1", 
      "name": "Node Name",
      "type": "n8n-nodes-base.webhook",
      "position": [x, y],
      "parameters": {}
    }
  ],
  "connections": {
    "unique-node-id-1": {
      "main": [[{"node": "unique-node-id-2", "type": "main", "index": 0}]]
    }
  },
  "settings": {},
  "staticData": {}
}

Use these n8n node types:
- Triggers: n8n-nodes-base.webhook, n8n-nodes-base.cron, n8n-nodes-base.manualTrigger  
- Actions: n8n-nodes-base.httpRequest, n8n-nodes-base.emailSend, n8n-nodes-base.slack, n8n-nodes-base.respondToWebhook
- Processing: n8n-nodes-base.set, n8n-nodes-base.if, n8n-nodes-base.function

IMPORTANT: 
- Use node IDs in connections, not node names
- Include unique node IDs for each node
- Make webhook paths URL-safe (no spaces, lowercase)
- Return ONLY valid JSON without markdown formatting`
    },
    {
      role: 'user',
      content: `Generate n8n workflow for: ${JSON.stringify(spec)}`
    }
  ];

  const { response } = await callOpenAI(messages, userId, 'gpt-4', 1500, 0.3);
  
  // Use healing system
  const healed = await healAndValidateJSON(response);
  
  if (healed.valid && healed.healed) {
    const workflow = healed.healed;
    
    // Ensure required fields with user isolation
    if (!workflow.name) {
      workflow.name = `${spec.trigger.description} → ${spec.actions[0]?.description || 'Process'}`.substring(0, 80);
    }
    
    // Apply user-specific naming convention
    if (userId) {
      workflow.name = WorkflowIsolationManager.generateWorkflowName(userId, workflow.name);
    }
    
    // Add metadata with user context
    workflow.meta = {
      templateCredit: 'Generated by Clixen AI',
      generatedBy: 'clixen-mvp',
      description: WorkflowIsolationManager.sanitizeDescription(`Automated workflow: ${workflow.name}`),
      complexity: spec.complexity,
      integrations: spec.integrations,
      generatedAt: new Date().toISOString(),
      userId: userId ? userId.substring(0, 8) : 'anonymous',
      tags: userId ? WorkflowIsolationManager.generateWorkflowTags(userId, projectId) : ['clixen-managed']
    };
    
    return workflow;
  } else {
    console.error('JSON healing failed, using fallback workflow');
    
    // Generate a working fallback workflow with user isolation
    const timestamp = Date.now().toString().slice(-6);
    const webhookPath = userId ? 
      WorkflowIsolationManager.generateWebhookPath(userId, spec.trigger.type) :
      `clixen-${spec.trigger.type}-${timestamp}`;
    
    return {
      name: userId ? 
        WorkflowIsolationManager.generateWorkflowName(userId, `Clixen ${spec.trigger.description}`) :
        `Clixen ${spec.trigger.description}`,
      nodes: [
        {
          id: `trigger-${timestamp}`,
          name: 'Workflow Trigger',
          type: spec.trigger.type === 'webhook' ? 'n8n-nodes-base.webhook' : 'n8n-nodes-base.manualTrigger',
          position: [200, 300],
          parameters: spec.trigger.type === 'webhook' ? 
            { path: webhookPath, httpMethod: 'POST' } : {}
        },
        {
          id: `action-${timestamp}`,
          name: 'Process Action',
          type: spec.actions[0]?.type === 'email_send' ? 
            'n8n-nodes-base.emailSend' : 'n8n-nodes-base.set',
          position: [500, 300],
          parameters: spec.actions[0]?.type === 'email_send' ? 
            {} : { values: { string: [{ name: 'result', value: 'processed' }] } }
        },
        {
          id: `respond-${timestamp}`,
          name: 'Send Response',
          type: 'n8n-nodes-base.respondToWebhook',
          position: [800, 300],
          parameters: {
            respondWith: 'json',
            responseBody: '={{ { status: "success", data: $json } }}'
          }
        }
      ],
      connections: {
        [`trigger-${timestamp}`]: {
          main: [[{ node: `action-${timestamp}`, type: 'main', index: 0 }]]
        },
        [`action-${timestamp}`]: {
          main: [[{ node: `respond-${timestamp}`, type: 'main', index: 0 }]]
        }
      },
      settings: {},
      staticData: {},
      tags: ['automation', 'generated', 'clixen'],
      meta: {
        templateCredit: 'Generated by Clixen AI (Fallback)',
        generatedBy: 'clixen-mvp-fallback',
        description: 'Reliable fallback workflow template',
        complexity: spec.complexity,
        integrations: spec.integrations,
        generatedAt: new Date().toISOString()
      }
    };
  }
};

// Function to determine conversation phase and next steps
const analyzeConversation = (messages: ChatMessage[]): {
  phase: 'gathering' | 'refining' | 'confirming' | 'generating';
  needsMoreInfo: boolean;
  readyForGeneration: boolean;
  clarifyingQuestions: string[];
} => {
  const userMessages = messages.filter(m => m.role === 'user');
  const conversationText = userMessages.map(m => m.content).join(' ').toLowerCase();
  const recentMessage = userMessages[userMessages.length - 1]?.content.toLowerCase() || '';

  // Check if this is NOT a workflow request
  const isGeneralQuestion = recentMessage.includes('what is') ||
                           recentMessage.includes('calculate') ||
                           recentMessage.includes('test') ||
                           recentMessage.match(/^\d+\s*[+\-*/]\s*\d+/) ||
                           recentMessage.includes('hi') ||
                           recentMessage.includes('hello') ||
                           recentMessage.length < 20;

  // Check if user is clearly asking for workflow/automation
  const isWorkflowRequest = conversationText.includes('automat') ||
                           conversationText.includes('workflow') ||
                           conversationText.includes('trigger') ||
                           conversationText.includes('schedule') ||
                           conversationText.includes('webhook') ||
                           conversationText.includes('send') && (conversationText.includes('email') || conversationText.includes('slack')) ||
                           conversationText.includes('every') && (conversationText.includes('minute') || conversationText.includes('hour') || conversationText.includes('day'));

  // If it's a general question, don't force workflow creation
  if (isGeneralQuestion && !isWorkflowRequest) {
    return {
      phase: 'gathering',
      needsMoreInfo: false,
      readyForGeneration: false,
      clarifyingQuestions: []
    };
  }

  // Extract potential workflow specification only if it's a workflow request
  const spec = isWorkflowRequest ? extractWorkflowSpec(conversationText) : null;

  // Determine phase based on conversation content and completeness
  let phase: 'gathering' | 'refining' | 'confirming' | 'generating' = 'gathering';
  let needsMoreInfo = true;
  let readyForGeneration = false;
  const clarifyingQuestions: string[] = [];

  if (spec && isWorkflowRequest) {
    // We have some specification
    const hasCompleteTrigger = spec.trigger.type !== 'unknown';
    const hasActions = spec.actions.length > 0;
    const hasIntegrations = spec.integrations.length > 0;

    if (hasCompleteTrigger && hasActions && hasIntegrations) {
      // Complete specification - move to confirmation
      phase = 'confirming';
      needsMoreInfo = false;

      // Enhanced confirmation detection
      const confirmationKeywords = [
        'yes', 'correct', 'right', 'exactly', 'perfect',
        'proceed', 'create', 'make it', 'build', 'deploy',
        'go ahead', 'do it', 'that works', 'sounds good',
        'let\'s do this', 'create the workflow', 'build the workflow'
      ];

      const negationKeywords = [
        'no', 'wait', 'hold on', 'not quite', 'incorrect',
        'wrong', 'change', 'modify', 'different', 'not right'
      ];

      const hasConfirmation = confirmationKeywords.some(keyword => 
        recentMessage.toLowerCase().includes(keyword.toLowerCase())
      );
      
      const hasNegation = negationKeywords.some(keyword => 
        recentMessage.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasConfirmation && !hasNegation) {
        phase = 'generating';
        readyForGeneration = true;
      } else if (hasNegation) {
        // User wants changes - go back to refining
        phase = 'refining';
        needsMoreInfo = true;
      }
      // else stay in confirming phase
    } else {
      // Incomplete specification - refining phase
      phase = 'refining';
      needsMoreInfo = true;
    }
  } else if (isWorkflowRequest) {
    // User wants workflow but no clear specification
    phase = 'gathering';
    needsMoreInfo = true;
  }

  return {
    phase,
    needsMoreInfo,
    readyForGeneration,
    clarifyingQuestions: [] // Let AI handle questions naturally
  };
};

// Main request handler
serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`🚀 [AI-Chat-Simple] [${requestId}] ${req.method} ${req.url}`, {
    userAgent: req.headers.get('user-agent'),
    origin: req.headers.get('origin'),
    authHeader: req.headers.get('authorization') ? 'present' : 'missing'
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`✅ [AI-Chat-Simple] [${requestId}] CORS preflight handled`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate authentication token
    const authHeader = req.headers.get('authorization');
    let authenticatedUser = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) {
          console.log(`❌ [AI-Chat-Simple] [${requestId}] Auth validation failed:`, authError.message);
          return new Response(
            JSON.stringify({ error: 'Invalid authentication token' }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        authenticatedUser = user;
        console.log(`✅ [AI-Chat-Simple] [${requestId}] User authenticated:`, {
          userId: user?.id?.substring(0, 8) + '***',
          email: user?.email
        });
      } catch (error) {
        console.log(`❌ [AI-Chat-Simple] [${requestId}] Auth token validation error:`, error.message);
        return new Response(
          JSON.stringify({ error: 'Authentication failed' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      console.log(`❌ [AI-Chat-Simple] [${requestId}] No authorization header provided`);
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await req.json();
    const { message, user_id, session_id, mode = 'workflow_creation' } = body;

    // Verify the user_id matches the authenticated user
    if (user_id && authenticatedUser && user_id !== authenticatedUser.id) {
      console.log(`❌ [AI-Chat-Simple] [${requestId}] User ID mismatch:`, {
        providedUserId: user_id?.substring(0, 8) + '***',
        authenticatedUserId: authenticatedUser.id?.substring(0, 8) + '***'
      });
      return new Response(
        JSON.stringify({ error: 'User ID mismatch' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📝 [AI-Chat-Simple] [${requestId}] Processing message:`, {
      userId: user_id?.substring(0, 8) + '***',
      messageLength: message.length,
      messagePreview: message.substring(0, 50) + '...',
      sessionId: session_id?.substring(0, 8) + '***',
      mode
    });

    // Get conversation history (simplified - last 10 messages)
    let conversationHistory: ChatMessage[] = [];
    
    if (session_id && user_id) {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('role, content')
        .eq('session_id', session_id)
        .eq('user_id', user_id)
        .order('created_at', { ascending: true })
        .limit(10);

      if (data && !error) {
        conversationHistory = data.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));
      }
    }

    // Add current user message
    const currentMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Analyze conversation state
    const analysis = analyzeConversation([...conversationHistory, { role: 'user', content: message }]);

    let response = '';
    let workflowGenerated = false;
    let workflowData: any = null;

    if (analysis.readyForGeneration) {
      // Generate and deploy workflow
      console.log('🔧 [AI-Chat-Simple] Generating workflow...');
      
      const spec = extractWorkflowSpec(conversationHistory.concat({ role: 'user', content: message }).map(m => m.content).join(' '));
      
      if (spec) {
        try {
          // Generate workflow with smart generator (99% reliability)
          workflowData = await generateN8nWorkflow(spec, user_id, conversationHistory);
          console.log('✅ Workflow JSON generated and validated with smart generator');
          
          // Deploy to n8n with enhanced MCP client
          const n8nClient = new N8nMCPClient(true); // Enable MCP
          const userIntent = conversationHistory.map(m => m.content).join(' ');
          const deployment = await n8nClient.deployWorkflow(workflowData, userIntent, 2, user_id);
          
          if (deployment.success) {
            workflowGenerated = true;
            
            // Get user's auto-created project
            const { data: userProject } = await supabase
              .from('projects')
              .select('id, name')
              .eq('user_id', user_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            const project_id = userProject?.id || null;
            console.log(`📋 Using project: ${userProject?.name || 'No project found'} (${project_id})`);

            // Store workflow in database
            try {
              await supabase.from('mvp_workflows').insert({
                user_id,
                project_id,
                name: workflowData.name,
                description: workflowData.meta?.description || 'Generated workflow',
                n8n_workflow_json: workflowData,
                n8n_workflow_id: deployment.workflowId,
                original_prompt: conversationHistory.map(m => m.content).join('\n'),
                status: 'deployed'
              });
              console.log('✅ Workflow stored in database');
            } catch (dbError) {
              console.error('❌ Database storage failed:', dbError);
            }
            
            response = `🎉 **Workflow Generated and Deployed Successfully!**\n\n` +
              `I've created and deployed your "${workflowData.name}" workflow to n8n.\n\n` +
              `**Summary:**\n` +
              `- **Trigger**: ${spec.trigger.description}\n` +
              `- **Actions**: ${spec.actions.map(a => a.description).join(', ')}\n` +
              `- **Integrations**: ${spec.integrations.join(', ')}\n` +
              `- **Complexity**: ${spec.complexity}\n` +
              `- **Workflow ID**: ${deployment.workflowId}\n` +
              (deployment.webhookUrl ? `- **Webhook URL**: ${deployment.webhookUrl}\n` : '') +
              `\n**Status**: ✅ Active and ready to use!\n\n` +
              `Your workflow is now live and will process requests automatically. ` +
              (deployment.webhookUrl ? 
                `You can test it by sending POST requests to the webhook URL above.` :
                `You can trigger it manually from the n8n interface.`);
          } else {
            workflowGenerated = false;
            response = `🚧 **Workflow Generated but Deployment Failed**\n\n` +
              `I've created your "${workflowData.name}" workflow, but encountered an issue deploying it to n8n:\n\n` +
              `**Error**: ${deployment.error}\n\n` +
              `The workflow JSON has been generated and validated. You can try deploying it manually or I can help troubleshoot the issue.`;
          }
        } catch (error) {
          console.error('Workflow generation/deployment failed:', error);
          response = `❌ **Workflow Generation Failed**\n\n` +
            `I encountered an issue creating your workflow: ${error.message}\n\n` +
            `Let me try a different approach. Could you describe your automation requirements in simpler terms? For example:\n` +
            `- What should trigger the workflow?\n` +
            `- What action should it perform?\n` +
            `- Where should the results go?`;
        }
      }
    } else {
      // Continue conversation
      const conversationMessages: ChatMessage[] = [
        ...currentMessages,
        {
          role: 'system',
          content: `Current conversation phase: ${analysis.phase}

Context: You have the full conversation history above. Be contextual and intelligent:

PHASE-SPECIFIC GUIDANCE:
${analysis.phase === 'gathering' ? 
  '- Help user define what they want to automate\n- Ask about triggers, actions, and outcomes\n- Be encouraging and supportive' :
analysis.phase === 'refining' ? 
  '- Clarify incomplete requirements\n- Ask specific technical questions\n- Help choose the right integrations' :
analysis.phase === 'confirming' ? 
  '- Summarize the complete workflow plan clearly\n- Ask for explicit confirmation before proceeding\n- Show what will be created and deployed\n- Make it easy to say yes or request changes' :
  '- You should be generating the workflow now\n- This message should not appear'
}

GENERAL RULES:
- If user is asking non-workflow questions, answer them directly
- Remember what they've already told you - don't repeat questions
- Be natural, conversational, and helpful
- Use the conversation history to avoid redundancy
- Show enthusiasm for their automation ideas

${analysis.needsMoreInfo && analysis.phase !== 'gathering' ? 'Focus on gathering the remaining workflow requirements naturally.' : ''}`
        }
      ];

      const { response: aiResponse, tokensUsed } = await callOpenAI(conversationMessages, user_id);
      response = aiResponse;
    }

    // Store conversation messages if session provided
    if (session_id && user_id) {
      try {
        // Store user message
        await supabase.from('ai_chat_messages').insert({
          session_id,
          user_id,
          role: 'user',
          content: message,
          metadata: { phase: analysis.phase }
        });

        // Store assistant response
        await supabase.from('ai_chat_messages').insert({
          session_id,
          user_id,
          role: 'assistant',
          content: response,
          metadata: { 
            phase: analysis.phase,
            workflow_generated: workflowGenerated,
            clarifying_questions: analysis.clarifyingQuestions
          }
        });
      } catch (dbError) {
        console.error('Error storing conversation:', dbError);
        // Don't fail the request if storage fails
      }
    }

    const result = {
      response,
      phase: analysis.phase,
      needs_more_info: analysis.needsMoreInfo,
      ready_for_generation: analysis.readyForGeneration,
      clarifying_questions: analysis.clarifyingQuestions,
      workflow_generated: workflowGenerated,
      workflow_data: workflowData,
      session_id: session_id || crypto.randomUUID()
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error(`❌ [AI-Chat-Simple] [${requestId}] Unexpected error:`, {
      error: error.message || error,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        response: 'I apologize, but I encountered an unexpected error. Please try again or rephrase your request.',
        phase: 'gathering',
        needs_more_info: true,
        ready_for_generation: false,
        workflow_generated: false,
        request_id: requestId
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
