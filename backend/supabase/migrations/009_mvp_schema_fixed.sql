-- ============================================================================
-- Clixen MVP Schema - Compatible with Existing Tables
-- ============================================================================
-- This migration works alongside existing tables, creating MVP-compliant structure
-- Author: Database Architect Agent
-- Date: 2025-01-08
-- Version: MVP 1.0 - Fixed

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- MVP TABLES (compatible with existing schema)
-- ============================================================================

-- 1. User Profiles (Extended profile for Supabase Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  preferences JSONB DEFAULT '{}'::jsonb,
  
  -- Onboarding tracking
  onboarding_completed BOOLEAN DEFAULT false,
  first_workflow_created_at TIMESTAMPTZ,
  first_deployment_at TIMESTAMPTZ,
  
  -- Usage statistics
  total_workflows_created INTEGER DEFAULT 0,
  total_deployments INTEGER DEFAULT 0,
  total_projects INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6', -- Blue default
  
  -- Project metadata
  workflow_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT projects_name_length CHECK (length(name) >= 1 AND length(name) <= 255)
);

-- 3. MVP Workflows Table (separate from existing workflows table)
CREATE TABLE IF NOT EXISTS mvp_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Workflow identification
  name TEXT NOT NULL,
  description TEXT,
  n8n_workflow_id TEXT, -- n8n instance workflow ID after deployment
  
  -- Workflow content
  n8n_workflow_json JSONB NOT NULL,
  original_prompt TEXT NOT NULL, -- User's original natural language request
  
  -- Status and versioning
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'deployed', 'failed', 'archived')),
  version INTEGER DEFAULT 1,
  
  -- Deployment tracking
  deployment_status TEXT DEFAULT 'not_deployed' CHECK (deployment_status IN ('not_deployed', 'deploying', 'deployed', 'failed', 'updating')),
  deployment_url TEXT,
  deployment_error TEXT,
  last_deployed_at TIMESTAMPTZ,
  
  -- Performance metrics
  execution_count INTEGER DEFAULT 0,
  last_execution_at TIMESTAMPTZ,
  avg_execution_time_ms INTEGER,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT mvp_workflows_name_length CHECK (length(name) >= 1 AND length(name) <= 255),
  CONSTRAINT mvp_workflows_version_positive CHECK (version > 0)
);

-- 4. MVP Chat Sessions (work with existing ai_chat_sessions or create new)
CREATE TABLE IF NOT EXISTS mvp_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES mvp_workflows(id) ON DELETE CASCADE, -- Links to MVP workflows
  
  -- Session metadata
  title TEXT DEFAULT 'New Chat',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  
  -- Chat tracking
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Session outcome (for telemetry)
  workflow_created BOOLEAN DEFAULT false,
  workflow_deployed BOOLEAN DEFAULT false,
  user_satisfied BOOLEAN DEFAULT NULL, -- Optional user feedback
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MVP Chat Messages
CREATE TABLE IF NOT EXISTS mvp_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES mvp_chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message content
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  
  -- AI agent information
  agent_type TEXT DEFAULT 'system' CHECK (agent_type IN ('system', 'orchestrator', 'workflow_designer', 'deployment')),
  
  -- Processing metadata
  processing_time_ms INTEGER,
  tokens_used INTEGER DEFAULT 0,
  
  -- Message metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT mvp_chat_messages_content_length CHECK (length(content) >= 1)
);

-- 6. Deployments Table
CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES mvp_workflows(id) ON DELETE CASCADE,
  
  -- Deployment details
  n8n_workflow_id TEXT NOT NULL,
  deployment_version INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'deploying', 'deployed', 'failed', 'rolled_back')),
  
  -- Deployment result
  n8n_response JSONB,
  error_message TEXT,
  deployment_url TEXT,
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT deployments_version_positive CHECK (deployment_version > 0)
);

