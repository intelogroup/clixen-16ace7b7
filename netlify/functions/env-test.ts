/**
 * Simple Environment Variable Test Function
 * Tests if environment variables are available in Netlify functions
 */

import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    // Test all environment variables
    const envVars = {
      // VITE_ prefixed (build-time)
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'NOT_SET',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET',
      VITE_N8N_API_URL: process.env.VITE_N8N_API_URL || 'NOT_SET',
      VITE_N8N_API_KEY: process.env.VITE_N8N_API_KEY ? 'SET' : 'NOT_SET',
      
      // Non-VITE_ prefixed (runtime)
      SUPABASE_URL: process.env.SUPABASE_URL || 'NOT_SET',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT_SET',
      N8N_API_URL: process.env.N8N_API_URL || 'NOT_SET',
      N8N_API_KEY: process.env.N8N_API_KEY ? 'SET' : 'NOT_SET',
      
      // Netlify specific
      NETLIFY: process.env.NETLIFY || 'NOT_SET',
      NETLIFY_DEV: process.env.NETLIFY_DEV || 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
      
      // Context
      CONTEXT: process.env.CONTEXT || 'NOT_SET',
      DEPLOY_URL: process.env.DEPLOY_URL || 'NOT_SET',
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Environment variables test',
        timestamp: new Date().toISOString(),
        environmentVariables: envVars,
        allEnvKeys: Object.keys(process.env).sort(),
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Environment test failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};