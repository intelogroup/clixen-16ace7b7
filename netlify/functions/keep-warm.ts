/**
 * Keep-Warm Function - Prevents cold starts for critical functions
 * Scheduled every 5 minutes to maintain warm function instances
 */

import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Don't warm during manual invocation (only scheduled)
  if (!event.headers['x-netlify-event']) {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Warming disabled for manual calls' }),
    };
  }

  const baseUrl = process.env.URL || 'https://clixen.netlify.app';
  
  // Critical functions to keep warm
  const criticalFunctions = [
    '/api/v1/workflows/generate',
    '/api/v1/usage',
    '/api/executions/status'
  ];

  const results = [];

  for (const endpoint of criticalFunctions) {
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'HEAD',
        headers: {
          'x-warmup': 'true',
          'User-Agent': 'Netlify-KeepWarm/1.0'
        },
        timeout: 5000
      });

      const duration = Date.now() - startTime;
      
      results.push({
        endpoint,
        status: response.status,
        duration,
        success: response.status < 500
      });

      // Log for monitoring
      console.log(`WARMUP: ${endpoint} - ${response.status} - ${duration}ms`);

    } catch (error: any) {
      results.push({
        endpoint,
        status: 'error',
        duration: 0,
        success: false,
        error: error.message
      });

      console.error(`WARMUP ERROR: ${endpoint} - ${error.message}`);
    }
  }

  // Summary stats
  const successful = results.filter(r => r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`WARMUP SUMMARY: ${successful}/${results.length} successful, avg ${avgDuration}ms`);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      warmed: criticalFunctions.length,
      successful,
      averageDuration: Math.round(avgDuration),
      results
    }),
  };
};