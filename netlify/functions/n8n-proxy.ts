/**
 * n8n API Proxy - Netlify Function
 * Proxies all n8n API requests to bypass CORS restrictions
 */

import type { Handler, HandlerEvent } from '@netlify/functions';

export const handler: Handler = async (event: HandlerEvent) => {
  // CORS headers for browser access
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-N8N-API-KEY',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    // Get the n8n API configuration from environment variables
    const N8N_API_URL = process.env.N8N_API_URL || process.env.VITE_N8N_API_URL || 'http://18.221.12.50:5678/api/v1';
    const N8N_API_KEY = process.env.N8N_API_KEY || process.env.VITE_N8N_API_KEY || '';

    if (!N8N_API_KEY) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'n8n API key not configured',
          message: 'Please set N8N_API_KEY or VITE_N8N_API_KEY environment variable'
        })
      };
    }

    // Extract the path from the request
    // The path after /.netlify/functions/n8n-proxy/
    const pathSegments = event.path.split('/n8n-proxy/');
    const apiPath = pathSegments[1] || '';

    // Build the full n8n API URL
    const targetUrl = `${N8N_API_URL}/${apiPath}${event.rawQuery ? '?' + event.rawQuery : ''}`;

    console.log('Proxying to n8n:', {
      method: event.httpMethod,
      targetUrl,
      hasBody: !!event.body,
      N8N_API_URL,
      pathSegments: event.path.split('/'),
      rawQuery: event.rawQuery
    });

    // Prepare headers for n8n
    const headers: HeadersInit = {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
    };

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      // Forward the request to n8n
      const response = await fetch(targetUrl, {
        method: event.httpMethod || 'GET',
        headers,
        body: event.body || undefined,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

    // Get the response body
    const responseText = await response.text();

    // Parse response if it's JSON
    let responseBody: any;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }

    // Return the proxied response
    return {
      statusCode: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
      body: typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)
    };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('n8n fetch error:', fetchError);
      
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'n8n fetch failed',
          message: fetchError instanceof Error ? fetchError.message : 'Network error',
          isTimeout: fetchError.name === 'AbortError',
          timestamp: new Date().toISOString()
        })
      };
    }

  } catch (error) {
    console.error('n8n proxy error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Proxy error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      })
    };
  }
};