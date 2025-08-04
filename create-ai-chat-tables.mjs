#!/usr/bin/env node

/**
 * Create AI Chat System tables manually using Supabase client
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Individual table creation functions
async function createChatSessionsTable() {
  console.log('Creating ai_chat_sessions table...');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS ai_chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT 'New Chat',
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Users can manage their own sessions" ON ai_chat_sessions;
      CREATE POLICY "Users can manage their own sessions" ON ai_chat_sessions
        FOR ALL USING (auth.uid() = user_id);
        
      CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
    `
  });
  
  if (error) {
    console.error('❌ Error creating ai_chat_sessions:', error);
    return false;
  }
  
  console.log('✅ ai_chat_sessions table created');
  return true;
}

async function createChatMessagesTable() {
  console.log('Creating ai_chat_messages table...');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        agent_type TEXT CHECK (agent_type IN ('orchestrator', 'workflow_designer', 'deployment', 'system')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      );
      
      ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Users can manage their own messages" ON ai_chat_messages;
      CREATE POLICY "Users can manage their own messages" ON ai_chat_messages
        FOR ALL USING (auth.uid() = user_id);
        
      CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON ai_chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_id ON ai_chat_messages(user_id);
    `
  });
  
  if (error) {
    console.error('❌ Error creating ai_chat_messages:', error);
    return false;
  }
  
  console.log('✅ ai_chat_messages table created');
  return true;
}

async function createAgentStatesTable() {
  console.log('Creating ai_agent_states table...');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS ai_agent_states (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        agent_type TEXT NOT NULL,
        state JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      ALTER TABLE ai_agent_states ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Users can manage their own agent states" ON ai_agent_states;
      CREATE POLICY "Users can manage their own agent states" ON ai_agent_states
        FOR ALL USING (auth.uid() = user_id);
        
      CREATE INDEX IF NOT EXISTS idx_ai_agent_states_session_id ON ai_agent_states(session_id);
    `
  });
  
  if (error) {
    console.error('❌ Error creating ai_agent_states:', error);
    return false;
  }
  
  console.log('✅ ai_agent_states table created');
  return true;
}

async function createOpenAIConfigTable() {
  console.log('Creating openai_configurations table...');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS openai_configurations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  });
  
  if (error) {
    console.error('❌ Error creating openai_configurations:', error);
    return false;
  }
  
  console.log('✅ openai_configurations table created');
  return true;
}

async function insertGlobalConfig() {
  console.log('Inserting global OpenAI configuration...');
  
  const { error } = await supabase
    .from('openai_configurations')
    .upsert({
      user_id: null,
      config_type: 'global',
      default_model: 'gpt-4',
      max_tokens: 4000,
      temperature: 0.7,
      requests_per_minute: 20,
      requests_per_hour: 200,
      daily_cost_limit_cents: 2000
    }, {
      onConflict: 'user_id,config_type',
      ignoreDuplicates: true
    });
  
  if (error) {
    console.error('❌ Error inserting global config:', error);
    return false;
  }
  
  console.log('✅ Global OpenAI configuration inserted');
  return true;
}

async function createStoredProcedures() {
  console.log('Creating stored procedures...');
  
  const { error } = await supabase.rpc('exec_sql', {
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
        
        -- Generate demo response (since OpenAI key setup is external)
        v_ai_response := 'Demo mode: I understand you want to ' || 
                        CASE 
                          WHEN LOWER(p_user_message) LIKE '%workflow%' THEN 'create a workflow. I''ll help you design an efficient automation.'
                          WHEN LOWER(p_user_message) LIKE '%deploy%' THEN 'deploy something. I''ll ensure a safe deployment process.'
                          ELSE 'work on this task. Let me coordinate with the appropriate specialist agents.'
                        END ||
                        ' This is a simulated response. Configure OpenAI API key for full functionality.';
        
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
    `
  });
  
  if (error) {
    console.error('❌ Error creating stored procedures:', error);
    return false;
  }
  
  console.log('✅ Stored procedures created');
  return true;
}

async function runTableCreation() {
  console.log('🚀 Creating AI Chat System tables...\n');

  const steps = [
    createChatSessionsTable,
    createChatMessagesTable,
    createAgentStatesTable,
    createOpenAIConfigTable,
    insertGlobalConfig,
    createStoredProcedures
  ];

  let allSuccessful = true;

  for (const step of steps) {
    const success = await step();
    if (!success) {
      allSuccessful = false;
    }
    console.log(''); // Add spacing
  }

  if (allSuccessful) {
    console.log('🎉 All tables created successfully!');
    console.log('\n✅ AI Chat System database setup complete');
    console.log('✅ Ready for Edge Function deployment');
    console.log('\n📋 Next steps:');
    console.log('1. Test the system: node test-ai-chat-system.mjs');
    console.log('2. Deploy Edge Functions: ./deploy-edge-functions.sh');
  } else {
    console.log('❌ Some tables failed to create. Check errors above.');
  }
}

runTableCreation().catch(console.error);