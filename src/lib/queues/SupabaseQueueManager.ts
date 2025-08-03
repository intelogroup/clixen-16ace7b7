import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

export interface QueueJob {
  msg_id: string;
  message: any;
  enqueued_at: string;
  vt: string;
  read_ct: number;
}

export interface QueueConfig {
  defaultVisibilityTimeout: number;
  maxRetries: number;
  batchSize: number;
  processingInterval: number;
}

export class SupabaseQueueManager {
  private supabase: SupabaseClient<Database>;
  private config: QueueConfig;
  private processingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(supabaseUrl: string, supabaseKey: string, config?: Partial<QueueConfig>) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    this.config = {
      defaultVisibilityTimeout: 30,
      maxRetries: 3,
      batchSize: 10,
      processingInterval: 1000,
      ...config
    };
  }

  /**
   * Initialize queue infrastructure
   */
  async initialize() {
    try {
      // Enable required extensions
      await this.enableExtensions();
      
      // Create predefined queues
      const queues = [
        'workflow_validation',
        'auto_heal',
        'deployment_test',
        'webhook_delivery',
        'analytics_processing'
      ];

      for (const queueName of queues) {
        await this.createQueue(queueName);
      }

      console.log('✅ Supabase Queue Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize queue manager:', error);
      throw error;
    }
  }

  /**
   * Enable required PostgreSQL extensions
   */
  private async enableExtensions() {
    const extensions = ['pgmq', 'pg_cron', 'pg_net'];
    
    for (const extension of extensions) {
      const { error } = await this.supabase.rpc('enable_extension', {
        extension_name: extension
      });
      
      if (error && !error.message.includes('already exists')) {
        throw new Error(`Failed to enable ${extension}: ${error.message}`);
      }
    }
  }

  /**
   * Create a new queue
   */
  async createQueue(queueName: string): Promise<void> {
    const { data, error } = await this.supabase.rpc('pgmq_create_queue', {
      queue_name: queueName
    });

    if (error && !error.message.includes('already exists')) {
      throw new Error(`Failed to create queue ${queueName}: ${error.message}`);
    }

    console.log(`📦 Queue '${queueName}' ready`);
  }

  /**
   * Add job to queue with advanced options
   */
  async addJob(
    queueName: string, 
    message: any, 
    options: {
      delay?: number;
      priority?: number;
      maxRetries?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const jobPayload = {
      data: message,
      metadata: {
        priority: options.priority || 0,
        maxRetries: options.maxRetries || this.config.maxRetries,
        createdAt: new Date().toISOString(),
        ...options.metadata
      }
    };

    const { data, error } = await this.supabase.rpc('pgmq_send_with_delay', {
      queue_name: queueName,
      msg: jobPayload,
      delay_seconds: options.delay || 0
    });

    if (error) {
      throw new Error(`Failed to add job to queue ${queueName}: ${error.message}`);
    }

    const jobId = data?.[0]?.msg_id || 'unknown';
    console.log(`📝 Job ${jobId} added to queue '${queueName}'`);
    return jobId;
  }

  /**
   * Process jobs with automatic retry and error handling
   */
  async processJobs<T = any>(
    queueName: string,
    processor: (job: T, jobId: string) => Promise<void>,
    options: {
      visibilityTimeout?: number;
      batchSize?: number;
      autoAck?: boolean;
    } = {}
  ): Promise<number> {
    const visibilityTimeout = options.visibilityTimeout || this.config.defaultVisibilityTimeout;
    const batchSize = options.batchSize || this.config.batchSize;
    const autoAck = options.autoAck ?? true;

    const { data: jobs, error } = await this.supabase.rpc('pgmq_read_batch', {
      queue_name: queueName,
      vt_seconds: visibilityTimeout,
      qty: batchSize
    });

    if (error) {
      throw new Error(`Failed to read jobs from queue ${queueName}: ${error.message}`);
    }

    if (!jobs || jobs.length === 0) {
      return 0;
    }

    let processedCount = 0;

    for (const job of jobs) {
      try {
        const jobData = job.message?.data || job.message;
        const metadata = job.message?.metadata || {};

        // Process the job
        await processor(jobData, job.msg_id);

        // Auto-acknowledge successful job
        if (autoAck) {
          await this.ackJob(queueName, job.msg_id);
        }

        processedCount++;
        console.log(`✅ Job ${job.msg_id} processed successfully`);

      } catch (error) {
        console.error(`❌ Job ${job.msg_id} failed:`, error);
        
        // Handle job failure with retry logic
        await this.handleJobFailure(queueName, job, error as Error);
      }
    }

    return processedCount;
  }

  /**
   * Acknowledge successful job completion
   */
  async ackJob(queueName: string, jobId: string): Promise<void> {
    const { error } = await this.supabase.rpc('pgmq_delete', {
      queue_name: queueName,
      msg_id: parseInt(jobId)
    });

    if (error) {
      throw new Error(`Failed to acknowledge job ${jobId}: ${error.message}`);
    }
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleJobFailure(queueName: string, job: QueueJob, error: Error): Promise<void> {
    const metadata = job.message?.metadata || {};
    const currentRetries = metadata.retryCount || 0;
    const maxRetries = metadata.maxRetries || this.config.maxRetries;

    if (currentRetries < maxRetries) {
      // Retry the job with exponential backoff
      const delay = Math.pow(2, currentRetries) * 1000; // 1s, 2s, 4s, 8s...
      
      const retryPayload = {
        ...job.message,
        metadata: {
          ...metadata,
          retryCount: currentRetries + 1,
          lastError: error.message,
          retryAt: new Date(Date.now() + delay).toISOString()
        }
      };

      await this.addJob(queueName, retryPayload.data, {
        delay: delay / 1000,
        metadata: retryPayload.metadata
      });

      console.log(`🔄 Job ${job.msg_id} scheduled for retry ${currentRetries + 1}/${maxRetries} in ${delay}ms`);
    } else {
      // Move to dead letter queue
      await this.moveToDeadLetterQueue(queueName, job, error);
    }

    // Always remove failed job from main queue
    await this.ackJob(queueName, job.msg_id);
  }

  /**
   * Move failed job to dead letter queue
   */
  private async moveToDeadLetterQueue(queueName: string, job: QueueJob, error: Error): Promise<void> {
    const dlqName = `${queueName}_dlq`;
    
    // Ensure DLQ exists
    await this.createQueue(dlqName);

    const dlqPayload = {
      originalQueue: queueName,
      originalJobId: job.msg_id,
      failedAt: new Date().toISOString(),
      error: error.message,
      data: job.message
    };

    await this.addJob(dlqName, dlqPayload);
    console.log(`💀 Job ${job.msg_id} moved to dead letter queue: ${dlqName}`);
  }

  /**
   * Start automatic job processing
   */
  startProcessor<T = any>(
    queueName: string,
    processor: (job: T, jobId: string) => Promise<void>,
    options: {
      visibilityTimeout?: number;
      batchSize?: number;
      interval?: number;
    } = {}
  ): void {
    const interval = options.interval || this.config.processingInterval;

    if (this.processingIntervals.has(queueName)) {
      console.warn(`⚠️ Processor for queue '${queueName}' already running`);
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const processed = await this.processJobs(queueName, processor, options);
        if (processed > 0) {
          console.log(`🔄 Processed ${processed} jobs from queue '${queueName}'`);
        }
      } catch (error) {
        console.error(`❌ Error processing queue '${queueName}':`, error);
      }
    }, interval);

    this.processingIntervals.set(queueName, intervalId);
    console.log(`🚀 Started processor for queue '${queueName}' (interval: ${interval}ms)`);
  }

  /**
   * Stop automatic job processing
   */
  stopProcessor(queueName: string): void {
    const intervalId = this.processingIntervals.get(queueName);
    if (intervalId) {
      clearInterval(intervalId);
      this.processingIntervals.delete(queueName);
      console.log(`⏹️ Stopped processor for queue '${queueName}'`);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<{
    depth: number;
    oldestJobAge: number;
    processing: number;
  }> {
    const { data, error } = await this.supabase.rpc('pgmq_metrics', {
      queue_name: queueName
    });

    if (error) {
      throw new Error(`Failed to get queue stats: ${error.message}`);
    }

    return {
      depth: data?.queue_length || 0,
      oldestJobAge: data?.oldest_msg_age_sec || 0,
      processing: data?.total_messages || 0
    };
  }

  /**
   * Purge all jobs from queue
   */
  async purgeQueue(queueName: string): Promise<void> {
    const { error } = await this.supabase.rpc('pgmq_purge_queue', {
      queue_name: queueName
    });

    if (error) {
      throw new Error(`Failed to purge queue ${queueName}: ${error.message}`);
    }

    console.log(`🧹 Queue '${queueName}' purged`);
  }

  /**
   * Clean shutdown
   */
  async shutdown(): Promise<void> {
    // Stop all processors
    for (const queueName of this.processingIntervals.keys()) {
      this.stopProcessor(queueName);
    }

    console.log('🔌 Supabase Queue Manager shutdown complete');
  }
}

// Export singleton instance
export const queueManager = new SupabaseQueueManager(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);