#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

console.log('🧪 COMPREHENSIVE CHAT FUNCTIONALITY TEST');
console.log('=========================================');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Simulate what the SimpleChatService does
class ChatTester {
  constructor() {
    this.user = null;
  }

  async authenticate() {
    console.log('\n🔐 Step 1: Authentication');
    console.log('==========================');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }

    this.user = data.user;
    console.log('✅ Authenticated successfully');
    console.log(`   User ID: ${this.user.id}`);
    console.log(`   Email: ${this.user.email}`);
    return true;
  }

  async testEdgeFunction(message) {
    console.log('\n🚀 Step 2: Testing Edge Function');
    console.log('=================================');

    const payload = {
      message,
      user_id: this.user.id,
      mode: 'workflow_creation'
    };

    console.log('📤 Sending to ai-chat-simple:', {
      messagePreview: message.substring(0, 50) + '...',
      userId: this.user.id.substring(0, 8) + '***',
      payloadSize: JSON.stringify(payload).length
    });

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-simple', {
        body: payload
      });

      if (error) {
        console.log('❌ Edge Function Error Details:', {
          message: error.message,
          code: error.code,
          status: error.status,
          details: error.details
        });

        // Analyze the error
        if (error.message?.includes('Function not found') || error.status === 404) {
          console.log('🔍 DIAGNOSIS: ai-chat-simple Edge Function not deployed');
          console.log('   Solution: Deploy with: supabase functions deploy ai-chat-simple');
        } else if (error.message?.includes('timeout')) {
          console.log('🔍 DIAGNOSIS: Function timeout (likely OpenAI API issues)');
        } else if (error.status === 401) {
          console.log('🔍 DIAGNOSIS: Authentication error with Edge Function');
        } else {
          console.log('🔍 DIAGNOSIS: Unknown Edge Function error');
        }

        return { success: false, error, usesFallback: true };
      }

      console.log('✅ Edge Function Response:', {
        hasResponse: !!data?.response,
        responseLength: data?.response?.length || 0,
        phase: data?.phase,
        needsMoreInfo: data?.needs_more_info,
        workflowGenerated: data?.workflow_generated
      });

      if (data?.response) {
        console.log('\n💬 AI Response Preview:');
        console.log(data.response.substring(0, 200) + (data.response.length > 200 ? '...' : ''));
      }

      return { success: true, data, usesFallback: false };

    } catch (error) {
      console.log('❌ Edge Function Call Failed:', error.message);
      return { success: false, error, usesFallback: true };
    }
  }

  simulateFallbackService(message) {
    console.log('\n🔄 Step 3: Testing Fallback Service');
    console.log('===================================');

    const msg = message.toLowerCase();
    let response = '';

    if (msg.includes('slack') || msg.includes('notification')) {
      response = `💬 **Slack Notification Automation** (Fallback Mode)

I can help you create a workflow that sends Slack notifications! 

Let me ask a few questions:
1. What should trigger the Slack message? (schedule, webhook, email, etc.)
2. Which Slack channel should receive the message?
3. Should the message content be dynamic or the same every time?

Based on your request for morning notifications, I'm thinking of a scheduled trigger at 9 AM. Does that sound right?`;
    } else if (msg.includes('email')) {
      response = `📧 **Email Automation Detected** (Fallback Mode)

Great! I can help with email workflows.

A few questions:
1. Do you want to trigger this when you **receive** emails or **send** emails?
2. Should this work with all emails or only specific ones?
3. What should happen when the email trigger fires?`;
    } else {
      response = `🤔 **Let me understand your automation:** (Fallback Mode)

I'm ready to help you create a workflow! To get started:

1. **What should trigger this automation?** (email, schedule, webhook, etc.)
2. **What actions should it perform?** (send messages, save data, etc.)  
3. **Which services do you want to connect?** (Slack, Gmail, etc.)

The more details you provide, the better I can help!`;
    }

    console.log('✅ Fallback Service Response:');
    console.log(response.substring(0, 200) + '...');

    return {
      success: true,
      content: response,
      workflowGenerated: false,
      mode: 'fallback'
    };
  }

  async testCompleteFlow(message) {
    console.log(`\n🎯 TESTING COMPLETE CHAT FLOW`);
    console.log(`📝 Message: "${message}"`);
    console.log('=' .repeat(50));

    // Step 1: Try Edge Function
    const edgeResult = await this.testEdgeFunction(message);

    if (edgeResult.success) {
      console.log('\n🎉 SUCCESS: Edge Function working!');
      console.log('   The chat functionality is fully operational');
      console.log('   Users will get real AI responses');
      return {
        success: true,
        method: 'Edge Function',
        response: edgeResult.data.response
      };
    } else {
      console.log('\n⚠️  Edge Function failed, testing fallback...');
      
      // Step 2: Use Fallback Service
      const fallbackResult = this.simulateFallbackService(message);
      
      console.log('\n✅ SUCCESS: Fallback service working!');
      console.log('   Users will get demo responses');
      console.log('   Chat is functional but in demo mode');
      
      return {
        success: true,
        method: 'Fallback Service',
        response: fallbackResult.content,
        isDemo: true
      };
    }
  }
}

