import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export interface UserAssignment {
  project_id: string
  folder_id: string
  status: string
  assigned_at: string
}

export interface UserQuotas {
  workflow_quota: number
  execution_quota: number
  workflows_created: number
  executions_used: number
}

export interface ValidationResult {
  canCreate: boolean
  assignment?: UserAssignment
  quotas?: UserQuotas
  errors: string[]
  warnings: string[]
}

export class WorkflowValidator {
  
  /**
   * Comprehensive validation before workflow creation
   */
  async validateUserCanCreateWorkflow(userId: string): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      console.log(`🔍 Validating workflow creation for user: ${userId}`)
      
      // Check 1: User has valid project/folder assignment
      const assignment = await this.getUserAssignment(userId)
      if (!assignment) {
        errors.push('User not assigned to project/folder. Please contact support.')
        return { canCreate: false, errors, warnings }
      }
      
      if (assignment.status !== 'active') {
        errors.push(`User assignment is ${assignment.status}. Please contact support.`)
        return { canCreate: false, errors, warnings }
      }
      
      console.log(`✅ User assigned to: ${assignment.project_id} -> ${assignment.folder_id}`)
      
      // Check 2: User hasn't exceeded workflow quota
      const quotas = await this.getUserQuotas(userId)
      if (quotas.workflows_created >= quotas.workflow_quota) {
        errors.push(`Workflow limit reached (${quotas.workflows_created}/${quotas.workflow_quota})`)
        return { canCreate: false, assignment, quotas, errors, warnings }
      }
      
      // Warning for approaching quota
      if (quotas.workflows_created >= quotas.workflow_quota * 0.8) {
        warnings.push(`Approaching workflow limit (${quotas.workflows_created}/${quotas.workflow_quota})`)
      }
      
      console.log(`✅ Quota check passed: ${quotas.workflows_created}/${quotas.workflow_quota} workflows`)
      
      // Check 3: Folder still exists and is valid
      const folderValid = await this.validateFolder(assignment.folder_id)
      if (!folderValid) {
        errors.push('Assigned folder no longer available. Please contact support.')
        return { canCreate: false, assignment, quotas, errors, warnings }
      }
      
      console.log(`✅ Folder validation passed: ${assignment.folder_id}`)
      
      // Check 4: System capacity check
      const systemCapacity = await this.checkSystemCapacity()
      if (!systemCapacity.available) {
        errors.push('System at capacity. Please try again later.')
        return { canCreate: false, assignment, quotas, errors, warnings }
      }
      
      if (systemCapacity.utilizationPercent > 80) {
        warnings.push(`System utilization high (${systemCapacity.utilizationPercent}%)`)
      }
      
      console.log(`✅ All validation checks passed`)
      
      return { 
        canCreate: true, 
        assignment, 
        quotas, 
        errors: [], 
        warnings 
      }
      
    } catch (error) {
      console.error('Validation error:', error)
      errors.push(`Validation failed: ${error.message}`)
      return { canCreate: false, errors, warnings }
    }
  }
  
  /**
   * Get user's project and folder assignment
   */
  private async getUserAssignment(userId: string): Promise<UserAssignment | null> {
    try {
      const { data, error } = await supabase
        .from('user_assignments')
        .select('project_id, folder_id, status, assigned_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()
      
      if (error) {
        console.warn('No user assignment found:', error.message)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error fetching user assignment:', error)
      return null
    }
  }
  
  /**
   * Get user's current quotas and usage
   */
  private async getUserQuotas(userId: string): Promise<UserQuotas> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('workflow_quota, execution_quota, workflows_created, executions_used')
        .eq('user_id', userId)
        .single()
      
      if (error || !data) {
        console.warn('No user settings found, using defaults')
        return {
          workflow_quota: 10,
          execution_quota: 1000,
          workflows_created: 0,
          executions_used: 0
        }
      }
      
      return data
    } catch (error) {
      console.error('Error fetching user quotas:', error)
      // Return safe defaults
      return {
        workflow_quota: 10,
        execution_quota: 1000,
        workflows_created: 0,
        executions_used: 0
      }
    }
  }
  
  /**
   * Validate that the assigned folder still exists in n8n
   */
  private async validateFolder(folderId: string): Promise<boolean> {
    try {
      // This would typically call your n8n MCP service
      // For now, we'll assume folder validation via API call
      const response = await fetch('/api/validate-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({ folderId })
      })
      
      if (!response.ok) {
        console.warn(`Folder validation failed: ${response.status}`)
        return false
      }
      
      const result = await response.json()
      return result.exists === true
      
    } catch (error) {
      console.error('Folder validation error:', error)
      // Default to true to avoid blocking users on validation failures
      return true
    }
  }
  
  /**
   * Check overall system capacity
   */
  private async checkSystemCapacity(): Promise<{
    available: boolean
    utilizationPercent: number
    availableFolders: number
    totalFolders: number
  }> {
    try {
      // This would call your capacity monitoring API
      const response = await fetch('/api/system-capacity', {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      })
      
      if (!response.ok) {
        // Default to available if check fails
        return {
          available: true,
          utilizationPercent: 0,
          availableFolders: 50,
          totalFolders: 50
        }
      }
      
      const data = await response.json()
      return {
        available: data.availableFolders > 0,
        utilizationPercent: Math.round((data.usedFolders / data.totalFolders) * 100),
        availableFolders: data.availableFolders,
        totalFolders: data.totalFolders
      }
      
    } catch (error) {
      console.error('System capacity check error:', error)
      // Default to available if check fails
      return {
        available: true,
        utilizationPercent: 0,
        availableFolders: 50,
        totalFolders: 50
      }
    }
  }
  
  /**
   * Get current user's auth token
   */
  private async getAuthToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }
  
  /**
   * Update user's workflow count after successful creation
   */
  async incrementWorkflowCount(userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_workflow_count', {
        user_id: userId
      })
      
      if (error) {
        console.error('Failed to increment workflow count:', error)
      }
    } catch (error) {
      console.error('Error incrementing workflow count:', error)
    }
  }
  
  /**
   * Get validation status summary for dashboard
   */
  async getValidationSummary(userId: string): Promise<{
    canCreateWorkflow: boolean
    quotaUsage: {
      workflows: { used: number, total: number, percent: number }
      executions: { used: number, total: number, percent: number }
    }
    assignment: UserAssignment | null
    systemStatus: 'healthy' | 'warning' | 'critical'
  }> {
    const validation = await this.validateUserCanCreateWorkflow(userId)
    
    const quotaUsage = validation.quotas ? {
      workflows: {
        used: validation.quotas.workflows_created,
        total: validation.quotas.workflow_quota,
        percent: Math.round((validation.quotas.workflows_created / validation.quotas.workflow_quota) * 100)
      },
      executions: {
        used: validation.quotas.executions_used,
        total: validation.quotas.execution_quota,
        percent: Math.round((validation.quotas.executions_used / validation.quotas.execution_quota) * 100)
      }
    } : {
      workflows: { used: 0, total: 10, percent: 0 },
      executions: { used: 0, total: 1000, percent: 0 }
    }
    
    let systemStatus: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (validation.errors.length > 0) {
      systemStatus = 'critical'
    } else if (validation.warnings.length > 0) {
      systemStatus = 'warning'
    }
    
    return {
      canCreateWorkflow: validation.canCreate,
      quotaUsage,
      assignment: validation.assignment || null,
      systemStatus
    }
  }
}