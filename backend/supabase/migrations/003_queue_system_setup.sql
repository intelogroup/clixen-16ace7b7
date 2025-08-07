-- ============================================================================
-- Supabase Queue System Setup
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgmq";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ============================================================================
-- Custom queue management functions
-- ============================================================================

-- Create queue with error handling
CREATE OR REPLACE FUNCTION pgmq_create_queue(queue_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if queue already exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'pgmq_' || queue_name
  ) THEN
    RETURN TRUE; -- Queue already exists
  END IF;
  
  -- Create the queue
  PERFORM pgmq.create(queue_name);
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  -- Log error and return false
  INSERT INTO queue_errors (queue_name, error_message, created_at)
  VALUES (queue_name, SQLERRM, NOW());
  
  RETURN FALSE;
END;
$$;

-- Send message with delay support
CREATE OR REPLACE FUNCTION pgmq_send_with_delay(
  queue_name TEXT,
  msg JSONB,
  delay_seconds INTEGER DEFAULT 0
)
RETURNS TABLE(msg_id BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_id BIGINT;
BEGIN
  IF delay_seconds > 0 THEN
    SELECT pgmq.send_at(queue_name, msg, NOW() + (delay_seconds || ' seconds')::INTERVAL) INTO result_id;
  ELSE
    SELECT pgmq.send(queue_name, msg) INTO result_id;
  END IF;
  
  RETURN QUERY SELECT result_id;
END;
$$;

-- Read batch of messages
CREATE OR REPLACE FUNCTION pgmq_read_batch(
  queue_name TEXT,
  vt_seconds INTEGER DEFAULT 30,
  qty INTEGER DEFAULT 10
)
RETURNS TABLE(msg_id BIGINT, read_ct INTEGER, enqueued_at TIMESTAMPTZ, vt TIMESTAMPTZ, message JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT * FROM pgmq.read(queue_name, vt_seconds, qty);
END;
$$;

-- Get queue metrics
CREATE OR REPLACE FUNCTION pgmq_metrics(queue_name TEXT)
RETURNS TABLE(
  queue_length BIGINT,
  oldest_msg_age_sec INTEGER,
  total_messages BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    (SELECT COUNT(*) FROM pgmq.metrics_all() WHERE queue_name_text = queue_name),
    (SELECT EXTRACT(EPOCH FROM (NOW() - MIN(enqueued_at)))::INTEGER 
     FROM pgmq.read(queue_name, 0, 1)),
    (SELECT COUNT(*) FROM pgmq.metrics_all() WHERE queue_name_text = queue_name);
END;
$$;

-- Purge queue
CREATE OR REPLACE FUNCTION pgmq_purge_queue(queue_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM pgmq.purge_queue(queue_name);
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- Enable extension helper
CREATE OR REPLACE FUNCTION enable_extension(extension_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE 'CREATE EXTENSION IF NOT EXISTS ' || quote_ident(extension_name);
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- ============================================================================
-- Workflow execution tables
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Function to send webhook notifications
CREATE OR REPLACE FUNCTION notify_workflow_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only send webhook if URL is provided and status changed to completed/failed
  IF NEW.webhook_url IS NOT NULL 
     AND OLD.status != NEW.status 
     AND NEW.status IN ('completed', 'failed') THEN
    
    -- Send async webhook using pg_net
    PERFORM net.http_post(
      url := NEW.webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'User-Agent', 'Clixen-Workflow-Engine/1.0',
        'X-Clixen-Event', 'workflow.execution.' || NEW.status
      ),
      body := jsonb_build_object(
        'event', 'workflow.execution.' || NEW.status,
        'execution_id', NEW.id,
        'user_id', NEW.user_id,
        'status', NEW.status,
        'execution_time', NEW.execution_time,
        'retry_count', NEW.retry_count,
        'timestamp', NEW.completed_at,
        'metadata', NEW.metadata
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for webhook notifications
CREATE TRIGGER workflow_completion_webhook
  AFTER UPDATE ON workflow_executions
  FOR EACH ROW EXECUTE FUNCTION notify_workflow_completion();

-- ============================================================================
-- Scheduled jobs using pg_cron
-- ============================================================================

-- Clean up old execution logs (every hour)
SELECT cron.schedule(
  'cleanup-old-executions',
  '0 * * * *', -- Every hour
  $$
  DELETE FROM workflow_executions 
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND status IN ('completed', 'failed');
  $$
);

-- Clean up old queue errors (daily)
SELECT cron.schedule(
  'cleanup-queue-errors',
  '0 2 * * *', -- 2 AM daily
  $$
  DELETE FROM queue_errors
  WHERE created_at < NOW() - INTERVAL '7 days';
  $$
);

-- Refresh materialized views (every 5 minutes)
SELECT cron.schedule(
  'refresh-workflow-analytics',
  '*/5 * * * *', -- Every 5 minutes
  $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY workflow_analytics_mv;
  $$
);

-- Auto-retry failed workflows (every 10 minutes)
SELECT cron.schedule(
  'auto-retry-failed-workflows',
  '*/10 * * * *', -- Every 10 minutes
  $$
  WITH failed_workflows AS (
    SELECT id, workflow_json, retry_count, user_id
    FROM workflow_executions
    WHERE status = 'failed'
    AND retry_count < 3
    AND updated_at < NOW() - INTERVAL '30 minutes'
    LIMIT 100
  )
  INSERT INTO pgmq_workflow_validation (message)
  SELECT jsonb_build_object(
    'execution_id', id,
    'workflow_json', workflow_json,
    'retry_count', retry_count + 1,
    'user_id', user_id,
    'action', 'retry_validation'
  )
  FROM failed_workflows;
  $$
);

-- Monitor queue health (every minute)
SELECT cron.schedule(
  'monitor-queue-health',
  '* * * * *', -- Every minute
  $$
  INSERT INTO queue_errors (queue_name, error_message)
  SELECT 
    'health_check',
    'Queue depth warning: ' || queue_name || ' has ' || queue_length || ' pending jobs'
  FROM pgmq.metrics_all()
  WHERE queue_length > 1000; -- Alert if queue depth > 1000
  $$
);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on workflow_executions
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own executions
CREATE POLICY "Users can view own executions" ON workflow_executions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own executions  
CREATE POLICY "Users can insert own executions" ON workflow_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own executions
CREATE POLICY "Users can update own executions" ON workflow_executions
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable RLS on workflow_execution_steps
ALTER TABLE workflow_execution_steps ENABLE ROW LEVEL SECURITY;

-- Users can only see steps for their own executions
CREATE POLICY "Users can view own execution steps" ON workflow_execution_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workflow_executions 
      WHERE id = execution_id AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- Initial data and cleanup
-- ============================================================================

-- Create initial queues
SELECT pgmq_create_queue('workflow_validation');
SELECT pgmq_create_queue('auto_heal');
SELECT pgmq_create_queue('deployment_test');
SELECT pgmq_create_queue('webhook_delivery');
SELECT pgmq_create_queue('analytics_processing');

-- Initial materialized view data
REFRESH MATERIALIZED VIEW workflow_analytics_mv;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA pgmq TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

COMMENT ON TABLE workflow_executions IS 'Tracks all workflow validation and execution attempts';
COMMENT ON TABLE workflow_execution_steps IS 'Detailed step-by-step execution tracking';
COMMENT ON MATERIALIZED VIEW workflow_analytics_mv IS 'Pre-computed analytics for dashboard performance';