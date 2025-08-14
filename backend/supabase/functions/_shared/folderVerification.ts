import { createClient } from '@supabase/supabase-js';
import { executeSSHCommand } from './sshUtils';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FolderVerificationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  verificationLayers?: {
    database: boolean;
    content: boolean;
    metadata: boolean;
    crossCheck: boolean;
    auditLog: boolean;
  };
  metadata: any;
}

interface WorkflowCheckResult {
  hasWorkflows: boolean;
  workflowCount: number;
  workflowNames: string[];
}

interface MetadataCheckResult {
  exists: boolean;
  data: {
    assigned_to: string;
    assigned_at: string;
    project_id: string;
    folder_id: string;
  } | null;
  hash: string | null;
}

interface CrossCheckResult {
  inconsistencies: string[];
  needsManualReview: boolean;
  isConsistent: boolean;
}

interface AuditCheckResult {
  recentActivity: boolean;
  suspiciousActivity: boolean;
  lastActivity?: string;
  logs?: any[];
}

/**
 * Enhanced multi-layer folder verification system
 * Implements Jimmy's triple-verification recommendations
 */
export async function verifyFolderAssignment(
  folderId: string,
  userId: string
): Promise<FolderVerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const verificationLayers = {
    database: false,
    content: false,
    metadata: false,
    crossCheck: false,
    auditLog: false
  };
  
  try {
    // Layer 1: Check database assignment status
    const { data: assignment, error: dbError } = await supabase
      .from('folder_assignments')
      .select('*')
      .eq('folder_tag_name', folderId)
      .single();
    
    if (dbError && dbError.code !== 'PGRST116') {
      errors.push(`Database error: ${dbError.message}`);
    }
    
    if (assignment) {
      if (assignment.status === 'active' && assignment.user_id !== userId) {
        errors.push(`Folder already assigned to user ${assignment.user_id}`);
      }
      if (assignment.is_assigned) {
        warnings.push('Folder marked as assigned in database');
      }
    } else {
      verificationLayers.database = true;
    }
    
    // Layer 2: Check for existing workflows in folder (via SSH)
    const workflowCheck = await checkFolderWorkflows(folderId);
    if (workflowCheck.hasWorkflows) {
      errors.push(`Folder contains ${workflowCheck.workflowCount} existing workflows`);
      warnings.push(`Workflows found: ${workflowCheck.workflowNames.join(', ')}`);
    } else {
      verificationLayers.content = true;
    }
    
    // Layer 3: Check for metadata file (Jimmy's recommendation)
    const metadataCheck = await checkFolderMetadataFile(folderId);
    if (metadataCheck.exists) {
      if (metadataCheck.data?.assigned_to && metadataCheck.data.assigned_to !== userId) {
        errors.push(`Metadata file shows folder assigned to ${metadataCheck.data.assigned_to}`);
        warnings.push(`Assignment date: ${metadataCheck.data.assigned_at}`);
      }
      // Verify metadata hash for tamper detection
      if (metadataCheck.hash && !verifyMetadataHash(metadataCheck.data, metadataCheck.hash)) {
        errors.push('Metadata file appears to be tampered');
      }
    } else {
      verificationLayers.metadata = true;
    }
    
    // Layer 4: Cross-source verification (Jimmy's recommendation)
    const crossCheckResult = performCrossSourceVerification({
      dbAssignment: assignment,
      folderContent: workflowCheck,
      metadataFile: metadataCheck
    });
    
    if (crossCheckResult.inconsistencies.length > 0) {
      warnings.push(...crossCheckResult.inconsistencies);
      // Mark folder for manual review if critical inconsistencies found
      if (crossCheckResult.needsManualReview) {
        errors.push('Folder state inconsistent - requires manual review');
        await markFolderForReview(folderId, crossCheckResult.inconsistencies);
      }
    } else {
      verificationLayers.crossCheck = true;
    }
    
    // Layer 5: Check audit log for recent activity
    const auditCheck = await checkFolderAuditLog(folderId);
    if (auditCheck.recentActivity) {
      warnings.push(`Recent activity detected: ${auditCheck.lastActivity}`);
      if (auditCheck.suspiciousActivity) {
        errors.push('Suspicious activity detected in audit log');
      }
    } else {
      verificationLayers.auditLog = true;
    }
    
    // Return comprehensive verification result
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      verificationLayers,
      metadata: {
        currentAssignment: assignment,
        workflowCount: workflowCheck.workflowCount,
        metadataFile: metadataCheck.data,
        crossCheckResult,
        auditLog: auditCheck
      }
    };
    
  } catch (error) {
    return {
      isValid: false,
      errors: [`Verification failed: ${error.message}`],
      warnings,
      verificationLayers,
      metadata: null
    };
  }
}

