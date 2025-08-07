/**
 * Cost Attribution Service
 * Tracks and calculates costs per user for billing
 */

import { supabase } from '../supabase';

export interface CostMetrics {
  executionCount: number;
  totalExecutionTime: number; // milliseconds
  totalNodeCount: number;
  aiTokensUsed: number;
  storageUsed: number; // bytes
  webhookCalls: number;
}

export interface CostCalculation {
  baseCost: number;
  executionCost: number;
  aiCost: number;
  storageCost: number;
  totalCost: number;
  tier: 'free' | 'pro' | 'enterprise';
}

export class CostAttribution {
  // Pricing model (cents)
  private readonly pricing = {
    free: {
      includedExecutions: 100,
      includedAiTokens: 10000,
      includedStorage: 1024 * 1024 * 100, // 100MB
    },
    pro: {
      baseCost: 2900, // $29/month
      executionCost: 0.01, // $0.01 per execution over 1000
      aiTokenCost: 0.002, // $0.002 per 1k tokens
      storageCost: 0.05, // $0.05 per GB
      includedExecutions: 1000,
      includedAiTokens: 100000,
      includedStorage: 1024 * 1024 * 1024, // 1GB
    },
    enterprise: {
      baseCost: 79900, // $799/month
      executionCost: 0.005, // $0.005 per execution over 10000
      aiTokenCost: 0.001, // $0.001 per 1k tokens
      storageCost: 0.02, // $0.02 per GB
      includedExecutions: 10000,
      includedAiTokens: 1000000,
      includedStorage: 1024 * 1024 * 1024 * 10, // 10GB
    },
  };

