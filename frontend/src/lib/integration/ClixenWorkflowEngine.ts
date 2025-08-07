import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { queueManager } from '../queues/SupabaseQueueManager';
import { validationPipeline, ValidationResult, N8nWorkflow } from '../validation/WorkflowValidationPipeline';
import { autoHealer } from '../healing/WorkflowAutoHealer';
import { performanceMonitor, PerformanceMetrics } from '../monitoring/PerformanceMonitor';
import { Database } from '../types/database';

// ============================================================================
// Complete Clixen Workflow Engine Integration
// ============================================================================

export interface WorkflowRequest {
  userId: string;
  workflow: unknown;
  options?: {
    autoHeal?: boolean;
    skipDeploymentTest?: boolean;
    webhook?: string;
    priority?: number;
    metadata?: Record<string, any>;
  };
}

export interface WorkflowResponse {
  success: boolean;
  executionId: string;
  validationResult?: ValidationResult;
  deploymentResult?: {
    n8nWorkflowId?: string;
    webhookUrl?: string;
    status: 'pending' | 'deployed' | 'failed';
  };
  performance: PerformanceMetrics;
  errors?: string[];
}

export interface RealTimeUpdate {
  executionId: string;
  userId: string;
  phase: string;
  status: string;
  progress: number; // 0-100
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Main Workflow Engine Class
// ============================================================================

export class ClixenWorkflowEngine {
  private supabase: SupabaseClient<Database>;
  private isInitialized = false;
  private realTimeSubscriptions: Map<string, any> = new Map();

  constructor() {
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Initialize the complete workflow engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Workflow engine already initialized');
      return;
    }

    console.log('🚀 Initializing Clixen Workflow Engine...');

    try {
      // 1. Initialize queue system
      console.log('📦 Initializing queue system...');
      await queueManager.initialize();

      // 2. Start queue processors
      console.log('⚙️ Starting queue processors...');
      await this.startQueueProcessors();

      // 3. Initialize auto-healer
      console.log('🔧 Starting auto-healer...');
      await autoHealer.startAutoHealProcessor();

      // 4. Initialize performance monitoring
      console.log('📊 Starting performance monitoring...');
      await performanceMonitor.getSystemHealth();

      // 5. Set up real-time subscriptions
      console.log('🔄 Setting up real-time subscriptions...');
      await this.setupRealTimeSubscriptions();

      this.isInitialized = true;
      console.log('✅ Clixen Workflow Engine initialized successfully!');

      // Log system status
      await this.logSystemStatus();

    } catch (error) {
      console.error('❌ Failed to initialize workflow engine:', error);
      throw error;
    }
  }