async function checkFolderWorkflows(folderId: string): Promise<WorkflowCheckResult> {
  try {
    const sshCommand = `
      sqlite3 /opt/n8n/database.sqlite "
        SELECT COUNT(*) as count, 
               GROUP_CONCAT(name, ', ') as names 
        FROM workflow_entity 
        WHERE tags LIKE '%${folderId}%'
        AND active = 1;
      "
    `;
    
    const result = await executeSSHCommand(sshCommand);
    const [count, names] = result.split('|');
    
    return {
      hasWorkflows: parseInt(count) > 0,
      workflowCount: parseInt(count),
      workflowNames: names ? names.split(', ') : []
    };
  } catch (error) {
    console.error('Error checking folder workflows:', error);
    return {
      hasWorkflows: false,
      workflowCount: 0,
      workflowNames: []
    };
  }
}

// Layer 3: Check metadata file (Jimmy's recommendation)
async function checkFolderMetadataFile(folderId: string): Promise<MetadataCheckResult> {
  try {
    // Check for metadata file in folder storage
    const { data: metadataFile, error } = await supabase.storage
      .from('folder-metadata')
      .download(`${folderId}/assignment.json`);
    
    if (error || !metadataFile) {
      return { exists: false, data: null, hash: null };
    }
    
    const metadataText = await metadataFile.text();
    const metadata = JSON.parse(metadataText);
    
    // Retrieve stored hash for tamper detection
    const { data: hashRecord } = await supabase
      .from('folder_metadata_hashes')
      .select('hash')
      .eq('folder_id', folderId)
      .single();
    
    return {
      exists: true,
      data: metadata,
      hash: hashRecord?.hash || null
    };
  } catch (error) {
    console.error('Error checking metadata file:', error);
    return { exists: false, data: null, hash: null };
  }
}

// Cross-source verification (Jimmy's recommendation)
function performCrossSourceVerification(sources: {
  dbAssignment: any,
  folderContent: WorkflowCheckResult,
  metadataFile: MetadataCheckResult
}): CrossCheckResult {
  const inconsistencies: string[] = [];
  let needsManualReview = false;
  
  // Check 1: DB says unassigned but metadata file exists
  if (!sources.dbAssignment?.is_assigned && sources.metadataFile.exists) {
    inconsistencies.push('DB shows unassigned but metadata file exists');
    needsManualReview = true;
  }
  
  // Check 2: DB says assigned but no metadata file
  if (sources.dbAssignment?.is_assigned && !sources.metadataFile.exists) {
    inconsistencies.push('DB shows assigned but no metadata file found');
    needsManualReview = true;
  }
  
  // Check 3: Folder has workflows but DB shows unassigned
  if (sources.folderContent.hasWorkflows && !sources.dbAssignment?.is_assigned) {
    inconsistencies.push(`Folder contains ${sources.folderContent.workflowCount} workflows but DB shows unassigned`);
    needsManualReview = true;
  }
  
  // Check 4: Metadata user doesn't match DB assignment
  if (sources.metadataFile.data?.assigned_to && 
      sources.dbAssignment?.user_id && 
      sources.metadataFile.data.assigned_to !== sources.dbAssignment.user_id) {
    inconsistencies.push('Metadata file user doesn\'t match DB assignment');
    needsManualReview = true;
  }
  
  return {
    inconsistencies,
    needsManualReview,
    isConsistent: inconsistencies.length === 0
  };
}

// Verify metadata hash for tamper detection
function verifyMetadataHash(data: any, storedHash: string): boolean {
  const crypto = require('crypto');
  const calculatedHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
  return calculatedHash === storedHash;
}

