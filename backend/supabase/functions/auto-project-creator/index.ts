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

    // Check if user already has a project
    const { data: existingProjects, error: checkError } = await supabase
      .from('projects')
      .select('id, name')
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

    // Create the project in Supabase
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert({
        user_id,
        name: projectName,
        description: projectDescription,
        metadata: {
          auto_created: true,
          trigger_type,
          created_for_email: email,
          username: username,
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
            content: `Welcome to your personal Clixen workspace! This is your project: "${projectName}". You can start creating workflows by describing what you want to automate.`,
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