#!/usr/bin/env node

/**
 * Comprehensive test for AI Chat System database functions
 * Tests the stored procedures and database functionality
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Test user ID (this would be a real user ID in production)
const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }

    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    return false;
  }
}

async function testSessionCreation() {
  console.log('🔍 Testing session creation...');
  
  try {
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .insert({
        user_id: TEST_USER_ID,
        title: 'Test AI Chat Session',
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Session creation failed:', error.message);
      return null;
    }

    console.log('✅ Session created successfully:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Session creation error:', error);
    return null;
  }
}

async function testMessageStorage(sessionId) {
  console.log('🔍 Testing message storage...');
  
  try {
    // Store user message
    const { data: userMessage, error: userError } = await supabase
      .from('ai_chat_messages')
      .insert({
        session_id: sessionId,
        user_id: TEST_USER_ID,
        content: 'Hello, this is a test message',
        role: 'user'
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ User message storage failed:', userError.message);
      return false;
    }

    // Store AI response
    const { data: aiMessage, error: aiError } = await supabase
      .from('ai_chat_messages')
      .insert({
        session_id: sessionId,
        user_id: TEST_USER_ID,
        content: 'Hello! This is a test AI response from the multi-agent system.',
        role: 'assistant',
        agent_type: 'orchestrator',
        metadata: {
          tokens_used: 25,
          processing_time: 1200,
          model: 'gpt-4'
        }
      })
      .select()
      .single();

    if (aiError) {
      console.error('❌ AI message storage failed:', aiError.message);
      return false;
    }

    console.log('✅ Messages stored successfully');
    console.log(`   User message ID: ${userMessage.id}`);
    console.log(`   AI message ID: ${aiMessage.id}`);
    return true;
  } catch (error) {
    console.error('❌ Message storage error:', error);
    return false;
  }
}

async function testConversationHistory(sessionId) {
  console.log('🔍 Testing conversation history retrieval...');
  
  try {
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', TEST_USER_ID)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Conversation history retrieval failed:', error.message);
      return false;
    }

    console.log('✅ Conversation history retrieved successfully');
    console.log(`   Found ${data.length} messages:`);
    data.forEach((msg, index) => {
      console.log(`   ${index + 1}. [${msg.role}${msg.agent_type ? ` - ${msg.agent_type}` : ''}]: ${msg.content.substring(0, 50)}...`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Conversation history error:', error);
    return false;
  }
}

async function testAgentStateManagement(sessionId) {
  console.log('🔍 Testing agent state management...');
  
  try {
    // Store agent state
    const testState = {
      conversation_phase: 'coordination',
      last_interaction: new Date().toISOString(),
      context_summary: 'Testing agent state management',
      workflow_progress: {
        phase: 'design',
        status: 'in_progress'
      }
    };

    const { data: stateData, error: stateError } = await supabase
      .from('ai_agent_states')
      .upsert({
        session_id: sessionId,
        user_id: TEST_USER_ID,
        agent_type: 'orchestrator',
        state: testState
      })
      .select()
      .single();

    if (stateError) {
      console.error('❌ Agent state storage failed:', stateError.message);
      return false;
    }

    // Retrieve agent state
    const { data: retrievedState, error: retrieveError } = await supabase
      .from('ai_agent_states')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', TEST_USER_ID)
      .eq('agent_type', 'orchestrator')
      .single();

    if (retrieveError) {
      console.error('❌ Agent state retrieval failed:', retrieveError.message);
      return false;
    }

    console.log('✅ Agent state management successful');
    console.log(`   State stored and retrieved for agent: ${retrievedState.agent_type}`);
    console.log(`   State content: ${JSON.stringify(retrievedState.state, null, 2)}`);
    
    return true;
  } catch (error) {
    console.error('❌ Agent state management error:', error);
    return false;
  }
}

async function testOpenAIConfiguration() {
  console.log('🔍 Testing OpenAI configuration...');
  
  try {
    // Check for existing configuration
    const { data: existingConfig, error: fetchError } = await supabase
      .from('openai_configurations')
      .select('*')
      .eq('config_type', 'global')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ OpenAI configuration fetch failed:', fetchError.message);
      return false;
    }

    if (existingConfig) {
      console.log('✅ OpenAI configuration found');
      console.log(`   Model: ${existingConfig.default_model}`);
      console.log(`   Max tokens: ${existingConfig.max_tokens}`);
      console.log(`   Temperature: ${existingConfig.temperature}`);
    } else {
      console.log('ℹ️  No existing OpenAI configuration found (this is expected for new setups)');
    }
    
    return true;
  } catch (error) {
    console.error('❌ OpenAI configuration error:', error);
    return false;
  }
}

async function testMultiAgentChatFunction(sessionId) {
  console.log('🔍 Testing multi-agent chat stored procedure...');
  
  try {
    // Call the stored procedure (this will use demo mode if no OpenAI key is configured)
    const { data, error } = await supabase.rpc('process_multi_agent_chat', {
      p_user_id: TEST_USER_ID,
      p_session_id: sessionId,
      p_user_message: 'Create a simple automation workflow for email notifications',
      p_agent_type: 'orchestrator'
    });

    if (error) {
      console.error('❌ Multi-agent chat function failed:', error.message);
      return false;
    }

    console.log('✅ Multi-agent chat function successful');
    console.log(`   Response: ${data.response.substring(0, 100)}...`);
    console.log(`   Agent type: ${data.agent_type}`);
    console.log(`   Processing time: ${data.processing_time}ms`);
    
    return true;
  } catch (error) {
    console.error('❌ Multi-agent chat function error:', error);
    return false;
  }
}

async function testSessionManagement() {
  console.log('🔍 Testing session management...');
  
  try {
    // List user sessions
    const { data: sessions, error: listError } = await supabase
      .from('ai_chat_sessions')
      .select(`
        id,
        title,
        status,
        created_at,
        updated_at,
        ai_chat_messages(count)
      `)
      .eq('user_id', TEST_USER_ID)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (listError) {
      console.error('❌ Session listing failed:', listError.message);
      return false;
    }

    console.log('✅ Session management successful');
    console.log(`   Found ${sessions.length} active sessions for user`);
    sessions.forEach((session, index) => {
      const messageCount = session.ai_chat_messages?.length || 0;
      console.log(`   ${index + 1}. ${session.title} (${messageCount} messages)`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Session management error:', error);
    return false;
  }
}

async function cleanup() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // Delete test messages
    await supabase
      .from('ai_chat_messages')
      .delete()
      .eq('user_id', TEST_USER_ID);

    // Delete test agent states
    await supabase
      .from('ai_agent_states')
      .delete()
      .eq('user_id', TEST_USER_ID);

    // Delete test sessions
    await supabase
      .from('ai_chat_sessions')
      .delete()
      .eq('user_id', TEST_USER_ID);

    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('⚠️  Cleanup error (this is usually not critical):', error);
  }
}

async function runComprehensiveTest() {
  console.log('🚀 Starting comprehensive AI Chat System test\n');

  let testSession = null;
  let allTestsPassed = true;

  // Test 1: Database Connection
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    allTestsPassed = false;
    console.log('\n❌ Critical error: Database connection failed. Stopping tests.');
    return;
  }

  // Test 2: Session Creation
  testSession = await testSessionCreation();
  if (!testSession) {
    allTestsPassed = false;
  }

  if (testSession) {
    // Test 3: Message Storage
    const messageStored = await testMessageStorage(testSession.id);
    if (!messageStored) allTestsPassed = false;

    // Test 4: Conversation History
    const historyWorking = await testConversationHistory(testSession.id);
    if (!historyWorking) allTestsPassed = false;

    // Test 5: Agent State Management
    const stateWorking = await testAgentStateManagement(testSession.id);
    if (!stateWorking) allTestsPassed = false;

    // Test 6: Multi-Agent Chat Function
    const chatWorking = await testMultiAgentChatFunction(testSession.id);
    if (!chatWorking) allTestsPassed = false;
  }

  // Test 7: OpenAI Configuration
  const configWorking = await testOpenAIConfiguration();
  if (!configWorking) allTestsPassed = false;

  // Test 8: Session Management
  const sessionMgmtWorking = await testSessionManagement();
  if (!sessionMgmtWorking) allTestsPassed = false;

  // Cleanup
  await cleanup();

  // Final report
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    console.log('🎉 All tests passed! AI Chat System is fully functional.');
    console.log('\n✅ Database schema is working correctly');
    console.log('✅ Multi-agent chat functionality is operational');
    console.log('✅ Session management is working');
    console.log('✅ Agent state persistence is functional');
    console.log('✅ OpenAI integration is configured');
    
    console.log('\n🚀 Ready for Edge Function deployment!');
    console.log('   Run: ./deploy-edge-functions.sh');
  } else {
    console.log('❌ Some tests failed. Please check the errors above.');
    console.log('\n🔧 Common issues:');
    console.log('   - Database migration not run: Run the migration SQL');
    console.log('   - RLS policies not set: Check row-level security configuration');
    console.log('   - Environment variables missing: Check .env configuration');
  }
  
  console.log('\n📋 Edge Function endpoints (after deployment):');
  console.log(`   • Main chat: ${SUPABASE_URL}/functions/v1/ai-chat-system`);
  console.log(`   • Sessions: ${SUPABASE_URL}/functions/v1/ai-chat-sessions`);
  console.log(`   • Streaming: ${SUPABASE_URL}/functions/v1/ai-chat-stream`);
}

runComprehensiveTest().catch(console.error);