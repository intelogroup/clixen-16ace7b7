/**
 * Keep-Warm Function - Netlify Function
 * Prevents cold starts by running every 5 minutes
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const headers = {
    'Content-Type': 'application/json'
  };

  try {
    // Simple health check to keep functions warm
    const timestamp = new Date().toISOString();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'warm',
        timestamp,
        message: 'Keep-warm function executed successfully',
        environment: {
          hasSupabaseUrl: !!process.env.SUPABASE_URL,
          hasN8nUrl: !!process.env.N8N_API_URL
        }
      })
    };

  } catch (error) {
    console.error('Keep-warm error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Keep-warm function failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    };
  }
};