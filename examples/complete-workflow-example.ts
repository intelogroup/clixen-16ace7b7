#!/usr/bin/env node

/**
 * Complete Clixen Workflow Engine Example
 * 
 * This example demonstrates the full Supabase-native workflow processing pipeline:
 * 1. Queue-based workflow validation
 * 2. Multi-layer validation (AJV + Zod + n8n compatibility)
 * 3. Auto-healing capabilities
 * 4. Real-time progress updates
 * 5. Performance monitoring
 * 6. n8n deployment testing
 */

import { workflowEngine, WorkflowRequest } from '../src/lib/integration/ClixenWorkflowEngine';
import { performanceMonitor } from '../src/lib/monitoring/PerformanceMonitor';
import { autoHealer } from '../src/lib/healing/WorkflowAutoHealer';

// ============================================================================
// Sample Workflows for Testing
// ============================================================================

const SAMPLE_WORKFLOWS = {
  // ✅ Valid simple workflow
  valid_simple: {
    name: "Simple Email to Slack Notification",
    active: false,
    nodes: [
      {
        id: "trigger",
        name: "Email Trigger",
        type: "n8n-nodes-base.emailReadImap",
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          format: "simple"
        }
      },
      {
        id: "slack",
        name: "Slack Notification",
        type: "n8n-nodes-base.slack",
        typeVersion: 1,
        position: [450, 300],
        parameters: {
          channel: "#notifications",
          text: "New email received: {{$json.subject}}"
        }
      }
    ],
    connections: {
      "Email Trigger": {
        main: [[{ node: "Slack Notification", type: "main", index: 0 }]]
      }
    },
    settings: {
      executionOrder: "v1"
    }
  },

  // ❌ Invalid workflow (missing required fields)
  invalid_structure: {
    name: "Invalid Workflow",
    active: true,
    nodes: [
      {
        // Missing required 'id' field
        name: "Broken Node",
        type: "n8n-nodes-base.start",
        typeVersion: 1,
        position: "invalid_position", // Should be [number, number]
        parameters: {}
      }
    ],
    connections: {}
  },

  // ⚠️ Complex workflow (high node count)
  complex_workflow: {
    name: "Complex Data Processing Pipeline",
    active: false,
    nodes: Array.from({ length: 25 }, (_, i) => ({
      id: `node_${i}`,
      name: `Processing Step ${i + 1}`,
      type: "n8n-nodes-base.function",
      typeVersion: 1,
      position: [250 + (i % 5) * 200, 300 + Math.floor(i / 5) * 150],
      parameters: {
        functionCode: `return [{json: {step: ${i + 1}, data: items[0].json}}];`
      }
    })),
    connections: {}, // Would need proper connections for all 25 nodes
    settings: {
      executionOrder: "v1"
    }
  },

  // 🔧 Auto-healable workflow (duplicate IDs)
  auto_healable: {
    name: "Workflow with Duplicate IDs",
    active: false,
    nodes: [
      {
        id: "duplicate_id", // This will cause a duplicate ID error
        name: "First Node",
        type: "n8n-nodes-base.start",
        typeVersion: 1,
        position: [250, 300],
        parameters: {}
      },
      {
        id: "duplicate_id", // Same ID as above
        name: "Second Node",
        type: "n8n-nodes-base.function",
        typeVersion: 1,
        position: [450, 300],
        parameters: {
          functionCode: "return items;"
        }
      }
    ],
    connections: {
      "First Node": {
        main: [[{ node: "Second Node", type: "main", index: 0 }]]
      }
    }
  }
};

// ============================================================================
// Example Usage Functions
// ============================================================================

/**
 * Example 1: Basic workflow validation and processing
 */
async function example1_basicValidation(): Promise<void> {
  console.log('\n🔥 Example 1: Basic Workflow Validation');
  console.log('=====================================');

  const request: WorkflowRequest = {
    userId: 'demo-user-1',
    workflow: SAMPLE_WORKFLOWS.valid_simple,
    options: {
      autoHeal: false,
      skipDeploymentTest: true,
      metadata: { example: 'basic_validation' }
    }
  };

  try {
    const response = await workflowEngine.processWorkflowRequest(request);
    
    console.log(`✅ Workflow processed successfully!`);
    console.log(`   Execution ID: ${response.executionId}`);
    console.log(`   Validation Time: ${response.performance.total}ms`);
    console.log(`   Status: ${response.success ? 'SUCCESS' : 'FAILED'}`);
    
    if (response.validationResult?.warnings?.length) {
      console.log(`   Warnings: ${response.validationResult.warnings.length}`);
    }

  } catch (error) {
    console.error('❌ Example 1 failed:', error);
  }
}

/**
 * Example 2: Auto-healing workflow with structural errors
 */
