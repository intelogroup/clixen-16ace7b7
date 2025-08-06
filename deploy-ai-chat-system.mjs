#!/usr/bin/env node

/**
 * Deploy ai-chat-system Edge Function with OpenAI Integration
 * Uses Supabase MCP for reliable deployment
 */

console.log('🚀 Deploying ai-chat-system Edge Function...\n');

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

const projectRef = 'zfbgdixbzezpxllkoyfc';
const functionName = 'ai-chat-system';

try {
  // Check if function directory exists
  const functionPath = `/root/repo/supabase/functions/${functionName}`;
  
  if (!existsSync(functionPath)) {
    console.error(`❌ Function directory not found: ${functionPath}`);
    process.exit(1);
  }
  
  console.log(`📁 Function directory: ${functionPath}`);
  console.log(`📦 Function name: ${functionName}`);
  console.log(`🎯 Project reference: ${projectRef}\n`);
  
  // Deploy using Supabase CLI (fallback method since MCP had issues)
  console.log('🔄 Deploying using Supabase CLI...');
  
  const deployCommand = `supabase functions deploy ${functionName} --project-ref ${projectRef} --no-verify-jwt`;
  
  console.log(`⚡ Running: ${deployCommand}`);
  
  const output = execSync(deployCommand, {
    cwd: '/root/repo',
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ Deployment Output:');
  console.log(output);
  
  // Test the deployed function
  console.log('\n🧪 Testing deployed function...');
  
  const testUrl = `https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/${functionName}`;
  console.log(`🔗 Function URL: ${testUrl}`);
  
  const testPayload = {
    message: 'Test OpenAI integration',
    user_id: '12345678-1234-1234-1234-123456789abc',
    agent_type: 'orchestrator'
  };
  
  console.log('📝 Sending test request...');
  
  const testResponse = await fetch(testUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw'
    },
    body: JSON.stringify(testPayload)
  });
  
  const testResult = await testResponse.json();
  
  console.log(`📊 Response Status: ${testResponse.status}`);
  console.log('📋 Response Body:');
  console.log(JSON.stringify(testResult, null, 2));
  
  if (testResponse.ok) {
    console.log('\n🎉 Deployment and test successful!');
    console.log('✅ ai-chat-system Edge Function is ready for production use');
  } else {
    console.log('\n⚠️  Deployment successful but test failed');
    console.log('💡 Check the function logs for detailed error information');
  }
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  
  if (error.stdout) {
    console.log('\n📤 STDOUT:');
    console.log(error.stdout);
  }
  
  if (error.stderr) {
    console.log('\n📥 STDERR:');
    console.log(error.stderr);
  }
  
  process.exit(1);
}