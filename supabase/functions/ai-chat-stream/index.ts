import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// Streaming chat endpoint for real-time AI responses
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Agent prompts for streaming responses
const STREAMING_AGENT_PROMPTS = {
  orchestrator: `You are the Orchestrator Agent providing streaming responses. Keep responses conversational and helpful while coordinating with other agents when needed. Be concise but informative.`,
  workflow_designer: `You are the Workflow Designer Agent providing streaming n8n workflow guidance. Provide step-by-step instructions clearly and concisely.`,
  deployment: `You are the Deployment Agent providing streaming deployment guidance. Focus on safety and clear deployment steps.`,
  system: `You are the System Agent providing streaming system support. Focus on clear error resolution and system guidance.`
};

// Stream OpenAI response
const streamOpenAIResponse = async (
  messages: any[],
  agentType: string,
  controller: ReadableStreamDefaultController
) => {
  const systemPrompt = STREAMING_AGENT_PROMPTS[agentType as keyof typeof STREAMING_AGENT_PROMPTS] || 
                     STREAMING_AGENT_PROMPTS.orchestrator;

  const openaiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: openaiMessages,
        max_tokens: 4000,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response stream available');
    }

    const decoder = new TextDecoder();
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              controller.enqueue(`data: ${JSON.stringify({
                type: 'done',
                agent_type: agentType,
                full_response: fullResponse,
                timestamp: new Date().toISOString()
              })}\n\n`);
              return fullResponse;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                fullResponse += content;
                controller.enqueue(`data: ${JSON.stringify({
                  type: 'chunk',
                  content,
                  agent_type: agentType,
                  timestamp: new Date().toISOString()
                })}\n\n`);
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  } catch (error) {
    console.error('Streaming error:', error);
    controller.enqueue(`data: ${JSON.stringify({
      type: 'error',
      error: error.message,
      agent_type: agentType,
      timestamp: new Date().toISOString()
    })}\n\n`);
    return `Error: ${error.message}`;
  }
};

// Get conversation context
const getConversationContext = async (sessionId: string, userId: string) => {
  try {
    const { data: messages, error } = await supabase
      .from('ai_chat_messages')
      .select('role, content, agent_type')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error fetching context:', error);
      return [];
    }

    return messages?.map(msg => ({
      role: msg.role,
      content: msg.content
    })) || [];
  } catch (error) {
    console.error('Error in getConversationContext:', error);
    return [];
  }
};

// Store streaming response
const storeStreamingResponse = async (
  sessionId: string,
  userId: string,
  userMessage: string,
  aiResponse: string,
  agentType: string
) => {
  try {
    // Store user message
    await supabase
      .from('ai_chat_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        content: userMessage,
        role: 'user'
      });

    // Store AI response
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        content: aiResponse,
        role: 'assistant',
        agent_type: agentType,
        metadata: {
          streaming: true,
          timestamp: new Date().toISOString()
        }
      })
      .select('id')
      .single();

    // Update session timestamp
    await supabase
      .from('ai_chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId);

    return data?.id;
  } catch (error) {
    console.error('Error storing streaming response:', error);
    return null;
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const body = await req.json();
    const { message, session_id, user_id, agent_type = 'orchestrator' } = body;

    if (!message || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Message and user_id are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify or create session
    let sessionId = session_id;
    if (!sessionId) {
      const { data: newSession, error } = await supabase
        .from('ai_chat_sessions')
        .insert({
          user_id,
          title: 'New Streaming Chat',
          status: 'active'
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create session: ${error.message}`);
      }
      sessionId = newSession.id;
    }

    // Get conversation context
    const conversationHistory = await getConversationContext(sessionId, user_id);
    
    // Add current message to context
    const messages = [
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection confirmation
        controller.enqueue(`data: ${JSON.stringify({
          type: 'connected',
          session_id: sessionId,
          agent_type,
          timestamp: new Date().toISOString()
        })}\n\n`);

        // Start streaming response
        streamOpenAIResponse(messages, agent_type, controller)
          .then(fullResponse => {
            // Store the complete conversation
            storeStreamingResponse(sessionId, user_id, message, fullResponse, agent_type)
              .then(messageId => {
                controller.enqueue(`data: ${JSON.stringify({
                  type: 'stored',
                  message_id: messageId,
                  session_id: sessionId,
                  timestamp: new Date().toISOString()
                })}\n\n`);
              })
              .catch(error => {
                console.error('Error storing response:', error);
              });
          })
          .catch(error => {
            console.error('Stream processing error:', error);
            controller.enqueue(`data: ${JSON.stringify({
              type: 'error',
              error: error.message,
              timestamp: new Date().toISOString()
            })}\n\n`);
          })
          .finally(() => {
            controller.close();
          });
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Streaming chat error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});