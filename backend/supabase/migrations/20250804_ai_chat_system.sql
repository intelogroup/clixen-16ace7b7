-- AI Chat System Migration
-- Creates tables and stored procedures for database-driven AI chat

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Create tables for AI chat system
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    agent_type TEXT CHECK (agent_type IN ('orchestrator', 'workflow_designer', 'deployment', 'system')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS ai_agent_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_type TEXT NOT NULL,
    state JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS openai_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    config_type TEXT NOT NULL DEFAULT 'user' CHECK (config_type IN ('user', 'global')),
    default_model TEXT NOT NULL DEFAULT 'gpt-4',
    max_tokens INTEGER DEFAULT 4000,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    requests_per_minute INTEGER DEFAULT 20,
    requests_per_hour INTEGER DEFAULT 200,
    daily_cost_limit_cents INTEGER DEFAULT 2000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, config_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_id ON ai_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_states_session_id ON ai_agent_states(session_id);

-- Enable Row Level Security
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE openai_configurations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own sessions" ON ai_chat_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own messages" ON ai_chat_messages
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own agent states" ON ai_agent_states
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own configurations" ON openai_configurations
    FOR ALL USING (auth.uid() = user_id OR config_type = 'global');

-- Create stored procedure for session creation
CREATE OR REPLACE FUNCTION create_chat_session(
    p_user_id UUID,
    p_title TEXT DEFAULT 'New Chat'
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    title TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_session ai_chat_sessions%ROWTYPE;
BEGIN
    INSERT INTO ai_chat_sessions (user_id, title)
    VALUES (p_user_id, p_title)
    RETURNING * INTO v_session;
    
    RETURN QUERY SELECT 
        v_session.id,
        v_session.user_id,
        v_session.title,
        v_session.status,
        v_session.created_at,
        v_session.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create stored procedure for getting conversation history
CREATE OR REPLACE FUNCTION get_conversation_history(
    p_session_id UUID,
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    id UUID,
    session_id UUID,
    user_id UUID,
    content TEXT,
    role TEXT,
    agent_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        m.id,
        m.session_id,
        m.user_id,
        m.content,
        m.role,
        m.agent_type,
        m.created_at,
        m.metadata
    FROM ai_chat_messages m
    WHERE m.session_id = p_session_id 
      AND m.user_id = p_user_id
    ORDER BY m.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create main chat processing function
CREATE OR REPLACE FUNCTION process_multi_agent_chat(
    p_user_id UUID,
    p_session_id UUID,
    p_user_message TEXT,
    p_agent_type TEXT DEFAULT 'orchestrator',
    p_model TEXT DEFAULT NULL,
    p_max_tokens INTEGER DEFAULT NULL,
    p_temperature DECIMAL DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_config RECORD;
    v_api_key TEXT;
    v_request_body JSONB;
    v_response JSONB;
    v_ai_response TEXT;
    v_message_id UUID;
    v_messages JSONB;
BEGIN
    -- Insert user message
    INSERT INTO ai_chat_messages (session_id, user_id, content, role)
    VALUES (p_session_id, p_user_id, p_user_message, 'user');
    
    -- Get OpenAI configuration
    SELECT * INTO v_config
    FROM openai_configurations
    WHERE (user_id = p_user_id OR config_type = 'global')
    ORDER BY user_id NULLS LAST
    LIMIT 1;
    
    IF v_config IS NULL THEN
        RAISE EXCEPTION 'No OpenAI configuration found';
    END IF;
    
    -- Get API key from environment or configuration
    -- This should be configured via Supabase secrets or environment variables
    v_api_key := current_setting('app.openai_api_key', true);
    
    IF v_api_key IS NULL OR v_api_key = '' THEN
        -- Fallback to demo mode with mock response
        v_ai_response := 'Demo mode: This is a simulated AI response. Configure OpenAI API key in Supabase secrets for full functionality.';
    ELSE
        -- Build conversation history for context
        SELECT jsonb_agg(
            jsonb_build_object(
                'role', CASE WHEN role = 'user' THEN 'user' ELSE 'assistant' END,
                'content', content
            ) ORDER BY created_at
        ) INTO v_messages
        FROM ai_chat_messages
        WHERE session_id = p_session_id AND user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 10;
        
        -- Build request body for OpenAI
        v_request_body := jsonb_build_object(
            'model', COALESCE(p_model, v_config.default_model, 'gpt-4'),
            'messages', COALESCE(v_messages, '[]'::jsonb),
            'max_tokens', COALESCE(p_max_tokens, v_config.max_tokens, 4000),
            'temperature', COALESCE(p_temperature, v_config.temperature, 0.7),
            'stream', false
        );
        
        -- Make API call to OpenAI (requires pg_net extension)
        SELECT INTO v_response net.http_request(
            'POST',
            'https://api.openai.com/v1/chat/completions',
            ARRAY[
                net.http_header('Authorization', 'Bearer ' || v_api_key),
                net.http_header('Content-Type', 'application/json')
            ],
            'application/json',
            v_request_body::text
        );
        
        -- Extract AI response
        IF v_response->>'status_code' = '200' THEN
            v_ai_response := v_response->'content'->'choices'->0->'message'->>'content';
        ELSE
            v_ai_response := 'Error: Failed to get AI response - ' || COALESCE(v_response->>'status_code', 'unknown error');
        END IF;
    END IF;
    
    -- Insert AI response
    INSERT INTO ai_chat_messages (session_id, user_id, content, role, agent_type, metadata)
    VALUES (p_session_id, p_user_id, v_ai_response, 'assistant', p_agent_type, 
            jsonb_build_object('processing_time', extract(epoch from now())))
    RETURNING id INTO v_message_id;
    
    -- Update session timestamp
    UPDATE ai_chat_sessions 
    SET updated_at = NOW() 
    WHERE id = p_session_id AND user_id = p_user_id;
    
    -- Return response
    RETURN jsonb_build_object(
        'response', v_ai_response,
        'agent_type', p_agent_type,
        'message_id', v_message_id,
        'processing_time', extract(epoch from now()),
        'tokens_used', COALESCE(v_response->'content'->'usage'->>'total_tokens', 0)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return error response
        INSERT INTO ai_chat_messages (session_id, user_id, content, role, agent_type)
        VALUES (p_session_id, p_user_id, 'Error: ' || SQLERRM, 'assistant', 'system');
        
        RETURN jsonb_build_object(
            'response', 'I apologize, but I encountered an error processing your request: ' || SQLERRM,
            'agent_type', 'system',
            'error', true
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default global configuration
INSERT INTO openai_configurations (
  user_id, config_type, default_model, max_tokens, temperature,
  requests_per_minute, requests_per_hour, daily_cost_limit_cents
) VALUES (
  NULL, 'global', 'gpt-4', 4000, 0.7, 20, 200, 2000
) ON CONFLICT (user_id, config_type) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;