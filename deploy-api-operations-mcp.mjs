#!/usr/bin/env node

import FormData from 'form-data';
import { readFileSync } from 'fs';
import fetch from 'node-fetch';

/**
 * Deploy api-operations Edge Function to Supabase
 * This script deploys the fixed api-operations function with resolved undefined response variable
 */

const PROJECT_REF = 'zfbgdixbzezpxllkoyfc';
const FUNCTION_NAME = 'api-operations';
const ACCESS_TOKEN = 'sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f';

async function deployApiOperationsFunction() {
  console.log('🚀 [DEPLOY] Starting deployment of api-operations with fixes...');
  
  try {
    // Read the function files
    const indexTs = readFileSync('./supabase/functions/api-operations/index.ts', 'utf8');
    const corsTs = readFileSync('./supabase/functions/_shared/cors.ts', 'utf8');
    
    console.log('📁 [DEPLOY] Function files loaded:', {
      'index.ts': `${indexTs.length} chars`,
      'cors.ts': `${corsTs.length} chars`
    });

    // Create form data
    const form = new FormData();
    
    // Add the main function file
    form.append('index', indexTs, {
      filename: 'index.ts',
      contentType: 'text/typescript'
    });
    
    // Add the shared cors file
    form.append('cors', corsTs, {
      filename: '_shared/cors.ts', 
      contentType: 'text/typescript'
    });
    
    // Add import map for dependencies
    const importMap = {
      "imports": {
        "https://deno.land/std@0.168.0/http/server.ts": "https://deno.land/std@0.168.0/http/server.ts",
        "https://esm.sh/@supabase/supabase-js@2.39.3": "https://esm.sh/@supabase/supabase-js@2.39.3"
      }
    };
    
    form.append('import_map', JSON.stringify(importMap), {
      filename: 'import_map.json',
      contentType: 'application/json'
    });

    const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${FUNCTION_NAME}`;
    
    console.log(`🌐 [DEPLOY] Deploying to: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        ...form.getHeaders()
      },
      body: form
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('❌ [DEPLOY] Deployment failed:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });
      return false;
    }

    console.log('✅ [DEPLOY] Function deployed successfully!');
    console.log('📄 [DEPLOY] Response:', responseText);
    
    return response.ok;
    
  } catch (error) {
    console.error('❌ [DEPLOY] Deployment error:', error);
    return false;
  }
}

async function testApiOperationsFunction() {
  console.log('🧪 [TEST] Testing deployed api-operations function...');
  
  try {
    // Test the health endpoint
    const healthResponse = await fetch(`https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/${FUNCTION_NAME}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const healthResult = await healthResponse.text();
    console.log('🧪 [TEST] Health check result:', {
      status: healthResponse.status,
      body: healthResult
    });
    
    return healthResponse.ok;
    
  } catch (error) {
    console.error('❌ [TEST] Health check error:', error);
    return false;
  }
}

// Run deployment and test
async function main() {
  const deploySuccess = await deployApiOperationsFunction();
  
  if (!deploySuccess) {
    console.log('❌ [DEPLOY] Deployment failed');
    process.exit(1);
  }
  
  // Wait a moment for deployment to be ready
  console.log('⏳ [DEPLOY] Waiting for function to be ready...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const testSuccess = await testApiOperationsFunction();
  
  if (deploySuccess && testSuccess) {
    console.log('✅ [SUCCESS] api-operations function deployed and tested successfully!');
    console.log('🎯 [FIXES] Included fixes:');
    console.log('   - Fixed undefined response variable issue');
    console.log('   - Comprehensive error handling');
    console.log('   - Rate limiting and user tier management');
    console.log('   - Complete n8n API integration');
    console.log('   - Health check endpoint');
    process.exit(0);
  } else {
    console.log('❌ [FAIL] Deployment or testing failed');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ [ERROR] Script failed:', error);
  process.exit(1);
});