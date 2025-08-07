/**
 * Role-Based Access Control (RBAC) and Authorization Manager for Clixen MVP
 * Handles permissions, resource ownership, and access control
 */

import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';

// User tiers and roles
export type UserTier = 'free' | 'pro' | 'enterprise';
export type UserRole = 'user' | 'admin' | 'super_admin';

// Resource types in the system
export type ResourceType = 'project' | 'workflow' | 'session' | 'api_key' | 'billing' | 'analytics';

// Permission types
export type Permission = 
  | 'read' 
  | 'write' 
  | 'delete' 
  | 'execute' 
  | 'admin' 
  | 'share' 
  | 'export' 
  | 'billing'
  | 'analytics';

// Action types for granular permissions
export type Action = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'execute' 
  | 'share' 
  | 'export' 
  | 'admin' 
  | 'billing' 
  | 'manage_users'
  | 'view_analytics';

export interface UserPermissions {
  tier: UserTier;
  role: UserRole;
  permissions: {
    [key in ResourceType]?: Permission[];
  };
  limits: {
    maxProjects: number;
    maxWorkflows: number;
    maxExecutionsPerMonth: number;
    apiRateLimit: number;
    storageQuotaGB: number;
    teamMembers: number;
  };
}

export interface ResourceAccess {
  resourceType: ResourceType;
  resourceId: string;
  userId: string;
  permissions: Permission[];
  grantedBy?: string;
  grantedAt?: Date;
  expiresAt?: Date;
}

export interface AccessControlResult {
  allowed: boolean;
  reason?: string;
  missingPermissions?: Permission[];
  upgradeRequired?: boolean;
  tierRequired?: UserTier;
}

// Permission matrix based on tier and role
const PERMISSION_MATRIX: Record<UserTier, UserPermissions> = {
  free: {
    tier: 'free',
    role: 'user',
    permissions: {
      project: ['read', 'write', 'delete'],
      workflow: ['read', 'write', 'delete', 'execute'],
      session: ['read', 'write', 'delete'],
      api_key: ['read'],
      billing: [],
      analytics: ['read']
    },
    limits: {
      maxProjects: 3,
      maxWorkflows: 10,
      maxExecutionsPerMonth: 100,
      apiRateLimit: 60, // requests per hour
      storageQuotaGB: 1,
      teamMembers: 1
    }
  },
  pro: {
    tier: 'pro',
    role: 'user',
    permissions: {
      project: ['read', 'write', 'delete', 'share'],
      workflow: ['read', 'write', 'delete', 'execute', 'share', 'export'],
      session: ['read', 'write', 'delete'],
      api_key: ['read', 'write', 'delete'],
      billing: ['read'],
      analytics: ['read']
    },
    limits: {
      maxProjects: 25,
      maxWorkflows: 100,
      maxExecutionsPerMonth: 5000,
      apiRateLimit: 300, // requests per hour
      storageQuotaGB: 10,
      teamMembers: 5
    }
  },
  enterprise: {
    tier: 'enterprise',
    role: 'user',
    permissions: {
      project: ['read', 'write', 'delete', 'share', 'admin'],
      workflow: ['read', 'write', 'delete', 'execute', 'share', 'export', 'admin'],
      session: ['read', 'write', 'delete', 'admin'],
      api_key: ['read', 'write', 'delete', 'admin'],
      billing: ['read', 'admin'],
      analytics: ['read', 'admin']
    },
    limits: {
      maxProjects: 1000,
      maxWorkflows: 10000,
      maxExecutionsPerMonth: 100000,
      apiRateLimit: 1000, // requests per hour
      storageQuotaGB: 100,
      teamMembers: 50
    }
  }
};

class AuthorizationManager {
  private static instance: AuthorizationManager;
  private userPermissionsCache: Map<string, { permissions: UserPermissions; expires: number }> = new Map();
  private resourceAccessCache: Map<string, { access: ResourceAccess[]; expires: number }> = new Map();
  
  private constructor() {}
  
  public static getInstance(): AuthorizationManager {
    if (!AuthorizationManager.instance) {
      AuthorizationManager.instance = new AuthorizationManager();
    }
    return AuthorizationManager.instance;
  }

