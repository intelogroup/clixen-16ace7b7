#!/usr/bin/env node

/**
 * Legacy Data Cleanup Script
 * Removes all workflows that don't follow the [USR-{userId}] naming convention
 * Cleans up orphaned data in both n8n and Supabase
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Fetch all workflows from n8n
 */
async function fetchN8nWorkflows() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '18.221.12.50',
      port: 5678,
      path: '/api/v1/workflows',
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    };

    const req = require('http').request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response.data || []);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Delete a workflow from n8n
 */
async function deleteN8nWorkflow(workflowId, workflowName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '18.221.12.50',
      port: 5678,
      path: `/api/v1/workflows/${workflowId}`,
      method: 'DELETE',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    };

    const req = require('http').request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 204) {
          log(`  ✓ Deleted: ${workflowName}`, 'green');
          resolve(true);
        } else {
          log(`  ✗ Failed to delete: ${workflowName} (Status: ${res.statusCode})`, 'red');
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      log(`  ✗ Error deleting ${workflowName}: ${err.message}`, 'red');
      resolve(false);
    });
    req.end();
  });
}

/**
 * Clean up legacy workflows from n8n
 */
async function cleanupN8nWorkflows() {
  log('\n═══════════════════════════════════════════════════════', 'cyan');
  log('STEP 1: Cleaning Legacy Workflows from n8n', 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');

  try {
    const workflows = await fetchN8nWorkflows();
    log(`\nFound ${workflows.length} workflows in n8n`, 'yellow');

    const legacyWorkflows = workflows.filter(w => !w.name.startsWith('[USR-'));
    const validWorkflows = workflows.filter(w => w.name.startsWith('[USR-'));

    log(`\nLegacy workflows (to be deleted): ${legacyWorkflows.length}`, 'red');
    log(`Valid workflows (with USR prefix): ${validWorkflows.length}`, 'green');

    if (legacyWorkflows.length === 0) {
      log('\n✓ No legacy workflows to clean up!', 'green');
      return;
    }

    log('\nDeleting legacy workflows:', 'yellow');
    for (const workflow of legacyWorkflows) {
      await deleteN8nWorkflow(workflow.id, workflow.name);
      // Add delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    log(`\n✓ Cleaned up ${legacyWorkflows.length} legacy workflows`, 'green');
  } catch (error) {
    log(`\n✗ Error cleaning n8n workflows: ${error.message}`, 'red');
  }
}

/**
 * Clean up orphaned data in Supabase
 */
async function cleanupSupabaseData() {
  log('\n═══════════════════════════════════════════════════════', 'cyan');
  log('STEP 2: Cleaning Orphaned Data from Supabase', 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');

  try {
    // Clean up mvp_workflows table
    log('\nCleaning mvp_workflows table...', 'yellow');
    const { data: workflows, error: workflowError } = await supabase
      .from('mvp_workflows')
      .select('*');

    if (workflowError) {
      log(`  Note: mvp_workflows table not found or accessible`, 'yellow');
    } else if (workflows && workflows.length > 0) {
      const legacyWorkflows = workflows.filter(w => 
        !w.name || !w.name.startsWith('[USR-')
      );
      
      if (legacyWorkflows.length > 0) {
        for (const workflow of legacyWorkflows) {
          const { error } = await supabase
            .from('mvp_workflows')
            .delete()
            .eq('id', workflow.id);
          
          if (!error) {
            log(`  ✓ Deleted workflow: ${workflow.name || workflow.id}`, 'green');
          }
        }
        log(`  ✓ Cleaned ${legacyWorkflows.length} legacy workflows from database`, 'green');
      } else {
        log(`  ✓ No legacy workflows in database`, 'green');
      }
    }

    // Clean up conversations table (old schema)
    log('\nCleaning conversations table...', 'yellow');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*');

    if (!convError && conversations && conversations.length > 0) {
      // Delete all test conversations created before security implementation
      const cutoffDate = '2025-08-08'; // Today's date
      const { error } = await supabase
        .from('conversations')
        .delete()
        .lt('created_at', cutoffDate);
      
      if (!error) {
        log(`  ✓ Cleaned legacy conversations created before ${cutoffDate}`, 'green');
      }
    }

    // Clean up ai_chat_messages table
    log('\nCleaning ai_chat_messages table...', 'yellow');
    const { error: chatError } = await supabase
      .from('ai_chat_messages')
      .delete()
      .lt('created_at', '2025-08-08');
    
    if (!chatError) {
      log(`  ✓ Cleaned legacy chat messages`, 'green');
    }

    log('\n✓ Supabase cleanup complete!', 'green');
  } catch (error) {
    log(`\n✗ Error cleaning Supabase data: ${error.message}`, 'red');
  }
}

/**
 * Verify cleanup results
 */
async function verifyCleanup() {
  log('\n═══════════════════════════════════════════════════════', 'cyan');
  log('STEP 3: Verifying Cleanup Results', 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');

  try {
    // Check n8n workflows
    const workflows = await fetchN8nWorkflows();
    const legacyCount = workflows.filter(w => !w.name.startsWith('[USR-')).length;
    const validCount = workflows.filter(w => w.name.startsWith('[USR-')).length;

    log('\nn8n Status:', 'yellow');
    log(`  Total workflows: ${workflows.length}`, 'blue');
    log(`  Legacy workflows: ${legacyCount}`, legacyCount > 0 ? 'red' : 'green');
    log(`  Valid workflows: ${validCount}`, 'green');

    // Check Supabase
    const { count: workflowCount } = await supabase
      .from('mvp_workflows')
      .select('*', { count: 'exact', head: true });

    const { count: convCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });

    log('\nSupabase Status:', 'yellow');
    log(`  mvp_workflows records: ${workflowCount || 0}`, 'blue');
    log(`  conversations records: ${convCount || 0}`, 'blue');

    if (legacyCount === 0) {
      log('\n✅ SUCCESS: All legacy data has been cleaned!', 'green');
      log('The system is now ready for secure workflow management.', 'green');
    } else {
      log('\n⚠️  WARNING: Some legacy workflows remain. Manual intervention may be needed.', 'yellow');
    }

  } catch (error) {
    log(`\n✗ Error verifying cleanup: ${error.message}`, 'red');
  }
}

/**
 * Main cleanup function
 */
async function main() {
  log('\n╔═══════════════════════════════════════════════════════╗', 'cyan');
  log('║     CLIXEN LEGACY DATA CLEANUP UTILITY                ║', 'cyan');
  log('║     Removing pre-security workflows and data          ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════╝', 'cyan');

  log('\n⚠️  This will DELETE all workflows without [USR-] prefix!', 'yellow');
  log('Press Ctrl+C to cancel, or wait 3 seconds to continue...', 'yellow');

  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    await cleanupN8nWorkflows();
    await cleanupSupabaseData();
    await verifyCleanup();

    log('\n╔═══════════════════════════════════════════════════════╗', 'green');
    log('║     CLEANUP COMPLETE                                  ║', 'green');
    log('║     System ready for secure operations                ║', 'green');
    log('╚═══════════════════════════════════════════════════════╝', 'green');
  } catch (error) {
    log('\n✗ Cleanup failed: ' + error.message, 'red');
    process.exit(1);
  }
}

// Run cleanup
main().catch(console.error);