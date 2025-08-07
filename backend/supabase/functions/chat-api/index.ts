import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// Types for Chat API
interface ChatSession {
  id?: string;
  user_id: string;
  project_id: string;
  workflow_id?: string;
  title: string;
  status: 'active' | 'archived' | 'completed';
  message_count: number;
  last_message_at: string;
  workflow_created: boolean;
  workflow_deployed: boolean;
  user_satisfied?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ChatMessage {
  id?: string;
  session_id: string;
  user_id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  agent_type: 'system' | 'orchestrator' | 'workflow_designer' | 'deployment';
  processing_time_ms?: number;
  tokens_used?: number;
  metadata?: Record<string, any>;
  created_at?: string;
}

interface CreateSessionRequest {
  project_id: string;
  title?: string;
  workflow_id?: string;
}

interface SendMessageRequest {
  message: string;
  agent_type?: 'orchestrator' | 'workflow_designer' | 'deployment';
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Authentication middleware
const authenticate = async (req: Request): Promise<{ user: any; error?: string }> => {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Authentication required - Bearer token missing' };
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { user: null, error: 'Invalid authentication token' };
    }

    return { user };
  } catch (error) {
    return { user: null, error: 'Authentication failed' };
  }
};

// Input validation
const validateSessionRequest = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.project_id || typeof data.project_id !== 'string') {
    errors.push('Project ID is required and must be a string');
  }
  
  if (data.title && (typeof data.title !== 'string' || data.title.length > 255)) {
    errors.push('Session title must be a string of 255 characters or less');
  }
  
  if (data.workflow_id && typeof data.workflow_id !== 'string') {
    errors.push('Workflow ID must be a string if provided');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateMessageRequest = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
    errors.push('Message is required and must be a non-empty string');
  }
  
  if (data.message && data.message.length > 5000) {
    errors.push('Message must be 5000 characters or less');
  }
  
  if (data.agent_type && !['orchestrator', 'workflow_designer', 'deployment'].includes(data.agent_type)) {
    errors.push('Agent type must be one of: orchestrator, workflow_designer, deployment');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Create or get chat session
const createChatSession = async (userId: string, sessionData: CreateSessionRequest): Promise<ChatSession> => {
  try {
    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', sessionData.project_id)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or access denied');
    }

    // Verify workflow ownership if provided
    if (sessionData.workflow_id) {
      const { data: workflow, error: workflowError } = await supabase
        .from('mvp_workflows')
        .select('id')
        .eq('id', sessionData.workflow_id)
        .eq('user_id', userId)
        .eq('project_id', sessionData.project_id)
        .single();

      if (workflowError || !workflow) {
        throw new Error('Workflow not found or access denied');
      }
    }

    const { data: session, error } = await supabase
      .from('mvp_chat_sessions')
      .insert({
        user_id: userId,
        project_id: sessionData.project_id,
        workflow_id: sessionData.workflow_id || null,
        title: sessionData.title || 'New Chat Session',
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating chat session:', error);
      throw new Error(`Failed to create session: ${error.message}`);
    }

    // Log telemetry
    await supabase
      .from('telemetry_events')
      .insert({
        user_id: userId,
        event_type: 'chat_session_created',
        event_category: 'engagement',
        project_id: sessionData.project_id,
        workflow_id: sessionData.workflow_id,
        session_id: session.id,
        event_data: {
          title: sessionData.title,
          has_workflow: !!sessionData.workflow_id
        },
        success: true
      })
      .catch(err => console.warn('Failed to log telemetry:', err));

    return session;

  } catch (error) {
    console.error('Error in createChatSession:', error);
    throw error;
  }
};

// Get existing chat session
const getChatSession = async (userId: string, sessionId: string): Promise<ChatSession | null> => {
  try {
    const { data: session, error } = await supabase
      .from('mvp_chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Session not found
      }
      console.error('Error fetching chat session:', error);
      throw new Error(`Failed to fetch session: ${error.message}`);
    }

    return session;
  } catch (error) {
    console.error('Error in getChatSession:', error);
    throw error;
  }
};

// Get chat session history
const getChatHistory = async (userId: string, sessionId: string, limit = 50): Promise<ChatMessage[]> => {
  try {
    // Verify session ownership
    const session = await getChatSession(userId, sessionId);
    if (!session) {
      throw new Error('Session not found or access denied');
    }

    const { data: messages, error } = await supabase
      .from('mvp_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching chat history:', error);
      throw new Error(`Failed to fetch chat history: ${error.message}`);
    }

    return messages || [];
  } catch (error) {
    console.error('Error in getChatHistory:', error);
    throw error;
  }
};