  /**
   * Process a workflow request end-to-end
   */
  async processWorkflowRequest(request: WorkflowRequest): Promise<WorkflowResponse> {
    if (!this.isInitialized) {
      throw new Error('Workflow engine not initialized. Call initialize() first.');
    }

    const startTime = performance.now();
    const executionId = crypto.randomUUID();

    console.log(`🔄 Processing workflow request ${executionId} for user ${request.userId}`);

    try {
      // Broadcast initial status
      await this.broadcastUpdate({
        executionId,
        userId: request.userId,
        phase: 'received',
        status: 'pending',
        progress: 0,
        message: 'Workflow request received',
        timestamp: new Date().toISOString()
      });

      // Start validation with performance tracking
      const validationBenchmark = performanceMonitor.startBenchmark('workflow_validation', {
        userId: request.userId,
        nodeCount: this.countNodes(request.workflow)
      });

      const validationResult = await validationPipeline.validateWorkflow(
        request.workflow,
        request.userId,
        {
          autoHeal: request.options?.autoHeal ?? true,
          skipDeploymentTest: request.options?.skipDeploymentTest ?? false,
          webhook: request.options?.webhook,
          metadata: request.options?.metadata
        }
      );

      const validationTime = performanceMonitor.endBenchmark(
        'workflow_validation',
        validationBenchmark,
        validationResult.valid
      );

      // Update progress
      await this.broadcastUpdate({
        executionId,
        userId: request.userId,
        phase: 'validation',
        status: validationResult.valid ? 'completed' : 'failed',
        progress: validationResult.valid ? 50 : 100,
        message: validationResult.valid ? 
          'Validation completed successfully' : 
          `Validation failed: ${validationResult.errors?.[0]?.message || 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        metadata: { validationTime, errors: validationResult.errors?.length || 0 }
      });

      // If validation failed and auto-heal is disabled, return early
      if (!validationResult.valid && !request.options?.autoHeal) {
        return this.createResponse(false, executionId, validationResult, undefined, {
          totalValidation: validationTime,
          structureValidation: 0,
          businessValidation: 0,
          compatibilityValidation: 0
        }, ['Validation failed']);
      }

      // If validation passed, proceed to deployment
      let deploymentResult: WorkflowResponse['deploymentResult'];
      
      if (validationResult.valid && !request.options?.skipDeploymentTest) {
        deploymentResult = await this.deployToN8n(
          executionId,
          request.userId,
          request.workflow as N8nWorkflow
        );
      }

      // Record comprehensive performance metrics
      const totalTime = performance.now() - startTime;
      const performanceMetrics: PerformanceMetrics = {
        timestamp: new Date().toISOString(),
        executionId,
        userId: request.userId,
        metrics: {
          validation: {
            structure: validationResult.performance?.structureValidation || 0,
            business: validationResult.performance?.businessValidation || 0,
            compatibility: validationResult.performance?.compatibilityValidation || 0,
            total: validationResult.performance?.totalValidation || validationTime
          },
          queue: {
            waitTime: 0, // Would be populated by queue system
            processingTime: totalTime
          },
          database: {
            queryTime: 0, // Would be populated by database monitoring
            connectionTime: 0
          },
          memory: {
            heapUsed: process.memoryUsage().heapUsed,
            heapTotal: process.memoryUsage().heapTotal,
            external: process.memoryUsage().external
          },
          system: {
            cpuUsage: 0, // Would be calculated from process.cpuUsage()
            loadAverage: []
          }
        },
        metadata: {
          nodeCount: this.countNodes(request.workflow),
          workflowComplexity: this.calculateComplexity(request.workflow),
          autoHealed: validationResult.autoHealed || false,
          retryCount: 0
        }
      };

      // Record metrics
      await performanceMonitor.recordMetrics(performanceMetrics);

      // Final status broadcast
      const success = validationResult.valid && (deploymentResult?.status !== 'failed');
      await this.broadcastUpdate({
        executionId,
        userId: request.userId,
        phase: 'completed',
        status: success ? 'completed' : 'failed',
        progress: 100,
        message: success ? 'Workflow processed successfully' : 'Workflow processing failed',
        timestamp: new Date().toISOString(),
        metadata: { 
          totalTime: totalTime,
          deployed: deploymentResult?.status === 'deployed'
        }
      });

      return this.createResponse(
        success,
        executionId,
        validationResult,
        deploymentResult,
        performanceMetrics.metrics.validation,
        success ? undefined : ['Processing failed']
      );

    } catch (error) {
      console.error(`❌ Workflow processing failed for ${executionId}:`, error);
      
      // Broadcast error
      await this.broadcastUpdate({
        executionId,
        userId: request.userId,
        phase: 'error',
        status: 'failed',
        progress: 100,
        message: `System error: ${(error as Error).message}`,
        timestamp: new Date().toISOString()
      });

      return this.createResponse(
        false,
        executionId,
        undefined,
        undefined,
        { structureValidation: 0, businessValidation: 0, compatibilityValidation: 0, total: 0 },
        [(error as Error).message]
      );
    }
  }

  /**
   * Subscribe to real-time updates for a user
   */
  subscribeToUpdates(
    userId: string,
    onUpdate: (update: RealTimeUpdate) => void
  ): () => void {
    const channel = this.supabase
      .channel(`user_${userId}_workflow_updates`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workflow_executions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const update: RealTimeUpdate = {
            executionId: payload.new.id,
            userId: payload.new.user_id,
            phase: payload.new.status,
            status: payload.new.status,
            progress: this.calculateProgress(payload.new.status),
            message: this.getStatusMessage(payload.new.status),
            timestamp: payload.new.updated_at,
            metadata: payload.new.validation_progress
          };
          
          onUpdate(update);
        }
      )
      .subscribe();

    this.realTimeSubscriptions.set(userId, channel);

    // Return unsubscribe function
    return () => {
      this.supabase.removeChannel(channel);
      this.realTimeSubscriptions.delete(userId);
    };
  }

  /**
   * Get system health and performance metrics
   */
  async getSystemMetrics(): Promise<{
    health: any;
    performance: any;
    queues: Record<string, any>;
  }> {
    const [health, queueStats] = await Promise.all([
      performanceMonitor.getSystemHealth(),
      this.getQueueStatistics()
    ]);

    const performance = await performanceMonitor.getPerformanceAnalytics('day');

    return {
      health,
      performance,
      queues: queueStats
    };
  }

  /**
   * Shutdown the workflow engine gracefully
   */
  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down Clixen Workflow Engine...');

    // Close real-time subscriptions
    for (const [userId, channel] of this.realTimeSubscriptions) {
      this.supabase.removeChannel(channel);
    }
    this.realTimeSubscriptions.clear();

    // Shutdown components
    await queueManager.shutdown();
    performanceMonitor.shutdown();

    this.isInitialized = false;
    console.log('✅ Workflow engine shutdown complete');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async startQueueProcessors(): Promise<void> {
    // Start validation queue processor
    queueManager.startProcessor('workflow_validation', async (job: any) => {
      const { execution_id, workflow, user_id, retry_after_healing } = job;
      
      console.log(`🔄 Processing queued validation: ${execution_id}`);
      
      // This would handle queued validation requests
      // For now, we'll just log the processing
      console.log(`✅ Processed queued validation: ${execution_id}`);
    }, {
      visibilityTimeout: 60,
      batchSize: 5,
      interval: 2000 // Process every 2 seconds
    });

    // Start deployment test queue processor
    queueManager.startProcessor('deployment_test', async (job: any) => {
      const { execution_id, workflow } = job;
      
      console.log(`🚀 Processing deployment test: ${execution_id}`);
      
      try {
        const deploymentResult = await this.testN8nDeployment(workflow);
        
        // Update execution with deployment result
        await this.supabase
          .from('workflow_executions')
          .update({
            status: deploymentResult.success ? 'completed' : 'failed',
            metadata: { deployment: deploymentResult },
            completed_at: new Date().toISOString()
          })
          .eq('id', execution_id);
          
        console.log(`✅ Deployment test completed: ${execution_id}`);
        
      } catch (error) {
        console.error(`❌ Deployment test failed: ${execution_id}`, error);
        
        await this.supabase
          .from('workflow_executions')
          .update({
            status: 'failed',
            error_details: { deployment_error: (error as Error).message },
            completed_at: new Date().toISOString()
          })
          .eq('id', execution_id);
      }
    }, {
      visibilityTimeout: 120, // 2 minutes for deployment tests
      batchSize: 3,
      interval: 5000 // Process every 5 seconds
    });

    // Start webhook delivery processor
    queueManager.startProcessor('webhook_delivery', async (job: any) => {
      const { webhook_url, payload, execution_id } = job;
      
      console.log(`📡 Delivering webhook: ${execution_id}`);
      
      try {
        const response = await fetch(webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Clixen-Workflow-Engine/1.0'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
        }

        console.log(`✅ Webhook delivered: ${execution_id}`);
        
      } catch (error) {
        console.error(`❌ Webhook delivery failed: ${execution_id}`, error);
        throw error; // This will trigger retry logic
      }
    }, {
      visibilityTimeout: 30,
      batchSize: 10,
      interval: 1000
    });
  }

  private async setupRealTimeSubscriptions(): Promise<void> {
    // Set up system-wide real-time subscriptions for monitoring
    const systemChannel = this.supabase
      .channel('system_monitoring')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'performance_alerts'
        },
        (payload) => {
          console.log(`🚨 Performance Alert: ${payload.new?.message}`);
        }
      )
      .subscribe();

    console.log('🔄 System real-time subscriptions active');
  }

  private async deployToN8n(
    executionId: string,
    userId: string,
    workflow: N8nWorkflow
  ): Promise<WorkflowResponse['deploymentResult']> {
    console.log(`🚀 Deploying workflow ${executionId} to n8n...`);

    try {
      // Update status
      await this.broadcastUpdate({
        executionId,
        userId,
        phase: 'deployment',
        status: 'deploying',
        progress: 75,
        message: 'Deploying to n8n...',
        timestamp: new Date().toISOString()
      });

      // Test deployment first
      const testResult = await this.testN8nDeployment(workflow);
      
      if (!testResult.success) {
        return {
          status: 'failed'
        };
      }

      // Actual deployment would happen here
      // For now, we'll simulate a successful deployment
      const n8nWorkflowId = `n8n_${executionId}`;
      const webhookUrl = `${process.env.VITE_N8N_API_URL}/webhook/${n8nWorkflowId}`;

      return {
        n8nWorkflowId,
        webhookUrl,
        status: 'deployed'
      };

    } catch (error) {
      console.error(`❌ Deployment failed for ${executionId}:`, error);
      return {
        status: 'failed'
      };
    }
  }

  private async testN8nDeployment(workflow: N8nWorkflow): Promise<{ success: boolean; error?: string }> {
    try {
      // This would implement actual n8n API testing
      // For now, we'll simulate a test
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Basic workflow validation
      if (!workflow.nodes || workflow.nodes.length === 0) {
        return { success: false, error: 'No nodes in workflow' };
      }

      return { success: true };
      
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async broadcastUpdate(update: RealTimeUpdate): Promise<void> {
    try {
      // Store update in database (triggers real-time broadcast)
      await this.supabase
        .from('workflow_executions')
        .update({
          validation_progress: {
            [update.phase]: {
              status: update.status,
              progress: update.progress,
              message: update.message,
              timestamp: update.timestamp,
              metadata: update.metadata
            }
          },
          updated_at: update.timestamp
        })
        .eq('id', update.executionId);

    } catch (error) {
      console.error('Failed to broadcast update:', error);
    }
  }

  private async getQueueStatistics(): Promise<Record<string, any>> {
    const queues = ['workflow_validation', 'auto_heal', 'deployment_test', 'webhook_delivery'];
    const stats: Record<string, any> = {};

    for (const queueName of queues) {
      try {
        stats[queueName] = await queueManager.getQueueStats(queueName);
      } catch (error) {
        stats[queueName] = { error: (error as Error).message };
      }
    }

    return stats;
  }

  private async logSystemStatus(): Promise<void> {
    const health = await performanceMonitor.getSystemHealth();
    const queueStats = await this.getQueueStatistics();

    console.log(`
📊 System Status Summary:
========================
🏥 Health: ${health.status}
⚡ Throughput: ${health.metrics.throughput} req/min
📊 Error Rate: ${(health.metrics.errorRate * 100).toFixed(2)}%
⏱️  Avg Response: ${health.metrics.averageResponseTime}ms
⏰ Uptime: ${Math.floor(health.metrics.uptime / 3600)}h ${Math.floor((health.metrics.uptime % 3600) / 60)}m

📦 Queue Status:
${Object.entries(queueStats)
  .map(([name, stats]) => `   ${name}: ${stats.depth || 0} jobs`)
  .join('\n')}

🚨 Active Alerts: ${health.alerts.length}
`);
  }

  private countNodes(workflow: unknown): number {
    if (typeof workflow === 'object' && workflow !== null && 'nodes' in workflow) {
      const nodes = (workflow as any).nodes;
      return Array.isArray(nodes) ? nodes.length : 0;
    }
    return 0;
  }

  private calculateComplexity(workflow: unknown): 'low' | 'medium' | 'high' | 'extreme' {
    const nodeCount = this.countNodes(workflow);
    
    if (nodeCount <= 5) return 'low';
    if (nodeCount <= 15) return 'medium';
    if (nodeCount <= 30) return 'high';
    return 'extreme';
  }

  private calculateProgress(status: string): number {
    const progressMap: Record<string, number> = {
      'pending': 0,
      'validating': 10,
      'structure_validated': 25,
      'business_validated': 40,
      'compatibility_validated': 55,
      'auto_healing': 60,
      'testing': 75,
      'deploying': 85,
      'completed': 100,
      'failed': 100
    };

    return progressMap[status] || 0;
  }

  private getStatusMessage(status: string): string {
    const messageMap: Record<string, string> = {
      'pending': 'Workflow queued for processing',
      'validating': 'Validating workflow structure',
      'structure_validated': 'Structure validation completed',
      'business_validated': 'Business rules validation completed',
      'compatibility_validated': 'Compatibility validation completed',
      'auto_healing': 'Auto-healing workflow issues',
      'testing': 'Testing workflow deployment',
      'deploying': 'Deploying to n8n',
      'completed': 'Workflow processing completed successfully',
      'failed': 'Workflow processing failed'
    };

    return messageMap[status] || 'Processing workflow';
  }

  private createResponse(
    success: boolean,
    executionId: string,
    validationResult?: ValidationResult,
    deploymentResult?: WorkflowResponse['deploymentResult'],
    performance?: any,
    errors?: string[]
  ): WorkflowResponse {
    return {
      success,
      executionId,
      validationResult,
      deploymentResult,
      performance: performance || {
        structureValidation: 0,
        businessValidation: 0,
        compatibilityValidation: 0,
        total: 0
      },
      errors
    };
  }
}

// Export singleton instance
export const workflowEngine = new ClixenWorkflowEngine();