  /**
   * Get user permissions based on their tier and role
   */
  public async getUserPermissions(userId: string): Promise<UserPermissions> {
    // Check cache first
    const cached = this.userPermissionsCache.get(userId);
    if (cached && Date.now() < cached.expires) {
      return cached.permissions;
    }

    try {
      // Get user profile from database
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('tier, role, custom_permissions, is_admin')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Failed to fetch user profile, using free tier defaults:', error);
        return PERMISSION_MATRIX.free;
      }

      const tier: UserTier = profile?.tier || 'free';
      const role: UserRole = profile?.is_admin ? 'admin' : (profile?.role || 'user');
      
      // Start with base permissions for tier
      const basePermissions = { ...PERMISSION_MATRIX[tier] };
      basePermissions.role = role;

      // Apply custom permissions if any
      if (profile?.custom_permissions) {
        try {
          const customPerms = JSON.parse(profile.custom_permissions);
          basePermissions.permissions = { 
            ...basePermissions.permissions, 
            ...customPerms 
          };
        } catch (parseError) {
          console.warn('Failed to parse custom permissions:', parseError);
        }
      }

      // Admin users get elevated permissions
      if (role === 'admin' || role === 'super_admin') {
        Object.keys(basePermissions.permissions).forEach(resource => {
          const resourceType = resource as ResourceType;
          basePermissions.permissions[resourceType] = [
            'read', 'write', 'delete', 'execute', 'admin', 'share', 'export', 'billing'
          ] as Permission[];
        });
        
        // Remove limits for admin users
        basePermissions.limits = {
          maxProjects: Infinity,
          maxWorkflows: Infinity,
          maxExecutionsPerMonth: Infinity,
          apiRateLimit: Infinity,
          storageQuotaGB: Infinity,
          teamMembers: Infinity
        };
      }

      // Cache the result for 5 minutes
      this.userPermissionsCache.set(userId, {
        permissions: basePermissions,
        expires: Date.now() + 5 * 60 * 1000
      });

      return basePermissions;

    } catch (error) {
      console.error('Error fetching user permissions:', error);
      return PERMISSION_MATRIX.free; // Fallback to free tier
    }
  }

  /**
   * Check if user has permission for a specific action on a resource type
   */
  public async hasPermission(
    userId: string,
    resourceType: ResourceType,
    permission: Permission
  ): Promise<AccessControlResult> {
    const userPermissions = await this.getUserPermissions(userId);
    const resourcePermissions = userPermissions.permissions[resourceType] || [];
    
    const hasPermission = resourcePermissions.includes(permission) || 
                         resourcePermissions.includes('admin');

    if (hasPermission) {
      return { allowed: true };
    }

    // Determine upgrade path
    const requiredTier = this.getRequiredTierForPermission(resourceType, permission);
    
    return {
      allowed: false,
      reason: `Permission '${permission}' not granted for resource '${resourceType}'`,
      missingPermissions: [permission],
      upgradeRequired: requiredTier ? userPermissions.tier !== requiredTier : false,
      tierRequired: requiredTier
    };
  }

  /**
   * Check if user owns or has access to a specific resource
   */
  public async hasResourceAccess(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    requiredPermission: Permission = 'read'
  ): Promise<AccessControlResult> {
    try {
      // First check if user has the general permission for this resource type
      const generalAccess = await this.hasPermission(userId, resourceType, requiredPermission);
      if (!generalAccess.allowed) {
        return generalAccess;
      }

      // Check resource ownership
      const isOwner = await this.verifyResourceOwnership(userId, resourceType, resourceId);
      if (isOwner) {
        return { allowed: true };
      }

      // Check shared access
      const sharedAccess = await this.getSharedResourceAccess(userId, resourceType, resourceId);
      if (sharedAccess.some(access => access.permissions.includes(requiredPermission))) {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: 'No access to this specific resource',
        missingPermissions: [requiredPermission]
      };

    } catch (error) {
      console.error('Error checking resource access:', error);
      return {
        allowed: false,
        reason: 'Failed to verify resource access'
      };
    }
  }

  /**
   * Verify if user owns a specific resource
   */
  private async verifyResourceOwnership(
    userId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<boolean> {
    try {
      let tableName: string;
      
      switch (resourceType) {
        case 'project':
          tableName = 'projects';
          break;
        case 'workflow':
          tableName = 'mvp_workflows';
          break;
        case 'session':
          tableName = 'mvp_chat_sessions';
          break;
        default:
          return false;
      }

      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .eq('id', resourceId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error verifying resource ownership:', error);
        return false;
      }

      return !!data;

    } catch (error) {
      console.error('Error in verifyResourceOwnership:', error);
      return false;
    }
  }

  /**
   * Get shared access for a resource
   */
  private async getSharedResourceAccess(
    userId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<ResourceAccess[]> {
    const cacheKey = `${userId}:${resourceType}:${resourceId}`;
    const cached = this.resourceAccessCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expires) {
      return cached.access;
    }

    try {
      // Check resource_access table for shared permissions
      const { data, error } = await supabase
        .from('resource_access')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .eq('user_id', userId)
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);

      if (error) {
        console.error('Error fetching shared resource access:', error);
        return [];
      }

      const access: ResourceAccess[] = (data || []).map(row => ({
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        userId: row.user_id,
        permissions: row.permissions || [],
        grantedBy: row.granted_by,
        grantedAt: row.granted_at ? new Date(row.granted_at) : undefined,
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined
      }));

      // Cache for 2 minutes
      this.resourceAccessCache.set(cacheKey, {
        access,
        expires: Date.now() + 2 * 60 * 1000
      });

      return access;

    } catch (error) {
      console.error('Error in getSharedResourceAccess:', error);
      return [];
    }
  }

  /**
   * Check usage limits for user
   */
  public async checkUsageLimit(
    userId: string,
    limitType: keyof UserPermissions['limits'],
    currentUsage: number
  ): Promise<{
    allowed: boolean;
    limit: number;
    usage: number;
    remaining: number;
    upgradeRequired?: boolean;
  }> {
    const permissions = await this.getUserPermissions(userId);
    const limit = permissions.limits[limitType];
    const remaining = Math.max(0, limit - currentUsage);

    return {
      allowed: currentUsage < limit,
      limit,
      usage: currentUsage,
      remaining,
      upgradeRequired: currentUsage >= limit && permissions.tier !== 'enterprise'
    };
  }

  /**
   * Get required tier for a specific permission
   */
  private getRequiredTierForPermission(
    resourceType: ResourceType,
    permission: Permission
  ): UserTier | null {
    // Find the minimum tier that grants this permission
    const tiers: UserTier[] = ['free', 'pro', 'enterprise'];
    
    for (const tier of tiers) {
      const tierPermissions = PERMISSION_MATRIX[tier].permissions[resourceType] || [];
      if (tierPermissions.includes(permission)) {
        return tier;
      }
    }

    return 'enterprise'; // Default to highest tier if not found
  }

  /**
   * Share a resource with another user
   */
  public async shareResource(
    ownerId: string,
    targetUserId: string,
    resourceType: ResourceType,
    resourceId: string,
    permissions: Permission[],
    expiresAt?: Date
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify owner has sharing permissions
      const ownerAccess = await this.hasResourceAccess(ownerId, resourceType, resourceId, 'share');
      if (!ownerAccess.allowed) {
        return {
          success: false,
          error: 'You do not have permission to share this resource'
        };
      }

      // Insert or update resource access
      const { error } = await supabase
        .from('resource_access')
        .upsert({
          user_id: targetUserId,
          resource_type: resourceType,
          resource_id: resourceId,
          permissions,
          granted_by: ownerId,
          granted_at: new Date().toISOString(),
          expires_at: expiresAt?.toISOString() || null
        }, {
          onConflict: 'user_id,resource_type,resource_id'
        });

      if (error) {
        console.error('Error sharing resource:', error);
        return {
          success: false,
          error: 'Failed to share resource'
        };
      }

      // Clear cache for target user
      const cacheKey = `${targetUserId}:${resourceType}:${resourceId}`;
      this.resourceAccessCache.delete(cacheKey);

      return { success: true };

    } catch (error) {
      console.error('Error in shareResource:', error);
      return {
        success: false,
        error: 'Failed to share resource'
      };
    }
  }

  /**
   * Revoke resource access
   */
  public async revokeResourceAccess(
    ownerId: string,
    targetUserId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify owner has admin permissions or is the one who granted access
      const ownerAccess = await this.hasResourceAccess(ownerId, resourceType, resourceId, 'admin');
      if (!ownerAccess.allowed) {
        // Check if owner originally granted the access
        const { data } = await supabase
          .from('resource_access')
          .select('granted_by')
          .eq('user_id', targetUserId)
          .eq('resource_type', resourceType)
          .eq('resource_id', resourceId)
          .single();

        if (!data || data.granted_by !== ownerId) {
          return {
            success: false,
            error: 'You do not have permission to revoke access to this resource'
          };
        }
      }

      // Remove resource access
      const { error } = await supabase
        .from('resource_access')
        .delete()
        .eq('user_id', targetUserId)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId);

      if (error) {
        console.error('Error revoking resource access:', error);
        return {
          success: false,
          error: 'Failed to revoke resource access'
        };
      }

      // Clear cache
      const cacheKey = `${targetUserId}:${resourceType}:${resourceId}`;
      this.resourceAccessCache.delete(cacheKey);

      return { success: true };

    } catch (error) {
      console.error('Error in revokeResourceAccess:', error);
      return {
        success: false,
        error: 'Failed to revoke resource access'
      };
    }
  }

  /**
   * Get all resources shared with a user
   */
  public async getSharedResources(
    userId: string,
    resourceType?: ResourceType
  ): Promise<ResourceAccess[]> {
    try {
      let query = supabase
        .from('resource_access')
        .select('*')
        .eq('user_id', userId)
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);

      if (resourceType) {
        query = query.eq('resource_type', resourceType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching shared resources:', error);
        return [];
      }

      return (data || []).map(row => ({
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        userId: row.user_id,
        permissions: row.permissions || [],
        grantedBy: row.granted_by,
        grantedAt: row.granted_at ? new Date(row.granted_at) : undefined,
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined
      }));

    } catch (error) {
      console.error('Error in getSharedResources:', error);
      return [];
    }
  }

  /**
   * Clear permission caches
   */
  public clearCache(userId?: string): void {
    if (userId) {
      this.userPermissionsCache.delete(userId);
      // Clear resource access cache for this user
      const keysToDelete: string[] = [];
      for (const key of this.resourceAccessCache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.resourceAccessCache.delete(key));
    } else {
      this.userPermissionsCache.clear();
      this.resourceAccessCache.clear();
    }
  }

  /**
   * Get permission summary for UI
   */
  public async getPermissionSummary(userId: string): Promise<{
    tier: UserTier;
    role: UserRole;
    limits: UserPermissions['limits'];
    features: string[];
    upgradeRecommendations: string[];
  }> {
    const permissions = await this.getUserPermissions(userId);
    
    const features: string[] = [];
    const upgradeRecommendations: string[] = [];

    // Determine available features based on permissions
    Object.entries(permissions.permissions).forEach(([resource, perms]) => {
      if (perms.includes('execute')) {
        features.push(`Execute ${resource}s`);
      }
      if (perms.includes('share')) {
        features.push(`Share ${resource}s`);
      }
      if (perms.includes('export')) {
        features.push(`Export ${resource}s`);
      }
      if (perms.includes('admin')) {
        features.push(`Manage ${resource}s`);
      }
    });

    // Generate upgrade recommendations based on tier
    if (permissions.tier === 'free') {
      upgradeRecommendations.push('Upgrade to Pro for resource sharing');
      upgradeRecommendations.push('Upgrade to Pro for advanced analytics');
      upgradeRecommendations.push('Upgrade to Pro for API access');
    } else if (permissions.tier === 'pro') {
      upgradeRecommendations.push('Upgrade to Enterprise for team management');
      upgradeRecommendations.push('Upgrade to Enterprise for advanced integrations');
      upgradeRecommendations.push('Upgrade to Enterprise for priority support');
    }

    return {
      tier: permissions.tier,
      role: permissions.role,
      limits: permissions.limits,
      features,
      upgradeRecommendations
    };
  }
}

// Export singleton instance
export const authorizationManager = AuthorizationManager.getInstance();

// Export permission constants for easy access
export const PERMISSIONS = {
  READ: 'read' as Permission,
  WRITE: 'write' as Permission,
  DELETE: 'delete' as Permission,
  EXECUTE: 'execute' as Permission,
  ADMIN: 'admin' as Permission,
  SHARE: 'share' as Permission,
  EXPORT: 'export' as Permission,
  BILLING: 'billing' as Permission
};

export const RESOURCES = {
  PROJECT: 'project' as ResourceType,
  WORKFLOW: 'workflow' as ResourceType,
  SESSION: 'session' as ResourceType,
  API_KEY: 'api_key' as ResourceType,
  BILLING: 'billing' as ResourceType,
  ANALYTICS: 'analytics' as ResourceType
};

export default authorizationManager;