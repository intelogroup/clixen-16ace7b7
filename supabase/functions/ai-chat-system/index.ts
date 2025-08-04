import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// Types for multi-agent system
interface AgentConfig {
  type: 'orchestrator' | 'workflow_designer' | 'deployment' | 'system';
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent_type?: string;
  metadata?: Record<string, any>;
}

interface MultiAgentResponse {
  response: string;
  agent_type: string;
  message_id: string;
  processing_time: number;
  tokens_used?: number;
  conversation_context?: Record<string, any>;
  next_agent?: string;
  workflow_progress?: Record<string, any>;
}

// Agent system prompts
const AGENT_PROMPTS = {
  orchestrator: `You are the Orchestrator Agent in a multi-agent AI system for workflow automation. Your role is to:
1. Understand user requirements and intentions
2. Coordinate with specialist agents (WorkflowDesigner, Deployment)
3. Manage conversation flow and context
4. Provide comprehensive responses to users
5. Detect when OAuth integrations are needed and guide users appropriately
6. Keep track of workflow development phases (understanding → design → deployment)

Always maintain context across conversations and coordinate with other agents when needed.`,

  workflow_designer: `You are the Workflow Designer Agent specializing in n8n workflow creation. Your expertise includes:
1. Deep knowledge of n8n nodes and their configurations
2. Best practices for workflow architecture and performance
3. Integration patterns with various APIs and services
4. Error handling and retry logic in workflows
5. Workflow optimization for scalability and maintainability
6. Security considerations for workflow credentials

Create efficient, maintainable, and secure n8n workflows based on user requirements.`,

  deployment: `You are the Deployment Agent responsible for safely deploying workflows to production. Your responsibilities include:
1. Validating workflow configurations before deployment
2. Managing deployment rollbacks if issues occur
3. Monitoring post-deployment health and performance
4. Ensuring security compliance and credential management
5. Coordinating with n8n API for safe deployment processes
6. Providing deployment status updates and error handling

Always prioritize safety and reliability in deployment processes.`,

  system: `You are the System Agent handling error recovery, logging, and system-level operations. Your role includes:
1. Error handling and recovery coordination
2. System health monitoring and alerts
3. Logging and debugging support
4. Performance monitoring and optimization suggestions
5. Security incident response and validation
6. Cross-agent communication facilitation

Focus on system reliability and comprehensive error handling.`
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Agent configuration
const getAgentConfig = (agentType: string): AgentConfig => {
  const baseConfig = {
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 4000,
  };

  switch (agentType) {
    case 'orchestrator':
      return {
        ...baseConfig,
        type: 'orchestrator',
        temperature: 0.8,
        systemPrompt: AGENT_PROMPTS.orchestrator,
      };
    case 'workflow_designer':
      return {
        ...baseConfig,
        type: 'workflow_designer',
        temperature: 0.6,
        maxTokens: 6000,
        systemPrompt: AGENT_PROMPTS.workflow_designer,
      };
    case 'deployment':
      return {
        ...baseConfig,
        type: 'deployment',
        temperature: 0.5,
        systemPrompt: AGENT_PROMPTS.deployment,
      };
    default:
      return {
        ...baseConfig,
        type: 'system',
        temperature: 0.3,
        systemPrompt: AGENT_PROMPTS.system,
      };
  }
};

// Get conversation history with context
const getConversationHistory = async (sessionId: string, userId: string, limit = 10): Promise<ChatMessage[]> => {
  try {
    const { data: messages, error } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }

    return messages?.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      agent_type: msg.agent_type,
      metadata: msg.metadata,
    })) || [];
  } catch (error) {
    console.error('Error in getConversationHistory:', error);
    return [];
  }
};

// Store message in database
const storeMessage = async (
  sessionId: string,
  userId: string,
  content: string,
  role: 'user' | 'assistant',
  agentType?: string,
  metadata?: Record<string, any>
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        content,
        role,
        agent_type: agentType,
        metadata: metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error storing message:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error in storeMessage:', error);
    return null;
  }
};

// Update agent state
const updateAgentState = async (
  sessionId: string,
  userId: string,
  agentType: string,
  state: Record<string, any>
): Promise<void> => {
  try {
    await supabase
      .from('ai_agent_states')
      .upsert({
        session_id: sessionId,
        user_id: userId,
        agent_type: agentType,
        state,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'session_id,user_id,agent_type'
      });
  } catch (error) {
    console.error('Error updating agent state:', error);
  }
};

// Get agent state
const getAgentState = async (
  sessionId: string,
  userId: string,
  agentType: string
): Promise<Record<string, any>> => {
  try {
    const { data, error } = await supabase
      .from('ai_agent_states')
      .select('state')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('agent_type', agentType)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting agent state:', error);
      return {};
    }

    return data?.state || {};
  } catch (error) {
    console.error('Error in getAgentState:', error);
    return {};
  }
};

