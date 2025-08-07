-- Create missing tables for AI Chat system
-- These tables are required by the Edge Functions

-- Create ai_chat_sessions table
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ai_chat_messages table
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    agent_type TEXT CHECK (agent_type IN ('orchestrator', 'workflow_designer', 'deployment', 'system')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_created_at ON ai_chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_id ON ai_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created_at ON ai_chat_messages(created_at);

-- Enable Row Level Security
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_chat_sessions
DROP POLICY IF EXISTS "Users can manage their own chat sessions" ON ai_chat_sessions;
CREATE POLICY "Users can manage their own chat sessions" ON ai_chat_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for ai_chat_messages  
DROP POLICY IF EXISTS "Users can manage their own chat messages" ON ai_chat_messages;
CREATE POLICY "Users can manage their own chat messages" ON ai_chat_messages
    FOR ALL USING (auth.uid() = user_id);

-- Create updated_at trigger for ai_chat_sessions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ai_chat_sessions_updated_at ON ai_chat_sessions;
CREATE TRIGGER update_ai_chat_sessions_updated_at 
    BEFORE UPDATE ON ai_chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (service role needs full access)
GRANT ALL ON ai_chat_sessions TO service_role;
GRANT ALL ON ai_chat_messages TO service_role;
GRANT ALL ON ai_chat_sessions TO authenticated;
GRANT ALL ON ai_chat_messages TO authenticated;