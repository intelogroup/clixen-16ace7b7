#!/usr/bin/env node

/**
 * Create AI Chat System tables using Supabase Management API
 */

const SUPABASE_PROJECT_REF = 'zfbgdixbzezpxllkoyfc';
const SUPABASE_ACCESS_TOKEN = 'sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f';

async function executeSQL(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`SQL execution failed: ${JSON.stringify(result)}`);
  }
  
  return result;
}

async function createAIChatTables() {
  console.log('🚀 Creating AI Chat System tables via Supabase API...\n');

  const migrations = [
    {
      name: 'Enable extensions',
      sql: `
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS "pg_net";
      `
    },
    {
      name: 'Create ai_chat_sessions table',
      sql: `
        CREATE TABLE IF NOT EXISTS ai_chat_sessions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          title TEXT NOT NULL DEFAULT 'New Chat',
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
        
        ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage their own sessions" ON ai_chat_sessions;
        CREATE POLICY "Users can manage their own sessions" ON ai_chat_sessions
          FOR ALL USING (auth.uid() = user_id);
      `
    },
    {
      name: 'Create ai_chat_messages table',
      sql: `
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
        
        CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON ai_chat_messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_id ON ai_chat_messages(user_id);
        
        ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage their own messages" ON ai_chat_messages;
        CREATE POLICY "Users can manage their own messages" ON ai_chat_messages
          FOR ALL USING (auth.uid() = user_id);
      `
    },
    {
      name: 'Create ai_agent_states table',
      sql: `
        CREATE TABLE IF NOT EXISTS ai_agent_states (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          agent_type TEXT NOT NULL,
          state JSONB DEFAULT '{}'::jsonb,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_ai_agent_states_session_id ON ai_agent_states(session_id);
        
        ALTER TABLE ai_agent_states ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage their own agent states" ON ai_agent_states;
        CREATE POLICY "Users can manage their own agent states" ON ai_agent_states
          FOR ALL USING (auth.uid() = user_id);
      `
    },
    {
      name: 'Create openai_configurations table',
      sql: `
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
        
        ALTER TABLE openai_configurations ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage their own configurations" ON openai_configurations;
        CREATE POLICY "Users can manage their own configurations" ON openai_configurations
          FOR ALL USING (auth.uid() = user_id OR config_type = 'global');
      `
    },
    {
      name: 'Insert global configuration',
      sql: `
        INSERT INTO openai_configurations (
          user_id, config_type, default_model, max_tokens, temperature,
          requests_per_minute, requests_per_hour, daily_cost_limit_cents
        ) VALUES (
          NULL, 'global', 'gpt-4', 4000, 0.7, 20, 200, 2000
        ) ON CONFLICT (user_id, config_type) DO NOTHING;
      `
    },
    {
      name: 'Create chat processing function',
      sql: `
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
          v_ai_response TEXT;
          v_message_id UUID;
        BEGIN
          -- Insert user message
          INSERT INTO ai_chat_messages (session_id, user_id, content, role)
          VALUES (p_session_id, p_user_id, p_user_message, 'user');
          
          -- Generate demo response (since OpenAI integration happens in Edge Functions)
          v_ai_response := 'Demo mode: I understand you want to ' || 
                          CASE 
                            WHEN LOWER(p_user_message) LIKE '%workflow%' THEN 'create a workflow. I''ll help you design an efficient automation.'
                            WHEN LOWER(p_user_message) LIKE '%deploy%' THEN 'deploy something. I''ll ensure a safe deployment process.'
                            ELSE 'work on this task. Let me coordinate with the appropriate specialist agents.'
                          END ||
                          ' This is a simulated response. The Edge Functions provide full OpenAI integration.';
          
          -- Insert AI response
          INSERT INTO ai_chat_messages (session_id, user_id, content, role, agent_type, metadata)
          VALUES (p_session_id, p_user_id, v_ai_response, 'assistant', p_agent_type, 
                  jsonb_build_object('processing_time', 500, 'demo_mode', true))
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
            'processing_time', 500,
            'tokens_used', 0,
            'demo_mode', true
          );
          
        EXCEPTION
          WHEN OTHERS THEN
            -- Insert error message
            INSERT INTO ai_chat_messages (session_id, user_id, content, role, agent_type)
            VALUES (p_session_id, p_user_id, 'Error: ' || SQLERRM, 'assistant', 'system');
            
            RETURN jsonb_build_object(
              'response', 'I apologize, but I encountered an error processing your request: ' || SQLERRM,
              'agent_type', 'system',
              'error', true
            );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    },
    {
      name: 'Grant permissions',
      sql: `
        GRANT USAGE ON SCHEMA public TO authenticated;
        GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
      `
    }
  ];

  let successCount = 0;
  
  for (const migration of migrations) {
    try {
      console.log(`Executing: ${migration.name}...`);
      await executeSQL(migration.sql);
      console.log(`✅ ${migration.name} completed successfully`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${migration.name} failed:`, error.message);
    }
    console.log(''); // Add spacing
  }

  console.log(`🎯 Migration Summary: ${successCount}/${migrations.length} completed successfully`);
  
  if (successCount === migrations.length) {
    console.log('🎉 All migrations completed successfully!');
    console.log('✅ AI Chat System database is ready');
    console.log('\n📋 Next steps:');
    console.log('1. Test the system: node test-ai-chat-system.mjs');
    console.log('2. Deploy Edge Functions: ./deploy-edge-functions.sh');
  }
}

createAIChatTables().catch(console.error);