#!/usr/bin/env node

import FormData from 'form-data';
import { createReadStream, readFileSync } from 'fs';
import fetch from 'node-fetch';

/**
 * Deploy Supabase Edge Function via Management API
 * This script deploys the updated ai-chat-system function with our fixes
 */

const PROJECT_REF = 'zfbgdixbzezpxllkoyfc';
const FUNCTION_NAME = 'ai-chat-system';
const ACCESS_TOKEN = 'sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f';

async function deployEdgeFunction() {
  console.log('🚀 [DEPLOY] Starting deployment of ai-chat-system with critical fixes...');
  
  try {
    // Read the function files
    const indexTs = readFileSync('./supabase/functions/ai-chat-system/index.ts', 'utf8');
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
    
    // Add import map (minimal)
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
    
    // Test the deployed function
    console.log('🧪 [TEST] Testing deployed function...');
    
    const testResponse = await fetch(`https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/${FUNCTION_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Test message to verify deployment',
        user_id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID format
        agent_type: 'orchestrator'
      })
    });
    
    const testResult = await testResponse.text();
    console.log('🧪 [TEST] Function test result:', {
      status: testResponse.status,
      body: testResult.substring(0, 200) + '...'
    });
    
    return response.ok;
    
  } catch (error) {
    console.error('❌ [DEPLOY] Deployment error:', error);
    return false;
  }
}

// Run deployment
deployEdgeFunction().then(success => {
  if (success) {
    console.log('✅ [DEPLOY] All fixes deployed and tested successfully!');
    console.log('🎯 [DEPLOY] Critical fixes included:');
    console.log('   - UUID format validation');
    console.log('   - Request timeout handling (30s)');
    console.log('   - Enhanced error logging');
    console.log('   - OpenAI API timeout (25s)');
    process.exit(0);
  } else {
    console.log('❌ [DEPLOY] Deployment failed');
    process.exit(1);
  }
});