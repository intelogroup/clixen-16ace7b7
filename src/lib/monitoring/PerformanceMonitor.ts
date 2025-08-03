import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { queueManager } from '../queues/SupabaseQueueManager';
import { Database } from '../types/database';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PerformanceMetrics {
  timestamp: string;
  executionId: string;
  userId: string;
  metrics: {
    validation: {
      structure: number; // ms
      business: number; // ms
      compatibility: number; // ms
      total: number; // ms
    };
    queue: {
      waitTime: number; // ms
      processingTime: number; // ms
    };
    database: {
      queryTime: number; // ms
      connectionTime: number; // ms
    };
    memory: {
      heapUsed: number; // bytes
      heapTotal: number; // bytes
      external: number; // bytes
    };
    system: {
      cpuUsage: number; // percentage
      loadAverage: number[];
    };
  };
  metadata: {
    nodeCount: number;
    workflowComplexity: 'low' | 'medium' | 'high' | 'extreme';
    autoHealed: boolean;
    retryCount: number;
  };
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: {
    queueDepth: Record<string, number>;
    averageResponseTime: number;
    errorRate: number;
    throughput: number; // requests per minute
    uptime: number; // seconds
  };
  alerts: Alert[];
}

export interface Alert {
  id: string;
  type: 'queue_backlog' | 'high_error_rate' | 'slow_response' | 'resource_exhaustion';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
  metadata?: Record<string, any>;
}

export interface PerformanceBenchmark {
  timestamp: string;
  operation: string;
  duration: number;
  success: boolean;
  metadata: Record<string, any>;
}

// ============================================================================
// Performance Monitor Class
// ============================================================================

export class PerformanceMonitor {
  private supabase: SupabaseClient<Database>;
  private startTime: number;
  private metrics: Map<string, PerformanceBenchmark[]> = new Map();
  private alerts: Alert[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;

  // Performance thresholds
  private readonly THRESHOLDS = {
    validation: {
      structure: 10, // ms
      business: 50, // ms
      compatibility: 200, // ms
      total: 500 // ms
    },
    queue: {
      depth: 100, // max pending jobs
      waitTime: 5000 // ms
    },
    database: {
      queryTime: 100, // ms
      connectionTime: 1000 // ms
    },
    errorRate: 0.05, // 5%
    responseTime: 1000 // ms
  };

  constructor() {
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.startTime = Date.now();
    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring infrastructure
   */
  private async initializeMonitoring(): Promise<void> {
    // Create performance tables if they don't exist
    await this.createPerformanceTables();
    
    // Start health check interval
    this.startHealthChecks();
    
    // Set up automatic cleanup
    this.scheduleCleanup();
    
    console.log('📊 Performance monitoring initialized');
  }

  /**
   * Create performance monitoring tables
   */
  private async createPerformanceTables(): Promise<void> {
    const createTablesSQL = `
      -- Performance metrics table
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        validation_structure_ms INTEGER,
        validation_business_ms INTEGER,
        validation_compatibility_ms INTEGER,
        validation_total_ms INTEGER,
        queue_wait_ms INTEGER,
        queue_processing_ms INTEGER,
        database_query_ms INTEGER,
        database_connection_ms INTEGER,
        memory_heap_used BIGINT,
        memory_heap_total BIGINT,
        memory_external BIGINT,
        cpu_usage NUMERIC(5,2),
        load_average NUMERIC[],
        node_count INTEGER,
        workflow_complexity TEXT CHECK (workflow_complexity IN ('low', 'medium', 'high', 'extreme')),
        auto_healed BOOLEAN DEFAULT FALSE,
        retry_count INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}'
      );

      -- Performance alerts table
      CREATE TABLE IF NOT EXISTS performance_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        alert_type TEXT NOT NULL,
        severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        message TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        resolved BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}'
      );

      -- System health snapshots
      CREATE TABLE IF NOT EXISTS system_health_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        status TEXT CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
        queue_depths JSONB,
        average_response_time INTEGER,
        error_rate NUMERIC(5,4),
        throughput NUMERIC(10,2),
        uptime_seconds BIGINT,
        active_alerts INTEGER,
        metadata JSONB DEFAULT '{}'
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp 
        ON performance_metrics (timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_performance_metrics_user 
        ON performance_metrics (user_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_performance_alerts_unresolved 
        ON performance_alerts (resolved, timestamp DESC) WHERE NOT resolved;
      CREATE INDEX IF NOT EXISTS idx_system_health_timestamp 
        ON system_health_snapshots (timestamp DESC);
    `;

    const { error } = await this.supabase.rpc('exec_sql', { sql: createTablesSQL });
    if (error) {
      console.error('Failed to create performance tables:', error);
    }
  }

  /**
   * Record performance metrics
   */
  async recordMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('performance_metrics')
        .insert({
          execution_id: metrics.executionId,
          user_id: metrics.userId,
          timestamp: metrics.timestamp,
          validation_structure_ms: metrics.metrics.validation.structure,
          validation_business_ms: metrics.metrics.validation.business,
          validation_compatibility_ms: metrics.metrics.validation.compatibility,
          validation_total_ms: metrics.metrics.validation.total,
          queue_wait_ms: metrics.metrics.queue.waitTime,
          queue_processing_ms: metrics.metrics.queue.processingTime,
          database_query_ms: metrics.metrics.database.queryTime,
          database_connection_ms: metrics.metrics.database.connectionTime,
          memory_heap_used: metrics.metrics.memory.heapUsed,
          memory_heap_total: metrics.metrics.memory.heapTotal,
          memory_external: metrics.metrics.memory.external,
          cpu_usage: metrics.metrics.system.cpuUsage,
          load_average: metrics.metrics.system.loadAverage,
          node_count: metrics.metadata.nodeCount,
          workflow_complexity: metrics.metadata.workflowComplexity,
          auto_healed: metrics.metadata.autoHealed,
          retry_count: metrics.metadata.retryCount,
          metadata: metrics
        });

      if (error) {
        console.error('Failed to record performance metrics:', error);
      }

      // Check for performance alerts
      await this.checkPerformanceThresholds(metrics);

    } catch (error) {
      console.error('Error recording metrics:', error);
    }
  }

