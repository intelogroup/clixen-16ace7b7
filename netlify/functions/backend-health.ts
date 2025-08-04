/**
 * Comprehensive Backend Health Check Function
 * Tests all backend services and API integrations
 */

import type { Handler } from '@netlify/functions';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  details?: any;
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

  const healthChecks: HealthCheck[] = [];
  
  // 1. Check Environment Variables
  const envCheck: HealthCheck = {
    service: 'Environment Variables',
    status: 'healthy',
    message: 'Checking environment configuration',
    details: {
      frontend: {
        VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY,
        VITE_N8N_API_URL: !!process.env.VITE_N8N_API_URL,
        VITE_N8N_API_KEY: !!process.env.VITE_N8N_API_KEY,
        VITE_OPENAI_API_KEY: !!process.env.VITE_OPENAI_API_KEY,
      },
      backend: {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        N8N_API_URL: !!process.env.N8N_API_URL,
        N8N_API_KEY: !!process.env.N8N_API_KEY,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      }
    }
  };
  
  // Use VITE_ variables as fallback for backend if non-prefixed are missing
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  const N8N_API_URL = process.env.N8N_API_URL || process.env.VITE_N8N_API_URL;
  const N8N_API_KEY = process.env.N8N_API_KEY || process.env.VITE_N8N_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

  // Check if we have minimum required variables
  const hasMinimumVars = SUPABASE_URL && SUPABASE_ANON_KEY && N8N_API_URL;
  envCheck.status = hasMinimumVars ? 'healthy' : 'unhealthy';
  envCheck.message = hasMinimumVars 
    ? 'Environment variables configured (using fallbacks where needed)'
    : 'Missing critical environment variables';
  healthChecks.push(envCheck);

  // 2. Test Supabase Connection
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      });
      
      healthChecks.push({
        service: 'Supabase Database',
        status: supabaseResponse.ok ? 'healthy' : 'unhealthy',
        message: supabaseResponse.ok ? 'Connected successfully' : `Failed with status ${supabaseResponse.status}`,
        details: {
          url: SUPABASE_URL,
          hasServiceRole: !!SUPABASE_SERVICE_ROLE_KEY,
          statusCode: supabaseResponse.status
        }
      });
    } catch (error: any) {
      healthChecks.push({
        service: 'Supabase Database',
        status: 'unhealthy',
        message: error.message,
        details: { error: error.toString() }
      });
    }
  }

  // 3. Test n8n Connection
  if (N8N_API_URL && N8N_API_KEY) {
    try {
      const n8nResponse = await fetch(`${N8N_API_URL}/workflows`, {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Accept': 'application/json',
        }
      });
      
      healthChecks.push({
        service: 'n8n Workflow Engine',
        status: n8nResponse.ok ? 'healthy' : 'degraded',
        message: n8nResponse.ok ? 'Connected successfully' : `API returned status ${n8nResponse.status}`,
        details: {
          url: N8N_API_URL,
          statusCode: n8nResponse.status
        }
      });
    } catch (error: any) {
      healthChecks.push({
        service: 'n8n Workflow Engine',
        status: 'unhealthy',
        message: error.message,
        details: { error: error.toString() }
      });
    }
  }

  // 4. Test OpenAI Connection
  if (OPENAI_API_KEY) {
    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        }
      });
      
      healthChecks.push({
        service: 'OpenAI API',
        status: openaiResponse.ok ? 'healthy' : 'unhealthy',
        message: openaiResponse.ok ? 'Connected successfully' : `Failed with status ${openaiResponse.status}`,
        details: {
          hasKey: true,
          statusCode: openaiResponse.status,
          keyPrefix: OPENAI_API_KEY.substring(0, 10) + '...'
        }
      });
    } catch (error: any) {
      healthChecks.push({
        service: 'OpenAI API',
        status: 'unhealthy',
        message: error.message,
        details: { error: error.toString() }
      });
    }
  } else {
    healthChecks.push({
      service: 'OpenAI API',
      status: 'unhealthy',
      message: 'No API key configured',
      details: { hasKey: false }
    });
  }

  // Calculate overall health
  const unhealthyCount = healthChecks.filter(h => h.status === 'unhealthy').length;
  const degradedCount = healthChecks.filter(h => h.status === 'degraded').length;
  const overallStatus = unhealthyCount > 0 ? 'unhealthy' : degradedCount > 0 ? 'degraded' : 'healthy';

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      environment: process.env.CONTEXT || 'production',
      checks: healthChecks,
      summary: {
        total: healthChecks.length,
        healthy: healthChecks.filter(h => h.status === 'healthy').length,
        degraded: degradedCount,
        unhealthy: unhealthyCount
      }
    }, null, 2),
  };
};