-- 7. Telemetry Table
CREATE TABLE IF NOT EXISTS telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event identification
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL CHECK (event_category IN ('auth', 'workflow', 'deployment', 'engagement', 'error', 'performance')),
  
  -- Event context
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  workflow_id UUID REFERENCES mvp_workflows(id) ON DELETE SET NULL,
  session_id UUID REFERENCES mvp_chat_sessions(id) ON DELETE SET NULL,
  
  -- Event data
  event_data JSONB DEFAULT '{}'::jsonb,
  
  -- Performance tracking
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Context metadata
  user_agent TEXT,
  ip_address INET,
  referer TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT telemetry_events_type_length CHECK (length(event_type) >= 1 AND length(event_type) <= 100)
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON user_profiles(tier);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_activity ON projects(user_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- MVP Workflows indexes
CREATE INDEX IF NOT EXISTS idx_mvp_workflows_user_id ON mvp_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_mvp_workflows_project_id ON mvp_workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_mvp_workflows_status ON mvp_workflows(status);
CREATE INDEX IF NOT EXISTS idx_mvp_workflows_deployment_status ON mvp_workflows(deployment_status);
CREATE INDEX IF NOT EXISTS idx_mvp_workflows_user_project ON mvp_workflows(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_mvp_workflows_created_at ON mvp_workflows(created_at DESC);

-- MVP Chat sessions indexes
CREATE INDEX IF NOT EXISTS idx_mvp_chat_sessions_user_id ON mvp_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mvp_chat_sessions_project_id ON mvp_chat_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_mvp_chat_sessions_workflow_id ON mvp_chat_sessions(workflow_id) WHERE workflow_id IS NOT NULL;

-- MVP Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_mvp_chat_messages_session_id ON mvp_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_mvp_chat_messages_user_id ON mvp_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_mvp_chat_messages_created_at ON mvp_chat_messages(created_at ASC);

-- Deployments indexes
CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_workflow_id ON deployments(workflow_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON deployments(created_at DESC);

-- Telemetry indexes
CREATE INDEX IF NOT EXISTS idx_telemetry_events_user_id ON telemetry_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_telemetry_events_type ON telemetry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_category ON telemetry_events(event_category);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_created_at ON telemetry_events(created_at DESC);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_mvp_workflows_updated_at
  BEFORE UPDATE ON mvp_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_mvp_chat_sessions_updated_at
  BEFORE UPDATE ON mvp_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to update project activity
CREATE OR REPLACE FUNCTION update_project_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE projects 
  SET last_activity_at = NOW() 
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers to update project activity
CREATE TRIGGER update_project_activity_mvp_workflows
  AFTER INSERT OR UPDATE OR DELETE ON mvp_workflows
  FOR EACH ROW EXECUTE FUNCTION update_project_activity();

CREATE TRIGGER update_project_activity_mvp_chat_sessions
  AFTER INSERT OR UPDATE OR DELETE ON mvp_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_project_activity();

-- Function to update workflow counters
CREATE OR REPLACE FUNCTION update_mvp_workflow_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update project workflow count
  UPDATE projects 
  SET workflow_count = (
    SELECT COUNT(*) 
    FROM mvp_workflows 
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    AND status != 'archived'
  )
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  -- Update user profile counters
  IF TG_OP = 'INSERT' THEN
    UPDATE user_profiles 
    SET total_workflows_created = total_workflows_created + 1,
        first_workflow_created_at = COALESCE(first_workflow_created_at, NEW.created_at)
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_mvp_workflow_counters
  AFTER INSERT OR UPDATE OR DELETE ON mvp_workflows
  FOR EACH ROW EXECUTE FUNCTION update_mvp_workflow_counters();

-- Function to update chat counters
CREATE OR REPLACE FUNCTION update_mvp_chat_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE mvp_chat_sessions 
    SET message_count = message_count + 1,
        last_message_at = NEW.created_at
    WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_mvp_chat_counters
  AFTER INSERT ON mvp_chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_mvp_chat_counters();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE mvp_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE mvp_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mvp_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own profiles" ON user_profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own MVP workflows" ON mvp_workflows
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own MVP chat sessions" ON mvp_chat_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own MVP chat messages" ON mvp_chat_messages
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own deployments" ON deployments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own telemetry" ON telemetry_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert telemetry" ON telemetry_events
  FOR INSERT WITH CHECK (true);

-- Service role bypass policies
CREATE POLICY "Service role full access user_profiles" ON user_profiles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access projects" ON projects
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access mvp_workflows" ON mvp_workflows
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access mvp_chat_sessions" ON mvp_chat_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access mvp_chat_messages" ON mvp_chat_messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access deployments" ON deployments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access telemetry" ON telemetry_events
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- MVP HELPER FUNCTIONS
-- ============================================================================

-- Function to create user profile automatically
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
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Log signup event
  INSERT INTO telemetry_events (user_id, event_type, event_category, event_data)
  VALUES (
    NEW.id,
    'user_signup',
    'auth',
    jsonb_build_object('email', NEW.email, 'signup_method', 'email')
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for user profile creation (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Function to get or create default project
CREATE OR REPLACE FUNCTION get_or_create_default_project(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Try to find existing project
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
  END IF;
  
  RETURN v_project_id;
END;
$$;

-- ============================================================================
-- USEFUL VIEWS
-- ============================================================================

-- Project summary view
CREATE OR REPLACE VIEW mvp_project_summary AS
SELECT 
  p.id,
  p.user_id,
  p.name,
  p.description,
  p.color,
  p.workflow_count,
  p.last_activity_at,
  p.created_at,
  COALESCE(w.deployed_count, 0) as deployed_workflows,
  COALESCE(cs.active_chats, 0) as active_chat_sessions
FROM projects p
LEFT JOIN (
  SELECT project_id, COUNT(*) as deployed_count
  FROM mvp_workflows 
  WHERE deployment_status = 'deployed'
  GROUP BY project_id
) w ON p.id = w.project_id
LEFT JOIN (
  SELECT project_id, COUNT(*) as active_chats
  FROM mvp_chat_sessions 
  WHERE status = 'active'
  GROUP BY project_id
) cs ON p.id = cs.project_id;

-- User dashboard stats
CREATE OR REPLACE VIEW mvp_user_dashboard_stats AS
SELECT 
  u.id as user_id,
  u.email,
  u.tier,
  u.total_workflows_created,
  u.total_deployments,
  u.total_projects,
  COALESCE(p.project_count, 0) as current_projects,
  COALESCE(w.active_workflows, 0) as active_workflows,
  COALESCE(cs.active_chats, 0) as active_chat_sessions
FROM user_profiles u
LEFT JOIN (
  SELECT user_id, COUNT(*) as project_count
  FROM projects GROUP BY user_id
) p ON u.id = p.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as active_workflows
  FROM mvp_workflows WHERE status NOT IN ('archived', 'failed')
  GROUP BY user_id
) w ON u.id = w.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as active_chats
  FROM mvp_chat_sessions WHERE status = 'active'
  GROUP BY user_id
) cs ON u.id = cs.user_id;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant usage on views
GRANT SELECT ON mvp_project_summary TO authenticated;
GRANT SELECT ON mvp_user_dashboard_stats TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_profiles IS 'MVP user profiles extending Supabase Auth';
COMMENT ON TABLE projects IS 'MVP user projects containing workflows';
COMMENT ON TABLE mvp_workflows IS 'MVP workflow table (separate from legacy workflows)';
COMMENT ON TABLE mvp_chat_sessions IS 'MVP chat sessions per project/workflow';
COMMENT ON TABLE mvp_chat_messages IS 'MVP chat messages';
COMMENT ON TABLE deployments IS 'MVP deployment tracking';
COMMENT ON TABLE telemetry_events IS 'MVP analytics and telemetry';

COMMENT ON VIEW mvp_project_summary IS 'MVP project summary for dashboard';
COMMENT ON VIEW mvp_user_dashboard_stats IS 'MVP user dashboard statistics';