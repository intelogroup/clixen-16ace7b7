/**
 * Workspace Analytics Edge Function - Phase 2 Implementation
 * Provides comprehensive workspace analytics, quota management, and insights
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { WorkspaceQuotaManager } from '../_shared/workspace-quota-manager.ts';
import { UsageTracker } from '../_shared/usage-tracker.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface WorkspaceAnalyticsRequest {
  action: 'get_analytics' | 'get_quota' | 'update_quota' | 'get_usage' | 'get_report' | 'get_recommendations';
  workspace_id?: string;
  user_id?: string;
  days?: number;
  hours?: number;
  new_quota?: any;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const quotaManager = new WorkspaceQuotaManager(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const usageTracker = new UsageTracker(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      action,
      workspace_id,
      user_id,
      days = 30,
      hours = 24,
      new_quota
    }: WorkspaceAnalyticsRequest = await req.json();

    console.log(`📊 [Analytics] Processing ${action} request for workspace: ${workspace_id?.substring(0, 8)}***`);

    // Get workspace_id from user_id if not provided
    let effectiveWorkspaceId = workspace_id;
    if (!effectiveWorkspaceId && user_id) {
      const { data: workspace } = await supabase
        .from('user_workspaces')
        .select('id')
        .eq('user_id', user_id)
        .single();
      
      effectiveWorkspaceId = workspace?.id;
    }

    if (!effectiveWorkspaceId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'workspace_id or user_id is required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let result;

    switch (action) {
      case 'get_analytics': {
        console.log(`📈 Getting analytics for workspace ${effectiveWorkspaceId.substring(0, 8)}*** (${days} days)`);
        
        const [metrics, performance, trends, analytics] = await Promise.all([
          usageTracker.getUsageMetrics(effectiveWorkspaceId, days),
          usageTracker.getPerformanceMetrics(effectiveWorkspaceId, hours),
          usageTracker.getUsageTrends(effectiveWorkspaceId, days),
          quotaManager.getWorkspaceAnalytics(effectiveWorkspaceId, days)
        ]);

        result = {
          success: true,
          data: {
            metrics,
            performance,
            trends,
            analytics,
            timeframe: {
              days_analyzed: days,
              hours_performance: hours
            }
          }
        };
        break;
      }

      case 'get_quota': {
        console.log(`📋 Getting quota info for workspace ${effectiveWorkspaceId.substring(0, 8)}***`);
        
        const workspaceInfo = await quotaManager.getWorkspaceInfo(effectiveWorkspaceId);
        if (!workspaceInfo) {
          result = {
            success: false,
            error: 'Workspace not found'
          };
        } else {
          result = {
            success: true,
            data: {
              quota: workspaceInfo.quota,
              usage: workspaceInfo.usage,
              utilization: {
                workflows: (workspaceInfo.usage.workflows_count / workspaceInfo.quota.max_workflows) * 100,
                executions: (workspaceInfo.usage.executions_count / workspaceInfo.quota.max_executions) * 100,
                storage: (workspaceInfo.usage.storage_used_mb / workspaceInfo.quota.storage_mb) * 100,
                projects: (workspaceInfo.usage.projects_count / workspaceInfo.quota.max_projects) * 100
              }
            }
          };
        }
        break;
      }

      case 'update_quota': {
        console.log(`⚙️ Updating quota for workspace ${effectiveWorkspaceId.substring(0, 8)}***`);
        
        if (!new_quota) {
          result = {
            success: false,
            error: 'new_quota is required'
          };
        } else {
          const updated = await quotaManager.updateWorkspaceQuota(effectiveWorkspaceId, new_quota);
          result = {
            success: updated,
            message: updated ? 'Quota updated successfully' : 'Failed to update quota'
          };
        }
        break;
      }

      case 'get_usage': {
        console.log(`📊 Getting usage metrics for workspace ${effectiveWorkspaceId.substring(0, 8)}***`);
        
        const metrics = await usageTracker.getUsageMetrics(effectiveWorkspaceId, days);
        result = {
          success: true,
          data: {
            usage: metrics,
            period_days: days
          }
        };
        break;
      }

      case 'get_report': {
        console.log(`📑 Generating comprehensive report for workspace ${effectiveWorkspaceId.substring(0, 8)}***`);
        
        const report = await usageTracker.generateUsageReport(effectiveWorkspaceId, days);
        result = {
          success: true,
          data: {
            report,
            generated_at: new Date().toISOString(),
            period_days: days
          }
        };
        break;
      }

      case 'get_recommendations': {
        console.log(`💡 Getting recommendations for workspace ${effectiveWorkspaceId.substring(0, 8)}***`);
        
        const recommendations = await quotaManager.getQuotaRecommendations(effectiveWorkspaceId);
        const trends = await usageTracker.getUsageTrends(effectiveWorkspaceId, days);
        
        result = {
          success: true,
          data: {
            quota_recommendations: recommendations,
            usage_trends: trends,
            generated_at: new Date().toISOString()
          }
        };
        break;
      }

      default:
        result = {
          success: false,
          error: `Unknown action: ${action}`
        };
    }

    // Log analytics request
    if (effectiveWorkspaceId && action !== 'get_usage') {
      try {
        await usageTracker.trackEvent({
          workspace_id: effectiveWorkspaceId,
          user_id: user_id || 'system',
          event_type: 'api_call',
          resource_type: 'analytics',
          resource_id: action,
          metadata: {
            action,
            days,
            hours,
            success: result.success
          },
          timestamp: new Date().toISOString(),
          success: result.success
        });
      } catch (trackingError) {
        console.warn('Analytics tracking failed:', trackingError);
      }
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 400
      }
    );

  } catch (error) {
    console.error('Workspace Analytics Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

/* 
 * Usage Examples:
 * 
 * 1. Get comprehensive analytics:
 * curl -X POST https://your-project.supabase.co/functions/v1/workspace-analytics \
 *   -H "Authorization: Bearer YOUR-ANON-KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{"action": "get_analytics", "user_id": "uuid", "days": 30}'
 * 
 * 2. Get current quota and usage:
 * curl -X POST https://your-project.supabase.co/functions/v1/workspace-analytics \
 *   -H "Authorization: Bearer YOUR-ANON-KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{"action": "get_quota", "workspace_id": "workspace-uuid"}'
 * 
 * 3. Update workspace quota:
 * curl -X POST https://your-project.supabase.co/functions/v1/workspace-analytics \
 *   -H "Authorization: Bearer YOUR-ANON-KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{"action": "update_quota", "workspace_id": "uuid", "new_quota": {"max_workflows": 100}}'
 * 
 * 4. Generate usage report:
 * curl -X POST https://your-project.supabase.co/functions/v1/workspace-analytics \
 *   -H "Authorization: Bearer YOUR-ANON-KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{"action": "get_report", "user_id": "uuid", "days": 7}'
 * 
 * Expected Response Format:
 * {
 *   "success": true,
 *   "data": {
 *     "metrics": {
 *       "total_workflows": 15,
 *       "total_executions": 342,
 *       "success_rate": 94.2,
 *       "avg_execution_time": 1250
 *     },
 *     "performance": {
 *       "response_time_p50": 850,
 *       "response_time_p95": 2100,
 *       "error_rate": 5.8
 *     },
 *     "trends": {
 *       "workflow_growth_rate": 15.3,
 *       "execution_growth_rate": 22.7
 *     }
 *   }
 * }
 */