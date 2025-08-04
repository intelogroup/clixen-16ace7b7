#!/usr/bin/env node

/**
 * Deploy Edge Functions using Supabase Management API
 * Alternative deployment method using HTTP requests
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
    
    const response = await fetch(`${BASE_URL}/projects/${SUPABASE_PROJECT_REF}/functions`, {
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

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to deploy ${functionName}:`, error);
      return false;
    }

    const result = await response.json();
    console.log(`✅ Successfully deployed ${functionName}:`, result.id);
    return true;
  } catch (error) {
    console.error(`💥 Error deploying ${functionName}:`, error.message);
    return false;
  }
}

/**
 * Read function source code
 */
function readFunctionCode(functionPath) {
  try {
    const indexPath = path.join(functionPath, 'index.ts');
    return fs.readFileSync(indexPath, 'utf-8');
  } catch (error) {
    console.error(`❌ Failed to read function code:`, error.message);
    return null;
  }
}

/**
 * Main deployment function
 */
async function main() {
  console.log('🎯 Starting Edge Function deployment via Management API...');
  
  const functionsDir = 'supabase/functions';
  const functions = ['ai-chat-system', 'api-operations', 'ai-chat-sessions', 'ai-chat-stream'];
  
  const results = [];
  
  for (const funcName of functions) {
    const functionPath = path.join(functionsDir, funcName);
    
    if (!fs.existsSync(functionPath)) {
      console.log(`⚠️  Function directory not found: ${functionPath}`);
      continue;
    }
    
    const sourceCode = readFunctionCode(functionPath);
    if (!sourceCode) {
      console.log(`⚠️  Could not read source code for: ${funcName}`);
      continue;
    }
    
    const success = await deployFunction(funcName, sourceCode);
    results.push({ function: funcName, success });
    
    // Small delay between deployments
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 Deployment Summary:');
  results.forEach(({ function: funcName, success }) => {
    console.log(`  ${success ? '✅' : '❌'} ${funcName}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎉 Deployed ${successCount}/${results.length} functions successfully!`);
}

// Run the deployment
main().catch(console.error);