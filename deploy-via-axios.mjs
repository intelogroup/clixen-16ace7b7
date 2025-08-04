#!/usr/bin/env node

/**
 * Deploy Edge Functions using axios and proper Supabase Management API
 * Based on 2025 documentation and GitHub discussions
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

// Mock axios with native fetch for simplicity
const axios = {
  post: async (url, data, config) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: config?.headers || {},
      body: data
    });
    
    const responseData = await response.json().catch(async () => await response.text());
    return {
      status: response.status,
      data: responseData
    };
  }
};

// Configuration
const PROJECT_REF = 'zfbgdixbzezpxllkoyfc';
const ACCESS_TOKEN = 'sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f';
const BASE_URL = 'https://api.supabase.com/v1';

/**
 * Deploy function using axios with proper form data
 */
async function deployFunctionWithAxios(functionName, functionPath) {
  try {
    console.log(`🚀 Deploying ${functionName} with axios...`);
    
    const indexPath = path.join(functionPath, 'index.ts');
    if (!fs.existsSync(indexPath)) {
      console.log(`⚠️  index.ts not found: ${indexPath}`);
      return false;
    }
    
    // Create form data
    const form = new FormData();
    form.append('source', fs.createReadStream(indexPath));
    form.append('slug', functionName);
    form.append('verify_jwt', 'true');
    
    const response = await axios.post(
      `${BASE_URL}/projects/${PROJECT_REF}/functions/deploy?slug=${functionName}`,
      form,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          ...form.getHeaders()
        }
      }
    );
    
    if (response.status === 200 || response.status === 201) {
      console.log(`✅ Successfully deployed ${functionName}`);
      console.log(`   Response:`, response.data);
      return true;
    } else {
      console.log(`❌ Failed to deploy ${functionName} (${response.status})`);
      console.log(`   Response:`, response.data);
      return false;
    }
  } catch (error) {
    console.error(`💥 Error deploying ${functionName}:`, error.message);
    return false;
  }
}

/**
 * Alternative method: Deploy using simple file upload
 */
async function deployFunctionSimple(functionName, functionPath) {
  try {
    console.log(`🚀 Deploying ${functionName} (simple method)...`);
    
    const indexPath = path.join(functionPath, 'index.ts');
    if (!fs.existsSync(indexPath)) {
      console.log(`⚠️  index.ts not found: ${indexPath}`);
      return false;
    }
    
    const sourceCode = fs.readFileSync(indexPath, 'utf-8');
    
    const response = await axios.post(
      `${BASE_URL}/projects/${PROJECT_REF}/functions`,
      {
        slug: functionName,
        source_code: sourceCode,
        verify_jwt: true
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status === 200 || response.status === 201) {
      console.log(`✅ Successfully deployed ${functionName}`);
      console.log(`   Response:`, response.data);
      return true;
    } else {
      console.log(`❌ Failed to deploy ${functionName} (${response.status})`);
      console.log(`   Response:`, response.data);
      return false;
    }
  } catch (error) {
    console.error(`💥 Error deploying ${functionName}:`, error.message);
    return false;
  }
}

/**
 * Main deployment function
 */
async function main() {
  console.log('🎯 Starting Edge Function deployment via axios...');
  
  const functionsDir = 'supabase/functions';
  const functions = ['ai-chat-system', 'api-operations', 'ai-chat-sessions', 'ai-chat-stream'];
  
  let successCount = 0;
  
  for (const funcName of functions) {
    const functionPath = path.join(functionsDir, funcName);
    
    if (!fs.existsSync(functionPath)) {
      console.log(`⚠️  Function directory not found: ${functionPath}`);
      continue;
    }
    
    // Try both methods
    let success = await deployFunctionWithAxios(funcName, functionPath);
    
    if (!success) {
      console.log(`🔄 Trying alternative method for ${funcName}...`);
      success = await deployFunctionSimple(funcName, functionPath);
    }
    
    if (success) {
      successCount++;
    }
    
    console.log(''); // Empty line for readability
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('📊 Final Summary:');
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${functions.length - successCount}`);
  console.log(`  📈 Success Rate: ${Math.round(successCount * 100 / functions.length)}%`);
  
  if (successCount === functions.length) {
    console.log('🎉 All functions deployed successfully!');
  } else if (successCount > 0) {
    console.log('⚠️  Some functions deployed, others may already exist');
  } else {
    console.log('❌ No new functions were deployed (they may already exist)');
  }
}

// Check if form-data is available, if not provide fallback
try {
  await import('form-data');
} catch (error) {
  console.log('⚠️  form-data not available, trying alternative methods...');
}

main().catch(console.error);