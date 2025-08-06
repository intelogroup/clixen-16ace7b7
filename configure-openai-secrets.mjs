#!/usr/bin/env node

/**
 * Configure OpenAI API Key for Clixen Multi-Agent System
 * Sets up OpenAI API key as a Supabase Edge Function secret
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

// Load environment variables from .env file if it exists
const envFile = '/root/repo/.env';
const env = {};

if (existsSync(envFile)) {
  const envContent = readFileSync(envFile, 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
}

// Configuration
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';
const SUPABASE_ACCESS_TOKEN = env.SUPABASE_ACCESS_TOKEN || 'sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f';

// Example OpenAI API key - this should be replaced with a real key
const EXAMPLE_OPENAI_API_KEY = 'sk-example1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

console.log('🔧 Configuring OpenAI API Key for Clixen Multi-Agent System...\n');

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function configureOpenAISecret() {
  try {
    console.log('📡 Testing Supabase connection...');
    
    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('api_configurations')
      .select('count', { count: 'exact', head: true });
    
    if (testError) {
      console.error('❌ Failed to connect to Supabase:', testError.message);
      return false;
    }
    
    console.log('✅ Connected to Supabase successfully\n');
    
    // Step 1: Check if OpenAI configuration already exists
    console.log('🔍 Checking for existing OpenAI configuration...');
    
    const { data: existingConfig, error: checkError } = await supabase
      .from('api_configurations')
      .select('*')
      .eq('service_name', 'openai')
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing configuration:', checkError.message);
      return false;
    }
    
    if (existingConfig) {
      console.log('⚠️  OpenAI configuration already exists');
      console.log(`   Service: ${existingConfig.service_name}`);
      console.log(`   Active: ${existingConfig.is_active}`);
      console.log(`   Created: ${new Date(existingConfig.created_at).toLocaleString()}`);
      
      // Update existing configuration
      console.log('\n📝 Updating existing OpenAI configuration...');
      
      const { error: updateError } = await supabase
        .from('api_configurations')
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
          metadata: {
            model: 'gpt-4',
            max_tokens: 4000,
            temperature: 0.7,
            timeout: 30000,
            description: 'OpenAI API key for Clixen multi-agent system'
          }
        })
        .eq('service_name', 'openai');
      
      if (updateError) {
        console.error('❌ Failed to update OpenAI configuration:', updateError.message);
        return false;
      }
      
      console.log('✅ Updated existing OpenAI configuration successfully');
      
    } else {
      // Create new configuration
      console.log('➕ Creating new OpenAI configuration...');
      
      const { error: insertError } = await supabase
        .from('api_configurations')
        .insert({
          service_name: 'openai',
          api_key: EXAMPLE_OPENAI_API_KEY,
          is_active: true,
          environment: 'production',
          metadata: {
            model: 'gpt-4',
            max_tokens: 4000,
            temperature: 0.7,
            timeout: 30000,
            description: 'OpenAI API key for Clixen multi-agent system'
          }
        });
      
      if (insertError) {
        console.error('❌ Failed to create OpenAI configuration:', insertError.message);
        return false;
      }
      
      console.log('✅ Created new OpenAI configuration successfully');
    }
    
    // Step 2: Verify configuration is retrievable
    console.log('\n🔍 Verifying OpenAI configuration...');
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('api_configurations')
      .select('*')
      .eq('service_name', 'openai')
      .eq('is_active', true)
      .single();
    
    if (verifyError) {
      console.error('❌ Failed to verify OpenAI configuration:', verifyError.message);
      return false;
    }
    
    console.log('✅ OpenAI configuration verified:');
    console.log(`   Service: ${verifyData.service_name}`);
    console.log(`   Active: ${verifyData.is_active}`);
    console.log(`   Key Length: ${verifyData.api_key.length} characters`);
    console.log(`   Key Preview: ${verifyData.api_key.substring(0, 8)}...`);
    
    // Step 3: Test API key access function
    console.log('\n🧪 Testing API key retrieval function...');
    
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_api_key', {
        p_service_name: 'openai'
      });
      
      if (rpcError) {
        console.warn('⚠️  RPC function test failed (this is expected if function doesn\'t exist):', rpcError.message);
      } else {
        console.log('✅ RPC function test successful');
      }
    } catch (error) {
      console.warn('⚠️  RPC function test failed:', error.message);
    }
    
    console.log('\n🎉 OpenAI API Key configuration completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Replace the example API key with your real OpenAI API key');
    console.log('2. Test the ai-chat-system edge function');
    console.log('3. Update your frontend to use the multi-agent system');
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

// Additional function to set up Edge Function secrets using the Management API
async function setupEdgeFunctionSecrets() {
  console.log('\n🔐 Setting up Edge Function secrets...');
  
  const secrets = {
    'OPENAI_API_KEY': EXAMPLE_OPENAI_API_KEY
  };
  
  try {
    const projectRef = 'zfbgdixbzezpxllkoyfc';
    
    for (const [secretName, secretValue] of Object.entries(secrets)) {
      console.log(`📝 Setting up secret: ${secretName}...`);
      
      const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/secrets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({
          name: secretName,
          value: secretValue
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️  Failed to set ${secretName} secret:`, response.status, errorText);
      } else {
        console.log(`✅ Set ${secretName} secret successfully`);
      }
    }
    
  } catch (error) {
    console.warn('⚠️  Edge Function secrets setup failed:', error.message);
    console.log('💡 Secrets can be set manually in the Supabase Dashboard');
  }
}

// Main execution
async function main() {
  const dbSuccess = await configureOpenAISecret();
  
  if (dbSuccess) {
    await setupEdgeFunctionSecrets();
    
    console.log('\n🏁 Configuration Summary:');
    console.log('✅ Database API configuration: SUCCESS');
    console.log('⚠️  Edge Function secrets: MANUAL SETUP RECOMMENDED');
    console.log('\n🔗 Useful Links:');
    console.log('• Supabase Dashboard: https://supabase.com/dashboard/project/zfbgdixbzezpxllkoyfc');
    console.log('• Edge Functions: https://supabase.com/dashboard/project/zfbgdixbzezpxllkoyfc/functions');
    console.log('• API Keys: https://platform.openai.com/api-keys');
  }
}

main().catch(console.error);