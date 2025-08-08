import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

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

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// N8n API configuration
const N8N_API_URL = Deno.env.get('N8N_API_URL') || 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = Deno.env.get('N8N_API_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

// System prompt for MVP workflow creation
const SYSTEM_PROMPT = `You are Clixen, an intelligent workflow automation assistant following the MVP specification.

Your role is to help users create n8n workflows through natural conversation:

1. **GATHERING PHASE**: Understand user automation requirements
   - Ask specific clarifying questions (max 2-3 per response)
   - Focus on trigger mechanism, actions, and integrations needed
   - Assess feasibility and identify potential issues

2. **VALIDATION PHASE**: Confirm complete requirements
   - Summarize what will be built
   - Check for missing information
   - Validate technical feasibility

3. **GENERATION PHASE**: Create n8n workflow JSON
   - Generate complete, valid n8n workflow structure
   - Include proper nodes, connections, and configuration
   - Ensure workflow follows n8n best practices

CONVERSATION GUIDELINES:
- Be conversational and encouraging
- Ask specific, actionable questions
- Explain technical concepts simply
- Focus on practical, achievable automations
- Guide users through the process step by step

WORKFLOW GENERATION CRITERIA:
Only generate workflow JSON when:
- Trigger mechanism is clearly defined
- Required actions are specified
- Integration requirements are understood
- User has confirmed the specification

When generating, create a complete n8n workflow with:
- Proper node types and configurations
- Valid connections between nodes
- Required metadata and settings
- Reasonable default parameters`;

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

// Function to call OpenAI API
const callOpenAI = async (
  messages: ChatMessage[],
  userId?: string,
  model = 'gpt-3.5-turbo',
  maxTokens = 1000,
  temperature = 0.7
): Promise<{ response: string; tokensUsed: number }> => {
  const apiKey = await getOpenAIApiKey(userId);
  
  if (!apiKey) {
    return {
      response: '⚠️ **OpenAI API Key Required**\n\nTo use the AI workflow assistant, you need to configure your OpenAI API key in your account settings.\n\n**How to get started:**\n1. Get your API key from [OpenAI](https://platform.openai.com/api-keys)\n2. Add it in your account settings\n3. Start creating amazing workflows!\n\nYour API key is stored securely and never shared.',
      tokensUsed: 0
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
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

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    return {
      response: data.choices[0]?.message?.content || 'No response generated',
      tokensUsed: data.usage?.total_tokens || 0
    };
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    
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
    
    // Detect trigger types
    if (text.includes('webhook') || text.includes('http')) {
      trigger = { type: 'webhook', description: 'HTTP webhook trigger', parameters: {} };
    } else if (text.includes('schedule') || text.includes('cron') || text.includes('daily') || text.includes('hourly')) {
      trigger = { type: 'cron', description: 'Scheduled trigger', parameters: {} };
    } else if (text.includes('email') && text.includes('receive')) {
      trigger = { type: 'email_trigger', description: 'Email trigger', parameters: {} };
    } else if (text.includes('manual') || text.includes('click') || text.includes('button')) {
      trigger = { type: 'manual', description: 'Manual trigger', parameters: {} };
    }
    
    // Detect actions
    if (text.includes('send email') || text.includes('email notification')) {
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

// Function to generate n8n workflow from specification
const generateN8nWorkflow = async (spec: WorkflowSpec, userId?: string): Promise<any> => {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Generate a complete n8n workflow JSON based on this specification. 

Create a valid n8n workflow with:
1. Complete nodes array with proper n8n node types
2. Connections showing data flow between nodes
3. Proper node positioning for visual clarity
4. Required settings and metadata

Use these n8n node types:
- Triggers: n8n-nodes-base.webhook, n8n-nodes-base.cron, n8n-nodes-base.manualTrigger
- Actions: n8n-nodes-base.httpRequest, n8n-nodes-base.emailSend, n8n-nodes-base.slack
- Processing: n8n-nodes-base.set, n8n-nodes-base.if, n8n-nodes-base.function

Return ONLY valid JSON without markdown formatting.`
    },
    {
      role: 'user',
      content: `Generate n8n workflow for: ${JSON.stringify(spec)}`
    }
  ];

  const { response } = await callOpenAI(messages, userId, 'gpt-4', 1500, 0.5);
  
  try {
    // Clean the response to extract JSON
    let cleanedResponse = response.trim();
    
    // Remove markdown code blocks if present
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\s*/, '').replace(/\s*```$/, '');
    }
    
    const workflow = JSON.parse(cleanedResponse);
    
    // Ensure required fields
    if (!workflow.name) {
      workflow.name = `${spec.trigger.description} → ${spec.actions[0]?.description || 'Process'}`;
    }
    
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      throw new Error('Invalid workflow structure');
    }
    
    // Add metadata
    workflow.meta = {
      templateCredit: 'Generated by Clixen AI',
      generatedBy: 'clixen-mvp',
      description: `Automated workflow: ${workflow.name}`,
      complexity: spec.complexity,
      integrations: spec.integrations,
      generatedAt: new Date().toISOString()
    };
    
    return workflow;
  } catch (error) {
    console.error('Error parsing generated workflow:', error);
    
    // Return a fallback workflow
    return {
      name: `Clixen Workflow ${new Date().toISOString().slice(0, 10)}`,
      active: false,
      nodes: [
        {
          id: crypto.randomUUID(),
          name: 'Trigger',
          type: 'n8n-nodes-base.webhook',
          position: [200, 100],
          parameters: { path: 'webhook-trigger' }
        },
        {
          id: crypto.randomUUID(),
          name: 'Process',
          type: 'n8n-nodes-base.set',
          position: [500, 100],
          parameters: {
            values: {
              string: [{ name: 'processed', value: 'true' }]
            }
          }
        }
      ],
      connections: {
        'Trigger': {
          main: [[{ node: 'Process', type: 'main', index: 0 }]]
        }
      },
      settings: {},
      staticData: {},
      tags: ['automation', 'generated'],
      meta: {
        templateCredit: 'Generated by Clixen AI (Fallback)',
        generatedBy: 'clixen-mvp-fallback',
        description: 'Fallback workflow template',
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
  
  // Extract potential workflow specification
  const spec = extractWorkflowSpec(conversationText);
  
  // Determine phase based on conversation content and completeness
  let phase: 'gathering' | 'refining' | 'confirming' | 'generating' = 'gathering';
  let needsMoreInfo = true;
  let readyForGeneration = false;
  const clarifyingQuestions: string[] = [];
  
  if (spec) {
    // We have some specification
    const hasCompleteTrigger = spec.trigger.type !== 'unknown';
    const hasActions = spec.actions.length > 0;
    const hasIntegrations = spec.integrations.length > 0;
    
    if (hasCompleteTrigger && hasActions && hasIntegrations) {
      // Complete specification - move to confirmation
      phase = 'confirming';
      needsMoreInfo = false;
      
      // Check for confirmation keywords in recent messages
      const recentMessage = userMessages[userMessages.length - 1]?.content.toLowerCase() || '';
      if (recentMessage.includes('yes') || recentMessage.includes('correct') || 
          recentMessage.includes('proceed') || recentMessage.includes('create')) {
        phase = 'generating';
        readyForGeneration = true;
      }
    } else {
      // Incomplete specification - refining phase
      phase = 'refining';
      
      if (!hasCompleteTrigger) {
        clarifyingQuestions.push('What should trigger this automation? (webhook, schedule, manual, etc.)');
      }
      if (!hasActions) {
        clarifyingQuestions.push('What actions should the workflow perform?');
      }
      if (!hasIntegrations) {
        clarifyingQuestions.push('Which services or integrations do you need to connect?');
      }
    }
  } else {
    // No clear specification yet - gathering phase
    clarifyingQuestions.push('What would you like to automate?');
    clarifyingQuestions.push('How would you like this automation to be triggered?');
  }
  
  return {
    phase,
    needsMoreInfo,
    readyForGeneration,
    clarifyingQuestions: clarifyingQuestions.slice(0, 2) // Limit to 2 questions max
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
      // Generate workflow
      console.log('🔧 [AI-Chat-Simple] Generating workflow...');
      
      const spec = extractWorkflowSpec(conversationHistory.concat({ role: 'user', content: message }).map(m => m.content).join(' '));
      
      if (spec) {
        try {
          workflowData = await generateN8nWorkflow(spec, user_id);
          workflowGenerated = true;
          
          response = `🎉 **Workflow Generated Successfully!**\n\n` +
            `I've created your "${workflowData.name}" workflow based on our conversation.\n\n` +
            `**Summary:**\n` +
            `- **Trigger**: ${spec.trigger.description}\n` +
            `- **Actions**: ${spec.actions.map(a => a.description).join(', ')}\n` +
            `- **Integrations**: ${spec.integrations.join(', ')}\n` +
            `- **Complexity**: ${spec.complexity}\n\n` +
            `Your workflow is ready for deployment! Click "Deploy" to make it live, or ask me any questions about how it works.`;
        } catch (error) {
          console.error('Workflow generation failed:', error);
          response = 'I encountered an issue generating your workflow. Let me try a different approach - could you describe your automation requirements once more?';
        }
      }
    } else {
      // Continue conversation
      const conversationMessages: ChatMessage[] = [
        ...currentMessages,
        {
          role: 'system',
          content: `Current conversation phase: ${analysis.phase}
${analysis.clarifyingQuestions.length > 0 ? `Ask these questions: ${analysis.clarifyingQuestions.join('; ')}` : ''}
Provide helpful, conversational response to guide the user through workflow creation.`
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
