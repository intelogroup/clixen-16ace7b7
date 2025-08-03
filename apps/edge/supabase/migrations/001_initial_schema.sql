-- Clixen Database Schema
-- Initial migration for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  workflow_quota INTEGER DEFAULT 10,
  node_limit INTEGER DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User workflows table
CREATE TABLE IF NOT EXISTS user_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  workflow_id TEXT, -- n8n workflow ID
  name TEXT NOT NULL,
  description TEXT,
  intent TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'deploying', 'active', 'failed', 'archived')),
  node_count INTEGER DEFAULT 0,
  webhook_url TEXT,
  last_run TIMESTAMPTZ,
  success_rate NUMERIC(5,2) DEFAULT 0 CHECK (success_rate >= 0 AND success_rate <= 100),
  total_executions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_workflow_per_user UNIQUE (user_id, workflow_id)
);

-- User credentials table
CREATE TABLE IF NOT EXISTS user_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  credential_id TEXT NOT NULL,
  credential_name TEXT,
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_credential_per_user UNIQUE (user_id, service, credential_id)
);

-- Workflow errors table
CREATE TABLE IF NOT EXISTS workflow_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES user_workflows(id) ON DELETE SET NULL,
  intent TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_type TEXT CHECK (error_type IN ('generation', 'validation', 'deployment', 'execution')),
  attempt_number INTEGER DEFAULT 1,
  workflow_json JSONB,
  stack_trace TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow executions table (for analytics)
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES user_workflows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  execution_id TEXT, -- n8n execution ID
  status TEXT CHECK (status IN ('running', 'success', 'error', 'timeout')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  execution_time_ms INTEGER,
  error_message TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage metrics table
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  metric_date DATE DEFAULT CURRENT_DATE,
  workflows_created INTEGER DEFAULT 0,
  workflows_executed INTEGER DEFAULT 0,
  tokens_consumed INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_metrics_per_day UNIQUE (user_id, metric_date)
);

-- Indexes for performance
CREATE INDEX idx_workflows_user_id ON user_workflows(user_id);
CREATE INDEX idx_workflows_status ON user_workflows(status);
CREATE INDEX idx_workflows_created_at ON user_workflows(created_at DESC);
CREATE INDEX idx_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_executions_user_id ON workflow_executions(user_id);
CREATE INDEX idx_errors_user_id ON workflow_errors(user_id);
CREATE INDEX idx_errors_created_at ON workflow_errors(created_at DESC);
CREATE INDEX idx_metrics_user_date ON usage_metrics(user_id, metric_date DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Workflows policies
CREATE POLICY "Users can view own workflows" ON user_workflows
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own workflows" ON user_workflows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflows" ON user_workflows
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workflows" ON user_workflows
  FOR DELETE USING (auth.uid() = user_id);

-- Credentials policies
CREATE POLICY "Users can view own credentials" ON user_credentials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own credentials" ON user_credentials
  FOR ALL USING (auth.uid() = user_id);

-- Errors policies
CREATE POLICY "Users can view own errors" ON workflow_errors
  FOR SELECT USING (auth.uid() = user_id);

-- Executions policies
CREATE POLICY "Users can view own executions" ON workflow_executions
  FOR SELECT USING (auth.uid() = user_id);

-- Metrics policies
CREATE POLICY "Users can view own metrics" ON usage_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- Functions and Triggers

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON user_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credentials_updated_at BEFORE UPDATE ON user_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update workflow success rate
CREATE OR REPLACE FUNCTION update_workflow_success_rate()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_workflows
  SET 
    success_rate = (
      SELECT 
        ROUND((COUNT(CASE WHEN status = 'success' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      FROM workflow_executions
      WHERE workflow_id = NEW.workflow_id
    ),
    total_executions = (
      SELECT COUNT(*) FROM workflow_executions WHERE workflow_id = NEW.workflow_id
    ),
    last_run = NOW()
  WHERE id = NEW.workflow_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflow_stats AFTER INSERT ON workflow_executions
  FOR EACH ROW EXECUTE FUNCTION update_workflow_success_rate();

-- Function to update daily usage metrics
CREATE OR REPLACE FUNCTION update_usage_metrics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usage_metrics (user_id, metric_date, workflows_created, workflows_executed)
  VALUES (NEW.user_id, CURRENT_DATE, 
    CASE WHEN TG_TABLE_NAME = 'user_workflows' THEN 1 ELSE 0 END,
    CASE WHEN TG_TABLE_NAME = 'workflow_executions' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, metric_date) 
  DO UPDATE SET
    workflows_created = usage_metrics.workflows_created + CASE WHEN TG_TABLE_NAME = 'user_workflows' THEN 1 ELSE 0 END,
    workflows_executed = usage_metrics.workflows_executed + CASE WHEN TG_TABLE_NAME = 'workflow_executions' THEN 1 ELSE 0 END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_workflow_creation AFTER INSERT ON user_workflows
  FOR EACH ROW EXECUTE FUNCTION update_usage_metrics();

CREATE TRIGGER track_workflow_execution AFTER INSERT ON workflow_executions
  FOR EACH ROW EXECUTE FUNCTION update_usage_metrics();

-- Initial data for testing (optional)
-- INSERT INTO profiles (id, email) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'test@clixen.com')
-- ON CONFLICT DO NOTHING;