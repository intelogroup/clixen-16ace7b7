/**
 * Main API Proxy - Netlify Function (Simplified)
 * Handles all API requests with auth and basic routing
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

/**
 * Main handler for all API requests
 */
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { queryStringParameters } = event;
    const endpoint = queryStringParameters?.endpoint || 'health';

    // Health check endpoint
    if (endpoint === 'health') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          function: 'api-proxy',
          environment: {
            hasSupabaseUrl: !!process.env.SUPABASE_URL,
            hasN8nUrl: !!process.env.N8N_API_URL,
            hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY
          }
        })
      };
    }

    // Environment info endpoint (for debugging)
    if (endpoint === 'env-check') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          environment: {
            SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
            N8N_API_URL: process.env.N8N_API_URL ? 'SET' : 'MISSING',
            N8N_API_KEY: process.env.N8N_API_KEY ? 'SET' : 'MISSING',
            OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'MISSING'
          }
        })
      };
    }

    // Supabase test endpoint
    if (endpoint === 'test-supabase') {
      const { createClient } = await import('@supabase/supabase-js');
      
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Supabase environment variables missing' })
        };
      }

      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data, error } = await supabase
        .from('conversations')
        .select('id, title')
        .limit(1);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: !error,
          data: data || [],
          error: error?.message
        })
      };
    }

    // n8n test endpoint
    if (endpoint === 'test-n8n') {
      if (!process.env.N8N_API_URL || !process.env.N8N_API_KEY) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'n8n environment variables missing' })
        };
      }

      const response = await fetch(`${process.env.N8N_API_URL}/workflows`, {
        headers: {
          'X-N8N-API-KEY': process.env.N8N_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      return {
        statusCode: response.ok ? 200 : 500,
        headers,
        body: JSON.stringify({
          success: response.ok,
          workflowCount: data.data?.length || 0,
          error: response.ok ? null : data.message
        })
      };
    }

    // Default response for unknown endpoints
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'Endpoint not found',
        availableEndpoints: ['health', 'env-check', 'test-supabase', 'test-n8n']
      })
    };

  } catch (error) {
    console.error('API Proxy error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    };
  }
};