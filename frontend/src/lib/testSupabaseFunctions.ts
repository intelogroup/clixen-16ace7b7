import { supabase } from './supabase';

export const testSupabaseFunctions = async () => {
  console.log('🔍 Testing Supabase Edge Functions...');
  
  // Test 1: Basic health check
  try {
    console.log('Testing health-check function...');
    const { data, error } = await supabase.functions.invoke('health-check', {
      body: { action: 'basic' }
    });
    console.log('✅ Health check result:', { data, error });
  } catch (error) {
    console.error('❌ Health check failed:', error);
  }

  // Test 2: AI Chat Simple
  try {
    console.log('Testing ai-chat-simple function...');
    const { data, error } = await supabase.functions.invoke('ai-chat-simple', {
      body: { 
        message: 'Hello, test message',
        user_id: 'test-user',
        mode: 'workflow_creation'
      }
    });
    console.log('✅ AI Chat result:', { data, error });
  } catch (error) {
    console.error('❌ AI Chat failed:', error);
  }

  // Test 3: Check Supabase config
  const config = supabase.supabaseUrl;
  console.log('📋 Supabase URL:', config);
  
  return 'Function tests completed - check console for results';
};

// Auto-run in development
if (import.meta.env.DEV) {
  setTimeout(() => {
    testSupabaseFunctions().then(result => {
      console.log('🎯 Function test result:', result);
    });
  }, 2000);
}
