/**
 * Execution Status Function - Check workflow execution status
 * Called by client to poll for execution updates
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    // Get execution ID from path
    const executionId = event.path.split('/').pop();
    if (!executionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Execution ID required' }),
      };
    }

    // Authenticate user
    const token = event.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No authorization token' }),
      };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' }),
      };
    }

    // Get execution from database
    const { data: execution, error: dbError } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('id', executionId)
      .eq('user_id', user.id)
      .single();

    if (dbError || !execution) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Execution not found' }),
      };
    }

    // If execution is still running, check n8n status
    if (execution.status === 'running' || execution.status === 'queued') {
      const n8nStatus = await checkN8nStatus(execution.n8n_execution_id);
      
      // Update database if status changed
      if (n8nStatus.finished) {
        await supabase
          .from('workflow_executions')
          .update({
            status: n8nStatus.success ? 'success' : 'error',
            output_data: n8nStatus.data,
            error_message: n8nStatus.error,
            execution_time_ms: n8nStatus.executionTime,
            completed_at: new Date().toISOString(),
          })
          .eq('id', executionId);

        // Update quota
        await updateUserQuota(user.id);

        execution.status = n8nStatus.success ? 'success' : 'error';
        execution.output_data = n8nStatus.data;
        execution.error_message = n8nStatus.error;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(execution),
    };
  } catch (error: any) {
    console.error('Execution status error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get execution status' }),
    };
  }
};

/**
 * Check n8n execution status
 */
async function checkN8nStatus(executionId: string) {
  try {
    const n8nUrl = process.env.N8N_API_URL;
    const n8nApiKey = process.env.N8N_API_KEY;

    const response = await fetch(`${n8nUrl}/executions/${executionId}?includeData=true`, {
      headers: {
        'X-N8N-API-KEY': n8nApiKey!,
      },
    });

    if (!response.ok) {
      return { finished: true, success: false, error: 'Failed to fetch status' };
    }

    const data = await response.json();
    return {
      finished: data.finished,
      success: data.status === 'success',
      executionTime: data.executionTime,
      data: data.data?.resultData?.lastNodeExecuted,
      error: data.data?.resultData?.error,
    };
  } catch (error) {
    console.error('n8n status check failed:', error);
    return { finished: true, success: false, error: 'Status check failed' };
  }
}

/**
 * Update user quota after execution
 */
async function updateUserQuota(userId: string) {
  const { data: quota } = await supabase
    .from('user_quotas')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (quota) {
    await supabase
      .from('user_quotas')
      .update({
        executions_this_week: quota.executions_this_week + 1,
        total_executions: quota.total_executions + 1,
      })
      .eq('user_id', userId);
  }
}