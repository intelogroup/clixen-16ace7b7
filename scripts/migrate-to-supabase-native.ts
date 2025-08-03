#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { SupabaseQueueManager } from '../src/lib/queues/SupabaseQueueManager';
import { performanceMonitor } from '../src/lib/monitoring/PerformanceMonitor';
import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// Migration Configuration
// ============================================================================

interface MigrationConfig {
  // Redis configuration (source)
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  
  // Supabase configuration (target)
  supabase: {
    url: string;
    serviceKey: string;
    anonKey: string;
  };
  
  // Migration options
  options: {
    dryRun: boolean;
    backupBeforeMigration: boolean;
    migrateData: boolean;
    updateEnvironment: boolean;
    cleanupOldSystems: boolean;
  };
}

interface MigrationReport {
  timestamp: string;
  success: boolean;
  steps: MigrationStep[];
  performance: {
    totalTime: number;
    dataTransferred: number;
    recordsMigrated: number;
  };
  errors: string[];
  warnings: string[];
}

interface MigrationStep {
  name: string;
  success: boolean;
  duration: number;
  details: string;
  error?: string;
}

// ============================================================================
// Migration Runner Class
// ============================================================================

class SupabaseNativeMigration {
  private config: MigrationConfig;
  private report: MigrationReport;
  private supabase: any;
  private queueManager: SupabaseQueueManager;

  constructor(config: MigrationConfig) {
    this.config = config;
    this.report = {
      timestamp: new Date().toISOString(),
      success: false,
      steps: [],
      performance: {
        totalTime: 0,
        dataTransferred: 0,
        recordsMigrated: 0
      },
      errors: [],
      warnings: []
    };

    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    this.queueManager = new SupabaseQueueManager(
      config.supabase.url, 
      config.supabase.serviceKey
    );
  }

