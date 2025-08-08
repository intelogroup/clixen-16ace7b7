#!/usr/bin/env deno run --allow-net --allow-env

/**
 * Workflow Cleanup Utility for MVP
 * Manages user data deletion and workflow cleanup in n8n
 * 
 * Usage: deno run --allow-net --allow-env workflow-cleanup.ts [--user-id=xxx] [--dry-run]
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const N8N_API_URL = Deno.env.get('N8N_API_URL') || 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = Deno.env.get('N8N_API_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface CleanupOptions {
  userId?: string;
  dryRun: boolean;
  olderThanDays?: number;
}

class WorkflowCleanupManager {
  /**
   * Clean up workflows for a specific user
   */
  async cleanupUserWorkflows(userId: string, dryRun: boolean = false): Promise<void> {
    console.log(`🧹 Starting cleanup for user: ${userId.substring(0, 8)}...`);
    
    // 1. Get all user workflows from Supabase
    const { data: workflows, error } = await supabase
      .from('mvp_workflows')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ Error fetching workflows:', error);
      return;
    }
    
    console.log(`📊 Found ${workflows?.length || 0} workflows for user`);
    
    for (const workflow of workflows || []) {
      await this.cleanupSingleWorkflow(workflow, dryRun);
    }
    
    // 3. Clean up user projects if requested
    if (!dryRun) {
      console.log('🗑️ Cleaning up user projects...');
      await supabase
        .from('projects')
        .delete()
        .eq('user_id', userId);
    }
    
    console.log('✅ User cleanup complete');
  }
  
  /**
   * Clean up a single workflow
   */
  async cleanupSingleWorkflow(workflow: any, dryRun: boolean = false): Promise<void> {
    const workflowId = workflow.n8n_workflow_id;
    const workflowName = workflow.name;
    
    console.log(`  📝 Processing: ${workflowName}`);
    
    if (!workflowId) {
      console.log(`    ⚠️ No n8n ID found, skipping n8n deletion`);
    } else {
      // Delete from n8n
      if (!dryRun) {
        try {
          const response = await fetch(`${N8N_API_URL}/workflows/${workflowId}`, {
            method: 'DELETE',
            headers: {
              'X-N8N-API-KEY': N8N_API_KEY,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            console.log(`    ✅ Deleted from n8n: ${workflowId}`);
          } else {
            console.log(`    ⚠️ Failed to delete from n8n: ${response.status}`);
          }
        } catch (error) {
          console.log(`    ❌ Error deleting from n8n:`, error.message);
        }
      } else {
        console.log(`    [DRY RUN] Would delete from n8n: ${workflowId}`);
      }
    }
    
    // Mark as archived in Supabase
    if (!dryRun) {
      await supabase
        .from('mvp_workflows')
        .update({ 
          is_active: false, 
          status: 'archived',
          n8n_workflow_id: null 
        })
        .eq('id', workflow.id);
      console.log(`    ✅ Archived in database`);
    } else {
      console.log(`    [DRY RUN] Would archive in database`);
    }
  }
  
  /**
   * Clean up old/inactive workflows
   */
  async cleanupInactiveWorkflows(olderThanDays: number = 30, dryRun: boolean = false): Promise<void> {
    console.log(`🧹 Cleaning up workflows older than ${olderThanDays} days...`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const { data: workflows, error } = await supabase
      .from('mvp_workflows')
      .select('*')
      .lt('last_accessed_at', cutoffDate.toISOString())
      .eq('is_active', true);
    
    if (error) {
      console.error('❌ Error fetching old workflows:', error);
      return;
    }
    
    console.log(`📊 Found ${workflows?.length || 0} inactive workflows`);
    
    for (const workflow of workflows || []) {
      await this.cleanupSingleWorkflow(workflow, dryRun);
    }
    
    console.log('✅ Inactive workflow cleanup complete');
  }
  
  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<void> {
    // Get all workflows from n8n
    const response = await fetch(`${N8N_API_URL}/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    });
    
    const n8nWorkflows = await response.json();
    
    // Get all workflows from Supabase
    const { data: dbWorkflows } = await supabase
      .from('mvp_workflows')
      .select('n8n_workflow_id, user_id, name, status');
    
    // Analyze
    const orphanedWorkflows = n8nWorkflows.data?.filter((n8nWf: any) => {
      const inDb = dbWorkflows?.find(dbWf => dbWf.n8n_workflow_id === n8nWf.id);
      return !inDb && n8nWf.name?.includes('[USR-');
    }) || [];
    
    console.log('📊 Cleanup Statistics:');
    console.log(`  Total n8n workflows: ${n8nWorkflows.data?.length || 0}`);
    console.log(`  Total DB workflows: ${dbWorkflows?.length || 0}`);
    console.log(`  Orphaned in n8n: ${orphanedWorkflows.length}`);
    
    if (orphanedWorkflows.length > 0) {
      console.log('\n⚠️ Orphaned workflows in n8n:');
      orphanedWorkflows.forEach((wf: any) => {
        console.log(`  - ${wf.name} (ID: ${wf.id})`);
      });
    }
  }
}

// Main execution
async function main() {
  const args = Deno.args;
  const options: CleanupOptions = {
    dryRun: args.includes('--dry-run'),
    userId: args.find(arg => arg.startsWith('--user-id='))?.split('=')[1],
    olderThanDays: parseInt(args.find(arg => arg.startsWith('--days='))?.split('=')[1] || '30')
  };
  
  const manager = new WorkflowCleanupManager();
  
  if (args.includes('--stats')) {
    await manager.getCleanupStats();
  } else if (options.userId) {
    await manager.cleanupUserWorkflows(options.userId, options.dryRun);
  } else if (args.includes('--inactive')) {
    await manager.cleanupInactiveWorkflows(options.olderThanDays, options.dryRun);
  } else {
    console.log('Workflow Cleanup Utility');
    console.log('========================');
    console.log('Usage:');
    console.log('  --user-id=xxx    Clean up specific user workflows');
    console.log('  --inactive       Clean up inactive workflows');
    console.log('  --days=30        Days of inactivity (default: 30)');
    console.log('  --dry-run        Preview without making changes');
    console.log('  --stats          Show cleanup statistics');
    console.log('\nExamples:');
    console.log('  deno run --allow-net --allow-env workflow-cleanup.ts --user-id=abc123 --dry-run');
    console.log('  deno run --allow-net --allow-env workflow-cleanup.ts --inactive --days=7');
    console.log('  deno run --allow-net --allow-env workflow-cleanup.ts --stats');
  }
}

if (import.meta.main) {
  main().catch(console.error);
}