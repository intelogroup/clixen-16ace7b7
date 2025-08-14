/**
 * Clixen Auto Project Creator - Supabase Edge Function
 * 
 * Automatically creates a project for new users upon signup
 * Uses our custom naming convention: {username}-project-{datetime}-user-{8digitcode}
 * 
 * Triggered by: Supabase Auth user creation
 * Flow: User Signup → Auth Table → Trigger → Edge Function → Create Project
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { 
  generateProjectName, 
  generateProjectDescription, 
  extractUsername 
} from '../_shared/project-naming.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreateProjectRequest {
  user_id: string;
  email: string;
  trigger_type?: 'signup' | 'manual';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { user_id, email, trigger_type = 'signup' }: CreateProjectRequest = await req.json()

    if (!user_id || !email) {
      throw new Error('user_id and email are required')
    }

    console.log(`🚀 Auto-creating project for user: ${email} (${user_id})`)

    // Check if user has a workspace (should exist from auth trigger)
    let { data: workspace, error: workspaceError } = await supabase
      .from('user_workspaces')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (workspaceError && workspaceError.code !== 'PGRST116') {
      console.error('Error fetching workspace:', workspaceError)
      throw workspaceError
    }

    // Create workspace if it doesn't exist (fallback)
    if (!workspace) {
      const username = email.split('@')[0].toLowerCase()
      const workspaceName = `${username} Workspace`
      const workspaceId = `${username}-workspace-${user_id.substring(0, 8)}`
      const n8nPrefix = `[USR-${user_id.substring(0, 8)}]`

      const { data: newWorkspace, error: createWorkspaceError } = await supabase
        .from('user_workspaces')
        .insert({
          user_id,
          workspace_name: workspaceName,
          workspace_id: workspaceId,
          n8n_prefix: n8nPrefix,
          metadata: {
            created_from_email: email,
            auto_provisioned: true,
            creation_method: 'fallback',
            created_at: new Date().toISOString()
          }
        })
        .select()
        .single()

      if (createWorkspaceError) {
        console.error('Error creating workspace:', createWorkspaceError)
        throw createWorkspaceError
      }

      workspace = newWorkspace
      console.log(`📦 Created workspace: ${workspace.workspace_name} for user: ${email}`)
    }

    // Check if user already has a project
    const { data: existingProjects, error: checkError } = await supabase
      .from('projects')
      .select('id, name, workspace_id')
      .eq('user_id', user_id)
      .limit(1)

    if (checkError) {
      console.error('Error checking existing projects:', checkError)
      throw checkError
    }

    if (existingProjects && existingProjects.length > 0) {
      console.log(`📋 User ${email} already has project: ${existingProjects[0].name}`)
      return new Response(
        JSON.stringify({
          success: true,
          project: existingProjects[0],
          message: 'User already has a project',
          created: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Generate unique project name and metadata
    const projectName = generateProjectName(email)
    const projectDescription = generateProjectDescription(email)
    const username = extractUsername(email)

    console.log(`📝 Generated project name: ${projectName}`)

    // Create the project in Supabase with workspace reference
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert({
        user_id,
        name: projectName,
        description: projectDescription,
        workspace_id: workspace.id,
        workspace_prefix: workspace.n8n_prefix,
        metadata: {
          auto_created: true,
          trigger_type,
          created_for_email: email,
          username: username,
          workspace_id: workspace.id,
          workspace_name: workspace.workspace_name,
          creation_timestamp: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating project:', createError)
      throw createError
    }

    console.log(`✅ Successfully created project: ${newProject.name} for user: ${email}`)

    // Update workspace project count and log activity
    const { error: workspaceUpdateError } = await supabase
      .from('user_workspaces')
      .update({ 
        project_count: workspace.project_count + 1,
        last_active: new Date().toISOString()
      })
      .eq('id', workspace.id)

    if (workspaceUpdateError) {
      console.warn('Warning: Could not update workspace project count:', workspaceUpdateError)
    }

    // Log workspace activity
    const { error: activityError } = await supabase
      .from('workspace_activity')
      .insert({
        workspace_id: workspace.id,
        user_id: user_id,
        activity_type: 'project_created',
        resource_type: 'project',
        resource_id: newProject.id,
        metadata: {
          project_name: projectName,
          trigger_type: trigger_type,
          auto_created: true
        }
      })

    if (activityError) {
      console.warn('Warning: Could not log workspace activity:', activityError)
    }

    // Optional: Create a default "Getting Started" conversation
    const { error: conversationError } = await supabase
      .from('conversations')
      .insert({
        user_id,
        project_id: newProject.id,
        title: 'Welcome to Clixen!',
        messages: JSON.stringify([
          {
            role: 'system',
            content: `Welcome to your personal Clixen workspace: "${workspace.workspace_name}"! 

Your first project "${projectName}" has been created and is ready to use. 

🎯 Enhanced Isolation Features:
• Your workspace ID: ${workspace.workspace_id}
• All your workflows will be prefixed with: ${workspace.n8n_prefix}
• Complete privacy: Only you can see your workflows
• Project-based organization: Each workflow belongs to a specific project

You can start creating workflows by describing what you want to automate. Each workflow will be automatically organized within your secure workspace!`,
            timestamp: new Date().toISOString()
          }
        ])
      })

    if (conversationError) {
      console.warn('Warning: Could not create welcome conversation:', conversationError)
      // Don't fail the whole operation for this
    }

    // Log successful creation for monitoring
    console.log(`🎉 Auto Project Creation Success:
      User: ${email}
      Project: ${projectName}  
      Project ID: ${newProject.id}
      Timestamp: ${new Date().toISOString()}`)

    return new Response(
      JSON.stringify({
        success: true,
        project: newProject,
        message: `Successfully created project: ${projectName}`,
        created: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201 
      }
    )

  } catch (error) {
    console.error('Auto Project Creator Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to create project automatically'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

/* 
 * Usage Examples:
 * 
 * 1. Manual trigger (testing):
 * curl -X POST https://your-supabase-url/functions/v1/auto-project-creator \
 *   -H "Authorization: Bearer YOUR-ANON-KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{"user_id": "uuid", "email": "goldbergwalmer@email.com", "trigger_type": "manual"}'
 * 
 * 2. Automatic trigger (database trigger):
 * Called automatically when handle_new_user() function runs on user signup
 * 
 * 3. Expected Response:
 * {
 *   "success": true,
 *   "project": {
 *     "id": "project-uuid",
 *     "name": "goldbergwalmer-project-140820251137-user-16ab2h6g",
 *     "description": "Clixen automated workflow project...",
 *     "user_id": "user-uuid"
 *   },
 *   "message": "Successfully created project: goldbergwalmer-project-140820251137-user-16ab2h6g",
 *   "created": true
 * }
 */