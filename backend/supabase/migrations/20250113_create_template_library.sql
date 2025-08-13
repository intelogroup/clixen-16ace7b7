-- Migration: Create Battle-Tested Template Library
-- Purpose: Establish infrastructure for curated workflow templates
-- Author: Clixen Architecture Team
-- Date: 2025-01-13

-- Main template storage
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  version TEXT DEFAULT '1.0.0',
  
  -- Classification
  category TEXT NOT NULL CHECK (category IN (
    'e-commerce', 'marketing', 'productivity', 'finance', 
    'communication', 'data-analytics', 'development', 'custom'
  )),
  tags TEXT[] DEFAULT '{}',
  persona TEXT CHECK (persona IN ('alex', 'jordan', 'sam', 'universal')),
  use_case TEXT,
  
  -- Technical specifications
  trigger_app TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  action_apps TEXT[] NOT NULL,
  complexity TEXT CHECK (complexity IN ('simple', 'moderate', 'advanced')),
  
  -- Template content
  n8n_json JSONB NOT NULL,
  placeholders JSONB DEFAULT '[]',
  
  -- Testing & validation
  test_data JSONB,
  validation_rules JSONB DEFAULT '[]',
  success_metrics JSONB DEFAULT '[]',
  
  -- Analytics
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 1.00,
  avg_execution_time INTEGER,
  
  -- Documentation
  description TEXT,
  requirements TEXT[] DEFAULT '{}',
  limitations TEXT[] DEFAULT '{}',
  example_prompt TEXT,
  
  -- Lifecycle
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'testing', 'active', 'deprecated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_tested TIMESTAMPTZ
);

-- Template usage tracking
CREATE TABLE IF NOT EXISTS template_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id TEXT,  -- n8n workflow ID
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Deployment details
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  deployment_status TEXT CHECK (deployment_status IN ('pending', 'success', 'failed', 'partial')),
  error_message TEXT,
  
  -- Customization tracking
  placeholders_filled JSONB,
  modifications_made JSONB,
  user_prompt TEXT,  -- Original user request
  
  -- Performance metrics
  execution_count INTEGER DEFAULT 0,
  last_execution TIMESTAMPTZ,
  avg_execution_time INTEGER,
  success_rate DECIMAL(3,2),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template discovery cache for external templates
CREATE TABLE IF NOT EXISTS template_discovery_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('n8n.io', 'community', 'github', 'custom')),
  external_id TEXT,
  external_url TEXT,
  
  -- Discovery metadata
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  relevance_score DECIMAL(3,2),
  popularity_score INTEGER,
  
  -- Template analysis
  analyzed BOOLEAN DEFAULT FALSE,
  analysis_result JSONB,
  compatibility_score DECIMAL(3,2),
  node_compatibility JSONB,  -- Which nodes are compatible
  
  -- Import status
  imported BOOLEAN DEFAULT FALSE,
  import_errors TEXT[],
  template_id UUID REFERENCES workflow_templates(id),
  
  -- Content
  raw_json JSONB,
  title TEXT,
  description TEXT,
  author TEXT,
  tags TEXT[]
);

-- Template validation logs
CREATE TABLE IF NOT EXISTS template_validation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE,
  
  -- Validation details
  validation_type TEXT CHECK (validation_type IN ('syntax', 'security', 'performance', 'compatibility')),
  validation_status TEXT CHECK (validation_status IN ('passed', 'failed', 'warning')),
  validation_message TEXT,
  validation_details JSONB,
  
  -- Metadata
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  validated_by UUID REFERENCES auth.users(id),
  validation_version TEXT DEFAULT '1.0.0'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_trigger ON workflow_templates(trigger_app);
CREATE INDEX IF NOT EXISTS idx_templates_actions ON workflow_templates USING GIN(action_apps);
CREATE INDEX IF NOT EXISTS idx_templates_tags ON workflow_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_templates_status ON workflow_templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_persona ON workflow_templates(persona);
CREATE INDEX IF NOT EXISTS idx_deployments_user ON template_deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_template ON template_deployments(template_id);
CREATE INDEX IF NOT EXISTS idx_discovery_source ON template_discovery_cache(source);
CREATE INDEX IF NOT EXISTS idx_discovery_imported ON template_discovery_cache(imported);

-- Row Level Security (RLS) Policies
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_discovery_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_validation_logs ENABLE ROW LEVEL SECURITY;

-- Public read access to active templates
CREATE POLICY "Public can view active templates" ON workflow_templates
  FOR SELECT
  USING (status = 'active');

-- Users can view their own deployments
CREATE POLICY "Users can view own deployments" ON template_deployments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create deployments
CREATE POLICY "Users can create deployments" ON template_deployments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin full access to templates (for template management)
CREATE POLICY "Admins can manage templates" ON workflow_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Function to update template usage statistics
CREATE OR REPLACE FUNCTION update_template_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deployment_status = 'success' THEN
    UPDATE workflow_templates
    SET 
      usage_count = usage_count + 1,
      updated_at = NOW()
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update template stats on successful deployment
CREATE TRIGGER update_template_stats_trigger
AFTER INSERT OR UPDATE ON template_deployments
FOR EACH ROW
WHEN (NEW.deployment_status = 'success')
EXECUTE FUNCTION update_template_stats();

