/**
 * Workflow Lifecycle Management System
 * 
 * Manages the complete lifecycle of workflows from creation to retirement
 * Includes status tracking, execution monitoring, performance metrics, and automated maintenance
 */

import { createClient } from '@supabase/supabase-js';
import type { N8nWorkflow } from '../n8n';

export interface WorkflowLifecycleState {
  id: string;
  status: 'draft' | 'validated' | 'deployed' | 'active' | 'paused' | 'failed' | 'archived' | 'retired';
  version: number;
  deploymentStatus: 'not_deployed' | 'deploying' | 'deployed' | 'failed' | 'updating' | 'rolling_back';
  healthStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
  
  metadata: {
    createdAt: string;
    updatedAt: string;
    lastDeployedAt?: string;
    lastExecutionAt?: string;
    retiredAt?: string;
    
    // Ownership and project context
    userId: string;
    projectId: string;
    originalPrompt: string;
    
    // Technical details
    n8nWorkflowId?: string;
    deploymentUrl?: string;
    webhookUrl?: string;
  };
  
  metrics: WorkflowMetrics;
  monitoring: MonitoringConfig;
  maintenance: MaintenanceInfo;
}

export interface WorkflowMetrics {
  // Execution metrics
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number; // milliseconds
  lastExecutionTime: number;
  
  // Performance metrics
  throughput: number; // executions per hour
  errorRate: number; // percentage
  availabilityScore: number; // percentage
  
  // Resource utilization
  avgCpuUsage: number; // percentage
  avgMemoryUsage: number; // MB
  avgNetworkUsage: number; // bytes
  
  // Business metrics
  costPerExecution: number; // USD cents
  totalCost: number; // USD cents
  businessValue: number; // calculated score
  
  // Time series data for trends
  hourlyStats: HourlyMetrics[];
  dailyStats: DailyMetrics[];
  weeklyStats: WeeklyMetrics[];
}

export interface HourlyMetrics {
  timestamp: string;
  executions: number;
  failures: number;
  avgResponseTime: number;
  errors: string[];
}

export interface DailyMetrics {
  date: string;
  totalExecutions: number;
  successRate: number;
  avgResponseTime: number;
  totalCost: number;
  businessValue: number;
}

export interface WeeklyMetrics {
  weekStart: string;
  totalExecutions: number;
  growthRate: number; // percentage change from previous week
  reliabilityScore: number;
  performanceScore: number;
  costEfficiency: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  alertsEnabled: boolean;
  healthCheckInterval: number; // minutes
  metricsRetention: number; // days
  
  thresholds: {
    errorRate: number; // percentage threshold for alerts
    responseTime: number; // milliseconds threshold
    availabilityScore: number; // minimum availability percentage
    costLimit: number; // maximum cost per day in cents
  };
  
  notifications: {
    email: boolean;
    slack: boolean;
    webhook?: string;
  };
  
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface MaintenanceInfo {
  lastHealthCheck: string;
  nextHealthCheck: string;
  maintenanceMode: boolean;
  scheduledMaintenance?: string;
  
  autoMaintenance: {
    enabled: boolean;
    autoRestart: boolean;
    autoScale: boolean;
    autoOptimize: boolean;
  };
  
  issues: MaintenanceIssue[];
  recommendations: MaintenanceRecommendation[];
}

export interface MaintenanceIssue {
  id: string;
  type: 'performance' | 'reliability' | 'security' | 'cost';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  detectedAt: string;
  resolvedAt?: string;
  autoFixAvailable: boolean;
}

export interface MaintenanceRecommendation {
  id: string;
  type: 'optimization' | 'security' | 'reliability' | 'cost';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  estimatedImpact: string;
  implementationEffort: 'low' | 'medium' | 'high';
  autoImplementable: boolean;
}

export interface StatusTransition {
  fromStatus: string;
  toStatus: string;
  timestamp: string;
  reason: string;
  triggeredBy: 'user' | 'system' | 'automation';
  metadata?: Record<string, any>;
}

export interface ExecutionRecord {
  id: string;
  workflowId: string;
  n8nExecutionId: string;
  status: 'running' | 'success' | 'error' | 'waiting' | 'cancelled';
  startedAt: string;
  finishedAt?: string;
  duration?: number; // milliseconds
  
