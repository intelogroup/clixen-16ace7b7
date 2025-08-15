import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface WorkflowWithAssignment {
  id: string
  name: string
  active: boolean
  created_at: string
  updated_at: string
  project_id?: string
  folder_id?: string
  project_name?: string
  execution_count?: number
  last_execution?: string
  status: 'active' | 'inactive' | 'error'
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const user_id = url.searchParams.get('user_id')
    const project_id = url.searchParams.get('project_id')
    const folder_id = url.searchParams.get('folder_id')

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`🔍 Fetching workflows for user ${user_id}`)

    // Get user's folder assignment
    const { data: userAssignment } = await supabase
      .from('folder_assignments')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .single()

    if (!userAssignment) {
      return new Response(
        JSON.stringify({ 
          error: 'User not assigned to any project folder',
          workflows: [],
          user_assignment: null
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get workflows assigned to user's project/folder
    let query = supabase
      .from('workflow_assignments')
      .select(`
        workflow_id,
        project_id,
        folder_id,
        assigned_at,
        status,
        workflows:workflow_id (
          id,
          name,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user_id)
      .eq('status', 'active')

    // Apply additional filters if provided
    if (project_id) {
      query = query.eq('project_id', project_id)
    }
    if (folder_id) {
      query = query.eq('folder_id', folder_id)
    }

    const { data: assignments, error } = await query

    if (error) {
      throw new Error(`Failed to fetch workflow assignments: ${error.message}`)
    }

    // Get n8n API data for each workflow
    const n8nApiKey = Deno.env.get('N8N_API_KEY')!
    const n8nApiUrl = Deno.env.get('N8N_API_URL')!

    const enrichedWorkflows: WorkflowWithAssignment[] = []

    for (const assignment of assignments || []) {
      try {
        // Fetch workflow details from n8n API
        const workflowResponse = await fetch(`${n8nApiUrl}/workflows/${assignment.workflow_id}`, {
          headers: {
            'X-N8N-API-KEY': n8nApiKey
          }
        })

        if (workflowResponse.ok) {
          const workflowData = await workflowResponse.json()

          // Fetch execution history
          const executionsResponse = await fetch(
            `${n8nApiUrl}/executions?workflowId=${assignment.workflow_id}&limit=10`,
            {
              headers: {
                'X-N8N-API-KEY': n8nApiKey
              }
            }
          )

          let executionCount = 0
          let lastExecution = null

          if (executionsResponse.ok) {
            const executionsData = await executionsResponse.json()
            executionCount = executionsData.count || 0
            lastExecution = executionsData.data?.[0]?.startedAt || null
          }

          enrichedWorkflows.push({
            id: workflowData.id,
            name: workflowData.name,
            active: workflowData.active,
            created_at: workflowData.createdAt,
            updated_at: workflowData.updatedAt,
            project_id: assignment.project_id,
            folder_id: assignment.folder_id,
            project_name: assignment.project_id, // Could be enhanced with actual project names
            execution_count: executionCount,
            last_execution: lastExecution,
            status: workflowData.active ? 'active' : 'inactive'
          })
        }
      } catch (workflowError) {
        console.error(`⚠️ Failed to fetch workflow ${assignment.workflow_id}:`, workflowError)
        // Add workflow with error status
        enrichedWorkflows.push({
          id: assignment.workflow_id,
          name: `Workflow ${assignment.workflow_id}`,
          active: false,
          created_at: assignment.assigned_at,
          updated_at: assignment.assigned_at,
          project_id: assignment.project_id,
          folder_id: assignment.folder_id,
          status: 'error'
        })
      }
    }

    // Get user's available projects and folders
    const availableProjects = await getAvailableProjects(userAssignment)
    const availableFolders = await getAvailableFolders(userAssignment)

    return new Response(
      JSON.stringify({
        success: true,
        user_id,
        user_assignment: {
          project_number: userAssignment.project_number,
          folder_tag_name: userAssignment.folder_tag_name,
          user_slot: userAssignment.user_slot,
          assigned_at: userAssignment.assigned_at
        },
        workflows: enrichedWorkflows,
        available_projects: availableProjects,
        available_folders: availableFolders,
        total_workflows: enrichedWorkflows.length,
        active_workflows: enrichedWorkflows.filter(w => w.status === 'active').length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Enhanced workflows error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getAvailableProjects(userAssignment: any) {
  // For now, user is assigned to one project
  // In the future, this could be expanded to multiple projects
  return [
    {
      id: `CLIXEN-PROJ-${userAssignment.project_number.toString().padStart(2, '0')}`,
      name: `Clixen Project ${userAssignment.project_number}`,
      number: userAssignment.project_number
    }
  ]
}

async function getAvailableFolders(userAssignment: any) {
  // For now, user is assigned to one folder
  // In the future, this could be expanded to multiple folders per project
  return [
    {
      id: userAssignment.folder_tag_name,
      name: `Folder ${userAssignment.user_slot}`,
      project_number: userAssignment.project_number,
      user_slot: userAssignment.user_slot
    }
  ]
}