/**
 * Workflow Isolation Manager for MVP
 * Implements user-specific naming conventions for n8n workflows
 */

import { createHash } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

export class WorkflowIsolationManager {
  /**
   * Generate a user-specific workflow name with project isolation
   * Format: [USR-{shortUserId}][PRJ-{shortProjectId}] {workflowName}
   * Example: [USR-a1b2c3d4][PRJ-x9y8z7w6] Email Automation
   */
  static generateWorkflowName(userId: string, projectId: string, workflowName: string): string {
    const shortUserId = userId.substring(0, 8);
    const shortProjectId = projectId.substring(0, 8);
    const sanitizedName = workflowName
      .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special chars
      .substring(0, 40); // Reduced to accommodate project prefix
    
    return `[USR-${shortUserId}][PRJ-${shortProjectId}] ${sanitizedName}`;
  }

  /**
   * Generate a legacy user-specific workflow name (backward compatibility)
   * Format: [USR-{shortId}] {workflowName}
   * Example: [USR-a1b2c3d4] Email Automation
   */
  static generateLegacyWorkflowName(userId: string, workflowName: string): string {
    const shortUserId = userId.substring(0, 8);
    const sanitizedName = workflowName
      .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special chars
      .substring(0, 50); // Limit length
    
    return `[USR-${shortUserId}] ${sanitizedName}`;
  }

  /**
   * Generate a unique webhook path with user context
   * Format: webhook/{userHash}/{timestamp}/{random}
   * Example: webhook/a1b2c3d4/1754654400/x9y8z7
   */
  static generateWebhookPath(userId: string, triggerType: string): string {
    const userHash = userId.substring(0, 8);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    return `webhook/${userHash}/${timestamp}/${random}`;
  }

  /**
   * Extract user ID from workflow name (supports both formats)
   * Used for cleanup and management operations
   */
  static extractUserIdFromWorkflowName(workflowName: string): string | null {
    // Try new format first: [USR-{userId}][PRJ-{projectId}]
    let match = workflowName.match(/\[USR-([a-f0-9]{8})\]\[PRJ-[a-f0-9]{8}\]/);
    if (match) return match[1];
    
    // Fall back to legacy format: [USR-{userId}]
    match = workflowName.match(/\[USR-([a-f0-9]{8})\]/);
    return match ? match[1] : null;
  }

  /**
   * Extract project ID from workflow name
   * Returns null for legacy format workflows
   */
  static extractProjectIdFromWorkflowName(workflowName: string): string | null {
    const match = workflowName.match(/\[USR-[a-f0-9]{8}\]\[PRJ-([a-f0-9]{8})\]/);
    return match ? match[1] : null;
  }

  /**
   * Check if workflow name uses new format with project isolation
   */
  static isEnhancedFormat(workflowName: string): boolean {
    return /\[USR-[a-f0-9]{8}\]\[PRJ-[a-f0-9]{8}\]/.test(workflowName);
  }

  /**
   * Generate workflow tags for better organization
   */
  static generateWorkflowTags(userId: string, projectId?: string): string[] {
    const tags = [
      'clixen-managed',
      `user:${userId.substring(0, 8)}`,
      'enhanced-isolation'
    ];
    
    if (projectId) {
      tags.push(`project:${projectId.substring(0, 8)}`);
      tags.push('workspace-enabled');
    } else {
      tags.push('legacy-format');
    }
    
    return tags;
  }

  /**
   * Generate user workspace identifier for database tracking
   */
  static generateWorkspaceId(userId: string, email: string): string {
    const username = email.split('@')[0].toLowerCase();
    const userHash = userId.substring(0, 8);
    return `${username}-workspace-${userHash}`;
  }

  /**
   * Filter workflows by user prefix (supports both formats)
   */
  static filterWorkflowsByUser(workflows: any[], userId: string): any[] {
    const shortUserId = userId.substring(0, 8);
    return workflows.filter(workflow => 
      workflow.name && workflow.name.includes(`[USR-${shortUserId}]`)
    );
  }

  /**
   * Filter workflows by user and project
   */
  static filterWorkflowsByUserAndProject(workflows: any[], userId: string, projectId: string): any[] {
    const shortUserId = userId.substring(0, 8);
    const shortProjectId = projectId.substring(0, 8);
    return workflows.filter(workflow => 
      workflow.name && 
      workflow.name.includes(`[USR-${shortUserId}]`) &&
      workflow.name.includes(`[PRJ-${shortProjectId}]`)
    );
  }

  /**
   * Sanitize workflow description to prevent injection
   */
  static sanitizeDescription(description: string): string {
    return description
      .replace(/[<>]/g, '') // Remove HTML tags
      .substring(0, 200); // Limit length
  }
}