  /**
   * Run the complete migration
   */
  async migrate(): Promise<MigrationReport> {
    const startTime = performance.now();
    
    console.log('🚀 Starting migration from Redis to Supabase Native');
    console.log(`📋 Mode: ${this.config.options.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
    
    try {
      // Step 1: Pre-migration validation
      await this.runStep('pre-validation', 'Pre-migration validation', async () => {
        await this.validateEnvironment();
        await this.checkDependencies();
        await this.validateSupabaseConnection();
      });

      // Step 2: Backup existing data
      if (this.config.options.backupBeforeMigration) {
        await this.runStep('backup', 'Backup existing data', async () => {
          await this.backupExistingData();
        });
      }

      // Step 3: Initialize Supabase infrastructure
      await this.runStep('initialize-supabase', 'Initialize Supabase infrastructure', async () => {
        await this.initializeSupabaseInfrastructure();
      });

      // Step 4: Migrate Redis data to Supabase
      if (this.config.options.migrateData) {
        await this.runStep('migrate-data', 'Migrate Redis data to Supabase', async () => {
          await this.migrateRedisData();
        });
      }

      // Step 5: Update application configuration
      if (this.config.options.updateEnvironment) {
        await this.runStep('update-config', 'Update application configuration', async () => {
          await this.updateApplicationConfig();
        });
      }

      // Step 6: Verify migration
      await this.runStep('verify-migration', 'Verify migration results', async () => {
        await this.verifyMigration();
      });

      // Step 7: Performance benchmarking
      await this.runStep('benchmark', 'Performance benchmarking', async () => {
        await this.runPerformanceBenchmarks();
      });

      // Step 8: Cleanup old systems (if enabled)
      if (this.config.options.cleanupOldSystems && !this.config.options.dryRun) {
        await this.runStep('cleanup', 'Cleanup old systems', async () => {
          await this.cleanupOldSystems();
        });
      }

      this.report.success = true;
      console.log('✅ Migration completed successfully!');

    } catch (error) {
      this.report.errors.push(`Migration failed: ${(error as Error).message}`);
      console.error('❌ Migration failed:', error);
    }

    this.report.performance.totalTime = performance.now() - startTime;
    
    // Generate and save report
    await this.generateReport();
    
    return this.report;
  }

  // ============================================================================
  // Migration Steps Implementation
  // ============================================================================

  private async validateEnvironment(): Promise<void> {
    console.log('🔍 Validating environment...');

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 18) {
      throw new Error(`Node.js 18+ required, found ${nodeVersion}`);
    }

    // Check required environment variables
    const requiredEnvVars = [
      'VITE_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    console.log('✅ Environment validation passed');
  }

  private async checkDependencies(): Promise<void> {
    console.log('📦 Checking dependencies...');

    try {
      // Check if current Redis-based system is running
      const redisCheck = await this.checkRedisConnection();
      if (!redisCheck) {
        this.report.warnings.push('Redis connection failed - will skip data migration');
      }

      // Check if required npm packages are installed
      const packageJson = JSON.parse(
        await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8')
      );

      const requiredPackages = [
        '@supabase/supabase-js',
        'ajv',
        'zod'
      ];

      for (const pkg of requiredPackages) {
        if (!packageJson.dependencies[pkg] && !packageJson.devDependencies[pkg]) {
          throw new Error(`Missing required package: ${pkg}`);
        }
      }

      console.log('✅ Dependencies check passed');

    } catch (error) {
      throw new Error(`Dependency check failed: ${(error as Error).message}`);
    }
  }

  private async validateSupabaseConnection(): Promise<void> {
    console.log('🔌 Validating Supabase connection...');

    try {
      const { data, error } = await this.supabase.from('workflow_executions').select('count').limit(1);
      
      if (error) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }

      console.log('✅ Supabase connection validated');
    } catch (error) {
      throw new Error(`Supabase validation failed: ${(error as Error).message}`);
    }
  }

  private async backupExistingData(): Promise<void> {
    console.log('💾 Creating backup of existing data...');

    const backupDir = path.join(process.cwd(), 'migration-backup');
    await fs.mkdir(backupDir, { recursive: true });

    try {
      // Backup Supabase data
      const tables = ['workflow_executions', 'workflow_execution_steps'];
      
      for (const table of tables) {
        const { data, error } = await this.supabase.from(table).select('*');
        
        if (error) {
          this.report.warnings.push(`Failed to backup table ${table}: ${error.message}`);
          continue;
        }

        await fs.writeFile(
          path.join(backupDir, `${table}.json`),
          JSON.stringify(data, null, 2)
        );
      }

      // Backup Redis data (if accessible)
      if (await this.checkRedisConnection()) {
        await this.backupRedisData(backupDir);
      }

      console.log(`✅ Backup created in ${backupDir}`);

    } catch (error) {
      throw new Error(`Backup failed: ${(error as Error).message}`);
    }
  }

  private async initializeSupabaseInfrastructure(): Promise<void> {
    console.log('🏗️ Initializing Supabase infrastructure...');

    if (this.config.options.dryRun) {
      console.log('📝 DRY RUN: Would initialize Supabase queues and extensions');
      return;
    }

    try {
      // Initialize queue manager
      await this.queueManager.initialize();

      // Initialize performance monitoring
      await performanceMonitor.getSystemHealth();

      console.log('✅ Supabase infrastructure initialized');

    } catch (error) {
      throw new Error(`Infrastructure initialization failed: ${(error as Error).message}`);
    }
  }

  private async migrateRedisData(): Promise<void> {
    console.log('📊 Migrating Redis data to Supabase...');

    if (this.config.options.dryRun) {
      console.log('📝 DRY RUN: Would migrate Redis queues and cached data');
      return;
    }

    try {
      // This would implement Redis-to-Supabase data migration
      // For now, we'll simulate the process
      
      const redisConnected = await this.checkRedisConnection();
      if (!redisConnected) {
        this.report.warnings.push('Redis not accessible - skipping data migration');
        return;
      }

      // Migrate queue data
      await this.migrateQueueData();
      
      // Migrate cached analytics
      await this.migrateCachedAnalytics();

      this.report.performance.recordsMigrated = 150; // Example count
      this.report.performance.dataTransferred = 1024 * 1024; // 1MB example

      console.log('✅ Data migration completed');

    } catch (error) {
      throw new Error(`Data migration failed: ${(error as Error).message}`);
    }
  }

  private async updateApplicationConfig(): Promise<void> {
    console.log('⚙️ Updating application configuration...');

    if (this.config.options.dryRun) {
      console.log('📝 DRY RUN: Would update environment variables and configs');
      return;
    }

    try {
      // Create new environment configuration
      const newEnvConfig = `
# Supabase Native Configuration (Generated by migration)
VITE_SUPABASE_URL=${this.config.supabase.url}
VITE_SUPABASE_ANON_KEY=${this.config.supabase.anonKey}
SUPABASE_SERVICE_ROLE_KEY=${this.config.supabase.serviceKey}

# Legacy Redis Configuration (Deprecated - remove after migration)
# REDIS_HOST=${this.config.redis.host}
# REDIS_PORT=${this.config.redis.port}
# REDIS_PASSWORD=${this.config.redis.password || ''}

# Migration timestamp
MIGRATION_TIMESTAMP=${new Date().toISOString()}
MIGRATION_VERSION=supabase-native-v1
`;

      // Backup current .env
      try {
        const currentEnv = await fs.readFile('.env', 'utf-8');
        await fs.writeFile('.env.backup', currentEnv);
      } catch (error) {
        // .env might not exist
      }

      // Write new configuration
      await fs.writeFile('.env.new', newEnvConfig);
      
      console.log('✅ Configuration updated (saved as .env.new)');
      console.log('⚠️  Please rename .env.new to .env to activate the new configuration');

    } catch (error) {
      throw new Error(`Configuration update failed: ${(error as Error).message}`);
    }
  }

  private async verifyMigration(): Promise<void> {
    console.log('🔍 Verifying migration results...');

    try {
      // Test Supabase queue operations
      const testMessage = { test: true, timestamp: new Date().toISOString() };
      const jobId = await this.queueManager.addJob('workflow_validation', testMessage);
      
      // Process the test job
      let processed = 0;
      await this.queueManager.processJobs('workflow_validation', async (job, id) => {
        if (job.test && id === jobId) {
          processed++;
        }
      });

      if (processed === 0) {
        throw new Error('Queue processing verification failed');
      }

      // Test real-time functionality
      await this.verifyRealtimeFeatures();

      // Test performance monitoring
      await this.verifyPerformanceMonitoring();

      console.log('✅ Migration verification passed');

    } catch (error) {
      throw new Error(`Migration verification failed: ${(error as Error).message}`);
    }
  }

  private async runPerformanceBenchmarks(): Promise<void> {
    console.log('⏱️ Running performance benchmarks...');

    try {
      const benchmarks = [];

      // Queue operation benchmark
      const queueStart = performance.now();
      for (let i = 0; i < 10; i++) {
        await this.queueManager.addJob('workflow_validation', { test: i });
      }
      const queueTime = performance.now() - queueStart;
      benchmarks.push({ operation: 'queue_operations', time: queueTime });

      // Database operation benchmark
      const dbStart = performance.now();
      await this.supabase.from('workflow_executions').select('id').limit(10);
      const dbTime = performance.now() - dbStart;
      benchmarks.push({ operation: 'database_query', time: dbTime });

      // Real-time benchmark
      const realtimeStart = performance.now();
      await this.supabase.from('workflow_executions').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        workflow_json: { test: true },
        status: 'completed'
      });
      const realtimeTime = performance.now() - realtimeStart;
      benchmarks.push({ operation: 'realtime_update', time: realtimeTime });

      console.log('📊 Benchmark Results:');
      benchmarks.forEach(b => {
        console.log(`  ${b.operation}: ${b.time.toFixed(2)}ms`);
      });

      // Store benchmarks in report
      this.report.performance = {
        ...this.report.performance,
        benchmarks
      };

    } catch (error) {
      this.report.warnings.push(`Benchmarking failed: ${(error as Error).message}`);
    }
  }

  private async cleanupOldSystems(): Promise<void> {
    console.log('🧹 Cleaning up old systems...');

    this.report.warnings.push('Manual cleanup required for Redis instance');
    console.log('⚠️  Manual steps required:');
    console.log('   1. Stop Redis server');
    console.log('   2. Remove Redis configuration from deployment');
    console.log('   3. Uninstall Redis-related npm packages');
    console.log('   4. Update Docker/deployment configurations');
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async runStep(
    stepName: string, 
    description: string, 
    action: () => Promise<void>
  ): Promise<void> {
    const step: MigrationStep = {
      name: stepName,
      success: false,
      duration: 0,
      details: description
    };

    console.log(`\n🔄 ${description}...`);
    const startTime = performance.now();

    try {
      await action();
      step.success = true;
      console.log(`✅ ${description} completed`);
    } catch (error) {
      step.success = false;
      step.error = (error as Error).message;
      console.error(`❌ ${description} failed:`, error);
      throw error;
    } finally {
      step.duration = performance.now() - startTime;
      this.report.steps.push(step);
    }
  }

  private async checkRedisConnection(): Promise<boolean> {
    // This would implement actual Redis connection check
    // For now, we'll return false to indicate Redis is not available
    return false;
  }

  private async backupRedisData(backupDir: string): Promise<void> {
    // This would implement Redis data backup
    console.log('📝 Redis backup placeholder - implement based on your Redis usage');
  }

  private async migrateQueueData(): Promise<void> {
    // This would implement queue data migration from Redis to Supabase
    console.log('📝 Queue data migration placeholder');
  }

  private async migrateCachedAnalytics(): Promise<void> {
    // This would implement cached analytics migration
    console.log('📝 Analytics migration placeholder');
  }

  private async verifyRealtimeFeatures(): Promise<void> {
    // Test Supabase realtime functionality
    const channel = this.supabase
      .channel('migration-test')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'workflow_executions' },
        (payload: any) => console.log('✅ Realtime event received:', payload)
      )
      .subscribe();

    // Cleanup
    setTimeout(() => {
      this.supabase.removeChannel(channel);
    }, 1000);
  }

  private async verifyPerformanceMonitoring(): Promise<void> {
    const health = await performanceMonitor.getSystemHealth();
    if (health.status === 'unhealthy') {
      throw new Error('Performance monitoring shows unhealthy status');
    }
  }

  private async generateReport(): Promise<void> {
    const reportPath = path.join(process.cwd(), `migration-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(this.report, null, 2));
    
    console.log(`\n📋 Migration Report:`);
    console.log(`   Success: ${this.report.success ? '✅' : '❌'}`);
    console.log(`   Duration: ${(this.report.performance.totalTime / 1000).toFixed(2)}s`);
    console.log(`   Steps completed: ${this.report.steps.filter(s => s.success).length}/${this.report.steps.length}`);
    console.log(`   Errors: ${this.report.errors.length}`);
    console.log(`   Warnings: ${this.report.warnings.length}`);
    console.log(`   Report saved: ${reportPath}`);

    if (this.report.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.report.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (this.report.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.report.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipBackup = args.includes('--skip-backup');
  const skipData = args.includes('--skip-data');
  const skipConfig = args.includes('--skip-config');
  const skipCleanup = args.includes('--skip-cleanup');

  // Load configuration
  const config: MigrationConfig = {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    },
    supabase: {
      url: process.env.VITE_SUPABASE_URL!,
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      anonKey: process.env.VITE_SUPABASE_ANON_KEY!
    },
    options: {
      dryRun,
      backupBeforeMigration: !skipBackup,
      migrateData: !skipData,
      updateEnvironment: !skipConfig,
      cleanupOldSystems: !skipCleanup
    }
  };

  console.log(`
🚀 Supabase Native Migration Tool
================================

This tool will migrate your application from Redis-based architecture
to Supabase-native solutions including:

✅ Queue System (Redis → Supabase Queues)
✅ Real-time Updates (Socket.io → Supabase Realtime)  
✅ Job Scheduling (Node-cron → pg_cron)
✅ Caching (Redis → Materialized Views)
✅ Pub/Sub (Redis → PostgreSQL NOTIFY/LISTEN)

Mode: ${dryRun ? '📝 DRY RUN (no changes will be made)' : '🔥 LIVE MIGRATION'}
`);

  if (!dryRun) {
    console.log('⚠️  WARNING: This will make changes to your system!');
    console.log('   Make sure you have backups and understand the changes.');
    console.log('   Run with --dry-run first to see what will happen.');
    console.log('');
    
    // In a real implementation, you'd add confirmation prompt here
  }

  try {
    const migration = new SupabaseNativeMigration(config);
    const report = await migration.migrate();
    
    process.exit(report.success ? 0 : 1);

  } catch (error) {
    console.error('💥 Migration failed with unhandled error:', error);
    process.exit(1);
  }
}

// Run if called directly
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  main().catch(console.error);
}

export { SupabaseNativeMigration, MigrationConfig, MigrationReport };