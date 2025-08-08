/**
 * Workflow Isolation Manager for MVP
 * Implements user-specific naming conventions for n8n workflows
 */

import { createHash } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

export class WorkflowIsolationManager {
  /**
   * Generate a user-specific workflow name
   * Format: [USR-{shortId}] {workflowName}
   * Example: [USR-a1b2c3d4] Email Automation
   */
  static generateWorkflowName(userId: string, workflowName: string): string {
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
   * Extract user ID from workflow name
   * Used for cleanup and management operations
   */
  static extractUserIdFromWorkflowName(workflowName: string): string | null {
    const match = workflowName.match(/\[USR-([a-f0-9]{8})\]/);
    return match ? match[1] : null;
  }

  /**
   * Generate workflow tags for better organization
   */
  static generateWorkflowTags(userId: string, projectId?: string): string[] {
    const tags = [
      'clixen-managed',
      `user:${userId.substring(0, 8)}`,
      'mvp-trial'
    ];
    
    if (projectId) {
      tags.push(`project:${projectId.substring(0, 8)}`);
    }
    
    return tags;
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