-- ============================================================================
-- Clixen MVP RLS Policies and Helper Functions
-- ============================================================================
-- Additional security policies and utility functions for the MVP
-- Author: Database Architect Agent
-- Date: 2025-01-08
-- Version: MVP 1.0

-- ============================================================================
-- ADVANCED RLS POLICIES
-- ============================================================================

-- Service role bypass for administrative functions
CREATE POLICY "Service role full access user_profiles" ON user_profiles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access projects" ON projects
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access workflows" ON workflows
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access chat_sessions" ON chat_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access chat_messages" ON chat_messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access deployments" ON deployments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access telemetry" ON telemetry_events
  FOR ALL USING (auth.role() = 'service_role');

-- Anonymous read access for public data (if needed for marketing/demos)
CREATE POLICY "Anonymous can view public project stats" ON projects
  FOR SELECT USING (false); -- Disabled by default, enable if needed

-- ============================================================================
-- MVP HELPER FUNCTIONS
-- ============================================================================

-- Function to create a new user profile automatically after signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  
  -- Log user signup event
  INSERT INTO telemetry_events (user_id, event_type, event_category, event_data)
  VALUES (
    NEW.id,
    'user_signup',
    'auth',
    jsonb_build_object(
      'email', NEW.email,
      'signup_method', 'email'
    )
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Function to get or create a default project for a user
CREATE OR REPLACE FUNCTION get_or_create_default_project(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Try to find existing default project
  SELECT id INTO v_project_id
  FROM projects
  WHERE user_id = p_user_id
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Create default project if none exists
  IF v_project_id IS NULL THEN
    INSERT INTO projects (user_id, name, description)
    VALUES (
      p_user_id,
      'My First Project',
      'Default project created automatically'
    )
    RETURNING id INTO v_project_id;
    
    -- Log project creation
    INSERT INTO telemetry_events (user_id, event_type, event_category, project_id, event_data)
    VALUES (
      p_user_id,
      'project_create',
      'workflow',
      v_project_id,
      jsonb_build_object('auto_created', true)
    );
  END IF;
  
  RETURN v_project_id;
END;
$$;

-- Function to create a new chat session
CREATE OR REPLACE FUNCTION create_chat_session(
  p_user_id UUID,
  p_project_id UUID,
  p_title TEXT DEFAULT 'New Chat',
  p_workflow_id UUID DEFAULT NULL
)
RETURNS TABLE(
  session_id UUID,
  session_title TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  -- Validate project ownership
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;
  
  -- Create new chat session
  INSERT INTO chat_sessions (user_id, project_id, workflow_id, title)
  VALUES (p_user_id, p_project_id, p_workflow_id, p_title)
  RETURNING id, created_at INTO v_session_id, v_created_at;
  
  -- Log chat session creation
  INSERT INTO telemetry_events (user_id, event_type, event_category, project_id, session_id, event_data)
  VALUES (
    p_user_id,
    'chat_start',
    'engagement',
    p_project_id,
    v_session_id,
    jsonb_build_object(
      'title', p_title,
      'has_workflow', p_workflow_id IS NOT NULL
    )
  );
  
  RETURN QUERY SELECT v_session_id, p_title, v_created_at;
END;
$$;

-- Function to add a chat message and trigger AI processing
CREATE OR REPLACE FUNCTION add_chat_message(
  p_session_id UUID,
  p_user_id UUID,
  p_content TEXT,
  p_role TEXT DEFAULT 'user'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_id UUID;
  v_session_exists BOOLEAN;
BEGIN
  -- Validate session ownership
  SELECT EXISTS(
    SELECT 1 FROM chat_sessions 
    WHERE id = p_session_id AND user_id = p_user_id
  ) INTO v_session_exists;
  
  IF NOT v_session_exists THEN
    RAISE EXCEPTION 'Chat session not found or access denied';
  END IF;
  
  -- Insert message
  INSERT INTO chat_messages (session_id, user_id, content, role)
  VALUES (p_session_id, p_user_id, p_content, p_role)
  RETURNING id INTO v_message_id;
  
  -- Log message event (only for user messages to avoid spam)
  IF p_role = 'user' THEN
    INSERT INTO telemetry_events (user_id, event_type, event_category, session_id, event_data)
    VALUES (
      p_user_id,
      'chat_message',
      'engagement',
      p_session_id,
      jsonb_build_object(
        'message_length', length(p_content),
        'role', p_role
      )
    );
  END IF;
  
  RETURN v_message_id;
END;
$$;

-- Function to create workflow from chat
CREATE OR REPLACE FUNCTION create_workflow_from_chat(
  p_user_id UUID,
  p_project_id UUID,
  p_session_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_original_prompt TEXT,
  p_n8n_workflow_json JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workflow_id UUID;
BEGIN
  -- Validate ownership
  IF NOT EXISTS (
    SELECT 1 FROM projects 
    WHERE id = p_project_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE id = p_session_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Chat session not found or access denied';
  END IF;
  
  -- Create workflow
  INSERT INTO workflows (
    user_id, project_id, name, description, 
    original_prompt, n8n_workflow_json, status
  )
  VALUES (
    p_user_id, p_project_id, p_name, p_description,
    p_original_prompt, p_n8n_workflow_json, 'validated'
  )
  RETURNING id INTO v_workflow_id;
  
  -- Update chat session to link with workflow
  UPDATE chat_sessions 
  SET workflow_id = v_workflow_id, workflow_created = true
  WHERE id = p_session_id;
  
  -- Log workflow creation (MVP success metric)
  INSERT INTO telemetry_events (
    user_id, event_type, event_category, project_id, 
    workflow_id, session_id, event_data
  )
  VALUES (
    p_user_id, 'workflow_create', 'workflow', p_project_id,
    v_workflow_id, p_session_id,
    jsonb_build_object(
      'name', p_name,
      'created_from_chat', true,
      'workflow_complexity', jsonb_array_length(p_n8n_workflow_json->'nodes')
    )
  );
  
  RETURN v_workflow_id;
END;
$$;

-- Function to record deployment attempt
CREATE OR REPLACE FUNCTION record_deployment(
  p_user_id UUID,
  p_workflow_id UUID,
  p_n8n_workflow_id TEXT,
  p_status TEXT DEFAULT 'pending'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deployment_id UUID;
  v_workflow_version INTEGER;
BEGIN
  -- Get workflow version
  SELECT version INTO v_workflow_version
  FROM workflows 
  WHERE id = p_workflow_id AND user_id = p_user_id;
  
  IF v_workflow_version IS NULL THEN
    RAISE EXCEPTION 'Workflow not found or access denied';
  END IF;
  
  -- Record deployment
  INSERT INTO deployments (
    user_id, workflow_id, n8n_workflow_id, 
    deployment_version, status
  )
  VALUES (
    p_user_id, p_workflow_id, p_n8n_workflow_id,
    v_workflow_version, p_status
  )
  RETURNING id INTO v_deployment_id;
  
  -- Update workflow deployment status
  UPDATE workflows 
  SET deployment_status = 
    CASE 
      WHEN p_status = 'deployed' THEN 'deployed'
      WHEN p_status = 'failed' THEN 'failed'
      ELSE 'deploying'
    END,
    last_deployed_at = CASE WHEN p_status = 'deployed' THEN NOW() ELSE last_deployed_at END
  WHERE id = p_workflow_id;
  
  -- Log deployment event (MVP success metric)
  INSERT INTO telemetry_events (user_id, event_type, event_category, workflow_id, event_data)
  VALUES (
    p_user_id, 
    'workflow_deploy', 
    'deployment', 
    p_workflow_id,
    jsonb_build_object(
      'deployment_id', v_deployment_id,
      'status', p_status,
      'n8n_workflow_id', p_n8n_workflow_id
    )
  );
  
  RETURN v_deployment_id;
END;
$$;

-- Function to update deployment status
CREATE OR REPLACE FUNCTION update_deployment_status(
  p_deployment_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_deployment_url TEXT DEFAULT NULL,
  p_n8n_response JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workflow_id UUID;
  v_user_id UUID;
BEGIN
  -- Update deployment record
  UPDATE deployments 
  SET 
    status = p_status,
    error_message = p_error_message,
    deployment_url = p_deployment_url,
    n8n_response = p_n8n_response,
    completed_at = NOW()
  WHERE id = p_deployment_id
  RETURNING workflow_id, user_id INTO v_workflow_id, v_user_id;
  
  IF v_workflow_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update workflow status
  UPDATE workflows 
  SET 
    deployment_status = 
      CASE 
        WHEN p_status = 'deployed' THEN 'deployed'
        WHEN p_status = 'failed' THEN 'failed'
        ELSE deployment_status
      END,
    deployment_error = p_error_message,
    deployment_url = p_deployment_url,
    last_deployed_at = CASE WHEN p_status = 'deployed' THEN NOW() ELSE last_deployed_at END
  WHERE id = v_workflow_id;
  
  -- Update user profile counters for successful deployments
  IF p_status = 'deployed' THEN
    UPDATE user_profiles 
    SET 
      total_deployments = total_deployments + 1,
      first_deployment_at = COALESCE(first_deployment_at, NOW())
    WHERE id = v_user_id;
    
    -- Update chat session if linked
    UPDATE chat_sessions 
    SET workflow_deployed = true
    WHERE workflow_id = v_workflow_id;
  END IF;
  
  -- Log deployment status change
  INSERT INTO telemetry_events (user_id, event_type, event_category, workflow_id, event_data)
  VALUES (
    v_user_id,
    'deployment_' || p_status,
    'deployment',
    v_workflow_id,
    jsonb_build_object(
      'deployment_id', p_deployment_id,
      'status', p_status,
      'has_error', p_error_message IS NOT NULL
    )
  );
  
  RETURN TRUE;
END;
$$;

-- Function to get user onboarding progress (MVP metric)
CREATE OR REPLACE FUNCTION get_user_onboarding_progress(p_user_id UUID)
RETURNS TABLE(
  signup_completed BOOLEAN,
  first_project_created BOOLEAN,
  first_chat_started BOOLEAN,
  first_workflow_created BOOLEAN,
  first_deployment_completed BOOLEAN,
  onboarding_completed BOOLEAN,
  completion_time_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_created_at TIMESTAMPTZ;
  v_first_workflow_at TIMESTAMPTZ;
  v_first_deployment_at TIMESTAMPTZ;
BEGIN
  -- Get user creation time
  SELECT created_at, first_workflow_created_at, first_deployment_at
  INTO v_user_created_at, v_first_workflow_at, v_first_deployment_at
  FROM user_profiles up
  JOIN auth.users au ON up.id = au.id
  WHERE up.id = p_user_id;
  
  RETURN QUERY SELECT
    TRUE as signup_completed,
    EXISTS(SELECT 1 FROM projects WHERE user_id = p_user_id) as first_project_created,
    EXISTS(SELECT 1 FROM chat_sessions WHERE user_id = p_user_id) as first_chat_started,
    v_first_workflow_at IS NOT NULL as first_workflow_created,
    v_first_deployment_at IS NOT NULL as first_deployment_completed,
    (v_first_deployment_at IS NOT NULL) as onboarding_completed,
    CASE 
      WHEN v_first_deployment_at IS NOT NULL THEN
        EXTRACT(EPOCH FROM (v_first_deployment_at - v_user_created_at)) / 60
      ELSE NULL
    END::INTEGER as completion_time_minutes;
END;
$$;

-- Function to get MVP success metrics
CREATE OR REPLACE FUNCTION get_mvp_metrics(
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_signups INTEGER,
  workflows_created INTEGER,
  workflows_deployed INTEGER,
  avg_time_to_first_workflow_minutes INTEGER,
  avg_time_to_first_deployment_minutes INTEGER,
  user_retention_rate DECIMAL,
  deployment_success_rate DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMPTZ := NOW() - (p_days_back || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      up.id,
      up.created_at,
      up.first_workflow_created_at,
      up.first_deployment_at,
      CASE WHEN up.first_workflow_created_at IS NOT NULL THEN
        EXTRACT(EPOCH FROM (up.first_workflow_created_at - up.created_at)) / 60
      END as minutes_to_first_workflow,
      CASE WHEN up.first_deployment_at IS NOT NULL THEN
        EXTRACT(EPOCH FROM (up.first_deployment_at - up.created_at)) / 60
      END as minutes_to_first_deployment
    FROM user_profiles up
    WHERE up.created_at >= v_start_date
  ),
  deployment_stats AS (
    SELECT 
      COUNT(*) as total_deployments,
      COUNT(*) FILTER (WHERE status = 'deployed') as successful_deployments
    FROM deployments d
    WHERE d.created_at >= v_start_date
  )
  SELECT 
    COUNT(*)::INTEGER as total_signups,
    COUNT(*) FILTER (WHERE first_workflow_created_at IS NOT NULL)::INTEGER as workflows_created,
    COUNT(*) FILTER (WHERE first_deployment_at IS NOT NULL)::INTEGER as workflows_deployed,
    AVG(minutes_to_first_workflow)::INTEGER as avg_time_to_first_workflow_minutes,
    AVG(minutes_to_first_deployment)::INTEGER as avg_time_to_first_deployment_minutes,
    ROUND(
      COUNT(*) FILTER (WHERE first_workflow_created_at IS NOT NULL)::DECIMAL / 
      NULLIF(COUNT(*), 0) * 100, 2
    ) as user_retention_rate,
    ROUND(
      ds.successful_deployments::DECIMAL / 
      NULLIF(ds.total_deployments, 0) * 100, 2
    ) as deployment_success_rate
  FROM user_stats us
  CROSS JOIN deployment_stats ds;
END;
$$;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to clean up old telemetry data (optional maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_telemetry(p_days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM telemetry_events
  WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL
  AND event_category NOT IN ('auth', 'workflow'); -- Keep important events longer
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- Function to archive old chat sessions
CREATE OR REPLACE FUNCTION archive_old_chat_sessions(p_days_inactive INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE chat_sessions
  SET status = 'archived'
  WHERE status = 'active'
  AND last_message_at < NOW() - (p_days_inactive || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS FOR NEW FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION create_user_profile() IS 'Automatically creates user profile and logs signup event';
COMMENT ON FUNCTION get_or_create_default_project(UUID) IS 'Gets or creates a default project for new users';
COMMENT ON FUNCTION create_chat_session(UUID, UUID, TEXT, UUID) IS 'Creates new chat session with telemetry logging';
COMMENT ON FUNCTION add_chat_message(UUID, UUID, TEXT, TEXT) IS 'Adds chat message with validation and logging';
COMMENT ON FUNCTION create_workflow_from_chat(UUID, UUID, UUID, TEXT, TEXT, TEXT, JSONB) IS 'Creates workflow from chat conversation';
COMMENT ON FUNCTION record_deployment(UUID, UUID, TEXT, TEXT) IS 'Records deployment attempt with telemetry';
COMMENT ON FUNCTION update_deployment_status(UUID, TEXT, TEXT, TEXT, JSONB) IS 'Updates deployment status and workflow state';
COMMENT ON FUNCTION get_user_onboarding_progress(UUID) IS 'Returns user onboarding progress for MVP metrics';
COMMENT ON FUNCTION get_mvp_metrics(INTEGER) IS 'Returns comprehensive MVP success metrics';