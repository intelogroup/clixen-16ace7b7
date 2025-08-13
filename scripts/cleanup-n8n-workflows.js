#!/usr/bin/env node

/**
 * Safe n8n Workflow Cleanup Script
 * Deactivates and deletes all workflows from the n8n instance
 */

const axios = require('axios');

class N8nWorkflowCleaner {
  constructor() {
    this.n8nConfig = {
      baseUrl: 'http://18.221.12.50:5678/api/v1',
      apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU'
    };
    this.deletedCount = 0;
    this.failedCount = 0;
    this.errors = [];
  }

  async makeN8nRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.n8nConfig.baseUrl}${endpoint}`,
        headers: {
          'X-N8N-API-KEY': this.n8nConfig.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'UNKNOWN',
          message: error.message,
          status: error.response?.status,
        }
      };
    }
  }

  async listAllWorkflows() {
    console.log('📋 Fetching all workflows...');
    
    const result = await this.makeN8nRequest('GET', '/workflows');
    
    if (result.success) {
      const workflows = result.data.data || [];
      console.log(`✅ Found ${workflows.length} workflows to clean up`);
      return workflows;
    } else {
      console.error('❌ Failed to list workflows:', result.error);
      return [];
    }
  }

  async deactivateWorkflow(workflow) {
    if (!workflow.active) {
      return { success: true, message: 'Already inactive' };
    }

    console.log(`   🔴 Deactivating: ${workflow.name}`);
    const result = await this.makeN8nRequest('POST', `/workflows/${workflow.id}/deactivate`);
    
    if (result.success) {
      console.log(`   ✅ Deactivated successfully`);
      return { success: true, message: 'Deactivated' };
    } else {
      console.error(`   ❌ Failed to deactivate: ${result.error.message}`);
      return { success: false, error: result.error };
    }
  }

  async deleteWorkflow(workflow) {
    console.log(`   🗑️  Deleting: ${workflow.name} (ID: ${workflow.id})`);
    const result = await this.makeN8nRequest('DELETE', `/workflows/${workflow.id}`);
    
    if (result.success) {
      console.log(`   ✅ Deleted successfully`);
      this.deletedCount++;
      return { success: true };
    } else {
      console.error(`   ❌ Failed to delete: ${result.error.message}`);
      this.failedCount++;
      this.errors.push({
        workflowId: workflow.id,
        workflowName: workflow.name,
        error: result.error.message
      });
      return { success: false, error: result.error };
    }
  }

  async cleanupWorkflow(workflow, index, total) {
    console.log(`\n🔧 [${index + 1}/${total}] Processing: ${workflow.name}`);
    console.log(`   ID: ${workflow.id}`);
    console.log(`   Status: ${workflow.active ? 'ACTIVE' : 'INACTIVE'}`);

    // Step 1: Deactivate if active
    if (workflow.active) {
      const deactivateResult = await this.deactivateWorkflow(workflow);
      if (!deactivateResult.success) {
        console.log(`   ⚠️  Continuing with deletion despite deactivation failure`);
      }
      // Wait a moment after deactivation
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Step 2: Delete the workflow
    await this.deleteWorkflow(workflow);
  }

  async runCleanup() {
    console.log('🧹 n8n Workflow Cleanup Tool');
    console.log('============================\n');

    // Step 1: List all workflows
    const workflows = await this.listAllWorkflows();
    
    if (workflows.length === 0) {
      console.log('✅ No workflows found - nothing to clean up');
      return;
    }

    // Step 2: Confirm cleanup
    console.log(`\n⚠️  CONFIRMATION REQUIRED`);
    console.log(`About to delete ${workflows.length} workflows:`);
    workflows.forEach((wf, i) => {
      console.log(`${i + 1}. ${wf.name} (${wf.active ? 'ACTIVE' : 'INACTIVE'})`);
    });

    console.log(`\n🚀 Starting cleanup process...\n`);

    // Step 3: Process each workflow
    for (let i = 0; i < workflows.length; i++) {
      await this.cleanupWorkflow(workflows[i], i, workflows.length);
      
      // Add small delay between deletions to avoid overwhelming the API
      if (i < workflows.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Step 4: Final verification
    console.log('\n🔍 Verifying cleanup...');
    const remainingWorkflows = await this.listAllWorkflows();
    
    // Step 5: Summary report
    this.printSummary(workflows.length, remainingWorkflows.length);
  }

  printSummary(originalCount, remainingCount) {
    console.log('\n📊 Cleanup Summary');
    console.log('==================');
    console.log(`Original workflows: ${originalCount}`);
    console.log(`Successfully deleted: ${this.deletedCount}`);
    console.log(`Failed deletions: ${this.failedCount}`);
    console.log(`Remaining workflows: ${remainingCount}`);

    if (this.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error.workflowName} (${error.workflowId}): ${error.error}`);
      });
    }

    if (remainingCount === 0) {
      console.log('\n🎉 SUCCESS: All workflows have been cleaned up!');
      console.log('✅ Your n8n instance is now clean and ready for fresh workflows');
    } else if (remainingCount < originalCount) {
      console.log('\n⚠️  PARTIAL SUCCESS: Some workflows were deleted');
      console.log(`${originalCount - remainingCount} workflows removed`);
      console.log(`${remainingCount} workflows still remain`);
    } else {
      console.log('\n❌ CLEANUP FAILED: No workflows were deleted');
      console.log('Please check the errors above and try again');
    }
  }
}

// Run the cleanup
const cleaner = new N8nWorkflowCleaner();
cleaner.runCleanup()
  .then(() => {
    console.log('\n🏁 Cleanup process completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Cleanup process failed:', error.message);
    process.exit(1);
  });