async function example2_autoHealing(): Promise<void> {
  console.log('\n🔧 Example 2: Auto-Healing Workflow');
  console.log('================================');

  const request: WorkflowRequest = {
    userId: 'demo-user-2',
    workflow: SAMPLE_WORKFLOWS.auto_healable,
    options: {
      autoHeal: true, // Enable auto-healing
      skipDeploymentTest: true,
      metadata: { example: 'auto_healing' }
    }
  };

  try {
    const response = await workflowEngine.processWorkflowRequest(request);
    
    console.log(`🔧 Auto-healing workflow processed!`);
    console.log(`   Execution ID: ${response.executionId}`);
    console.log(`   Auto-healed: ${response.validationResult?.autoHealed ? 'YES' : 'NO'}`);
    console.log(`   Final Status: ${response.success ? 'SUCCESS' : 'FAILED'}`);
    
    if (response.validationResult?.errors?.length) {
      console.log(`   Remaining Errors: ${response.validationResult.errors.length}`);
      response.validationResult.errors.forEach(error => {
        console.log(`     - ${error.message}`);
      });
    }

  } catch (error) {
    console.error('❌ Example 2 failed:', error);
  }
}

/**
 * Example 3: Real-time workflow monitoring
 */
async function example3_realTimeMonitoring(): Promise<void> {
  console.log('\n📡 Example 3: Real-Time Workflow Monitoring');
  console.log('=========================================');

  const userId = 'demo-user-3';
  
  // Set up real-time subscription
  const unsubscribe = workflowEngine.subscribeToUpdates(userId, (update) => {
    console.log(`📡 Real-time update: ${update.phase} - ${update.message} (${update.progress}%)`);
  });

  try {
    const request: WorkflowRequest = {
      userId,
      workflow: SAMPLE_WORKFLOWS.complex_workflow,
      options: {
        autoHeal: true,
        skipDeploymentTest: false, // Enable deployment test for full pipeline
        metadata: { example: 'realtime_monitoring' }
      }
    };

    const response = await workflowEngine.processWorkflowRequest(request);
    
    console.log(`📡 Real-time monitoring completed!`);
    console.log(`   Execution ID: ${response.executionId}`);
    console.log(`   Deployment Status: ${response.deploymentResult?.status || 'skipped'}`);
    
    // Wait a moment for final real-time updates
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    console.error('❌ Example 3 failed:', error);
  } finally {
    // Clean up subscription
    unsubscribe();
  }
}

/**
 * Example 4: Performance monitoring and system health
 */
