-- Migration: Multi-User Workflow Management System
-- Description: Complete tables for user isolation, execution tracking, cost attribution, and marketplace

-- 1. User Workflows Mapping
CREATE TABLE IF NOT EXISTS user_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  n8n_workflow_id VARCHAR(255) NOT NULL,
  workflow_name VARCHAR(255) NOT NULL,
  workflow_type VARCHAR(100),
  workflow_description TEXT,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, n8n_workflow_id)
);

-- 2. Workflow Versions
CREATE TABLE IF NOT EXISTS workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES user_workflows(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  n8n_workflow_json JSONB NOT NULL,
  ai_generation_metadata JSONB DEFAULT '{}',
  deployment_status VARCHAR(20) DEFAULT 'draft',
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(workflow_id, version_number)
);

-- 3. Workflow Executions
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id VARCHAR(255) NOT NULL,
  n8n_execution_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'queued',
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  node_count INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. User Quotas
CREATE TABLE IF NOT EXISTS user_quotas (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier VARCHAR(20) DEFAULT 'free',
  executions_this_week INTEGER DEFAULT 0,
  weekly_limit INTEGER DEFAULT 100,
  executions_this_month INTEGER DEFAULT 0,
  monthly_limit INTEGER DEFAULT 400,
  total_executions INTEGER DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Execution Queue
CREATE TABLE IF NOT EXISTS execution_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id VARCHAR(255) NOT NULL,
  priority INTEGER DEFAULT 5,
  status VARCHAR(20) DEFAULT 'queued',
  payload JSONB DEFAULT '{}',
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Webhook Executions
CREATE TABLE IF NOT EXISTS webhook_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  request_payload JSONB DEFAULT '{}',
  response_data JSONB DEFAULT '{}',
  error_message TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Execution Costs
CREATE TABLE IF NOT EXISTS execution_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id VARCHAR(255) NOT NULL,
  execution_time_ms INTEGER DEFAULT 0,
  node_count INTEGER DEFAULT 0,
  ai_tokens_used INTEGER DEFAULT 0,
  data_processed_bytes BIGINT DEFAULT 0,
  cost_amount DECIMAL(10, 4) DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. User Cost Metrics (Aggregated)
CREATE TABLE IF NOT EXISTS user_cost_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE,
  execution_count INTEGER DEFAULT 0,
  total_execution_time BIGINT DEFAULT 0,
  total_node_count INTEGER DEFAULT 0,
  ai_tokens_used INTEGER DEFAULT 0,
  storage_used BIGINT DEFAULT 0,
  webhook_calls INTEGER DEFAULT 0,
  total_cost DECIMAL(10, 2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

-- 9. Notifications (for real-time updates)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  message TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Workflow Templates (for future marketplace)
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  tags TEXT[],
  n8n_workflow_json JSONB NOT NULL,
  complexity_score INTEGER DEFAULT 1,
  price_cents INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  rating_average DECIMAL(2, 1) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. User Credentials (for shared service accounts)
CREATE TABLE IF NOT EXISTS user_n8n_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  n8n_credential_id INTEGER,
  credential_type VARCHAR(100) NOT NULL,
  credential_name VARCHAR(255),
  encrypted_data TEXT,
  is_shared BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_workflows_user_id ON user_workflows(user_id);
CREATE INDEX idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_execution_queue_status ON execution_queue(status);
CREATE INDEX idx_execution_costs_user_timestamp ON execution_costs(user_id, timestamp);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX idx_workflow_templates_public ON workflow_templates(is_public, is_verified);

-- Functions

-- Function to check execution limit
CREATE OR REPLACE FUNCTION check_execution_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_running_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_running_count
  FROM execution_queue
  WHERE user_id = p_user_id
  AND status = 'running';
  
  RETURN v_running_count < 3; -- Max 3 concurrent executions
END;
$$ LANGUAGE plpgsql;

-- Function to reset weekly quotas
CREATE OR REPLACE FUNCTION reset_weekly_quotas()
RETURNS void AS $$
BEGIN
  UPDATE user_quotas
  SET 
    executions_this_week = 0,
    reset_at = NOW() + INTERVAL '7 days'
  WHERE reset_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user tier based on usage
CREATE OR REPLACE FUNCTION calculate_user_tier(p_user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_total_executions INTEGER;
  v_tier VARCHAR;
BEGIN
  SELECT total_executions INTO v_total_executions
  FROM user_quotas
  WHERE user_id = p_user_id;
  
  IF v_total_executions IS NULL THEN
    RETURN 'free';
  ELSIF v_total_executions < 1000 THEN
    RETURN 'free';
  ELSIF v_total_executions < 10000 THEN
    RETURN 'pro';
  ELSE
    RETURN 'enterprise';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_workflows_updated_at
  BEFORE UPDATE ON user_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workflow_executions_updated_at
  BEFORE UPDATE ON workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_quotas_updated_at
  BEFORE UPDATE ON user_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS)

ALTER TABLE user_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cost_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_n8n_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User can only see their own workflows
CREATE POLICY user_workflows_policy ON user_workflows
  FOR ALL USING (auth.uid() = user_id);

-- User can only see their own executions
CREATE POLICY workflow_executions_policy ON workflow_executions
  FOR ALL USING (auth.uid() = user_id);

-- User can only see their own quotas
CREATE POLICY user_quotas_policy ON user_quotas
  FOR ALL USING (auth.uid() = user_id);

-- User can only see their own queue items
CREATE POLICY execution_queue_policy ON execution_queue
  FOR ALL USING (auth.uid() = user_id);

-- User can only see their own costs
CREATE POLICY execution_costs_policy ON execution_costs
  FOR ALL USING (auth.uid() = user_id);

-- User can only see their own notifications
CREATE POLICY notifications_policy ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- User can only see their own credentials
CREATE POLICY user_credentials_policy ON user_n8n_credentials
  FOR ALL USING (auth.uid() = user_id);

-- Public templates are visible to all, private only to author
CREATE POLICY workflow_templates_public_policy ON workflow_templates
  FOR SELECT USING (is_public = true OR auth.uid() = author_id);

CREATE POLICY workflow_templates_author_policy ON workflow_templates
  FOR ALL USING (auth.uid() = author_id);

-- Initial data for existing users
INSERT INTO user_quotas (user_id, tier, weekly_limit, monthly_limit)
SELECT id, 'free', 100, 400
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;