  /**
   * Track execution costs
   */
  async trackExecution(userId: string, executionData: {
    workflowId: string;
    executionTime: number;
    nodeCount: number;
    aiTokensUsed?: number;
    dataProcessed?: number;
  }) {
    // Record in cost tracking table
    const { error } = await supabase.from('execution_costs').insert({
      user_id: userId,
      workflow_id: executionData.workflowId,
      execution_time_ms: executionData.executionTime,
      node_count: executionData.nodeCount,
      ai_tokens_used: executionData.aiTokensUsed || 0,
      data_processed_bytes: executionData.dataProcessed || 0,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to track execution cost:', error);
    }

    // Update aggregated metrics
    await this.updateAggregatedMetrics(userId);
  }

  /**
   * Update aggregated cost metrics for a user
   */
  private async updateAggregatedMetrics(userId: string) {
    // Get current billing period (month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Aggregate costs for current period
    const { data: costs } = await supabase
      .from('execution_costs')
      .select('execution_time_ms, node_count, ai_tokens_used, data_processed_bytes')
      .eq('user_id', userId)
      .gte('timestamp', startOfMonth.toISOString());

    if (!costs) return;

    const metrics: CostMetrics = {
      executionCount: costs.length,
      totalExecutionTime: costs.reduce((sum, c) => sum + c.execution_time_ms, 0),
      totalNodeCount: costs.reduce((sum, c) => sum + c.node_count, 0),
      aiTokensUsed: costs.reduce((sum, c) => sum + (c.ai_tokens_used || 0), 0),
      storageUsed: costs.reduce((sum, c) => sum + (c.data_processed_bytes || 0), 0),
      webhookCalls: 0, // Track separately
    };

    // Update user metrics
    await supabase
      .from('user_cost_metrics')
      .upsert({
        user_id: userId,
        period_start: startOfMonth.toISOString(),
        ...metrics,
        updated_at: new Date().toISOString(),
      });
  }

  /**
   * Calculate costs for a user
   */
  async calculateUserCost(userId: string): Promise<CostCalculation> {
    // Get user tier
    const { data: user } = await supabase
      .from('user_quotas')
      .select('tier')
      .eq('user_id', userId)
      .single();

    const tier = user?.tier || 'free';

    // Get current period metrics
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: metrics } = await supabase
      .from('user_cost_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('period_start', startOfMonth.toISOString())
      .single();

    if (!metrics) {
      return {
        baseCost: 0,
        executionCost: 0,
        aiCost: 0,
        storageCost: 0,
        totalCost: 0,
        tier,
      };
    }

    return this.computeCost(metrics, tier);
  }

  /**
   * Compute cost based on metrics and tier
   */
  private computeCost(metrics: CostMetrics, tier: string): CostCalculation {
    if (tier === 'free') {
      // Free tier - check if within limits
      const overLimit = 
        metrics.executionCount > this.pricing.free.includedExecutions ||
        metrics.aiTokensUsed > this.pricing.free.includedAiTokens ||
        metrics.storageUsed > this.pricing.free.includedStorage;

      return {
        baseCost: 0,
        executionCost: 0,
        aiCost: 0,
        storageCost: 0,
        totalCost: overLimit ? -1 : 0, // -1 indicates upgrade needed
        tier: 'free',
      };
    }

    const pricing = this.pricing[tier as 'pro' | 'enterprise'];
    
    // Calculate overage costs
    const executionOverage = Math.max(0, metrics.executionCount - pricing.includedExecutions);
    const aiTokenOverage = Math.max(0, metrics.aiTokensUsed - pricing.includedAiTokens);
    const storageOverage = Math.max(0, metrics.storageUsed - pricing.includedStorage);

    const executionCost = executionOverage * pricing.executionCost;
    const aiCost = (aiTokenOverage / 1000) * pricing.aiTokenCost;
    const storageCost = (storageOverage / (1024 * 1024 * 1024)) * pricing.storageCost;

    return {
      baseCost: pricing.baseCost,
      executionCost,
      aiCost,
      storageCost,
      totalCost: pricing.baseCost + executionCost + aiCost + storageCost,
      tier: tier as 'pro' | 'enterprise',
    };
  }

  /**
   * Get usage statistics for dashboard
   */
  async getUserUsageStats(userId: string) {
    const { data: quota } = await supabase
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: metrics } = await supabase
      .from('user_cost_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .limit(1)
      .single();

    const cost = await this.calculateUserCost(userId);

    const tier = quota?.tier || 'free';
    const limits = this.pricing[tier as keyof typeof this.pricing];

    return {
      tier,
      usage: {
        executions: {
          used: metrics?.executionCount || 0,
          limit: 'includedExecutions' in limits ? limits.includedExecutions : -1,
          percentage: metrics && 'includedExecutions' in limits 
            ? (metrics.executionCount / limits.includedExecutions) * 100 
            : 0,
        },
        aiTokens: {
          used: metrics?.aiTokensUsed || 0,
          limit: 'includedAiTokens' in limits ? limits.includedAiTokens : -1,
          percentage: metrics && 'includedAiTokens' in limits
            ? (metrics.aiTokensUsed / limits.includedAiTokens) * 100
            : 0,
        },
        storage: {
          used: metrics?.storageUsed || 0,
          limit: 'includedStorage' in limits ? limits.includedStorage : -1,
          percentage: metrics && 'includedStorage' in limits
            ? (metrics.storageUsed / limits.includedStorage) * 100
            : 0,
        },
      },
      cost,
      nextResetDate: quota?.reset_at || null,
    };
  }

  /**
   * Check if user has quota available
   */
  async checkQuota(userId: string): Promise<boolean> {
    const stats = await this.getUserUsageStats(userId);
    
    if (stats.tier === 'free') {
      return stats.usage.executions.used < stats.usage.executions.limit;
    }

    // Pro and Enterprise have soft limits (they pay for overage)
    return true;
  }

  /**
   * Generate billing report
   */
  async generateBillingReport(userId: string, startDate: Date, endDate: Date) {
    const { data: costs } = await supabase
      .from('execution_costs')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: false });

    const totalMetrics: CostMetrics = {
      executionCount: costs?.length || 0,
      totalExecutionTime: costs?.reduce((sum, c) => sum + c.execution_time_ms, 0) || 0,
      totalNodeCount: costs?.reduce((sum, c) => sum + c.node_count, 0) || 0,
      aiTokensUsed: costs?.reduce((sum, c) => sum + (c.ai_tokens_used || 0), 0) || 0,
      storageUsed: costs?.reduce((sum, c) => sum + (c.data_processed_bytes || 0), 0) || 0,
      webhookCalls: 0,
    };

    const { data: user } = await supabase
      .from('user_quotas')
      .select('tier')
      .eq('user_id', userId)
      .single();

    const costCalculation = this.computeCost(totalMetrics, user?.tier || 'free');

    return {
      period: { start: startDate, end: endDate },
      metrics: totalMetrics,
      cost: costCalculation,
      details: costs,
    };
  }
}

// Singleton instance
export const costAttribution = new CostAttribution();