// Call OpenAI API with agent-specific configuration
const callOpenAI = async (
  messages: ChatMessage[],
  agentConfig: AgentConfig,
  stream = false
): Promise<{ response: string; tokensUsed: number }> => {
  const systemMessage = {
    role: 'system' as const,
    content: agentConfig.systemPrompt,
  };

  const openaiMessages = [
    systemMessage,
    ...messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
  ];

  const requestBody = {
    model: agentConfig.model,
    messages: openaiMessages,
    max_tokens: agentConfig.maxTokens,
    temperature: agentConfig.temperature,
    stream,
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    return {
      response: data.choices[0]?.message?.content || 'No response generated',
      tokensUsed: data.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return {
      response: `I encountered an error processing your request: ${error.message}. Please try again.`,
      tokensUsed: 0,
    };
  }
};

// Determine which agent should handle the request
const determineAgent = (userMessage: string, conversationHistory: ChatMessage[]): string => {
  const message = userMessage.toLowerCase();
  
  // Check for deployment-related keywords
  if (message.includes('deploy') || message.includes('publish') || message.includes('production') || 
      message.includes('live') || message.includes('activate workflow')) {
    return 'deployment';
  }
  
  // Check for workflow design keywords
  if (message.includes('workflow') || message.includes('automation') || message.includes('n8n') ||
      message.includes('trigger') || message.includes('node') || message.includes('api integration')) {
    return 'workflow_designer';
  }
  
  // Check for error/system keywords
  if (message.includes('error') || message.includes('debug') || message.includes('not working') ||
      message.includes('failed') || message.includes('issue')) {
    return 'system';
  }
  
  // Default to orchestrator for general conversations and coordination
  return 'orchestrator';
};

// Process multi-agent chat
const processMultiAgentChat = async (
  sessionId: string,
  userId: string,
  userMessage: string,
  requestedAgent?: string
): Promise<MultiAgentResponse> => {
  const startTime = Date.now();
  
  try {
    // Store user message
    await storeMessage(sessionId, userId, userMessage, 'user');
    
    // Get conversation history
    const conversationHistory = await getConversationHistory(sessionId, userId, 10);
    
    // Determine which agent should handle this request
    const agentType = requestedAgent || determineAgent(userMessage, conversationHistory);
    const agentConfig = getAgentConfig(agentType);
    
    // Get current agent state
    const agentState = await getAgentState(sessionId, userId, agentType);
    
    // Add agent state context to the conversation if it exists
    const contextualMessages = [...conversationHistory];
    if (Object.keys(agentState).length > 0) {
      contextualMessages.push({
        role: 'system',
        content: `Previous agent state: ${JSON.stringify(agentState)}`,
      });
    }
    
    // Add current user message
    contextualMessages.push({
      role: 'user',
      content: userMessage,
    });
    
    // Call OpenAI with agent-specific configuration
    const { response, tokensUsed } = await callOpenAI(contextualMessages, agentConfig);
    
    // Store AI response
    const messageId = await storeMessage(
      sessionId,
      userId,
      response,
      'assistant',
      agentType,
      {
        tokens_used: tokensUsed,
        processing_time: Date.now() - startTime,
        model: agentConfig.model,
      }
    );
    
    // Update agent state based on the conversation
    const updatedState = {
      ...agentState,
      last_interaction: new Date().toISOString(),
      conversation_phase: agentType === 'orchestrator' ? 'coordination' : 'specialized_task',
      context_summary: userMessage.substring(0, 200), // Keep recent context
    };
    
    await updateAgentState(sessionId, userId, agentType, updatedState);
    
    // Update session timestamp
    await supabase
      .from('ai_chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId);
    
    // Determine if another agent should be involved
    let nextAgent: string | undefined;
    if (agentType === 'orchestrator' && (
      response.toLowerCase().includes('workflow') || 
      response.toLowerCase().includes('automation')
    )) {
      nextAgent = 'workflow_designer';
    } else if (agentType === 'workflow_designer' && response.toLowerCase().includes('deploy')) {
      nextAgent = 'deployment';
    }
    
    return {
      response,
      agent_type: agentType,
      message_id: messageId || 'unknown',
      processing_time: Date.now() - startTime,
      tokens_used: tokensUsed,
      conversation_context: updatedState,
      next_agent: nextAgent,
      workflow_progress: agentType === 'workflow_designer' ? { phase: 'design', status: 'in_progress' } : undefined,
    };
    
  } catch (error) {
    console.error('Error in processMultiAgentChat:', error);
    
    // Store error message
    const errorMessage = `I apologize, but I encountered an error processing your request: ${error.message}. Please try again.`;
    const messageId = await storeMessage(sessionId, userId, errorMessage, 'assistant', 'system');
    
    return {
      response: errorMessage,
      agent_type: 'system',
      message_id: messageId || 'error',
      processing_time: Date.now() - startTime,
      tokens_used: 0,
    };
  }
};

// Create or get chat session
const getOrCreateSession = async (userId: string, sessionId?: string): Promise<string> => {
  if (sessionId) {
    // Verify session exists and belongs to user
    const { data: existingSession } = await supabase
      .from('ai_chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();
    
    if (existingSession) {
      return sessionId;
    }
  }
  
  // Create new session
  const { data: newSession, error } = await supabase
    .from('ai_chat_sessions')
    .insert({
      user_id: userId,
      title: 'New AI Chat',
      status: 'active',
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }
  
  return newSession.id;
};

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Verify request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const { 
      message, 
      session_id, 
      agent_type, 
      user_id,
      stream = false 
    } = body;
    
    // Validate required fields
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required and must be a string' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Verify OpenAI API key is configured
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured',
          response: 'Demo mode: This is a simulated AI response. Configure OpenAI API key for full functionality.',
          agent_type: 'system',
          message_id: 'demo',
          processing_time: 100,
          tokens_used: 0,
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Get or create session
    const sessionId = await getOrCreateSession(user_id, session_id);
    
    // Process the chat with multi-agent system
    const result = await processMultiAgentChat(
      sessionId,
      user_id,
      message,
      agent_type
    );
    
    // Add session_id to response
    const response = {
      ...result,
      session_id: sessionId,
    };
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        response: 'I apologize, but I encountered an unexpected error. Please try again.',
        agent_type: 'system',
        message_id: 'error',
        processing_time: 0,
        tokens_used: 0,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});