// Send message and get AI response
const sendMessage = async (
  userId: string, 
  sessionId: string, 
  messageData: SendMessageRequest
): Promise<{
  user_message: ChatMessage;
  ai_response: ChatMessage;
  session: ChatSession;
}> => {
  const startTime = Date.now();
  
  try {
    // Verify session ownership
    const session = await getChatSession(userId, sessionId);
    if (!session) {
      throw new Error('Session not found or access denied');
    }

    // Store user message
    const { data: userMessage, error: userMessageError } = await supabase
      .from('mvp_chat_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        content: messageData.message,
        role: 'user',
        agent_type: 'system'
      })
      .select()
      .single();

    if (userMessageError) {
      throw new Error(`Failed to store user message: ${userMessageError.message}`);
    }

    // Call the ai-chat-system function to get AI response
    const aiResponse = await fetch(`${supabaseUrl}/functions/v1/ai-chat-system`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: messageData.message,
        session_id: sessionId,
        user_id: userId,
        agent_type: messageData.agent_type
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI service error: ${aiResponse.status} ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    
    if (!aiData.response) {
      throw new Error('No response from AI service');
    }

    // Store AI response message
    const { data: aiMessage, error: aiMessageError } = await supabase
      .from('mvp_chat_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        content: aiData.response,
        role: 'assistant',
        agent_type: aiData.agent_type || 'orchestrator',
        processing_time_ms: aiData.processing_time || (Date.now() - startTime),
        tokens_used: aiData.tokens_used || 0,
        metadata: {
          conversation_context: aiData.conversation_context,
          workflow_progress: aiData.workflow_progress,
          next_agent: aiData.next_agent
        }
      })
      .select()
      .single();

    if (aiMessageError) {
      throw new Error(`Failed to store AI message: ${aiMessageError.message}`);
    }

    // Update session metadata
    const { data: updatedSession, error: sessionError } = await supabase
      .from('mvp_chat_sessions')
      .update({ 
        last_message_at: new Date().toISOString(),
        workflow_created: aiData.workflow_progress?.workflow_id ? true : session.workflow_created,
        workflow_deployed: aiData.workflow_progress?.status === 'deployed' ? true : session.workflow_deployed
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (sessionError) {
      console.warn('Failed to update session:', sessionError);
    }

    // Log telemetry
    await supabase
      .from('telemetry_events')
      .insert({
        user_id: userId,
        event_type: 'chat_message_sent',
        event_category: 'engagement',
        project_id: session.project_id,
        workflow_id: session.workflow_id,
        session_id: sessionId,
        event_data: {
          message_length: messageData.message.length,
          agent_type: aiData.agent_type,
          tokens_used: aiData.tokens_used,
          workflow_created: aiData.workflow_progress?.workflow_id ? true : false
        },
        duration_ms: Date.now() - startTime,
        success: true
      })
      .catch(err => console.warn('Failed to log telemetry:', err));

    return {
      user_message: userMessage,
      ai_response: aiMessage,
      session: updatedSession || session
    };

  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
};

// Get user's chat sessions
const getUserChatSessions = async (userId: string, projectId?: string, limit = 20): Promise<ChatSession[]> => {
  try {
    let query = supabase
      .from('mvp_chat_sessions')
      .select('*')
      .eq('user_id', userId);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: sessions, error } = await query
      .order('last_message_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching chat sessions:', error);
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    return sessions || [];
  } catch (error) {
    console.error('Error in getUserChatSessions:', error);
    throw error;
  }
};

// Update chat session
const updateChatSession = async (
  userId: string, 
  sessionId: string, 
  updates: { title?: string; status?: 'active' | 'archived' | 'completed'; user_satisfied?: boolean }
): Promise<ChatSession> => {
  try {
    // Verify session ownership
    const session = await getChatSession(userId, sessionId);
    if (!session) {
      throw new Error('Session not found or access denied');
    }

    const { data: updatedSession, error } = await supabase
      .from('mvp_chat_sessions')
      .update(updates)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating chat session:', error);
      throw new Error(`Failed to update session: ${error.message}`);
    }

    // Log telemetry for status changes
    if (updates.status || updates.user_satisfied !== undefined) {
      await supabase
        .from('telemetry_events')
        .insert({
          user_id: userId,
          event_type: updates.status === 'completed' ? 'chat_session_completed' : 'chat_session_updated',
          event_category: 'engagement',
          project_id: session.project_id,
          session_id: sessionId,
          event_data: {
            status: updates.status,
            user_satisfied: updates.user_satisfied,
            message_count: session.message_count
          },
          success: true
        })
        .catch(err => console.warn('Failed to log telemetry:', err));
    }

    return updatedSession;

  } catch (error) {
    console.error('Error in updateChatSession:', error);
    throw error;
  }
};

