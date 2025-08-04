#!/usr/bin/env node

/**
 * Deploy ai-chat-system Edge Function using Supabase Management API
 * Focused deployment for the updated ai-chat-system with Claude API fallback
 */

import fs from 'fs';
import path from 'path';

// Configuration
const SUPABASE_PROJECT_REF = 'zfbgdixbzezpxllkoyfc';
const ACCESS_TOKEN = 'sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f';
const BASE_URL = 'https://api.supabase.com/v1';

/**
 * Deploy a single Edge Function using Management API
 */
async function deployFunction(functionName, functionCode) {
  try {
    console.log(`🚀 Deploying ${functionName}...`);
    
    // First, try to update existing function
    let response = await fetch(`${BASE_URL}/projects/${SUPABASE_PROJECT_REF}/functions/${functionName}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_code: functionCode,
        verify_jwt: true,
      }),
    });

    // If function doesn't exist, create it
    if (response.status === 404) {
      console.log(`📝 Function doesn't exist, creating new one...`);
      response = await fetch(`${BASE_URL}/projects/${SUPABASE_PROJECT_REF}/functions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: functionName,
          source_code: functionCode,
          verify_jwt: true,
        }),
      });
    }

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to deploy ${functionName}:`, error);
      return false;
    }

    const result = await response.json();
    console.log(`✅ Successfully deployed ${functionName}:`, result.id || 'updated');
    return true;
  } catch (error) {
    console.error(`💥 Error deploying ${functionName}:`, error.message);
    return false;
  }
}

/**
 * Read function source code and dependencies
 */
function readFunctionCode(functionPath) {
  try {
    const indexPath = path.join(functionPath, 'index.ts');
    if (!fs.existsSync(indexPath)) {
      throw new Error(`Function index.ts not found at ${indexPath}`);
    }
    
    const sourceCode = fs.readFileSync(indexPath, 'utf-8');
    
    // Also check for shared dependencies
    const sharedCorsPath = 'supabase/functions/_shared/cors.ts';
    if (fs.existsSync(sharedCorsPath)) {
      const corsCode = fs.readFileSync(sharedCorsPath, 'utf-8');
      console.log(`📦 Found shared CORS module (${corsCode.length} chars)`);
    }
    
    console.log(`📄 Function source code loaded (${sourceCode.length} chars)`);
    return sourceCode;
  } catch (error) {
    console.error(`❌ Failed to read function code:`, error.message);
    return null;
  }
}

/**
 * Main deployment function
 */
async function main() {
  console.log('🎯 Deploying ai-chat-system Edge Function with Claude API fallback...');
  
  const functionName = 'ai-chat-system';
  const functionPath = path.join('supabase/functions', functionName);
  
  if (!fs.existsSync(functionPath)) {
    console.error(`❌ Function directory not found: ${functionPath}`);
    process.exit(1);
  }
  
  const sourceCode = readFunctionCode(functionPath);
  if (!sourceCode) {
    console.error(`❌ Could not read source code for: ${functionName}`);
    process.exit(1);
  }
  
  console.log(`🔍 Function features detected:`);
  console.log(`  - Multi-agent system: ${sourceCode.includes('orchestrator') ? '✅' : '❌'}`);
  console.log(`  - OpenAI integration: ${sourceCode.includes('openai') ? '✅' : '❌'}`);
  console.log(`  - Claude API fallback: ${sourceCode.includes('claude') ? '✅' : '❌'}`);
  console.log(`  - Conversation memory: ${sourceCode.includes('conversation_history') ? '✅' : '❌'}`);
  console.log(`  - Agent coordination: ${sourceCode.includes('AgentCoordinator') ? '✅' : '❌'}`);
  
  const success = await deployFunction(functionName, sourceCode);
  
  if (success) {
    console.log(`\n🎉 ai-chat-system deployed successfully!`);
    console.log(`📡 Function URL: https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/ai-chat-system`);
    console.log(`\n🔧 Environment variables required:`);
    console.log(`  - OPENAI_API_KEY (primary AI provider)`);
    console.log(`  - CLAUDE_API_KEY (fallback AI provider)`);
    console.log(`  - SUPABASE_URL (database connection)`);
    console.log(`  - SUPABASE_SERVICE_ROLE_KEY (database admin access)`);
  } else {
    console.error(`\n❌ Deployment failed!`);
    process.exit(1);
  }
}

// Run the deployment
main().catch(error => {
  console.error('💥 Deployment script failed:', error.message);
  process.exit(1);
});