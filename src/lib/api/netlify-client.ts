/**
 * Netlify Functions API Client
 * Client-side helper for interacting with Netlify Functions
 */

import { supabase } from '../supabase';

export class NetlifyAPIClient {
  private baseUrl = '/api/v1';
  
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
   * Generate workflow from user request
   */
  async generateWorkflow(request: string, preference: 'speed' | 'accuracy' | 'balanced' = 'balanced') {
    const { data: userQuota } = await supabase
      .from('user_quotas')
      .select('tier')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    return this.request('/workflows/generate', {
      method: 'POST',
      body: JSON.stringify({
        request,
        tier: userQuota?.tier || 'free',
        preference,
      }),
    });
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(workflowId: string, data: any = {}) {
    return this.request('/workflows/execute', {
      method: 'POST',
      body: JSON.stringify({ workflowId, data }),
    });
  }

  /**
   * Get execution status (with polling support)
   */
  async getExecutionStatus(executionId: string) {
    const response = await fetch(`/api/executions/${executionId}`, {
      headers: {
        'Authorization': `Bearer ${await this.getAuthToken()}`,
      },
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
   * Get user executions history
   */
  async getUserExecutions() {
    return this.request('/executions');
  }

  /**
   * Get usage statistics
   */
  async getUsageStats() {
    return this.request('/usage');
  }

  /**
   * Get billing report
   */
  async getBillingReport(startDate?: Date, endDate?: Date) {
    const params = new URLSearchParams();
    if (startDate) params.append('start', startDate.toISOString());
    if (endDate) params.append('end', endDate.toISOString());
    
    return this.request(`/billing?${params.toString()}`);
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
export const netlifyAPI = new NetlifyAPIClient();