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
  console.log('🚀 OpenAI Chat function called');
  
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

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('❌ OPENAI_API_KEY not found in environment');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured. Please add your OPENAI_API_KEY to Supabase secrets.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🤖 Using OpenAI model:', model);

    // Prepare the request to OpenAI API
    const openaiRequest = {
      model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: 0.7,
      max_tokens: 4000,
      stream
    };

    console.log('📤 Sending request to OpenAI API');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(openaiRequest),
    });

    console.log('📥 OpenAI API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', errorText);
      return new Response(JSON.stringify({ 
        error: `OpenAI API error: ${response.status}` 
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
                  const dataStr = line.slice(6).trim();
                  if (dataStr === '[DONE]') {
                    controller.enqueue(`data: {"content": "", "isComplete": true}\n\n`);
                    continue;
                  }
                  
                  try {
                    const data = JSON.parse(dataStr);
                    const content = data.choices?.[0]?.delta?.content || '';
                    if (content) {
                      controller.enqueue(`data: ${JSON.stringify({ content, isComplete: false })}\n\n`);
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
      console.log('✅ OpenAI response received');
      
      const content = data.choices?.[0]?.message?.content || 'No response content';
      
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