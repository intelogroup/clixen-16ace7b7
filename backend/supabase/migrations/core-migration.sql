-- ============================================================================
-- Core Supabase Queue System Setup (without extensions)
-- ============================================================================

-- Execution status enum
CREATE TYPE execution_status AS ENUM (
  'pending',
  'validating', 
  'structure_validated',
  'business_validated', 
  'compatibility_validated',
  'auto_healing',
  'testing',
  'deploying',
  'completed',
  'failed',
  'cancelled'
);

-- Main workflow executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workflow_json JSONB NOT NULL,
  validation_progress JSONB DEFAULT '{}',
  status execution_status NOT NULL DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  execution_time INTEGER, -- milliseconds
  error_details JSONB,
  webhook_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT execution_time_positive CHECK (execution_time >= 0),
  CONSTRAINT retry_count_reasonable CHECK (retry_count >= 0 AND retry_count <= 10)
);

-- Workflow execution steps (for detailed tracking)
CREATE TABLE IF NOT EXISTS workflow_execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  status execution_status NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  result JSONB,
  error_details JSONB,
  
  UNIQUE(execution_id, step_name)
);

-- Queue error logging
CREATE TABLE IF NOT EXISTS queue_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow analytics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS workflow_analytics_mv AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  user_id,
  status,
  COUNT(*) as execution_count,
  AVG(execution_time) as avg_execution_time,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY execution_time) as median_execution_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time) as p95_execution_time,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY execution_time) as p99_execution_time,
  MIN(execution_time) as min_execution_time,
  MAX(execution_time) as max_execution_time,
  COUNT(*) FILTER (WHERE status = 'completed') as success_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failure_count,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 2
  ) as success_rate
FROM workflow_executions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1, 2, 3;

-- ============================================================================
-- Indexes for performance
-- ============================================================================

-- Workflow executions indexes
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_status 
  ON workflow_executions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at 
  ON workflow_executions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_retry 
  ON workflow_executions (status, retry_count, updated_at) 
  WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS idx_workflow_executions_completed_at 
  ON workflow_executions (completed_at DESC) 
  WHERE completed_at IS NOT NULL;

-- Execution steps indexes
CREATE INDEX IF NOT EXISTS idx_workflow_execution_steps_execution_id 
  ON workflow_execution_steps (execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_steps_status 
  ON workflow_execution_steps (status, started_at);

-- Queue errors index
CREATE INDEX IF NOT EXISTS idx_queue_errors_created_at 
  ON queue_errors (created_at DESC);

-- Materialized view unique index for refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_analytics_mv_unique
  ON workflow_analytics_mv (hour, user_id, status);

-- ============================================================================
-- Triggers and functions
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

-- Trigger for workflow_executions
CREATE TRIGGER workflow_executions_updated_at
  BEFORE UPDATE ON workflow_executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to calculate execution step duration
CREATE OR REPLACE FUNCTION calculate_step_duration()
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

-- Trigger for execution steps
CREATE TRIGGER workflow_execution_steps_duration
  BEFORE UPDATE ON workflow_execution_steps
  FOR EACH ROW EXECUTE FUNCTION calculate_step_duration();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on workflow_executions
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own executions
CREATE POLICY "Users can view own executions" ON workflow_executions
  FOR SELECT USING (user_id = CURRENT_USER::UUID);

-- Users can only insert their own executions  
CREATE POLICY "Users can insert own executions" ON workflow_executions
  FOR INSERT WITH CHECK (user_id = CURRENT_USER::UUID);

-- Users can only update their own executions
CREATE POLICY "Users can update own executions" ON workflow_executions
  FOR UPDATE USING (user_id = CURRENT_USER::UUID);

-- Enable RLS on workflow_execution_steps
ALTER TABLE workflow_execution_steps ENABLE ROW LEVEL SECURITY;

-- Users can only see steps for their own executions
CREATE POLICY "Users can view own execution steps" ON workflow_execution_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workflow_executions 
      WHERE id = execution_id AND user_id = CURRENT_USER::UUID
    )
  );

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Comments
COMMENT ON TABLE workflow_executions IS 'Tracks all workflow validation and execution attempts';
COMMENT ON TABLE workflow_execution_steps IS 'Detailed step-by-step execution tracking';
COMMENT ON MATERIALIZED VIEW workflow_analytics_mv IS 'Pre-computed analytics for dashboard performance';