// Main request handler
serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);
  
  console.log(`🚀 [CHAT-API-${requestId}] ${req.method} ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Authenticate user
    const { user, error: authError } = await authenticate(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: authError || 'Authentication failed',
          timestamp: new Date().toISOString()
        } as ApiResponse),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = user.id;
    let response: ApiResponse;
    let statusCode = 200;

    // Route handling
    if (pathSegments.length >= 1 && pathSegments[0] === 'chat') {
      if (pathSegments.length === 2 && pathSegments[1] === 'sessions') {
        if (req.method === 'GET') {
          // GET /chat/sessions - List user's chat sessions
          const projectId = url.searchParams.get('project_id') || undefined;
          const limit = parseInt(url.searchParams.get('limit') || '20');
          
          const sessions = await getUserChatSessions(userId, projectId, limit);
          
          response = {
            success: true,
            data: sessions,
            message: `Retrieved ${sessions.length} chat sessions`,
            timestamp: new Date().toISOString()
          };
        } else if (req.method === 'POST') {
          // POST /chat/sessions - Create new chat session
          const body = await req.json();
          const validation = validateSessionRequest(body);
          
          if (!validation.isValid) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Validation failed',
                message: validation.errors.join(', '),
                timestamp: new Date().toISOString()
              } as ApiResponse),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          
          const session = await createChatSession(userId, body);
          
          response = {
            success: true,
            data: session,
            message: 'Chat session created successfully',
            timestamp: new Date().toISOString()
          };
          statusCode = 201;
        } else {
          throw new Error('Method not allowed');
        }
      } else if (pathSegments.length === 3 && pathSegments[1] === 'sessions') {
        const sessionId = pathSegments[2];
        
        if (req.method === 'GET') {
          // GET /chat/sessions/{id} - Get chat session
          const session = await getChatSession(userId, sessionId);
          if (!session) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Session not found',
                timestamp: new Date().toISOString()
              } as ApiResponse),
              { 
                status: 404, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          
          response = {
            success: true,
            data: session,
            timestamp: new Date().toISOString()
          };
        } else if (req.method === 'PUT') {
          // PUT /chat/sessions/{id} - Update chat session
          const body = await req.json();
          const session = await updateChatSession(userId, sessionId, body);
          
          response = {
            success: true,
            data: session,
            message: 'Session updated successfully',
            timestamp: new Date().toISOString()
          };
        } else {
          throw new Error('Method not allowed');
        }
      } else if (pathSegments.length === 4 && pathSegments[1] === 'sessions' && pathSegments[3] === 'messages') {
        const sessionId = pathSegments[2];
        
        if (req.method === 'GET') {
          // GET /chat/sessions/{id}/messages - Get chat history
          const limit = parseInt(url.searchParams.get('limit') || '50');
          
          const messages = await getChatHistory(userId, sessionId, limit);
          
          response = {
            success: true,
            data: messages,
            message: `Retrieved ${messages.length} messages`,
            timestamp: new Date().toISOString()
          };
        } else if (req.method === 'POST') {
          // POST /chat/sessions/{id}/messages - Send message
          const body = await req.json();
          const validation = validateMessageRequest(body);
          
          if (!validation.isValid) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Validation failed',
                message: validation.errors.join(', '),
                timestamp: new Date().toISOString()
              } as ApiResponse),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          
          const result = await sendMessage(userId, sessionId, body);
          
          response = {
            success: true,
            data: result,
            message: 'Message sent successfully',
            timestamp: new Date().toISOString()
          };
          statusCode = 201;
        } else {
          throw new Error('Method not allowed');
        }
      } else if (pathSegments.length === 3 && pathSegments[2] === 'history') {
        // GET /chat/{sessionId}/history - Alternative endpoint for history
        const sessionId = pathSegments[1];
        
        if (req.method === 'GET') {
          const limit = parseInt(url.searchParams.get('limit') || '50');
          const messages = await getChatHistory(userId, sessionId, limit);
          
          response = {
            success: true,
            data: messages,
            message: `Retrieved ${messages.length} messages`,
            timestamp: new Date().toISOString()
          };
        } else {
          throw new Error('Method not allowed');
        }
      } else {
        throw new Error('Endpoint not found');
      }
    } else {
      throw new Error('Endpoint not found');
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ [CHAT-API-${requestId}] Completed in ${processingTime}ms`);

    return new Response(
      JSON.stringify(response),
      { 
        status: statusCode,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Processing-Time': processingTime.toString()
        }
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [CHAT-API-${requestId}] Error after ${processingTime}ms:`, error);
    
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error.message === 'Method not allowed') {
      statusCode = 405;
      errorMessage = error.message;
    } else if (error.message === 'Endpoint not found') {
      statusCode = 404;
      errorMessage = error.message;
    } else if (error.message.includes('not found') || error.message.includes('access denied')) {
      statusCode = 404;
      errorMessage = error.message;
    } else if (error.message.includes('Validation') || error.message.includes('required')) {
      statusCode = 400;
      errorMessage = error.message;
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
              endpoint: 'chat-api',
              method: req.method,
              error: error.message,
              status_code: statusCode
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

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        message: statusCode >= 500 ? 'An unexpected error occurred. Please try again.' : error.message,
        timestamp: new Date().toISOString()
      } as ApiResponse),
      { 
        status: statusCode,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Processing-Time': processingTime.toString()
        }
      }
    );
  }
});