async function example4_performanceMonitoring(): Promise<void> {
  console.log('\n📊 Example 4: Performance Monitoring');
  console.log('=================================');

  try {
    // Get current system metrics
    const metrics = await workflowEngine.getSystemMetrics();
    
    console.log('📊 System Health:');
    console.log(`   Status: ${metrics.health.status}`);
    console.log(`   Average Response Time: ${metrics.health.metrics.averageResponseTime}ms`);
    console.log(`   Error Rate: ${(metrics.health.metrics.errorRate * 100).toFixed(2)}%`);
    console.log(`   Throughput: ${metrics.health.metrics.throughput} req/min`);
    console.log(`   Uptime: ${Math.floor(metrics.health.metrics.uptime / 3600)}h ${Math.floor((metrics.health.metrics.uptime % 3600) / 60)}m`);

    console.log('\n📦 Queue Status:');
    Object.entries(metrics.queues).forEach(([name, stats]) => {
      console.log(`   ${name}: ${(stats as any).depth || 0} pending jobs`);
    });

    if (metrics.health.alerts.length > 0) {
      console.log('\n🚨 Active Alerts:');
      metrics.health.alerts.forEach((alert: any) => {
        console.log(`   ${alert.severity.toUpperCase()}: ${alert.message}`);
      });
    } else {
      console.log('\n✅ No active alerts');
    }

    // Get healing statistics
    const healingStats = await autoHealer.getHealingStats('day');
    console.log('\n🔧 Auto-Healing Statistics (24h):');
    console.log(`   Total Attempts: ${healingStats.totalAttempts}`);
    console.log(`   Successful Heals: ${healingStats.successfulHeals}`);
    console.log(`   Success Rate: ${healingStats.successRate.toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Example 4 failed:', error);
  }
}

/**
 * Example 5: Batch processing multiple workflows
 */
async function example5_batchProcessing(): Promise<void> {
  console.log('\n⚡ Example 5: Batch Processing');
  console.log('============================');

  const workflows = [
    { name: 'Simple', workflow: SAMPLE_WORKFLOWS.valid_simple },
    { name: 'Invalid', workflow: SAMPLE_WORKFLOWS.invalid_structure },
    { name: 'Auto-healable', workflow: SAMPLE_WORKFLOWS.auto_healable }
  ];

  const results = [];

  for (let i = 0; i < workflows.length; i++) {
    const { name, workflow } = workflows[i];
    console.log(`\n🔄 Processing workflow ${i + 1}/${workflows.length}: ${name}`);

    try {
      const request: WorkflowRequest = {
        userId: `batch-user-${i}`,
        workflow,
        options: {
          autoHeal: true,
          skipDeploymentTest: true,
          metadata: { 
            example: 'batch_processing',
            batch_index: i,
            batch_name: name
          }
        }
      };

      const response = await workflowEngine.processWorkflowRequest(request);
      results.push({ name, success: response.success, executionId: response.executionId });
      
      console.log(`   ${response.success ? '✅' : '❌'} ${name}: ${response.success ? 'SUCCESS' : 'FAILED'}`);

    } catch (error) {
      results.push({ name, success: false, error: (error as Error).message });
      console.log(`   ❌ ${name}: ERROR - ${(error as Error).message}`);
    }
  }

  console.log('\n📊 Batch Processing Summary:');
  console.log(`   Total: ${results.length}`);
  console.log(`   Successful: ${results.filter(r => r.success).length}`);
  console.log(`   Failed: ${results.filter(r => !r.success).length}`);
}

/**
 * Example 6: Error handling and recovery
 */
async function example6_errorHandling(): Promise<void> {
  console.log('\n🚨 Example 6: Error Handling and Recovery');
  console.log('======================================');

  try {
    // Test with completely invalid data
    const request: WorkflowRequest = {
      userId: 'error-test-user',
      workflow: null, // This will cause validation errors
      options: {
        autoHeal: true,
        metadata: { example: 'error_handling' }
      }
    };

    const response = await workflowEngine.processWorkflowRequest(request);
    
    console.log(`🚨 Error handling test completed:`);
    console.log(`   Success: ${response.success}`);
    console.log(`   Errors: ${response.errors?.length || 0}`);
    
    if (response.errors) {
      response.errors.forEach(error => {
        console.log(`     - ${error}`);
      });
    }

  } catch (error) {
    console.log(`✅ Error properly caught and handled: ${(error as Error).message}`);
  }
}

// ============================================================================
// Main Example Runner
// ============================================================================

async function runAllExamples(): Promise<void> {
  console.log(`
🚀 Clixen Workflow Engine - Complete Example Suite
================================================

This example demonstrates the full Supabase-native workflow processing pipeline
with queue management, multi-layer validation, auto-healing, real-time updates,
and performance monitoring.

Environment:
- Supabase URL: ${process.env.VITE_SUPABASE_URL?.substring(0, 30)}...
- Node.js: ${process.version}
- Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB used

`);

  try {
    // Initialize the workflow engine
    console.log('🔄 Initializing Clixen Workflow Engine...');
    await workflowEngine.initialize();
    console.log('✅ Workflow engine initialized successfully!\n');

    // Run all examples
    await example1_basicValidation();
    await example2_autoHealing();
    await example3_realTimeMonitoring();
    await example4_performanceMonitoring();
    await example5_batchProcessing();
    await example6_errorHandling();

    console.log('\n🎉 All examples completed successfully!');
    console.log('\n📊 Final System Status:');
    
    const finalMetrics = await workflowEngine.getSystemMetrics();
    console.log(`   Health: ${finalMetrics.health.status}`);
    console.log(`   Total Requests Processed: ${Object.values(finalMetrics.queues).reduce((sum: number, stats: any) => sum + (stats.depth || 0), 0)}`);
    console.log(`   Average Response Time: ${finalMetrics.health.metrics.averageResponseTime}ms`);

  } catch (error) {
    console.error('💥 Example suite failed:', error);
    process.exit(1);
  } finally {
    // Graceful shutdown
    console.log('\n🔌 Shutting down workflow engine...');
    await workflowEngine.shutdown();
    console.log('✅ Shutdown complete');
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Clixen Workflow Engine Examples

Usage:
  npm run examples                 # Run all examples
  npm run examples -- --example 1 # Run specific example
  npm run examples -- --help      # Show this help

Examples:
  1. Basic workflow validation
  2. Auto-healing workflow
  3. Real-time monitoring
  4. Performance monitoring
  5. Batch processing
  6. Error handling

Environment Variables Required:
  VITE_SUPABASE_URL            # Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY    # Supabase service role key
  VITE_SUPABASE_ANON_KEY       # Supabase anonymous key
`);
    return;
  }

  const exampleNumber = args.find(arg => arg.startsWith('--example'))?.split('=')[1] || 
                        args[args.indexOf('--example') + 1];

  if (exampleNumber) {
    // Run specific example
    const exampleFunctions = [
      example1_basicValidation,
      example2_autoHealing,
      example3_realTimeMonitoring,
      example4_performanceMonitoring,
      example5_batchProcessing,
      example6_errorHandling
    ];

    const index = parseInt(exampleNumber) - 1;
    if (index >= 0 && index < exampleFunctions.length) {
      console.log(`Running Example ${exampleNumber}...`);
      
      await workflowEngine.initialize();
      await exampleFunctions[index]();
      await workflowEngine.shutdown();
    } else {
      console.error(`Invalid example number: ${exampleNumber}`);
      process.exit(1);
    }
  } else {
    // Run all examples
    await runAllExamples();
  }
}

// Run if called directly
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  main().catch(error => {
    console.error('💥 Example failed:', error);
    process.exit(1);
  });
}

export {
  SAMPLE_WORKFLOWS,
  example1_basicValidation,
  example2_autoHealing,
  example3_realTimeMonitoring,
  example4_performanceMonitoring,
  example5_batchProcessing,
  example6_errorHandling
};