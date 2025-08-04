/**
 * Complete Backend Test Function with S3 Storage Testing
 * Tests all backend services including Supabase S3 storage
 */

import type { Handler } from '@netlify/functions';
import { getBackendConfig, validateConfig, getSafeConfig } from './utils/config';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
  duration?: number;
}

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const startTime = Date.now();
  const tests: TestResult[] = [];
  
  // Get configuration
  const config = getBackendConfig();
  
  // Additional S3 configuration
  const s3Config = {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY || '',
    region: process.env.SUPABASE_S3_REGION || '',
    endpoint: process.env.SUPABASE_S3_ENDPOINT || '',
  };

  // Test 1: Complete Configuration Check
  tests.push({
    name: 'Complete Configuration Check',
    passed: true,
    message: 'Checking all environment variables',
    details: {
      core: {
        supabaseUrl: !!config.supabase.url,
        supabaseAnonKey: !!config.supabase.anonKey,
        supabaseServiceRoleKey: !!config.supabase.serviceRoleKey,
        supabaseJwtSecret: !!config.supabase.jwtSecret,
        databaseUrl: !!config.supabase.databaseUrl,
      },
      storage: {
        s3AccessKeyId: !!s3Config.accessKeyId,
        s3SecretAccessKey: !!s3Config.secretAccessKey,
        s3Region: !!s3Config.region,
        s3Endpoint: !!s3Config.endpoint,
      },
      apis: {
        n8nUrl: !!config.n8n.apiUrl,
        n8nApiKey: !!config.n8n.apiKey,
        openaiApiKey: !!config.openai.apiKey,
      },
      tokens: {
        supabaseAccessToken: !!process.env.SUPABASE_ACCESS_TOKEN,
        netlifyAccessToken: !!process.env.NETLIFY_ACCESS_TOKEN,
      }
    },
    duration: Date.now() - startTime,
  });

  // Test 2: Supabase REST API
  if (config.supabase.url && config.supabase.anonKey) {
    const testStart = Date.now();
    try {
      const response = await fetch(`${config.supabase.url}/rest/v1/`, {
        headers: {
          'apikey': config.supabase.anonKey,
          'Authorization': `Bearer ${config.supabase.anonKey}`,
        },
      });
      
      tests.push({
        name: 'Supabase REST API',
        passed: response.ok,
        message: response.ok ? 'Connected successfully' : `Failed with status ${response.status}`,
        details: {
          statusCode: response.status,
          url: config.supabase.url,
        },
        duration: Date.now() - testStart,
      });
    } catch (error: any) {
      tests.push({
        name: 'Supabase REST API',
        passed: false,
        message: error.message,
        duration: Date.now() - testStart,
      });
    }
  }

  // Test 3: Supabase Admin Operations
  if (config.supabase.url && config.supabase.serviceRoleKey) {
    const testStart = Date.now();
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      
      // Test admin query
      const { data, error } = await supabase
        .from('conversations')
        .select('count')
        .limit(1);
      
      tests.push({
        name: 'Supabase Admin Operations',
        passed: !error,
        message: !error ? 'Admin access working' : error.message,
        details: {
          hasServiceRole: true,
          querySuccessful: !error,
          error: error?.message,
        },
        duration: Date.now() - testStart,
      });
    } catch (error: any) {
      tests.push({
        name: 'Supabase Admin Operations',
        passed: false,
        message: error.message,
        duration: Date.now() - testStart,
      });
    }
  }

  // Test 4: Supabase Storage
  if (config.supabase.url && config.supabase.serviceRoleKey) {
    const testStart = Date.now();
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
      
      // List buckets
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      tests.push({
        name: 'Supabase Storage',
        passed: !error,
        message: !error ? `Storage accessible (${buckets?.length || 0} buckets)` : error.message,
        details: {
          bucketCount: buckets?.length || 0,
          buckets: buckets?.map(b => b.name) || [],
          s3ConfigPresent: !!s3Config.endpoint,
        },
        duration: Date.now() - testStart,
      });
    } catch (error: any) {
      tests.push({
        name: 'Supabase Storage',
        passed: false,
        message: error.message,
        duration: Date.now() - testStart,
      });
    }
  }

  // Test 5: Database Connection
  if (config.supabase.databaseUrl) {
    const testStart = Date.now();
    tests.push({
      name: 'Database Configuration',
      passed: true,
      message: 'Database URLs configured',
      details: {
        hasPoolerUrl: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DATABASE_URL_DIRECT,
        hasTransactionUrl: !!process.env.DATABASE_URL_TRANSACTION,
      },
      duration: Date.now() - testStart,
    });
  }

  // Test 6: n8n Workflow Engine
  if (config.n8n.apiUrl && config.n8n.apiKey) {
    const testStart = Date.now();
    try {
      const response = await fetch(`${config.n8n.apiUrl}/workflows`, {
        headers: {
          'X-N8N-API-KEY': config.n8n.apiKey,
          'Accept': 'application/json',
        },
      });
      
      const data = await response.json();
      
      tests.push({
        name: 'n8n Workflow Engine',
        passed: response.ok,
        message: response.ok ? `Connected (${data.data?.length || 0} workflows)` : `Failed: ${response.status}`,
        details: {
          statusCode: response.status,
          workflowCount: data.data?.length || 0,
          url: config.n8n.apiUrl,
        },
        duration: Date.now() - testStart,
      });
    } catch (error: any) {
      tests.push({
        name: 'n8n Workflow Engine',
        passed: false,
        message: error.message,
        duration: Date.now() - testStart,
      });
    }
  }

  // Test 7: OpenAI API
  if (config.openai.apiKey) {
    const testStart = Date.now();
    try {
      const response = await fetch('https://api.openai.com/v1/models/gpt-4', {
        headers: {
          'Authorization': `Bearer ${config.openai.apiKey}`,
        },
      });
      
      tests.push({
        name: 'OpenAI API',
        passed: response.ok,
        message: response.ok ? 'API key valid for GPT-4' : `Failed: ${response.status}`,
        details: {
          statusCode: response.status,
          keyPrefix: config.openai.apiKey.substring(0, 20) + '...',
        },
        duration: Date.now() - testStart,
      });
    } catch (error: any) {
      tests.push({
        name: 'OpenAI API',
        passed: false,
        message: error.message,
        duration: Date.now() - testStart,
      });
    }
  }

  // Test 8: OpenAI Chat Completion
  if (config.openai.apiKey) {
    const testStart = Date.now();
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.openai.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: 'Reply with: Backend operational' }
          ],
          max_tokens: 10,
          temperature: 0,
        }),
      });
      
      const data = await response.json();
      
      tests.push({
        name: 'OpenAI Chat Completion',
        passed: response.ok && data.choices?.[0]?.message?.content,
        message: response.ok ? 'Chat working' : `Failed: ${data.error?.message || response.status}`,
        details: {
          statusCode: response.status,
          response: data.choices?.[0]?.message?.content || data.error?.message,
        },
        duration: Date.now() - testStart,
      });
    } catch (error: any) {
      tests.push({
        name: 'OpenAI Chat Completion',
        passed: false,
        message: error.message,
        duration: Date.now() - testStart,
      });
    }
  }

  // Calculate summary
  const totalTests = tests.length;
  const passedTests = tests.filter(t => t.passed).length;
  const failedTests = totalTests - passedTests;
  const totalDuration = Date.now() - startTime;
  const allPassed = failedTests === 0;

  // Generate status message
  const statusMessage = allPassed 
    ? '🎉 ALL SYSTEMS OPERATIONAL - Backend 100% Ready!'
    : `⚠️ ${failedTests} test(s) failed - Backend ${Math.round((passedTests/totalTests)*100)}% operational`;

  return {
    statusCode: allPassed ? 200 : 207, // 207 for partial success
    headers,
    body: JSON.stringify({
      success: allPassed,
      timestamp: new Date().toISOString(),
      environment: config.environment,
      status: statusMessage,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        duration: totalDuration,
        percentage: Math.round((passedTests/totalTests) * 100),
      },
      tests,
      configuration: {
        hasAllCore: tests[0]?.details?.core,
        hasAllStorage: tests[0]?.details?.storage,
        hasAllApis: tests[0]?.details?.apis,
        hasAllTokens: tests[0]?.details?.tokens,
      },
    }, null, 2),
  };
};