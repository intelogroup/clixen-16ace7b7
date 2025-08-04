#!/usr/bin/env node

/**
 * Deploy Supabase Edge Function using Management API
 * This script creates/updates the ai-chat-system Edge Function directly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_REF = 'zfbgdixbzezpxllkoyfc';
const ACCESS_TOKEN = 'sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f';
const FUNCTION_NAME = 'ai-chat-system';

// Helper function to make API requests
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Read function files
function readFunctionFiles() {
  const functionDir = path.join(__dirname, 'supabase', 'functions', FUNCTION_NAME);
  
  if (!fs.existsSync(functionDir)) {
    throw new Error(`Function directory not found: ${functionDir}`);
  }

  const files = {};
  
  // Read main index.ts
  const indexPath = path.join(functionDir, 'index.ts');
  if (fs.existsSync(indexPath)) {
    files['index.ts'] = fs.readFileSync(indexPath, 'utf8');
  }
  
  // Read session-manager.ts
  const sessionManagerPath = path.join(functionDir, 'session-manager.ts');
  if (fs.existsSync(sessionManagerPath)) {
    files['session-manager.ts'] = fs.readFileSync(sessionManagerPath, 'utf8');
  }
  
  // Read shared CORS file
  const corsPath = path.join(__dirname, 'supabase', 'functions', '_shared', 'cors.ts');
  if (fs.existsSync(corsPath)) {
    files['_shared/cors.ts'] = fs.readFileSync(corsPath, 'utf8');
  }

  return files;
}

// Create function slug (minified bundle)
function createFunctionSlug(files) {
  // We need to create a proper bundle that can be executed by Deno
  let bundle = '';
  
  // First, we need to replace imports with inline code
  let mainCode = files['index.ts'] || '';
  
  // Replace the CORS import with inline code
  if (files['_shared/cors.ts']) {
    const corsCode = files['_shared/cors.ts'];
    // Extract the export from cors.ts
    const corsExport = corsCode.match(/export const corsHeaders = ({[\s\S]*?});/);
    if (corsExport) {
      const corsHeaders = corsExport[1];
      mainCode = mainCode.replace(
        "import { corsHeaders } from '../_shared/cors.ts';",
        `const corsHeaders = ${corsHeaders};`
      );
    }
  }
  
  bundle = mainCode;
  
  if (!bundle.trim()) {
    throw new Error('Bundle is empty - check function files');
  }
  
  console.log(`📦 Bundle size: ${bundle.length} characters`);
  return Buffer.from(bundle).toString('base64');
}

// Deploy the function
async function deployFunction() {
  try {
    console.log('🚀 Starting Edge Function deployment...');
    
    // Step 1: Read function files
    console.log('📁 Reading function files...');
    const files = readFunctionFiles();
    console.log(`Found ${Object.keys(files).length} files to deploy`);
    
    // Step 2: Create function slug
    console.log('📦 Creating function bundle...');
    const slug = createFunctionSlug(files);
    
    // Step 3: Check if function exists
    console.log('🔍 Checking if function exists...');
    let functionExists = false;
    try {
      await apiRequest(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${FUNCTION_NAME}`);
      functionExists = true;
      console.log('✅ Function exists, will update');
    } catch (error) {
      console.log('📝 Function does not exist, will create');
    }
    
    // Step 4: Create or update function
    if (functionExists) {
      console.log('🔄 Updating existing function...');
      await apiRequest(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${FUNCTION_NAME}`, {
        method: 'PATCH',
        body: JSON.stringify({
          slug: slug,
          verify_jwt: false, // Disable JWT verification for now
        }),
      });
    } else {
      console.log('🆕 Creating new function...');
      await apiRequest(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`, {
        method: 'POST',
        body: JSON.stringify({
          name: FUNCTION_NAME,
          slug: slug,
          verify_jwt: false, // Disable JWT verification for now
        }),
      });
    }
    
    console.log('✅ Function deployed successfully!');
    console.log(`🌐 Function URL: https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_NAME}`);
    
    // Step 5: Test the function
    console.log('🧪 Testing function deployment...');
    try {
      const testResponse = await fetch(`https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_NAME}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw`,
        },
        body: JSON.stringify({
          message: 'Hello, this is a test message!',
          user_id: 'test-user-123',
        }),
      });
      
      if (testResponse.ok) {
        const result = await testResponse.json();
        console.log('✅ Function test successful!');
        console.log('📄 Test response:', JSON.stringify(result, null, 2));
      } else {
        console.log('⚠️  Function test failed:', testResponse.status, await testResponse.text());
      }
    } catch (testError) {
      console.log('⚠️  Function test error:', testError.message);
    }
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run the deployment
deployFunction();