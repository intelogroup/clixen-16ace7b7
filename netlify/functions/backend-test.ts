/**
 * Comprehensive Backend Test Function
 * Tests all backend services and APIs with detailed diagnostics
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
  const validation = validateConfig(config);
  
  // Test 1: Configuration Validation
  tests.push({
    name: 'Configuration Validation',
    passed: validation.isValid,
    message: validation.isValid ? 'All required configuration present' : 'Missing configuration',
    details: {
      ...getSafeConfig(config),
      errors: validation.errors,
    },
    duration: Date.now() - startTime,
  });

  // Test 2: Supabase Connection
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
        name: 'Supabase Anon Key Connection',
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
        name: 'Supabase Anon Key Connection',
        passed: false,
        message: error.message,
        duration: Date.now() - testStart,
      });
    }
  }

  // Test 3: Supabase Service Role
  if (config.supabase.url && config.supabase.serviceRoleKey) {
    const testStart = Date.now();
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
      
      const { data, error } = await supabase
        .from('conversations')
        .select('count')
        .limit(1);
      
      tests.push({
        name: 'Supabase Service Role Query',
        passed: !error,
        message: !error ? 'Query executed successfully' : error.message,
        details: {
          hasData: !!data,
          error: error?.message,
        },
        duration: Date.now() - testStart,
      });
    } catch (error: any) {
      tests.push({
        name: 'Supabase Service Role Query',
        passed: false,
        message: error.message,
        duration: Date.now() - testStart,
      });
    }
  }

  // Test 4: n8n API Connection
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
        name: 'n8n API Connection',
        passed: response.ok,
        message: response.ok ? 'API accessible' : `Failed with status ${response.status}`,
        details: {
          statusCode: response.status,
          workflowCount: data.data?.length || 0,
          url: config.n8n.apiUrl,
        },
        duration: Date.now() - testStart,
      });
    } catch (error: any) {
      tests.push({
        name: 'n8n API Connection',
        passed: false,
        message: error.message,
        duration: Date.now() - testStart,
      });
    }
  }

  // Test 5: OpenAI API Connection
  if (config.openai.apiKey) {
    const testStart = Date.now();
    try {
      const response = await fetch('https://api.openai.com/v1/models/gpt-3.5-turbo', {
        headers: {
          'Authorization': `Bearer ${config.openai.apiKey}`,
        },
      });
      
      tests.push({
        name: 'OpenAI API Connection',
        passed: response.ok,
        message: response.ok ? 'API key valid' : `Failed with status ${response.status}`,
        details: {
          statusCode: response.status,
          keyPrefix: config.openai.apiKey.substring(0, 10) + '...',
        },
        duration: Date.now() - testStart,
      });
    } catch (error: any) {
      tests.push({
        name: 'OpenAI API Connection',
        passed: false,
        message: error.message,
        duration: Date.now() - testStart,
      });
    }
  }

  // Test 6: OpenAI Chat Completion
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
            { role: 'system', content: 'You are a test assistant. Reply with exactly: "Backend test successful"' },
            { role: 'user', content: 'Test' }
          ],
          max_tokens: 10,
          temperature: 0,
        }),
      });
      
      const data = await response.json();
      
      tests.push({
        name: 'OpenAI Chat Completion',
        passed: response.ok && data.choices?.[0]?.message?.content,
        message: response.ok ? 'Chat completion working' : `Failed with status ${response.status}`,
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

  return {
    statusCode: allPassed ? 200 : 500,
    headers,
    body: JSON.stringify({
      success: allPassed,
      timestamp: new Date().toISOString(),
      environment: config.environment,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        duration: totalDuration,
        status: allPassed ? 'All tests passed ✅' : `${failedTests} test(s) failed ❌`,
      },
      tests,
      recommendations: getRecommendations(tests, config),
    }, null, 2),
  };
};

function getRecommendations(tests: TestResult[], config: any): string[] {
  const recommendations: string[] = [];
  
  // Check for configuration issues
  const configTest = tests.find(t => t.name === 'Configuration Validation');
  if (!configTest?.passed) {
    recommendations.push('Set missing environment variables in Netlify dashboard or CLI');
  }

  // Check for OpenAI issues
  const openaiTests = tests.filter(t => t.name.includes('OpenAI'));
  if (openaiTests.some(t => !t.passed)) {
    if (!config.openai.apiKey) {
      recommendations.push('Add OPENAI_API_KEY or VITE_OPENAI_API_KEY to Netlify environment variables');
    } else {
      recommendations.push('Verify OpenAI API key is valid and has proper permissions');
    }
  }

  // Check for Supabase issues
  const supabaseTests = tests.filter(t => t.name.includes('Supabase'));
  if (supabaseTests.some(t => !t.passed)) {
    if (!config.supabase.serviceRoleKey) {
      recommendations.push('Add SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY for admin operations');
    }
  }

  // Check for n8n issues
  const n8nTests = tests.filter(t => t.name.includes('n8n'));
  if (n8nTests.some(t => !t.passed)) {
    recommendations.push('Verify n8n instance is running and API key is valid');
  }

  if (recommendations.length === 0) {
    recommendations.push('All systems operational - backend is fully configured! 🎉');
  }

  return recommendations;
}