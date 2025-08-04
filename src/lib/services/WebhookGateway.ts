/**
 * Webhook Gateway Service
 * Validates and forwards webhooks to n8n with security and rate limiting
 */

import { supabase } from '../supabase';
import crypto from 'crypto';

export interface WebhookRequest {
  userId: string;
  workflowId: string;
  payload: any;
  headers: Record<string, string>;
  signature?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export class WebhookGateway {
  private rateLimitCache: Map<string, { count: number; resetTime: number }> = new Map();
  
  private readonly config = {
    rateLimit: {
      windowMs: 60000, // 1 minute
      maxRequests: 500, // 500 requests per minute per user
    },
    security: {
      requireSignature: true,
      allowedIPs: process.env.ALLOWED_IPS?.split(',') || [],
      maxPayloadSize: 1024 * 1024, // 1MB
    },
  };

  /**
   * Main webhook handler with full security validation
   */
  async handleWebhook(request: WebhookRequest): Promise<any> {
    try {
      // 1. Rate limiting
      if (!await this.checkRateLimit(request.userId)) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // 2. Verify ownership
      const ownership = await this.verifyWorkflowOwnership(request.userId, request.workflowId);
      if (!ownership) {
        throw new Error('Unauthorized: Workflow not found or access denied');
      }

      // 3. Validate signature (if required)
      if (this.config.security.requireSignature && !this.validateSignature(request)) {
        throw new Error('Invalid webhook signature');
      }

      // 4. Check payload size
      const payloadSize = JSON.stringify(request.payload).length;
      if (payloadSize > this.config.security.maxPayloadSize) {
        throw new Error('Payload too large');
      }

      // 5. Inject user context
      const enhancedPayload = {
        ...request.payload,
        __metadata: {
          userId: request.userId,
          workflowId: request.workflowId,
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        },
      };

      // 6. Forward to n8n
      const n8nResponse = await this.forwardToN8n(ownership.n8n_workflow_id, enhancedPayload);

      // 7. Log execution
      await this.logWebhookExecution(request, n8nResponse);

      return n8nResponse;
    } catch (error) {
      await this.logWebhookError(request, error);
      throw error;
    }
  }

  /**
   * Rate limiting implementation
   */
  private async checkRateLimit(userId: string): Promise<boolean> {
    const now = Date.now();
    const userLimit = this.rateLimitCache.get(userId);

    if (!userLimit || userLimit.resetTime < now) {
      // Reset window
      this.rateLimitCache.set(userId, {
        count: 1,
        resetTime: now + this.config.rateLimit.windowMs,
      });
      return true;
    }

    if (userLimit.count >= this.config.rateLimit.maxRequests) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  /**
   * Verify user owns the workflow
   */
  private async verifyWorkflowOwnership(userId: string, workflowId: string) {
    const { data, error } = await supabase
      .from('user_workflows')
      .select('id, n8n_workflow_id, is_active')
      .eq('user_id', userId)
      .eq('id', workflowId)
      .single();

    if (error || !data || !data.is_active) {
      return null;
    }

    return data;
  }

  /**
   * Validate HMAC signature
   */
  private validateSignature(request: WebhookRequest): boolean {
    if (!request.signature) return false;

    const secret = process.env.WEBHOOK_SECRET || 'default-secret';
    const payload = JSON.stringify(request.payload);
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(request.signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Forward validated request to n8n
   */
  private async forwardToN8n(n8nWorkflowId: string, payload: any) {
    const n8nUrl = process.env.N8N_API_URL || process.env.VITE_N8N_API_URL || 'http://18.221.12.50:5678/api/v1';
    const n8nApiKey = process.env.N8N_API_KEY || process.env.VITE_N8N_API_KEY;

    const response = await fetch(`${n8nUrl}/workflows/${n8nWorkflowId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey || '',
      },
      body: JSON.stringify({ body: payload }),
    });

    if (!response.ok) {
      throw new Error(`n8n execution failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Log successful webhook execution
   */
  private async logWebhookExecution(request: WebhookRequest, response: any) {
    await supabase.from('webhook_executions').insert({
      user_id: request.userId,
      workflow_id: request.workflowId,
      status: 'success',
      request_payload: request.payload,
      response_data: response,
      ip_address: request.headers['x-forwarded-for'] || request.headers['x-real-ip'],
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Log webhook errors for debugging
   */
  private async logWebhookError(request: WebhookRequest, error: any) {
    await supabase.from('webhook_executions').insert({
      user_id: request.userId,
      workflow_id: request.workflowId,
      status: 'error',
      request_payload: request.payload,
      error_message: error.message,
      ip_address: request.headers['x-forwarded-for'] || request.headers['x-real-ip'],
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Clean up old rate limit entries periodically
   */
  cleanupRateLimitCache() {
    const now = Date.now();
    for (const [userId, limit] of this.rateLimitCache.entries()) {
      if (limit.resetTime < now) {
        this.rateLimitCache.delete(userId);
      }
    }
  }
}

// Singleton instance
export const webhookGateway = new WebhookGateway();

// Cleanup interval
setInterval(() => webhookGateway.cleanupRateLimitCache(), 60000);