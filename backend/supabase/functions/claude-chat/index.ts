import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  model: string;
  stream?: boolean;
}

serve(async (req) => {
  console.log('🚀 Claude Chat function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { messages, model, stream = false }: RequestBody = await req.json();
    console.log('📝 Processing request:', { messagesCount: messages.length, model, stream });

    // Get Anthropic API key from environment
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      console.error('❌ ANTHROPIC_API_KEY not found in environment');
      return new Response(JSON.stringify({ 
        error: 'Anthropic API key not configured. Please add your ANTHROPIC_API_KEY to Supabase secrets.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map model names to Anthropic API model names
    const modelMapping: Record<string, string> = {
      'claude-opus-4-20250514': 'claude-3-opus-20240229',
      'claude-sonnet-4-20250514': 'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022': 'claude-3-5-haiku-20241022'
    };

    const anthropicModel = modelMapping[model] || 'claude-3-5-sonnet-20241022';
    console.log('🤖 Using Anthropic model:', anthropicModel);

    // Prepare the request to Anthropic API
    const anthropicRequest = {
      model: anthropicModel,
      max_tokens: 4000,
      temperature: 0.7,
      messages: messages.filter(m => m.role !== 'system').map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      stream
    };

    // Add system message if present
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage) {
      anthropicRequest.system = systemMessage.content;
    }

    console.log('📤 Sending request to Anthropic API');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicRequest),
    });

    console.log('📥 Anthropic API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Anthropic API error:', errorText);
      return new Response(JSON.stringify({ 
        error: `Anthropic API error: ${response.status}` 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (stream) {
      // Handle streaming response
      const headers = {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      };

      const readableStream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                controller.enqueue(`data: {"content": "", "isComplete": true}\n\n`);
                controller.close();
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (data.type === 'content_block_delta') {
                      const content = data.delta?.text || '';
                      if (content) {
                        controller.enqueue(`data: ${JSON.stringify({ content, isComplete: false })}\n\n`);
                      }
                    }
                  } catch (e) {
                    console.warn('Failed to parse SSE line:', line);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Streaming error:', error);
            controller.enqueue(`data: {"error": "${error.message}", "isComplete": true}\n\n`);
            controller.close();
          } finally {
            reader.releaseLock();
          }
        },
      });

      return new Response(readableStream, { headers });
    } else {
      // Handle non-streaming response
      const data = await response.json();
      console.log('✅ Claude response received');
      
      const content = data.content?.[0]?.text || 'No response content';
      
      return new Response(JSON.stringify({ content }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('💥 Function error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});