#!/usr/bin/env node

/**
 * Test script to verify API key retrieval from Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🧪 Testing API Key Retrieval from Supabase\n');

async function testApiKeyRetrieval(serviceName) {
  console.log(`📍 Testing ${serviceName} API key retrieval...`);
  
  try {
    // Method 1: Direct table query (what Edge Functions use)
    const { data, error } = await supabase
      .from('api_configurations')
      .select('api_key, is_active, environment, last_used_at, metadata')
      .eq('service_name', serviceName)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error(`❌ Error retrieving ${serviceName} key:`, error);
      return false;
    }
    
    if (!data?.api_key) {
      console.warn(`⚠️  No active ${serviceName} key found in database`);
      return false;
    }
    
    console.log(`✅ Successfully retrieved ${serviceName} key`);
    console.log(`   - Environment: ${data.environment}`);
    console.log(`   - Last used: ${data.last_used_at || 'Never'}`);
    console.log(`   - Key preview: ${data.api_key.substring(0, 10)}...`);
    if (data.metadata) {
      console.log(`   - Metadata:`, data.metadata);
    }
    
    // Method 2: Using the database function
    const { data: funcData, error: funcError } = await supabase
      .rpc('get_api_key', { 
        p_service_name: serviceName,
        p_environment: 'production'
      });
    
    if (!funcError && funcData) {
      console.log(`✅ Database function also working`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Exception testing ${serviceName}:`, error);
    return false;
  }
}

async function testAllServices() {
  const services = ['openai', 'n8n', 'twilio', 'whatsapp'];
  const results = {};
  
  for (const service of services) {
    results[service] = await testApiKeyRetrieval(service);
    console.log(''); // Empty line between services
  }
  
  // Summary
  console.log('📊 Summary:');
  console.log('─'.repeat(40));
  
  for (const [service, success] of Object.entries(results)) {
    console.log(`${service.padEnd(15)} ${success ? '✅ Configured' : '❌ Not configured'}`);
  }
  
  // Test audit log
  console.log('\n📝 Testing audit log functionality...');
  try {
    const { error } = await supabase.rpc('log_api_key_access', {
      p_service_name: 'test',
      p_action: 'test_script',
      p_edge_function_name: 'test-script',
      p_metadata: { test: true, timestamp: new Date().toISOString() }
    });
    
    if (error) {
      console.log('❌ Audit log function error:', error);
    } else {
      console.log('✅ Audit log function working');
    }
  } catch (error) {
    console.log('❌ Audit log exception:', error);
  }
}

// Run the tests
testAllServices().catch(console.error);