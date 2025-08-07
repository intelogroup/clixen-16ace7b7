import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// Types for Project API
interface Project {
  id?: string;
  name: string;
  description?: string;
  color?: string;
  user_id?: string;
  workflow_count?: number;
  last_activity_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface CreateProjectRequest {
  name: string;
  description?: string;
  color?: string;
}

interface ProjectWithStats extends Project {
  deployed_workflows?: number;
  active_chat_sessions?: number;
  workflows?: WorkflowSummary[];
}

interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
  status: string;
  deployment_status: string;
  created_at: string;
  last_deployed_at?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Authentication middleware
const authenticate = async (req: Request): Promise<{ user: any; error?: string }> => {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Authentication required - Bearer token missing' };
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { user: null, error: 'Invalid authentication token' };
    }

    return { user };
  } catch (error) {
    return { user: null, error: 'Authentication failed' };
  }
};

// Input validation
const validateProjectData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Project name is required and must be a non-empty string');
  }
  
  if (data.name && data.name.length > 255) {
    errors.push('Project name must be 255 characters or less');
  }
  
  if (data.description && typeof data.description !== 'string') {
    errors.push('Project description must be a string');
  }
  
  if (data.color && (typeof data.color !== 'string' || !data.color.match(/^#[0-9A-Fa-f]{6}$/))) {
    errors.push('Project color must be a valid hex color code (e.g., #3B82F6)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Get all projects for a user
const getUserProjects = async (userId: string): Promise<ProjectWithStats[]> => {
  try {
    const { data: projects, error } = await supabase
      .from('mvp_project_summary')
      .select('*')
      .eq('user_id', userId)
      .order('last_activity_at', { ascending: false });

    if (error) {
      console.error('Error fetching user projects:', error);
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    return projects || [];
  } catch (error) {
    console.error('Error in getUserProjects:', error);
    throw error;
  }
};

// Get single project by ID
const getProject = async (userId: string, projectId: string): Promise<ProjectWithStats | null> => {
  try {
    const { data: project, error } = await supabase
      .from('mvp_project_summary')
      .select('*')
      .eq('user_id', userId)
      .eq('id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Project not found
      }
      console.error('Error fetching project:', error);
      throw new Error(`Failed to fetch project: ${error.message}`);
    }

    return project;
  } catch (error) {
    console.error('Error in getProject:', error);
    throw error;
  }
};

// Create new project
const createProject = async (userId: string, projectData: CreateProjectRequest): Promise<Project> => {
  try {
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: projectData.name.trim(),
        description: projectData.description?.trim() || null,
        color: projectData.color || '#3B82F6',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      throw new Error(`Failed to create project: ${error.message}`);
    }

    // Log telemetry event
    await supabase
      .from('telemetry_events')
      .insert({
        user_id: userId,
        event_type: 'project_created',
        event_category: 'workflow',
        project_id: project.id,
        event_data: {
          project_name: projectData.name,
          has_description: !!projectData.description,
          color: projectData.color || '#3B82F6'
        },
        success: true
      })
      .catch(err => console.warn('Failed to log telemetry:', err));

    return project;
  } catch (error) {
    console.error('Error in createProject:', error);
    throw error;
  }
};

// Get workflows in a project
const getProjectWorkflows = async (userId: string, projectId: string): Promise<WorkflowSummary[]> => {
  try {
    // First verify user owns the project
    const project = await getProject(userId, projectId);
    if (!project) {
      throw new Error('Project not found or access denied');
    }

    const { data: workflows, error } = await supabase
      .from('mvp_workflows')
      .select(`
        id,
        name,
        description,
        status,
        deployment_status,
        created_at,
        last_deployed_at
      `)
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching project workflows:', error);
      throw new Error(`Failed to fetch workflows: ${error.message}`);
    }

    return workflows || [];
  } catch (error) {
    console.error('Error in getProjectWorkflows:', error);
    throw error;
  }
};

// Update project
const updateProject = async (userId: string, projectId: string, updates: Partial<CreateProjectRequest>): Promise<Project> => {
  try {
    // First verify user owns the project
    const existingProject = await getProject(userId, projectId);
    if (!existingProject) {
      throw new Error('Project not found or access denied');
    }

    const updateData: any = {};
    
    if (updates.name) {
      updateData.name = updates.name.trim();
    }
    
    if (updates.description !== undefined) {
      updateData.description = updates.description?.trim() || null;
    }
    
    if (updates.color) {
      updateData.color = updates.color;
    }

    const { data: project, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('user_id', userId)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      throw new Error(`Failed to update project: ${error.message}`);
    }

    // Log telemetry event
    await supabase
      .from('telemetry_events')
      .insert({
        user_id: userId,
        event_type: 'project_updated',
        event_category: 'workflow',
        project_id: projectId,
        event_data: {
          updated_fields: Object.keys(updateData),
          changes: updateData
        },
        success: true
      })
      .catch(err => console.warn('Failed to log telemetry:', err));

    return project;
  } catch (error) {
    console.error('Error in updateProject:', error);
    throw error;
  }
};

// Delete project
const deleteProject = async (userId: string, projectId: string): Promise<void> => {
  try {
    // First verify user owns the project and get workflow count
    const project = await getProject(userId, projectId);
    if (!project) {
      throw new Error('Project not found or access denied');
    }

    // Check if project has workflows
    if (project.workflow_count && project.workflow_count > 0) {
      throw new Error('Cannot delete project with existing workflows. Please delete all workflows first.');
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('user_id', userId)
      .eq('id', projectId);

    if (error) {
      console.error('Error deleting project:', error);
      throw new Error(`Failed to delete project: ${error.message}`);
    }

    // Log telemetry event
    await supabase
      .from('telemetry_events')
      .insert({
        user_id: userId,
        event_type: 'project_deleted',
        event_category: 'workflow',
        project_id: projectId,
        event_data: {
          project_name: project.name,
          had_workflows: project.workflow_count > 0
        },
        success: true
      })
      .catch(err => console.warn('Failed to log telemetry:', err));

  } catch (error) {
    console.error('Error in deleteProject:', error);
    throw error;
  }
};

// Main request handler
serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);
  
  console.log(`🚀 [PROJECTS-API-${requestId}] ${req.method} ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Authenticate user
    const { user, error: authError } = await authenticate(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: authError || 'Authentication failed',
          timestamp: new Date().toISOString()
        } as ApiResponse),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = user.id;
    let response: ApiResponse;
    let statusCode = 200;

    // Route handling
    if (pathSegments.length === 0 || pathSegments[0] === 'projects') {
      // /projects routes
      if (pathSegments.length === 1) {
        if (req.method === 'GET') {
          // GET /projects - List all projects for user
          const projects = await getUserProjects(userId);
          response = {
            success: true,
            data: projects,
            message: `Retrieved ${projects.length} projects`,
            timestamp: new Date().toISOString()
          };
        } else if (req.method === 'POST') {
          // POST /projects - Create new project
          const body = await req.json();
          const validation = validateProjectData(body);
          
          if (!validation.isValid) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Validation failed',
                message: validation.errors.join(', '),
                timestamp: new Date().toISOString()
              } as ApiResponse),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          
          const project = await createProject(userId, body);
          response = {
            success: true,
            data: project,
            message: 'Project created successfully',
            timestamp: new Date().toISOString()
          };
          statusCode = 201;
        } else {
          throw new Error('Method not allowed');
        }
      } else if (pathSegments.length === 2) {
        // /projects/{id} routes
        const projectId = pathSegments[1];
        
        if (req.method === 'GET') {
          // GET /projects/{id} - Get single project
          const project = await getProject(userId, projectId);
          if (!project) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Project not found',
                timestamp: new Date().toISOString()
              } as ApiResponse),
              { 
                status: 404, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          
          response = {
            success: true,
            data: project,
            timestamp: new Date().toISOString()
          };
        } else if (req.method === 'PUT') {
          // PUT /projects/{id} - Update project
          const body = await req.json();
          const validation = validateProjectData({ ...body, name: body.name || 'temp' });
          
          if (!validation.isValid) {
            const relevantErrors = validation.errors.filter(err => 
              !err.includes('name is required') || body.name
            );
            
            if (relevantErrors.length > 0) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: 'Validation failed',
                  message: relevantErrors.join(', '),
                  timestamp: new Date().toISOString()
                } as ApiResponse),
                { 
                  status: 400, 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
              );
            }
          }
          
          const project = await updateProject(userId, projectId, body);
          response = {
            success: true,
            data: project,
            message: 'Project updated successfully',
            timestamp: new Date().toISOString()
          };
        } else if (req.method === 'DELETE') {
          // DELETE /projects/{id} - Delete project
          await deleteProject(userId, projectId);
          response = {
            success: true,
            message: 'Project deleted successfully',
            timestamp: new Date().toISOString()
          };
        } else {
          throw new Error('Method not allowed');
        }
      } else if (pathSegments.length === 3 && pathSegments[2] === 'workflows') {
        // /projects/{id}/workflows routes
        const projectId = pathSegments[1];
        
        if (req.method === 'GET') {
          // GET /projects/{id}/workflows - Get workflows in project
          const workflows = await getProjectWorkflows(userId, projectId);
          response = {
            success: true,
            data: workflows,
            message: `Retrieved ${workflows.length} workflows for project`,
            timestamp: new Date().toISOString()
          };
        } else {
          throw new Error('Method not allowed');
        }
      } else {
        throw new Error('Endpoint not found');
      }
    } else {
      throw new Error('Endpoint not found');
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ [PROJECTS-API-${requestId}] Completed in ${processingTime}ms`);

    return new Response(
      JSON.stringify(response),
      { 
        status: statusCode,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Processing-Time': processingTime.toString()
        }
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [PROJECTS-API-${requestId}] Error after ${processingTime}ms:`, error);
    
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error.message === 'Method not allowed') {
      statusCode = 405;
      errorMessage = error.message;
    } else if (error.message === 'Endpoint not found') {
      statusCode = 404;
      errorMessage = error.message;
    } else if (error.message.includes('not found') || error.message.includes('access denied')) {
      statusCode = 404;
      errorMessage = error.message;
    } else if (error.message.includes('Validation') || error.message.includes('required')) {
      statusCode = 400;
      errorMessage = error.message;
    }

    // Log error telemetry
    try {
      const { user } = await authenticate(req);
      if (user) {
        await supabase
          .from('telemetry_events')
          .insert({
            user_id: user.id,
            event_type: 'api_error',
            event_category: 'error',
            event_data: {
              endpoint: 'projects-api',
              method: req.method,
              error: error.message,
              status_code: statusCode
            },
            duration_ms: processingTime,
            success: false,
            error_message: error.message
          })
          .catch(err => console.warn('Failed to log error telemetry:', err));
      }
    } catch (telemetryError) {
      console.warn('Failed to log error telemetry:', telemetryError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        message: statusCode >= 500 ? 'An unexpected error occurred. Please try again.' : error.message,
        timestamp: new Date().toISOString()
      } as ApiResponse),
      { 
        status: statusCode,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Processing-Time': processingTime.toString()
        }
      }
    );
  }
});