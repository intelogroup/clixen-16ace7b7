import { WorkflowValidator, type UserAssignment, type ValidationResult } from './workflowValidation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export interface WorkflowCreationRequest {
  name: string
  description?: string
  nodes: any[]
  connections: any
  settings?: any
}

export interface WorkflowCreationResult {
  success: boolean
  workflowId?: string
  workflowName?: string
  errors: string[]
  warnings: string[]
  assignment?: UserAssignment
}

export class EnhancedWorkflowService {
  private validator = new WorkflowValidator()
  
  /**
   * Create workflow with full validation and assignment
   */
  async createWorkflow(
    userId: string, 
    workflowData: WorkflowCreationRequest
  ): Promise<WorkflowCreationResult> {
    
    console.log(`🚀 Creating workflow for user: ${userId}`)
    console.log(`Workflow: ${workflowData.name}`)
    
    // STEP 1: Comprehensive validation
    const validation = await this.validator.validateUserCanCreateWorkflow(userId)
    
    if (!validation.canCreate) {
      console.error('❌ Validation failed:', validation.errors)
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings || []
      }
    }
    
    const { assignment, quotas } = validation
    console.log(`✅ Validation passed for ${assignment!.project_id} -> ${assignment!.folder_id}`)
    
    try {
      // STEP 2: Prepare workflow with proper naming and structure
      const workflowName = `[USR-${userId}] ${workflowData.name}`
      
      const n8nWorkflow = {
        name: workflowName,
        nodes: workflowData.nodes,
        connections: workflowData.connections,
        settings: workflowData.settings || { executionOrder: "v1" }
        // Explicitly exclude read-only properties
      }
      
      console.log(`📝 Prepared workflow: ${workflowName}`)
      
      // STEP 3: Create workflow in n8n via API/MCP
      const created = await this.createWorkflowInN8n(n8nWorkflow)
      
      if (!created.success) {
        throw new Error(created.error || 'n8n workflow creation failed')
      }
      
      console.log(`✅ Workflow created in n8n: ${created.workflowId}`)
      
      // STEP 4: Assign workflow to user's project and folder
      await this.assignWorkflowToUserSpace(created.workflowId!, assignment!)
      console.log(`✅ Workflow assigned to project and folder`)
      
      // STEP 5: Update user quotas
      await this.validator.incrementWorkflowCount(userId)
      console.log(`✅ User quota updated`)
      
      // STEP 6: Store workflow metadata in Supabase
      await this.storeWorkflowMetadata(
        userId, 
        created.workflowId!, 
        workflowName, 
        assignment!,
        workflowData.description
      )
      console.log(`✅ Workflow metadata stored`)
      
      return {
        success: true,
        workflowId: created.workflowId,
        workflowName: workflowName,
        errors: [],
        warnings: validation.warnings || [],
        assignment: assignment
      }
      
    } catch (error) {
      console.error('❌ Workflow creation failed:', error)
      return {
        success: false,
        errors: [`Workflow creation failed: ${error.message}`],
        warnings: validation.warnings || []
      }
    }
  }
  
  /**
   * Create workflow in n8n via API
   */
  private async createWorkflowInN8n(workflowData: any): Promise<{
    success: boolean
    workflowId?: string
    error?: string
  }> {
    try {
      // Option 1: Use MCP n8n server if available
      if (this.isMCPAvailable()) {
        return await this.createViaMCP(workflowData)
      }
      
      // Option 2: Direct n8n API call
      return await this.createViaN8nAPI(workflowData)
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * Create workflow via MCP n8n server
   */
  private async createViaMCP(workflowData: any): Promise<{
    success: boolean
    workflowId?: string
    error?: string
  }> {
    try {
      // This would call your MCP n8n integration
      const response = await fetch('/api/mcp/n8n/create-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({ workflow: workflowData })
      })
      
      if (!response.ok) {
        throw new Error(`MCP API error: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'MCP workflow creation failed')
      }
      
      return {
        success: true,
        workflowId: result.workflowId
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * Create workflow via direct n8n API
   */
  private async createViaN8nAPI(workflowData: any): Promise<{
    success: boolean
    workflowId?: string
    error?: string
  }> {
    try {
      const n8nUrl = import.meta.env.VITE_N8N_API_URL
      const n8nApiKey = import.meta.env.VITE_N8N_API_KEY
      
      const response = await fetch(`${n8nUrl}/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': n8nApiKey
        },
        body: JSON.stringify(workflowData)
      })
      
      if (!response.ok) {
        throw new Error(`n8n API error: ${response.status}`)
      }
      
      const result = await response.json()
      
      return {
        success: true,
        workflowId: result.id
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * Assign workflow to user's project and folder via SSH automation
   */
  private async assignWorkflowToUserSpace(
    workflowId: string, 
    assignment: UserAssignment
  ): Promise<void> {
    try {
      // Call your SSH automation API
      const response = await fetch('/api/ssh/assign-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          workflowId,
          projectId: assignment.project_id,
          folderId: assignment.folder_id
        })
      })
      
      if (!response.ok) {
        throw new Error(`SSH assignment failed: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'SSH assignment failed')
      }
      
    } catch (error) {
      console.error('SSH assignment error:', error)
      throw new Error(`Failed to assign workflow to user space: ${error.message}`)
    }
  }
  
  /**
   * Store workflow metadata in Supabase
   */
  private async storeWorkflowMetadata(
    userId: string,
    workflowId: string,
    workflowName: string,
    assignment: UserAssignment,
    description?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_workflows')
        .insert({
          user_id: userId,
          workflow_id: workflowId,
          workflow_name: workflowName,
          project_id: assignment.project_id,
          folder_id: assignment.folder_id,
          description: description || null,
          created_at: new Date().toISOString(),
          status: 'active'
        })
      
      if (error) {
        throw new Error(`Failed to store workflow metadata: ${error.message}`)
      }
      
    } catch (error) {
      console.error('Metadata storage error:', error)
      throw error
    }
  }
  
  /**
   * Get user's workflows with proper filtering
   */
  async getUserWorkflows(userId: string): Promise<{
    success: boolean
    workflows: any[]
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .from('user_workflows')
        .select(`
          workflow_id,
          workflow_name,
          description,
          project_id,
          folder_id,
          created_at,
          updated_at,
          status
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new Error(error.message)
      }
      
      return {
        success: true,
        workflows: data || []
      }
      
    } catch (error) {
      return {
        success: false,
        workflows: [],
        error: error.message
      }
    }
  }
  
  /**
   * Check if MCP n8n server is available
   */
  private isMCPAvailable(): boolean {
    // This would check if your MCP integration is available
    // For now, return false to use direct API
    return false
  }
  
  /**
   * Get current user's auth token
   */
  private async getAuthToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }
  
  /**
   * Delete workflow with proper cleanup
   */
  async deleteWorkflow(userId: string, workflowId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // Validate user owns this workflow
      const { data: workflow } = await supabase
        .from('user_workflows')
        .select('workflow_id, folder_id')
        .eq('user_id', userId)
        .eq('workflow_id', workflowId)
        .single()
      
      if (!workflow) {
        throw new Error('Workflow not found or access denied')
      }
      
      // Delete from n8n
      await this.deleteFromN8n(workflowId)
      
      // Mark as deleted in Supabase
      await supabase
        .from('user_workflows')
        .update({ 
          status: 'deleted',
          deleted_at: new Date().toISOString()
        })
        .eq('workflow_id', workflowId)
        .eq('user_id', userId)
      
      // Decrement user's workflow count
      await supabase.rpc('decrement_workflow_count', {
        user_id: userId
      })
      
      return { success: true }
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * Delete workflow from n8n
   */
  private async deleteFromN8n(workflowId: string): Promise<void> {
    try {
      const n8nUrl = import.meta.env.VITE_N8N_API_URL
      const n8nApiKey = import.meta.env.VITE_N8N_API_KEY
      
      const response = await fetch(`${n8nUrl}/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: {
          'X-N8N-API-KEY': n8nApiKey
        }
      })
      
      if (!response.ok && response.status !== 404) {
        throw new Error(`n8n deletion failed: ${response.status}`)
      }
      
    } catch (error) {
      console.error('n8n deletion error:', error)
      // Don't throw - workflow might already be deleted
    }
  }
}