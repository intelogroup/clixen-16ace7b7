/**
 * Supabase Edge Functions API Client
 * Client-side helper for interacting with Supabase Edge Functions
 */

import { supabase } from '../supabase';

export class SupabaseAPIClient {
  private baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  
  /**
   * Get auth token for API calls
   */
  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  /**
   * Make authenticated API request
   */
  private async request(path: string, options: RequestInit = {}) {
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  }

  /**
   * Generate workflow from user request using Supabase Edge Functions
   */
  async generateWorkflow(request: string, preference: 'speed' | 'accuracy' | 'balanced' = 'balanced') {
    const { data: userQuota } = await supabase
      .from('user_quotas')
      .select('tier')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    return this.request('/api-operations', {
      method: 'POST',
      body: JSON.stringify({
        action: 'generate-workflow',
        request,
        tier: userQuota?.tier || 'free',
        preference,
      }),
    });
  }

  /**
   * Execute workflow using Supabase Edge Functions
   */
  async executeWorkflow(workflowId: string, data: any = {}) {
    return this.request('/api-operations', {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'execute-workflow',
        workflowId, 
        data 
      }),
    });
  }

  /**
   * Get execution status (with polling support)
   */
  async getExecutionStatus(executionId: string) {
    const token = await this.getAuthToken();
    const response = await fetch(`${this.baseUrl}/api-operations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'get-execution-status',
        executionId
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get execution status');
    }

    return response.json();
  }

  /**
   * Poll execution status until complete
   */
  async pollExecutionStatus(
    executionId: string, 
    onUpdate?: (status: any) => void,
    maxAttempts = 60,
    intervalMs = 2000
  ): Promise<any> {
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          attempts++;
          
          const status = await this.getExecutionStatus(executionId);
          
          if (onUpdate) {
            onUpdate(status);
          }

          if (status.status === 'success' || status.status === 'error') {
            clearInterval(interval);
            resolve(status);
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            reject(new Error('Execution polling timeout'));
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, intervalMs);
    });
  }

  /**
   * Get user executions history using Supabase Edge Functions
   */
  async getUserExecutions() {
    return this.request('/api-operations', {
      method: 'POST',
      body: JSON.stringify({ action: 'get-user-executions' }),
    });
  }

  /**
   * Get usage statistics using Supabase Edge Functions
   */
  async getUsageStats() {
    return this.request('/api-operations', {
      method: 'POST',
      body: JSON.stringify({ action: 'get-usage-stats' }),
    });
  }

  /**
   * Get billing report using Supabase Edge Functions
   */
  async getBillingReport(startDate?: Date, endDate?: Date) {
    return this.request('/api-operations', {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'get-billing-report',
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      }),
    });
  }

  /**
   * Subscribe to real-time execution updates
   */
  subscribeToExecutions(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`executions:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workflow_executions',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to notifications
   */
  subscribeToNotifications(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  }
}

// Singleton instance
export const supabaseAPI = new SupabaseAPIClient();

// Legacy alias for backward compatibility
export const netlifyAPI = supabaseAPI;