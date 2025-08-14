-- Enhanced User Workspace Isolation Migration
-- Adds workspace tracking and enhanced user isolation features
-- Date: January 15, 2025

-- Create user workspaces table for enhanced isolation
CREATE TABLE IF NOT EXISTS user_workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_name TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL UNIQUE, -- Format: {username}-workspace-{userHash}
  n8n_prefix TEXT NOT NULL UNIQUE,   -- Format: [USR-{shortUserId}]
  project_count INTEGER DEFAULT 0,
  quota JSONB DEFAULT '{
    "max_workflows": 50,
    "max_executions": 1000,
    "storage_mb": 100,
    "max_projects": 10
  }'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Create workspace activity tracking
CREATE TABLE IF NOT EXISTS workspace_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES user_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'workflow_created', 'workflow_executed', 'project_created', etc.
  resource_type TEXT, -- 'workflow', 'project', 'execution'
  resource_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update existing projects table to reference workspace
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES user_workspaces(id),
ADD COLUMN IF NOT EXISTS workspace_prefix TEXT; -- Cached for performance

-- Update workflows table with enhanced tracking
ALTER TABLE mvp_workflows 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES user_workspaces(id),
ADD COLUMN IF NOT EXISTS project_prefix TEXT, -- [PRJ-{shortProjectId}]
ADD COLUMN IF NOT EXISTS full_isolation_name TEXT, -- [USR-xxx][PRJ-yyy] Name
ADD COLUMN IF NOT EXISTS isolation_format TEXT DEFAULT 'legacy'; -- 'legacy' or 'enhanced'

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_workspaces_user_id ON user_workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_user_workspaces_n8n_prefix ON user_workspaces(n8n_prefix);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_workspace_id ON workspace_activity(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_user_id ON workspace_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_type ON workspace_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflows_workspace_id ON mvp_workflows(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflows_isolation_format ON mvp_workflows(isolation_format);

-- Enable Row Level Security
ALTER TABLE user_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_workspaces
CREATE POLICY "Users can only see their own workspace" 
  ON user_workspaces FOR ALL 
  USING (user_id = auth.uid());

-- RLS Policies for workspace_activity  
CREATE POLICY "Users can only see their workspace activity" 
  ON workspace_activity FOR ALL
  USING (user_id = auth.uid());

-- Update existing projects to reference workspaces (will be populated by function)
CREATE OR REPLACE FUNCTION link_existing_projects_to_workspaces()
RETURNS void AS $$
DECLARE
  project_record RECORD;
  workspace_record RECORD;
BEGIN
  -- For each project without a workspace_id
  FOR project_record IN 
    SELECT p.*, u.email 
    FROM projects p
    JOIN auth.users u ON p.user_id = u.id
    WHERE p.workspace_id IS NULL
  LOOP
    -- Find or create workspace for this user
    SELECT * INTO workspace_record 
    FROM user_workspaces 
    WHERE user_id = project_record.user_id;
    
    IF NOT FOUND THEN
      -- Create workspace if it doesn't exist (will be handled by auto-provisioning)
      CONTINUE;
    END IF;
    
    -- Link project to workspace
    UPDATE projects 
    SET 
      workspace_id = workspace_record.id,
      workspace_prefix = workspace_record.n8n_prefix
    WHERE id = project_record.id;
    
    -- Update workspace project count
    UPDATE user_workspaces 
    SET 
      project_count = project_count + 1,
      updated_at = NOW()
    WHERE id = workspace_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update workspace activity
CREATE OR REPLACE FUNCTION log_workspace_activity(
  p_workspace_id UUID,
  p_user_id UUID,
  p_activity_type TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
  INSERT INTO workspace_activity (
    workspace_id,
    user_id,
    activity_type,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    p_workspace_id,
    p_user_id,
    p_activity_type,
    p_resource_type,
    p_resource_id,
    p_metadata
  );
  
  -- Update workspace last_active
  UPDATE user_workspaces 
  SET 
    last_active = NOW(),
    updated_at = NOW()
  WHERE id = p_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get workspace usage statistics
CREATE OR REPLACE FUNCTION get_workspace_usage(p_workspace_id UUID)
RETURNS TABLE(
  workflow_count BIGINT,
  execution_count BIGINT,
  project_count BIGINT,
  last_activity TIMESTAMPTZ,
  quota_usage JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      (SELECT COUNT(*) FROM mvp_workflows WHERE workspace_id = p_workspace_id) as workflows,
      (SELECT COUNT(*) FROM workspace_activity WHERE workspace_id = p_workspace_id AND activity_type = 'workflow_executed') as executions,
      (SELECT COUNT(*) FROM projects WHERE workspace_id = p_workspace_id) as projects,
      (SELECT MAX(created_at) FROM workspace_activity WHERE workspace_id = p_workspace_id) as last_act
  )
  SELECT 
    s.workflows,
    s.executions,
    s.projects,
    s.last_act,
    jsonb_build_object(
      'workflows_used', s.workflows,
      'executions_used', s.executions,
      'projects_used', s.projects,
      'calculated_at', NOW()
    )
  FROM stats s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated trigger function for auto workspace creation
CREATE OR REPLACE FUNCTION handle_new_user_with_workspace()
RETURNS trigger AS $$
DECLARE
  workspace_name TEXT;
  workspace_identifier TEXT;
  n8n_prefix TEXT;
  username TEXT;
BEGIN
  -- Extract username from email
  username := split_part(NEW.email, '@', 1);
  
  -- Generate workspace identifiers
  workspace_name := username || ' Workspace';
  workspace_identifier := username || '-workspace-' || substring(NEW.id::text, 1, 8);
  n8n_prefix := '[USR-' || substring(NEW.id::text, 1, 8) || ']';
  
  -- Create workspace
  INSERT INTO user_workspaces (
    user_id,
    workspace_name,
    workspace_id,
    n8n_prefix,
    metadata
  ) VALUES (
    NEW.id,
    workspace_name,
    workspace_identifier,
    n8n_prefix,
    jsonb_build_object(
      'created_from_email', NEW.email,
      'auto_provisioned', true,
      'creation_method', 'auth_trigger'
    )
  );
  
  -- Call existing project creation function
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/auto-project-creator',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'trigger_type', 'signup'
      )
    );
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user workspace creation
DROP TRIGGER IF EXISTS on_auth_user_created_workspace ON auth.users;
CREATE TRIGGER on_auth_user_created_workspace
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_with_workspace();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON user_workspaces TO authenticated;
GRANT SELECT, INSERT ON workspace_activity TO authenticated;

-- Comments for documentation
COMMENT ON TABLE user_workspaces IS 'Enhanced user workspace isolation tracking';
COMMENT ON TABLE workspace_activity IS 'Activity log for workspace operations';
COMMENT ON FUNCTION handle_new_user_with_workspace() IS 'Auto-provision workspace and project on user signup';
COMMENT ON FUNCTION log_workspace_activity(UUID, UUID, TEXT, TEXT, TEXT, JSONB) IS 'Log activity in user workspace';
COMMENT ON FUNCTION get_workspace_usage(UUID) IS 'Get workspace usage statistics and quota information';

-- Insert initial data for existing test users if needed
DO $$
DECLARE
  user_record RECORD;
  workspace_name TEXT;
  workspace_identifier TEXT;
  n8n_prefix TEXT;
  username TEXT;
BEGIN
  FOR user_record IN 
    SELECT id, email 
    FROM auth.users 
    WHERE id NOT IN (SELECT user_id FROM user_workspaces)
  LOOP
    username := split_part(user_record.email, '@', 1);
    workspace_name := username || ' Workspace';
    workspace_identifier := username || '-workspace-' || substring(user_record.id::text, 1, 8);
    n8n_prefix := '[USR-' || substring(user_record.id::text, 1, 8) || ']';
    
    INSERT INTO user_workspaces (
      user_id,
      workspace_name,
      workspace_id,
      n8n_prefix,
      metadata
    ) VALUES (
      user_record.id,
      workspace_name,
      workspace_identifier,
      n8n_prefix,
      jsonb_build_object(
        'created_from_email', user_record.email,
        'auto_provisioned', true,
        'creation_method', 'migration',
        'migrated_at', NOW()
      )
    );
  END LOOP;
END;
$$;