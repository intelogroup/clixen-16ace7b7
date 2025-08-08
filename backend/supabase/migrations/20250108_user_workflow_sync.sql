-- Migration: User Workflow Sync Improvements for MVP
-- Purpose: Ensure proper user isolation and workflow tracking

-- Add indexes for better performance when filtering by user
CREATE INDEX IF NOT EXISTS idx_mvp_workflows_user_id ON mvp_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_mvp_workflows_n8n_id ON mvp_workflows(n8n_workflow_id);
CREATE INDEX IF NOT EXISTS idx_mvp_workflows_status ON mvp_workflows(status);

-- Add composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_mvp_workflows_user_status 
  ON mvp_workflows(user_id, status, created_at DESC);

-- Update RLS policies to ensure strict user isolation
ALTER TABLE mvp_workflows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own workflows" ON mvp_workflows;
DROP POLICY IF EXISTS "Users can create own workflows" ON mvp_workflows;
DROP POLICY IF EXISTS "Users can update own workflows" ON mvp_workflows;

-- Create strict RLS policies
CREATE POLICY "Users can view own workflows" ON mvp_workflows
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own workflows" ON mvp_workflows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflows" ON mvp_workflows
  FOR UPDATE USING (auth.uid() = user_id);

-- Add workflow cleanup tracking
ALTER TABLE mvp_workflows 
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS execution_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Function to update last accessed timestamp
CREATE OR REPLACE FUNCTION update_workflow_access_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update access time on workflow updates
DROP TRIGGER IF EXISTS update_workflow_access ON mvp_workflows;
CREATE TRIGGER update_workflow_access
  BEFORE UPDATE ON mvp_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_access_time();

-- View for dashboard display (user-specific)
CREATE OR REPLACE VIEW user_workflows_dashboard AS
SELECT 
  w.id,
  w.name,
  w.description,
  w.status,
  w.n8n_workflow_id,
  w.webhook_url,
  w.created_at,
  w.last_accessed_at,
  w.execution_count,
  w.is_active,
  p.name as project_name,
  p.id as project_id
FROM mvp_workflows w
LEFT JOIN projects p ON w.project_id = p.id
WHERE w.user_id = auth.uid()
  AND w.is_active = true
ORDER BY w.last_accessed_at DESC;

-- Grant access to the view
GRANT SELECT ON user_workflows_dashboard TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW user_workflows_dashboard IS 'User-specific workflow view for dashboard display with strict RLS enforcement';