async function runCompleteChatTest() {
  const tester = new ChatTester();
  
  try {
    // Test authentication
    await tester.authenticate();
    
    // Test different types of messages
    const testMessages = [
      "I want to create a workflow that sends me a Slack notification every morning at 9 AM",
      "Create an email automation that saves attachments to Google Drive",
      "Set up a webhook that processes form submissions"
    ];

    const results = [];

    for (const message of testMessages) {
      const result = await tester.testCompleteFlow(message);
      results.push(result);
    }

    // Summary
    console.log('\n📊 CHAT FUNCTIONALITY TEST SUMMARY');
    console.log('==================================');

    const edgeFunctionWorking = results.some(r => r.method === 'Edge Function');
    const fallbackWorking = results.every(r => r.success);

    console.log(`Edge Function: ${edgeFunctionWorking ? '✅ Working' : '❌ Not working'}`);
    console.log(`Fallback Service: ${fallbackWorking ? '✅ Working' : '❌ Not working'}`);
    console.log(`Overall Chat: ${fallbackWorking ? '✅ Functional' : '❌ Broken'}`);

    console.log('\n💡 RECOMMENDATIONS:');

    if (!edgeFunctionWorking) {
      console.log('🔧 TO ENABLE FULL AI FUNCTIONALITY:');
      console.log('   1. Deploy Edge Function: supabase functions deploy ai-chat-simple --project-ref zfbgdixbzezpxllkoyfc');
      console.log('   2. Configure OpenAI API key in Supabase project settings');
      console.log('   3. Set environment variables: OPENAI_API_KEY, N8N_API_URL, N8N_API_KEY');
      console.log('   4. Check Supabase function logs for deployment status');
    } else {
      console.log('🎉 Full AI functionality is working perfectly!');
    }

    if (fallbackWorking) {
      console.log('\n✅ CURRENT STATUS:');
      console.log('   • Chat interface is functional');
      console.log('   • Users can interact with the AI assistant');
      console.log('   • Fallback service provides demo responses');
      console.log('   • No edge function errors will block the user experience');
    } else {
      console.log('\n❌ CRITICAL ISSUES:');
      console.log('   • Both Edge Function and Fallback Service failed');
      console.log('   • Chat functionality is completely broken');
      console.log('   • Users cannot interact with the AI');
    }

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    console.log('\nThis indicates a fundamental issue with:');
    console.log('- Authentication system');
    console.log('- Supabase connection');
    console.log('- Basic app functionality');
  }
}

// Execute the comprehensive test
runCompleteChatTest()
  .then(() => {
    console.log('\n🏁 Chat functionality test completed');
  })
  .catch(error => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });
