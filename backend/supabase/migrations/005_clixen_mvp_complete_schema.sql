-- ============================================================================
-- Clixen MVP Complete Database Schema
-- ============================================================================
-- This migration creates the complete MVP schema based on the specification
-- Includes: Users, Projects, Workflows, Chat Sessions, Deployments, and Telemetry
-- Author: Database Architect Agent
-- Date: 2025-01-08
-- Version: MVP 1.0

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE MVP TABLES
-- ============================================================================

-- 1. Users Table (Extended profile for Supabase Auth)
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

-- 3. Workflows Table (MVP core entity)
CREATE TABLE IF NOT EXISTS workflows (
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
  CONSTRAINT workflows_name_length CHECK (length(name) >= 1 AND length(name) <= 255),
  CONSTRAINT workflows_version_positive CHECK (version > 0)
);

-- 4. Chat Sessions Table (MVP requirement: persistent chat per project/workflow)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE, -- Optional: can be project-level chat
  
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

-- 5. Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message content
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  
  -- AI agent information (optional for MVP but useful for telemetry)
  agent_type TEXT DEFAULT 'system' CHECK (agent_type IN ('system', 'orchestrator', 'workflow_designer', 'deployment')),
  
  -- Processing metadata
  processing_time_ms INTEGER,
  tokens_used INTEGER DEFAULT 0,
  
  -- Message metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chat_messages_content_length CHECK (length(content) >= 1)
);

-- 6. Deployments Table (Track deployment history and status)
CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  
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

-- 7. Telemetry Table (MVP requirement: user events analytics)
CREATE TABLE IF NOT EXISTS telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for anonymous events
  
  -- Event identification
  event_type TEXT NOT NULL, -- 'user_signup', 'workflow_create', 'workflow_deploy', 'chat_start', etc.
  event_category TEXT NOT NULL, -- 'auth', 'workflow', 'deployment', 'engagement'
  
  -- Event context
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  
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
  CONSTRAINT telemetry_events_type_length CHECK (length(event_type) >= 1 AND length(event_type) <= 100),
  CONSTRAINT telemetry_events_category_valid CHECK (event_category IN ('auth', 'workflow', 'deployment', 'engagement', 'error', 'performance'))
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- User profiles indexes
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_tier ON user_profiles(tier);
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- Projects indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_user_activity ON projects(user_id, last_activity_at DESC);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- Workflows indexes
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_workflows_project_id ON workflows(project_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_deployment_status ON workflows(deployment_status);
CREATE INDEX idx_workflows_user_project ON workflows(user_id, project_id);
CREATE INDEX idx_workflows_created_at ON workflows(created_at DESC);
CREATE INDEX idx_workflows_last_deployed ON workflows(last_deployed_at DESC) WHERE last_deployed_at IS NOT NULL;

-- Chat sessions indexes
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_project_id ON chat_sessions(project_id);
CREATE INDEX idx_chat_sessions_workflow_id ON chat_sessions(workflow_id) WHERE workflow_id IS NOT NULL;
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_last_message ON chat_sessions(last_message_at DESC);

-- Chat messages indexes
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_role ON chat_messages(role);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at ASC); -- For chronological order

-- Deployments indexes
CREATE INDEX idx_deployments_user_id ON deployments(user_id);
CREATE INDEX idx_deployments_workflow_id ON deployments(workflow_id);
CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_created_at ON deployments(created_at DESC);

-- Telemetry indexes
CREATE INDEX idx_telemetry_events_user_id ON telemetry_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_telemetry_events_type ON telemetry_events(event_type);
CREATE INDEX idx_telemetry_events_category ON telemetry_events(event_category);
CREATE INDEX idx_telemetry_events_created_at ON telemetry_events(created_at DESC);
CREATE INDEX idx_telemetry_events_success ON telemetry_events(success, event_type);

-- Composite indexes for common queries
CREATE INDEX idx_workflows_user_status_created ON workflows(user_id, status, created_at DESC);
CREATE INDEX idx_telemetry_user_category_date ON telemetry_events(user_id, event_category, created_at DESC) WHERE user_id IS NOT NULL;

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

CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to calculate deployment duration
CREATE OR REPLACE FUNCTION calculate_deployment_duration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_ms = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_deployments_duration
  BEFORE UPDATE ON deployments
  FOR EACH ROW EXECUTE FUNCTION calculate_deployment_duration();