// Check audit log for folder activity
async function checkFolderAuditLog(folderId: string): Promise<AuditCheckResult> {
  try {
    const { data: auditLogs } = await supabase
      .from('folder_audit_log')
      .select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!auditLogs || auditLogs.length === 0) {
      return { recentActivity: false, suspiciousActivity: false };
    }
    
    const lastActivity = auditLogs[0];
    const recentActivity = new Date(lastActivity.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      'multiple_assignment_attempts',
      'metadata_tampering',
      'unauthorized_access'
    ];
    
    const suspiciousActivity = auditLogs.some(log => 
      suspiciousPatterns.some(pattern => log.action?.includes(pattern))
    );
    
    return {
      recentActivity,
      suspiciousActivity,
      lastActivity: lastActivity.action,
      logs: auditLogs
    };
  } catch (error) {
    console.error('Error checking audit log:', error);
    return { recentActivity: false, suspiciousActivity: false };
  }
}

// Mark folder for manual review
async function markFolderForReview(folderId: string, issues: string[]): Promise<void> {
  try {
    await supabase
      .from('folder_review_queue')
      .insert({
        folder_id: folderId,
        issues: issues,
        status: 'pending_review',
        created_at: new Date().toISOString()
      });
    
    // Send alert to admin
    console.error(`[MANUAL REVIEW REQUIRED] Folder ${folderId} has inconsistencies:`, issues);
  } catch (error) {
    console.error('Error marking folder for review:', error);
  }
}

/**
 * Create metadata file for newly assigned folder
 * Part of Jimmy's recommendation for persistent assignment tracking
 */
export async function createFolderMetadata(
  folderId: string,
  userId: string,
  projectId: string
): Promise<void> {
  try {
    const metadata = {
      assigned_to: userId,
      assigned_at: new Date().toISOString(),
      project_id: projectId,
      folder_id: folderId,
      version: '1.0'
    };
    
    // Calculate hash for tamper detection
    const crypto = require('crypto');
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(metadata))
      .digest('hex');
    
    // Store metadata file
    await supabase.storage
      .from('folder-metadata')
      .upload(`${folderId}/assignment.json`, JSON.stringify(metadata, null, 2), {
        contentType: 'application/json',
        upsert: false
      });
    
    // Store hash separately for verification
    await supabase
      .from('folder_metadata_hashes')
      .insert({
        folder_id: folderId,
        hash: hash,
        created_at: new Date().toISOString()
      });
    
    // Log to audit trail
    await supabase
      .from('folder_audit_log')
      .insert({
        folder_id: folderId,
        user_id: userId,
        action: 'folder_assigned',
        metadata: metadata,
        created_at: new Date().toISOString()
      });
    
  } catch (error) {
    console.error('Error creating folder metadata:', error);
    throw error;
  }
}

/**
 * Reconcile folder state across all sources
 * Fixes inconsistencies found during verification
 */
export async function reconcileFolderState(folderId: string): Promise<{
  fixed: boolean;
  actions: string[];
}> {
  const actions: string[] = [];
  
  try {
    // Get current state from all sources
    const dbState = await supabase
      .from('folder_assignments')
      .select('*')
      .eq('folder_tag_name', folderId)
      .single();
    
    const workflowCheck = await checkFolderWorkflows(folderId);
    const metadataCheck = await checkFolderMetadataFile(folderId);
    
    // Determine true state based on evidence
    const hasContent = workflowCheck.hasWorkflows;
    const hasMetadata = metadataCheck.exists;
    const dbAssigned = dbState.data?.is_assigned;
    
    // Apply reconciliation logic
    if (hasContent || hasMetadata) {
      // Folder is actually assigned
      if (!dbAssigned) {
        await supabase
          .from('folder_assignments')
          .update({ 
            is_assigned: true, 
            status: 'active',
            reconciled_at: new Date().toISOString()
          })
          .eq('folder_tag_name', folderId);
        actions.push('Updated DB to reflect assigned state');
      }
      
      if (!hasMetadata && dbState.data?.user_id) {
        // Recreate missing metadata file
        await createFolderMetadata(
          folderId,
          dbState.data.user_id,
          dbState.data.project_id
        );
        actions.push('Recreated missing metadata file');
      }
    } else {
      // Folder is actually unassigned
      if (dbAssigned) {
        await supabase
          .from('folder_assignments')
          .update({ 
            is_assigned: false,
            status: 'available',
            user_id: null,
            reconciled_at: new Date().toISOString()
          })
          .eq('folder_tag_name', folderId);
        actions.push('Updated DB to reflect unassigned state');
      }
    }
    
    return {
      fixed: true,
      actions
    };
    
  } catch (error) {
    console.error('Error reconciling folder state:', error);
    return {
      fixed: false,
      actions: [`Error: ${error.message}`]
    };
  }
}