import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types
interface UserAssignmentResult {
  success: boolean
  projectId?: string
  folderId?: string
  error?: string
}

interface SSHCommandResult {
  success: boolean
  data?: any
  error?: string
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { record, type } = await req.json()
    
    // Only handle user signup events
    if (type !== 'INSERT') {
      return new Response('Event not handled', { 
        status: 200, 
        headers: corsHeaders 
      })
    }

    const userId = record.id
    const email = record.email

    console.log(`Processing signup for user: ${userId} (${email})`)

    // Step 1: Assign user to project
    const projectId = assignUserToProject(userId)
    console.log(`Assigned to project: ${projectId}`)

    // Step 2: Find and assign available folder
    const folderResult = await assignUserToFolder(userId, projectId)
    if (!folderResult.success) {
      throw new Error(folderResult.error || 'Folder assignment failed')
    }

    // Step 3: Store assignment in Supabase
    await storeUserAssignment(userId, projectId, folderResult.folderId!)

    // Step 4: Initialize user settings
    await initializeUserSettings(userId, email)

    console.log(`User assignment complete: ${projectId} -> ${folderResult.folderId}`)

    return new Response(JSON.stringify({
      success: true,
      projectId,
      folderId: folderResult.folderId,
      message: 'User successfully assigned to project and folder'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('User signup handler error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Hash-based project assignment for even distribution
function assignUserToProject(userId: string): string {
  // Simple hash function to distribute users evenly
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  const projectNumber = (Math.abs(hash) % 10) + 1
  return `CLIXEN-PROJ-${String(projectNumber).padStart(2, '0')}`
}

// Find and assign available folder
async function assignUserToFolder(userId: string, projectId: string): Promise<{
  success: boolean
  folderId?: string
  error?: string
}> {
  try {
    // First, try to find available folder in assigned project
    const availableInProject = await executeSSH(`
      SELECT folder_id FROM folder_assignments 
      WHERE project_id = '${projectId}' AND is_assigned = 0 
      ORDER BY folder_id LIMIT 1;
    `)

    if (availableInProject.success && availableInProject.data?.folder_id) {
      // Assign this folder to the user
      const assignResult = await executeSSH(`
        UPDATE folder_assignments 
        SET user_id = '${userId}', 
            is_assigned = 1, 
            assigned_at = datetime('now')
        WHERE folder_id = '${availableInProject.data.folder_id}';
      `)

      if (assignResult.success) {
        return {
          success: true,
          folderId: availableInProject.data.folder_id
        }
      }
    }

    // Fallback: Find any available folder in any project
    console.log(`No folders available in ${projectId}, trying system-wide...`)
    
    const availableAnywhere = await executeSSH(`
      SELECT folder_id, project_id FROM folder_assignments 
      WHERE is_assigned = 0 
      ORDER BY project_id, folder_id LIMIT 1;
    `)

    if (availableAnywhere.success && availableAnywhere.data?.folder_id) {
      const assignResult = await executeSSH(`
        UPDATE folder_assignments 
        SET user_id = '${userId}', 
            is_assigned = 1, 
            assigned_at = datetime('now')
        WHERE folder_id = '${availableAnywhere.data.folder_id}';
      `)

      if (assignResult.success) {
        console.log(`Assigned to fallback folder: ${availableAnywhere.data.folder_id}`)
        return {
          success: true,
          folderId: availableAnywhere.data.folder_id
        }
      }
    }

    return {
      success: false,
      error: 'No available folders - system at capacity'
    }

  } catch (error) {
    return {
      success: false,
      error: `Folder assignment error: ${error.message}`
    }
  }
}

// Execute SSH command to n8n database
async function executeSSH(sqlCommand: string): Promise<SSHCommandResult> {
  try {
    const sshHost = Deno.env.get('SSH_HOST')
    const sshPort = Deno.env.get('SSH_PORT') || '22222'
    const dbPath = '/opt/n8n/database.sqlite'

    // In a real implementation, you'd use a proper SSH client
    // For now, this is a placeholder for the SSH command structure
    console.log(`SSH Command: ${sqlCommand}`)
    
    // This would be replaced with actual SSH execution
    // const result = await sshExec(`sqlite3 ${dbPath} "${sqlCommand}"`)
    
    // Simulated response - replace with actual SSH implementation
    return {
      success: true,
      data: { folder_id: 'FOLDER-P01-U1' } // Placeholder
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Store user assignment in Supabase
async function storeUserAssignment(userId: string, projectId: string, folderId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { error } = await supabase
    .from('user_assignments')
    .insert({
      user_id: userId,
      project_id: projectId,
      folder_id: folderId,
      assigned_at: new Date().toISOString(),
      status: 'active'
    })

  if (error) {
    throw new Error(`Failed to store user assignment: ${error.message}`)
  }
}

// Initialize user settings with default quotas
async function initializeUserSettings(userId: string, email: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { error } = await supabase
    .from('user_settings')
    .insert({
      user_id: userId,
      workflow_quota: 10,
      execution_quota: 1000,
      workflows_created: 0,
      executions_used: 0
    })

  if (error) {
    console.warn(`Failed to initialize user settings: ${error.message}`)
    // Don't throw - this is not critical for signup
  }
}