-- Function to update project activity timestamp
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
CREATE TRIGGER update_project_activity_workflows
  AFTER INSERT OR UPDATE OR DELETE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_project_activity();

CREATE TRIGGER update_project_activity_chat_sessions
  AFTER INSERT OR UPDATE OR DELETE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_project_activity();

-- Function to update counters
CREATE OR REPLACE FUNCTION update_workflow_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update project workflow count
  UPDATE projects 
  SET workflow_count = (
    SELECT COUNT(*) 
    FROM workflows 
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

CREATE TRIGGER update_workflow_counters
  AFTER INSERT OR UPDATE OR DELETE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_workflow_counters();

-- Function to update chat session counters
CREATE OR REPLACE FUNCTION update_chat_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chat_sessions 
    SET message_count = message_count + 1,
        last_message_at = NEW.created_at
    WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_chat_counters
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_counters();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view and edit own profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- Workflows policies
CREATE POLICY "Users can manage own workflows" ON workflows
  FOR ALL USING (auth.uid() = user_id);

-- Chat sessions policies
CREATE POLICY "Users can manage own chat sessions" ON chat_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can manage own chat messages" ON chat_messages
  FOR ALL USING (auth.uid() = user_id);

-- Deployments policies
CREATE POLICY "Users can view own deployments" ON deployments
  FOR ALL USING (auth.uid() = user_id);

-- Telemetry policies (users can only view their own events)
CREATE POLICY "Users can view own telemetry" ON telemetry_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert telemetry" ON telemetry_events
  FOR INSERT WITH CHECK (true); -- Allow system to insert events

-- ============================================================================
-- USEFUL VIEWS FOR MVP
-- ============================================================================

-- Project summary view
CREATE VIEW project_summary AS
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
  FROM workflows 
  WHERE deployment_status = 'deployed'
  GROUP BY project_id
) w ON p.id = w.project_id
LEFT JOIN (
  SELECT project_id, COUNT(*) as active_chats
  FROM chat_sessions 
  WHERE status = 'active'
  GROUP BY project_id
) cs ON p.id = cs.project_id;

-- User dashboard stats view
CREATE VIEW user_dashboard_stats AS
SELECT 
  u.id as user_id,
  u.email,
  u.tier,
  u.total_workflows_created,
  u.total_deployments,
  u.total_projects,
  COALESCE(p.project_count, 0) as current_projects,
  COALESCE(w.active_workflows, 0) as active_workflows,
  COALESCE(cs.active_chats, 0) as active_chat_sessions,
  COALESCE(recent_activity.last_activity, u.updated_at) as last_activity_at
FROM user_profiles u
LEFT JOIN (
  SELECT user_id, COUNT(*) as project_count
  FROM projects
  GROUP BY user_id
) p ON u.id = p.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as active_workflows
  FROM workflows
  WHERE status NOT IN ('archived', 'failed')
  GROUP BY user_id
) w ON u.id = w.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as active_chats
  FROM chat_sessions
  WHERE status = 'active'
  GROUP BY user_id
) cs ON u.id = cs.user_id
LEFT JOIN (
  SELECT user_id, MAX(created_at) as last_activity
  FROM telemetry_events
  WHERE user_id IS NOT NULL
  GROUP BY user_id
) recent_activity ON u.id = recent_activity.user_id;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant usage on views
GRANT SELECT ON project_summary TO authenticated;
GRANT SELECT ON user_dashboard_stats TO authenticated;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE user_profiles IS 'Extended user profiles for Supabase Auth users with MVP tracking';
COMMENT ON TABLE projects IS 'User projects containing workflows and chat sessions';
COMMENT ON TABLE workflows IS 'MVP core entity: user-created n8n workflows with deployment tracking';
COMMENT ON TABLE chat_sessions IS 'Persistent chat sessions per project/workflow as required by MVP';
COMMENT ON TABLE chat_messages IS 'Individual messages within chat sessions';
COMMENT ON TABLE deployments IS 'Deployment history and status tracking for workflows';
COMMENT ON TABLE telemetry_events IS 'User analytics and behavior tracking as required by MVP';

COMMENT ON VIEW project_summary IS 'Aggregated project statistics for dashboard display';
COMMENT ON VIEW user_dashboard_stats IS 'Complete user dashboard statistics';