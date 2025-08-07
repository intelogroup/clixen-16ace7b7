// Secure OpenAI API integration with proper secret management
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
  max_tokens?: number;
  temperature?: number;
  session_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // SECURITY FIX: Get API key from Supabase secrets instead of hardcoding
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { messages, model = 'gpt-4o-mini', max_tokens = 4000, temperature = 0.7, session_id }: ChatRequest = await req.json();

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Invalid messages format');
    }

    // Rate limiting check
    const { data: rateLimitData, error: rateLimitError } = await supabase.rpc('check_rate_limits', {
      p_user_id: user.id,
      p_request_type: 'chat'
    });

    if (rateLimitError) {
      console.warn('Rate limit check failed:', rateLimitError);
    }

    const startTime = Date.now();

    // Call OpenAI API securely
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Clixen-Secure-Chat/1.0'
      },
      body: JSON.stringify({
        model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: String(msg.content).slice(0, 10000) // Sanitize content length
        })),
        max_tokens,
        temperature,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;

    // Extract response safely
    const content = data.choices?.[0]?.message?.content || 'No response generated';
    const usage = data.usage || {};
    const totalTokens = usage.total_tokens || 0;
    
    // Calculate cost (approximate)
    const costCents = Math.round(
      (usage.prompt_tokens || 0) * 0.0015 + 
      (usage.completion_tokens || 0) * 0.002
    );

    // Store chat message securely
    if (session_id) {
      const { error: messageError } = await supabase
        .from('ai_chat_messages')
        .insert([
          {
            session_id,
            user_id: user.id,
            role: 'user',
            content: messages[messages.length - 1].content,
          },
          {
            session_id,
            user_id: user.id,
            role: 'assistant',
            content,
            model,
            token_count: totalTokens,
            processing_time_ms: processingTime,
            cost_cents: costCents,
            agent_type: 'secure_openai',
            agent_status: 'completed',
            metadata: {
              usage,
              model,
              processing_time: processingTime
            }
          }
        ]);

      if (messageError) {
        console.error('Failed to store chat message:', messageError);
      }
    }

    // Update rate limits
    try {
      await supabase.rpc('update_rate_limits', {
        p_user_id: user.id,
        p_request_type: 'chat',
        p_cost_cents: costCents
      });
    } catch (updateError) {
      console.warn('Failed to update rate limits:', updateError);
    }

    // Return secure response
    return new Response(JSON.stringify({
      content,
      usage,
      processing_time_ms: processingTime,
      cost_cents: costCents,
      model,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Secure OpenAI chat error:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
      secure: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});