-- Function to calculate template success rate
CREATE OR REPLACE FUNCTION calculate_template_success_rate(template_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  success_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE deployment_status = 'success'),
    COUNT(*)
  INTO success_count, total_count
  FROM template_deployments
  WHERE template_id = template_uuid;
  
  IF total_count = 0 THEN
    RETURN 1.00;
  ELSE
    RETURN ROUND(success_count::DECIMAL / total_count, 2);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Initial seed data for testing
INSERT INTO workflow_templates (
  name, 
  slug, 
  category, 
  tags, 
  persona,
  use_case,
  trigger_app, 
  trigger_type,
  action_apps,
  complexity,
  n8n_json,
  placeholders,
  description,
  example_prompt,
  status
) VALUES (
  'Hacker News Daily Digest',
  'hacker-news-daily-digest',
  'data-analytics',
  ARRAY['news', 'email', 'digest', 'hacker-news'],
  'universal',
  'Send daily digest of top Hacker News stories',
  'schedule',
  'cron',
  ARRAY['http', 'email'],
  'simple',
  '{
    "nodes": [
      {
        "id": "trigger",
        "type": "n8n-nodes-base.scheduleTrigger",
        "parameters": {
          "rule": {
            "cronExpression": "{{CRON_EXPRESSION}}"
          }
        }
      }
    ]
  }'::JSONB,
  '[
    {
      "key": "{{CRON_EXPRESSION}}",
      "type": "string",
      "required": true,
      "default_value": "0 9 * * *",
      "description": "When to send the digest",
      "ai_hint": "Extract time from user request",
      "user_prompt": "What time would you like to receive your daily digest?"
    },
    {
      "key": "{{RECIPIENT_EMAIL}}",
      "type": "string",
      "required": true,
      "description": "Email address to send digest to",
      "validation_regex": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
      "ai_hint": "Extract email from user context or request",
      "user_prompt": "What email address should receive the digest?"
    }
  ]'::JSONB,
  'Automatically fetch and email the top stories from Hacker News every day at your preferred time.',
  'Send me the top Hacker News stories every morning at 9am',
  'active'
);

-- Table for tracking unmatched requests (MVP Phase 1)
CREATE TABLE IF NOT EXISTS unmatched_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Request details
  prompt TEXT NOT NULL,
  analyzed_intent JSONB,
  
  -- Tracking
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending_template' CHECK (status IN (
    'pending_template',    -- Waiting for template creation
    'template_created',    -- Template has been created
    'wont_implement',      -- Decided not to implement
    'duplicate'            -- Duplicate of existing request
  )),
  
  -- Priority scoring
  request_count INTEGER DEFAULT 1,  -- How many times requested
  priority_score DECIMAL(3,2),      -- Calculated priority for implementation
  
  -- Resolution
  template_id UUID REFERENCES workflow_templates(id),  -- If template was created
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

-- Index for finding popular requests
CREATE INDEX IF NOT EXISTS idx_unmatched_status ON unmatched_requests(status);
CREATE INDEX IF NOT EXISTS idx_unmatched_user ON unmatched_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_unmatched_priority ON unmatched_requests(priority_score DESC);

-- RLS for unmatched requests
ALTER TABLE unmatched_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own unmatched requests
CREATE POLICY "Users can view own unmatched requests" ON unmatched_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Function to increment request count for duplicates
CREATE OR REPLACE FUNCTION increment_unmatched_request()
RETURNS TRIGGER AS $$
DECLARE
  existing_id UUID;
BEGIN
  -- Check for similar request in last 30 days
  SELECT id INTO existing_id
  FROM unmatched_requests
  WHERE status = 'pending_template'
    AND timestamp > NOW() - INTERVAL '30 days'
    AND analyzed_intent = NEW.analyzed_intent
  LIMIT 1;
  
  IF existing_id IS NOT NULL THEN
    -- Increment count on existing request
    UPDATE unmatched_requests
    SET 
      request_count = request_count + 1,
      priority_score = LEAST(1.0, (request_count + 1) * 0.1)
    WHERE id = existing_id;
    
    -- Prevent insert of duplicate
    RETURN NULL;
  END IF;
  
  -- Calculate initial priority
  NEW.priority_score = 0.1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to handle duplicate requests
CREATE TRIGGER handle_duplicate_unmatched_requests
BEFORE INSERT ON unmatched_requests
FOR EACH ROW
EXECUTE FUNCTION increment_unmatched_request();

-- Add comment for documentation
COMMENT ON TABLE workflow_templates IS 'Battle-tested workflow templates for reliable automation generation';
COMMENT ON TABLE template_deployments IS 'Track template usage and customization by users';
COMMENT ON TABLE template_discovery_cache IS 'Cache of discovered templates from external sources';
COMMENT ON TABLE template_validation_logs IS 'Validation history for quality assurance';
COMMENT ON TABLE unmatched_requests IS 'Track workflow requests that dont match existing templates for future development';