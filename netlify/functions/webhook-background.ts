/**
 * Webhook Background Function - Netlify Background Function
 * Handles webhook processing with longer timeout (up to 15 minutes)
 */

import type { BackgroundHandler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Background function for processing webhooks
 * Triggered by the main API proxy for long-running webhook operations
 */
export const handler: BackgroundHandler = async (event) => {
  console.log('Processing webhook in background:', event.body);

  try {
    const { userId, workflowId, payload } = JSON.parse(event.body || '{}');

    // 1. Verify workflow ownership
    const { data: workflow, error } = await supabase
      .from('user_workflows')
      .select('*')
      .eq('user_id', userId)
      .eq('id', workflowId)
      .single();

    if (error || !workflow) {
      throw new Error('Workflow not found or unauthorized');
    }

    // 2. Process webhook (could be long-running)
    const n8nUrl = process.env.VITE_N8N_API_URL;
    const n8nApiKey = process.env.VITE_N8N_API_KEY;

    const response = await fetch(`${n8nUrl}/workflows/${workflow.n8n_workflow_id}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey!,
      },
      body: JSON.stringify({ 
        body: {
          ...payload,
          __metadata: {
            userId,
            workflowId,
            timestamp: new Date().toISOString(),
          },
        },
      }),
    });

    const result = await response.json();

    // 3. Log execution result
    await supabase.from('webhook_executions').insert({
      user_id: userId,
      workflow_id: workflowId,
      status: response.ok ? 'success' : 'error',
      request_payload: payload,
      response_data: result,
      created_at: new Date().toISOString(),
    });

    // 4. Send notification to user
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'webhook_complete',
      title: 'Webhook Processed',
      message: `Workflow ${workflow.workflow_name} completed`,
      data: { workflowId, success: response.ok },
      created_at: new Date().toISOString(),
    });

    console.log('Webhook processed successfully');
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    
    // Log error
    if (event.body) {
      const { userId, workflowId } = JSON.parse(event.body);
      await supabase.from('webhook_executions').insert({
        user_id: userId,
        workflow_id: workflowId,
        status: 'error',
        error_message: error.message,
        created_at: new Date().toISOString(),
      });
    }
  }
};