  trigger: {
    type: 'manual' | 'webhook' | 'schedule' | 'api';
    source?: string;
    data?: any;
  };
  
  results: {
    outputData?: any;
    errorMessage?: string;
    executionPath: string[]; // node IDs in execution order
    nodeExecutionTime: Record<string, number>; // node ID -> execution time
  };
  
  resources: {
    cpuTime: number; // milliseconds
    memoryUsed: number; // bytes
    networkIO: number; // bytes
  };
  
  cost: number; // USD cents
}

// Main lifecycle manager class
export class WorkflowLifecycleManager {
  private supabase: any;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.VITE_SUPABASE_ANON_KEY || ''
    );
  }

  /**
   * Initialize lifecycle management for a workflow
   */
  async initializeWorkflow(
    workflowId: string,
    initialState: Partial<WorkflowLifecycleState>
  ): Promise<WorkflowLifecycleState> {
    const defaultState: WorkflowLifecycleState = {
      id: workflowId,
      status: 'draft',
      version: 1,
      deploymentStatus: 'not_deployed',
      healthStatus: 'unknown',
      
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: '',
        projectId: '',
        originalPrompt: '',
        ...initialState.metadata
      },
      
      metrics: this.createDefaultMetrics(),
      monitoring: this.createDefaultMonitoringConfig(),
      maintenance: this.createDefaultMaintenanceInfo(),
      
      ...initialState
    };

    // Store in database
    await this.storeWorkflowState(defaultState);
    
    // Initialize monitoring if enabled
    if (defaultState.monitoring.enabled) {
      await this.startMonitoring(workflowId);
    }

    return defaultState;
  }

  /**
   * Transition workflow to new status
   */
  async transitionStatus(
    workflowId: string,
    newStatus: WorkflowLifecycleState['status'],
    reason: string,
    triggeredBy: 'user' | 'system' | 'automation' = 'user',
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const currentState = await this.getWorkflowState(workflowId);
      if (!currentState) {
        throw new Error('Workflow not found');
      }

      // Validate transition
      if (!this.isValidTransition(currentState.status, newStatus)) {
        throw new Error(`Invalid status transition from ${currentState.status} to ${newStatus}`);
      }

      // Record transition
      const transition: StatusTransition = {
        fromStatus: currentState.status,
        toStatus: newStatus,
        timestamp: new Date().toISOString(),
        reason,
        triggeredBy,
        metadata
      };

      // Update state
      const updatedState: WorkflowLifecycleState = {
        ...currentState,
        status: newStatus,
        metadata: {
          ...currentState.metadata,
          updatedAt: new Date().toISOString()
        }
      };

      // Handle special status transitions
      await this.handleStatusTransition(updatedState, transition);

      // Store updated state
      await this.storeWorkflowState(updatedState);

      // Record transition history
      await this.recordStatusTransition(workflowId, transition);

      // Emit events
      this.emitEvent(workflowId, 'status_changed', { transition, newState: updatedState });

      return true;

    } catch (error) {
      console.error('Status transition failed:', error);
      return false;
    }
  }

  /**
   * Record workflow execution
   */
  async recordExecution(execution: ExecutionRecord): Promise<void> {
    try {
      // Store execution record
      await this.storeExecution(execution);

      // Update workflow metrics
      await this.updateExecutionMetrics(execution);

      // Check health and performance
      await this.checkWorkflowHealth(execution.workflowId);

      // Emit execution event
      this.emitEvent(execution.workflowId, 'execution_recorded', { execution });

    } catch (error) {
      console.error('Failed to record execution:', error);
    }
  }

  /**
   * Get comprehensive workflow state
   */
  async getWorkflowState(workflowId: string): Promise<WorkflowLifecycleState | null> {
    try {
      const { data, error } = await this.supabase
        .from('workflow_lifecycle_states')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (error || !data) {
        return null;
      }

      return this.deserializeState(data);
    } catch (error) {
      console.error('Failed to get workflow state:', error);
      return null;
    }
  }

  /**
   * Get workflow execution history
   */
  async getExecutionHistory(
    workflowId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: ExecutionRecord['status'];
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<ExecutionRecord[]> {
    try {
      let query = this.supabase
        .from('workflow_executions')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('started_at', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.dateFrom) {
        query = query.gte('started_at', options.dateFrom);
      }

      if (options.dateTo) {
        query = query.lte('started_at', options.dateTo);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map(this.deserializeExecution);
    } catch (error) {
      console.error('Failed to get execution history:', error);
      return [];
    }
  }

  /**
   * Start monitoring for a workflow
   */
  async startMonitoring(workflowId: string): Promise<void> {
    const state = await this.getWorkflowState(workflowId);
    if (!state || !state.monitoring.enabled) {
      return;
    }

    // Clear existing monitoring
    await this.stopMonitoring(workflowId);

    // Set up health check interval
    const interval = setInterval(async () => {
      await this.performHealthCheck(workflowId);
    }, state.monitoring.healthCheckInterval * 60 * 1000);

    this.monitoringIntervals.set(workflowId, interval);

    console.log(`Started monitoring for workflow ${workflowId}`);
  }

  /**
   * Stop monitoring for a workflow
   */
  async stopMonitoring(workflowId: string): Promise<void> {
    const interval = this.monitoringIntervals.get(workflowId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(workflowId);
      console.log(`Stopped monitoring for workflow ${workflowId}`);
    }
  }

  /**
   * Perform health check on workflow
   */
  async performHealthCheck(workflowId: string): Promise<void> {
    try {
      const state = await this.getWorkflowState(workflowId);
      if (!state) return;

      const healthStatus = await this.checkWorkflowHealth(workflowId);
      
      if (healthStatus !== state.healthStatus) {
        await this.updateHealthStatus(workflowId, healthStatus);
        
        // Send alerts if health is degraded
        if (healthStatus === 'critical' || healthStatus === 'warning') {
          await this.sendHealthAlert(workflowId, healthStatus);
        }
      }

      // Update maintenance info
      await this.updateMaintenanceInfo(workflowId);

    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  /**
   * Get workflow analytics and insights
   */
  async getWorkflowAnalytics(
    workflowId: string,
    timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<{
    metrics: WorkflowMetrics;
    trends: {
      executionTrend: number; // percentage change
      performanceTrend: number;
      errorRateTrend: number;
      costTrend: number;
    };
    insights: string[];
    recommendations: MaintenanceRecommendation[];
  }> {
    const state = await this.getWorkflowState(workflowId);
    if (!state) {
      throw new Error('Workflow not found');
    }

    // Calculate trends based on time range
    const trends = await this.calculateTrends(workflowId, timeRange);
    
    // Generate insights
    const insights = await this.generateInsights(state, trends);
    
    // Get recommendations
    const recommendations = state.maintenance.recommendations;

    return {
      metrics: state.metrics,
      trends,
      insights,
      recommendations
    };
  }

  /**
   * Archive workflow
   */
  async archiveWorkflow(workflowId: string, reason: string): Promise<boolean> {
    try {
      // Stop monitoring
      await this.stopMonitoring(workflowId);

      // Transition to archived status
      await this.transitionStatus(workflowId, 'archived', reason, 'system');

      // Export data for backup
      await this.exportWorkflowData(workflowId);

      return true;
    } catch (error) {
      console.error('Failed to archive workflow:', error);
      return false;
    }
  }

  /**
   * Retire workflow permanently
   */
  async retireWorkflow(workflowId: string, reason: string): Promise<boolean> {
    try {
      // First archive if not already
      const state = await this.getWorkflowState(workflowId);
      if (state?.status !== 'archived') {
        await this.archiveWorkflow(workflowId, 'Preparing for retirement');
      }

      // Mark as retired
      await this.transitionStatus(workflowId, 'retired', reason, 'system', {
        retiredAt: new Date().toISOString()
      });

      // Clean up resources
      await this.cleanupWorkflowResources(workflowId);

      return true;
    } catch (error) {
      console.error('Failed to retire workflow:', error);
      return false;
    }
  }

  // Private helper methods
  private isValidTransition(from: string, to: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'draft': ['validated', 'archived'],
      'validated': ['deployed', 'draft', 'archived'],
      'deployed': ['active', 'failed', 'paused', 'archived'],
      'active': ['paused', 'failed', 'archived'],
      'paused': ['active', 'archived'],
      'failed': ['deployed', 'archived'],
      'archived': ['retired'],
      'retired': [] // Terminal state
    };

    return validTransitions[from]?.includes(to) || false;
  }

  private async handleStatusTransition(
    state: WorkflowLifecycleState,
    transition: StatusTransition
  ): Promise<void> {
    switch (transition.toStatus) {
      case 'deployed':
        if (state.monitoring.enabled) {
          await this.startMonitoring(state.id);
        }
        break;
      case 'archived':
      case 'retired':
        await this.stopMonitoring(state.id);
        break;
    }
  }

  private createDefaultMetrics(): WorkflowMetrics {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      lastExecutionTime: 0,
      throughput: 0,
      errorRate: 0,
      availabilityScore: 100,
      avgCpuUsage: 0,
      avgMemoryUsage: 0,
      avgNetworkUsage: 0,
      costPerExecution: 0,
      totalCost: 0,
      businessValue: 0,
      hourlyStats: [],
      dailyStats: [],
      weeklyStats: []
    };
  }

  private createDefaultMonitoringConfig(): MonitoringConfig {
    return {
      enabled: true,
      alertsEnabled: true,
      healthCheckInterval: 15, // 15 minutes
      metricsRetention: 30, // 30 days
      thresholds: {
        errorRate: 5, // 5%
        responseTime: 30000, // 30 seconds
        availabilityScore: 95, // 95%
        costLimit: 1000 // $10.00 per day
      },
      notifications: {
        email: true,
        slack: false
      },
      logLevel: 'info'
    };
  }

  private createDefaultMaintenanceInfo(): MaintenanceInfo {
    return {
      lastHealthCheck: new Date().toISOString(),
      nextHealthCheck: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      maintenanceMode: false,
      autoMaintenance: {
        enabled: true,
        autoRestart: false,
        autoScale: false,
        autoOptimize: true
      },
      issues: [],
      recommendations: []
    };
  }

  private async storeWorkflowState(state: WorkflowLifecycleState): Promise<void> {
    const serializedState = this.serializeState(state);
    
    const { error } = await this.supabase
      .from('workflow_lifecycle_states')
      .upsert(serializedState);

    if (error) {
      throw error;
    }
  }

  private async updateExecutionMetrics(execution: ExecutionRecord): Promise<void> {
    const state = await this.getWorkflowState(execution.workflowId);
    if (!state) return;

    const metrics = state.metrics;
    metrics.totalExecutions++;
    
    if (execution.status === 'success') {
      metrics.successfulExecutions++;
    } else if (execution.status === 'error') {
      metrics.failedExecutions++;
    }

    if (execution.duration) {
      metrics.averageExecutionTime = 
        (metrics.averageExecutionTime * (metrics.totalExecutions - 1) + execution.duration) / 
        metrics.totalExecutions;
      metrics.lastExecutionTime = execution.duration;
    }

    metrics.errorRate = (metrics.failedExecutions / metrics.totalExecutions) * 100;
    metrics.totalCost += execution.cost;

    await this.storeWorkflowState({ ...state, metrics });
  }

  private async checkWorkflowHealth(workflowId: string): Promise<WorkflowLifecycleState['healthStatus']> {
    const state = await this.getWorkflowState(workflowId);
    if (!state) return 'unknown';

    const metrics = state.metrics;
    const thresholds = state.monitoring.thresholds;

    // Check error rate
    if (metrics.errorRate > thresholds.errorRate * 2) {
      return 'critical';
    } else if (metrics.errorRate > thresholds.errorRate) {
      return 'warning';
    }

    // Check response time
    if (metrics.averageExecutionTime > thresholds.responseTime * 2) {
      return 'critical';
    } else if (metrics.averageExecutionTime > thresholds.responseTime) {
      return 'warning';
    }

    // Check availability
    if (metrics.availabilityScore < thresholds.availabilityScore - 10) {
      return 'critical';
    } else if (metrics.availabilityScore < thresholds.availabilityScore) {
      return 'warning';
    }

    return 'healthy';
  }

  private serializeState(state: WorkflowLifecycleState): any {
    return {
      id: state.id,
      status: state.status,
      version: state.version,
      deployment_status: state.deploymentStatus,
      health_status: state.healthStatus,
      metadata: JSON.stringify(state.metadata),
      metrics: JSON.stringify(state.metrics),
      monitoring: JSON.stringify(state.monitoring),
      maintenance: JSON.stringify(state.maintenance),
      updated_at: new Date().toISOString()
    };
  }

  private deserializeState(data: any): WorkflowLifecycleState {
    return {
      id: data.id,
      status: data.status,
      version: data.version,
      deploymentStatus: data.deployment_status,
      healthStatus: data.health_status,
      metadata: JSON.parse(data.metadata || '{}'),
      metrics: JSON.parse(data.metrics || '{}'),
      monitoring: JSON.parse(data.monitoring || '{}'),
      maintenance: JSON.parse(data.maintenance || '{}')
    };
  }

  private deserializeExecution(data: any): ExecutionRecord {
    return {
      id: data.id,
      workflowId: data.workflow_id,
      n8nExecutionId: data.n8n_execution_id,
      status: data.status,
      startedAt: data.started_at,
      finishedAt: data.finished_at,
      duration: data.duration,
      trigger: JSON.parse(data.trigger || '{}'),
      results: JSON.parse(data.results || '{}'),
      resources: JSON.parse(data.resources || '{}'),
      cost: data.cost || 0
    };
  }

  private emitEvent(workflowId: string, event: string, data: any): void {
    const listeners = this.eventListeners.get(`${workflowId}:${event}`) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }

  // Additional helper methods would be implemented here...
  private async recordStatusTransition(workflowId: string, transition: StatusTransition): Promise<void> {
    // Implementation for recording status transitions
  }

  private async updateHealthStatus(workflowId: string, healthStatus: string): Promise<void> {
    // Implementation for updating health status
  }

  private async sendHealthAlert(workflowId: string, healthStatus: string): Promise<void> {
    // Implementation for sending health alerts
  }

  private async updateMaintenanceInfo(workflowId: string): Promise<void> {
    // Implementation for updating maintenance information
  }

  private async calculateTrends(workflowId: string, timeRange: string): Promise<any> {
    // Implementation for calculating performance trends
    return {
      executionTrend: 0,
      performanceTrend: 0,
      errorRateTrend: 0,
      costTrend: 0
    };
  }

  private async generateInsights(state: WorkflowLifecycleState, trends: any): Promise<string[]> {
    // Implementation for generating workflow insights
    return ['No insights available'];
  }

  private async exportWorkflowData(workflowId: string): Promise<void> {
    // Implementation for exporting workflow data
  }

  private async cleanupWorkflowResources(workflowId: string): Promise<void> {
    // Implementation for cleaning up workflow resources
  }

  private async storeExecution(execution: ExecutionRecord): Promise<void> {
    const { error } = await this.supabase
      .from('workflow_executions')
      .insert({
        id: execution.id,
        workflow_id: execution.workflowId,
        n8n_execution_id: execution.n8nExecutionId,
        status: execution.status,
        started_at: execution.startedAt,
        finished_at: execution.finishedAt,
        duration: execution.duration,
        trigger: JSON.stringify(execution.trigger),
        results: JSON.stringify(execution.results),
        resources: JSON.stringify(execution.resources),
        cost: execution.cost
      });

    if (error) {
      throw error;
    }
  }
}

export default WorkflowLifecycleManager;