-- Migration: Add 2-Way Sync Support for Workflows
-- Phase 3: Workflow Sync Implementation
-- Description: Adds columns and tables needed for 2-way sync between Supabase and n8n

-- Add sync-related columns to mvp_workflows table
ALTER TABLE mvp_workflows ADD COLUMN IF NOT EXISTS execution_count INTEGER DEFAULT 0;
ALTER TABLE mvp_workflows ADD COLUMN IF NOT EXISTS successful_executions INTEGER DEFAULT 0;
ALTER TABLE mvp_workflows ADD COLUMN IF NOT EXISTS failed_executions INTEGER DEFAULT 0;
ALTER TABLE mvp_workflows ADD COLUMN IF NOT EXISTS last_execution_at TIMESTAMPTZ NULL;
ALTER TABLE mvp_workflows ADD COLUMN IF NOT EXISTS last_execution_status TEXT NULL;
ALTER TABLE mvp_workflows ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ NULL;

-- Create sync_logs table for tracking sync operations
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  sync_type TEXT NOT NULL, -- 'workflow_sync', 'cleanup', etc.
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- 'success', 'error', 'partial_success'
  workflows_processed INTEGER DEFAULT 0,
  successful_syncs INTEGER DEFAULT 0,
  failed_syncs INTEGER DEFAULT 0,
  executions_updated INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  errors JSONB NULL,
  metadata JSONB NULL
);

-- Add index on sync_logs for performance
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_type_status ON sync_logs(sync_type, status);

-- Add index on mvp_workflows for sync queries
CREATE INDEX IF NOT EXISTS idx_mvp_workflows_n8n_id ON mvp_workflows(n8n_workflow_id) WHERE n8n_workflow_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mvp_workflows_last_sync ON mvp_workflows(last_sync_at);

-- Row Level Security for sync_logs
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sync logs
CREATE POLICY "Users can view their own sync logs"
ON sync_logs FOR SELECT
USING (
  user_id IS NULL OR -- System-wide sync logs visible to all
  auth.uid() = user_id
);

-- Policy: Service role can manage all sync logs  
CREATE POLICY "Service role can manage all sync logs"
ON sync_logs FOR ALL
USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE sync_logs IS 'Tracks 2-way sync operations between Supabase and n8n';
COMMENT ON COLUMN mvp_workflows.execution_count IS 'Total number of workflow executions from n8n';
COMMENT ON COLUMN mvp_workflows.successful_executions IS 'Number of successful executions';
COMMENT ON COLUMN mvp_workflows.failed_executions IS 'Number of failed executions';
COMMENT ON COLUMN mvp_workflows.last_execution_at IS 'Timestamp of most recent execution';
COMMENT ON COLUMN mvp_workflows.last_execution_status IS 'Status of most recent execution';
COMMENT ON COLUMN mvp_workflows.last_sync_at IS 'Timestamp of last sync with n8n';

-- Enable realtime for mvp_workflows table for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE mvp_workflows;

-- Create a function to update last_accessed_at when syncing
CREATE OR REPLACE FUNCTION update_workflow_access_on_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_accessed_at when execution data changes
  IF OLD.execution_count IS DISTINCT FROM NEW.execution_count OR
     OLD.last_execution_at IS DISTINCT FROM NEW.last_execution_at THEN
    NEW.last_accessed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update access time on sync
DROP TRIGGER IF EXISTS trigger_workflow_sync_access ON mvp_workflows;
CREATE TRIGGER trigger_workflow_sync_access
  BEFORE UPDATE ON mvp_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_access_on_sync();

-- Insert initial sync log entry
INSERT INTO sync_logs (sync_type, status, metadata)
VALUES (
  'migration', 
  'success', 
  jsonb_build_object(
    'migration', '20250108_workflow_sync_schema',
    'description', 'Added 2-way sync support for workflows',
    'timestamp', NOW()
  )
);