  /**
   * Start a performance benchmark
   */
  startBenchmark(operation: string, metadata: Record<string, any> = {}): string {
    const benchmarkId = crypto.randomUUID();
    const benchmark: PerformanceBenchmark = {
      timestamp: new Date().toISOString(),
      operation,
      duration: 0,
      success: false,
      metadata: {
        ...metadata,
        startTime: performance.now()
      }
    };

    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    this.metrics.get(operation)!.push(benchmark);
    
    return benchmarkId;
  }

  /**
   * End a performance benchmark
   */
  endBenchmark(operation: string, benchmarkId: string, success: boolean = true): number {
    const operationMetrics = this.metrics.get(operation);
    if (!operationMetrics) return 0;

    const benchmark = operationMetrics.find(b => 
      b.metadata.startTime && 
      b.timestamp === operationMetrics[operationMetrics.length - 1].timestamp
    );

    if (benchmark) {
      const duration = performance.now() - benchmark.metadata.startTime;
      benchmark.duration = duration;
      benchmark.success = success;
      
      return duration;
    }

    return 0;
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      // Get queue depths
      const queueDepths: Record<string, number> = {};
      const queues = ['workflow_validation', 'auto_heal', 'deployment_test', 'webhook_delivery'];
      
      for (const queueName of queues) {
        try {
          const stats = await queueManager.getQueueStats(queueName);
          queueDepths[queueName] = stats.depth;
        } catch (error) {
          queueDepths[queueName] = -1; // Error indicator
        }
      }

      // Calculate metrics from recent data
      const { data: recentMetrics } = await this.supabase
        .from('performance_metrics')
        .select('validation_total_ms, timestamp')
        .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .order('timestamp', { ascending: false });

      const { data: recentExecutions } = await this.supabase
        .from('workflow_executions')
        .select('status, created_at')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      // Calculate derived metrics
      const averageResponseTime = recentMetrics?.length ? 
        recentMetrics.reduce((sum, m) => sum + (m.validation_total_ms || 0), 0) / recentMetrics.length : 0;

      const errorRate = recentExecutions?.length ?
        recentExecutions.filter(e => e.status === 'failed').length / recentExecutions.length : 0;

      const throughput = recentExecutions?.length ? 
        (recentExecutions.length / 5) * 60 : 0; // requests per minute

      const uptime = Math.floor((Date.now() - this.startTime) / 1000);

      // Determine overall health status
      const status = this.determineHealthStatus(queueDepths, averageResponseTime, errorRate);

      // Get active alerts
      const { data: activeAlerts } = await this.supabase
        .from('performance_alerts')
        .select('*')
        .eq('resolved', false)
        .order('timestamp', { ascending: false });

      const alerts: Alert[] = (activeAlerts || []).map(alert => ({
        id: alert.id,
        type: alert.alert_type as any,
        severity: alert.severity as any,
        message: alert.message,
        timestamp: alert.timestamp,
        resolved: alert.resolved,
        metadata: alert.metadata
      }));

      const healthStatus: SystemHealth = {
        status,
        metrics: {
          queueDepth: queueDepths,
          averageResponseTime,
          errorRate,
          throughput,
          uptime
        },
        alerts
      };

      // Store health snapshot
      await this.storeHealthSnapshot(healthStatus);

      return healthStatus;

    } catch (error) {
      console.error('Failed to get system health:', error);
      return {
        status: 'unhealthy',
        metrics: {
          queueDepth: {},
          averageResponseTime: 0,
          errorRate: 1,
          throughput: 0,
          uptime: 0
        },
        alerts: []
      };
    }
  }

  /**
   * Get performance analytics
   */
  async getPerformanceAnalytics(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    validationTimes: Array<{ timestamp: string; average: number; p95: number; p99: number }>;
    throughput: Array<{ timestamp: string; count: number }>;
    errorRates: Array<{ timestamp: string; rate: number }>;
    topErrors: Array<{ error: string; count: number }>;
    queueHealth: Record<string, { averageDepth: number; maxDepth: number }>;
  }> {
    const interval = timeframe === 'hour' ? '1 hour' : 
                    timeframe === 'day' ? '1 day' : '7 days';
    
    const timeGroup = timeframe === 'hour' ? 'minute' : 
                     timeframe === 'day' ? 'hour' : 'day';

    try {
      // Validation performance over time
      const { data: validationData } = await this.supabase
        .rpc('get_validation_performance', {
          time_interval: interval,
          time_group: timeGroup
        });

      // Throughput analysis
      const { data: throughputData } = await this.supabase
        .rpc('get_throughput_analysis', {
          time_interval: interval,
          time_group: timeGroup
        });

      // Error rate analysis
      const { data: errorData } = await this.supabase
        .rpc('get_error_rate_analysis', {
          time_interval: interval
        });

      // Queue health
      const queueHealth = await this.getQueueHealthAnalytics(interval);

      return {
        validationTimes: validationData || [],
        throughput: throughputData || [],
        errorRates: errorData || [],
        topErrors: [], // Would implement based on error logging
        queueHealth
      };

    } catch (error) {
      console.error('Failed to get performance analytics:', error);
      return {
        validationTimes: [],
        throughput: [],
        errorRates: [],
        topErrors: [],
        queueHealth: {}
      };
    }
  }

  /**
   * Create performance alert
   */
  async createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('performance_alerts')
        .insert({
          alert_type: alert.type,
          severity: alert.severity,
          message: alert.message,
          metadata: alert.metadata || {}
        });

      if (error) {
        console.error('Failed to create alert:', error);
      } else {
        console.warn(`🚨 ${alert.severity.toUpperCase()} ALERT: ${alert.message}`);
        
        // Add to in-memory alerts for immediate access
        this.alerts.push({
          ...alert,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('performance_alerts')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) {
        console.error('Failed to resolve alert:', error);
      } else {
        // Remove from in-memory alerts
        this.alerts = this.alerts.filter(a => a.id !== alertId);
        console.log(`✅ Alert ${alertId} resolved`);
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async checkPerformanceThresholds(metrics: PerformanceMetrics): Promise<void> {
    const validation = metrics.metrics.validation;
    const queue = metrics.metrics.queue;
    const database = metrics.metrics.database;

    // Check validation performance
    if (validation.total > this.THRESHOLDS.validation.total) {
      await this.createAlert({
        type: 'slow_response',
        severity: validation.total > this.THRESHOLDS.validation.total * 2 ? 'high' : 'medium',
        message: `Slow validation: ${validation.total}ms (threshold: ${this.THRESHOLDS.validation.total}ms)`,
        metadata: { executionId: metrics.executionId, validationTime: validation.total }
      });
    }

    // Check database performance
    if (database.queryTime > this.THRESHOLDS.database.queryTime) {
      await this.createAlert({
        type: 'slow_response',
        severity: 'medium',
        message: `Slow database query: ${database.queryTime}ms`,
        metadata: { executionId: metrics.executionId, queryTime: database.queryTime }
      });
    }

    // Check memory usage
    const memoryUsagePercent = metrics.metrics.memory.heapUsed / metrics.metrics.memory.heapTotal;
    if (memoryUsagePercent > 0.8) {
      await this.createAlert({
        type: 'resource_exhaustion',
        severity: memoryUsagePercent > 0.9 ? 'critical' : 'high',
        message: `High memory usage: ${(memoryUsagePercent * 100).toFixed(1)}%`,
        metadata: { executionId: metrics.executionId, memoryUsage: memoryUsagePercent }
      });
    }
  }

  private determineHealthStatus(
    queueDepths: Record<string, number>,
    averageResponseTime: number,
    errorRate: number
  ): SystemHealth['status'] {
    // Check for critical issues
    const maxQueueDepth = Math.max(...Object.values(queueDepths).filter(d => d >= 0));
    
    if (errorRate > 0.1 || averageResponseTime > 2000 || maxQueueDepth > 500) {
      return 'unhealthy';
    }
    
    if (errorRate > 0.05 || averageResponseTime > 1000 || maxQueueDepth > 100) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private async storeHealthSnapshot(health: SystemHealth): Promise<void> {
    try {
      await this.supabase
        .from('system_health_snapshots')
        .insert({
          status: health.status,
          queue_depths: health.metrics.queueDepth,
          average_response_time: health.metrics.averageResponseTime,
          error_rate: health.metrics.errorRate,
          throughput: health.metrics.throughput,
          uptime_seconds: health.metrics.uptime,
          active_alerts: health.alerts.length,
          metadata: health
        });
    } catch (error) {
      console.error('Failed to store health snapshot:', error);
    }
  }

  private async getQueueHealthAnalytics(interval: string): Promise<Record<string, { averageDepth: number; maxDepth: number }>> {
    // This would analyze queue depths over time
    // Placeholder implementation
    return {
      workflow_validation: { averageDepth: 5, maxDepth: 25 },
      auto_heal: { averageDepth: 2, maxDepth: 10 },
      deployment_test: { averageDepth: 3, maxDepth: 15 }
    };
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        
        // Check for queue backlogs
        for (const [queueName, depth] of Object.entries(health.metrics.queueDepth)) {
          if (depth > this.THRESHOLDS.queue.depth) {
            await this.createAlert({
              type: 'queue_backlog',
              severity: depth > this.THRESHOLDS.queue.depth * 2 ? 'high' : 'medium',
              message: `Queue backlog: ${queueName} has ${depth} pending jobs`,
              metadata: { queueName, depth }
            });
          }
        }

        // Check error rate
        if (health.metrics.errorRate > this.THRESHOLDS.errorRate) {
          await this.createAlert({
            type: 'high_error_rate',
            severity: health.metrics.errorRate > 0.1 ? 'critical' : 'high',
            message: `High error rate: ${(health.metrics.errorRate * 100).toFixed(2)}%`,
            metadata: { errorRate: health.metrics.errorRate }
          });
        }

      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 60000); // Every minute

    console.log('🏥 Health checks started (60s interval)');
  }

  private scheduleCleanup(): void {
    // Clean up old metrics and alerts periodically
    setInterval(async () => {
      try {
        // Clean up metrics older than 30 days
        await this.supabase
          .from('performance_metrics')
          .delete()
          .lt('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        // Clean up resolved alerts older than 7 days
        await this.supabase
          .from('performance_alerts')
          .delete()
          .eq('resolved', true)
          .lt('resolved_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        // Clean up health snapshots older than 7 days
        await this.supabase
          .from('system_health_snapshots')
          .delete()
          .lt('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        console.log('🧹 Performance data cleanup completed');
      } catch (error) {
        console.error('Cleanup failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Get system resource usage
   */
  getSystemMetrics(): {
    memory: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    uptime: number;
  } {
    return {
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime()
    };
  }

  /**
   * Shutdown monitoring
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    console.log('📊 Performance monitoring shutdown');
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();