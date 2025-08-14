-- Enhanced Folder Verification System Tables
-- Implements Jimmy's triple-verification recommendations

-- Table to store folder metadata file hashes for tamper detection
CREATE TABLE IF NOT EXISTS folder_metadata_hashes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  folder_id TEXT NOT NULL UNIQUE,
  hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for folder audit log
CREATE TABLE IF NOT EXISTS folder_audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  folder_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for efficient queries
  INDEX idx_folder_audit_folder_id (folder_id),
  INDEX idx_folder_audit_created_at (created_at DESC)
);

-- Table for folders requiring manual review
CREATE TABLE IF NOT EXISTS folder_review_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  folder_id TEXT NOT NULL,
  issues TEXT[],
  status TEXT DEFAULT 'pending_review',
  reviewed_by TEXT,
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending_review', 'reviewing', 'resolved', 'escalated'))
);

-- Add reconciliation tracking to folder_assignments
ALTER TABLE folder_assignments 
ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT;

-- Create storage bucket for folder metadata files
INSERT INTO storage.buckets (id, name, public)
VALUES ('folder-metadata', 'folder-metadata', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for new tables
ALTER TABLE folder_metadata_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_review_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can manage metadata hashes
CREATE POLICY "Service role manages metadata hashes" ON folder_metadata_hashes
  FOR ALL USING (auth.role() = 'service_role');

-- Audit log is append-only for authenticated users
CREATE POLICY "Authenticated users can insert audit logs" ON folder_audit_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Service role can read audit logs" ON folder_audit_log
  FOR SELECT USING (auth.role() = 'service_role');

-- Review queue is admin-only
CREATE POLICY "Service role manages review queue" ON folder_review_queue
  FOR ALL USING (auth.role() = 'service_role');

-- Function to check folder consistency
CREATE OR REPLACE FUNCTION check_folder_consistency()
RETURNS TABLE (
  folder_id TEXT,
  has_db_assignment BOOLEAN,
  has_workflows BOOLEAN,
  has_metadata BOOLEAN,
  is_consistent BOOLEAN,
  issues TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH folder_state AS (
    SELECT 
      fa.folder_tag_name as folder_id,
      fa.is_assigned as has_db_assignment,
      EXISTS(
        SELECT 1 FROM folder_metadata_hashes fmh 
        WHERE fmh.folder_id = fa.folder_tag_name
      ) as has_metadata
    FROM folder_assignments fa
  )
  SELECT 
    fs.folder_id,
    fs.has_db_assignment,
    false as has_workflows, -- Would need SSH to check
    fs.has_metadata,
    (fs.has_db_assignment = fs.has_metadata) as is_consistent,
    CASE 
      WHEN fs.has_db_assignment AND NOT fs.has_metadata THEN 
        ARRAY['Missing metadata file']
      WHEN NOT fs.has_db_assignment AND fs.has_metadata THEN 
        ARRAY['Unexpected metadata file']
      ELSE ARRAY[]::TEXT[]
    END as issues
  FROM folder_state fs;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log folder assignment changes
CREATE OR REPLACE FUNCTION log_folder_assignment_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_assigned != NEW.is_assigned THEN
      INSERT INTO folder_audit_log (folder_id, user_id, action, metadata)
      VALUES (
        NEW.folder_tag_name,
        NEW.user_id,
        CASE 
          WHEN NEW.is_assigned THEN 'folder_assigned'
          ELSE 'folder_unassigned'
        END,
        jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status,
          'old_user', OLD.user_id,
          'new_user', NEW.user_id
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER folder_assignment_audit_trigger
AFTER UPDATE ON folder_assignments
FOR EACH ROW
EXECUTE FUNCTION log_folder_assignment_changes();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_folder_assignments_reconciled 
ON folder_assignments(reconciled_at) 
WHERE reconciled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_review_queue_status 
ON folder_review_queue(status) 
WHERE status = 'pending_review';

-- Grant permissions
GRANT ALL ON folder_metadata_hashes TO service_role;
GRANT ALL ON folder_audit_log TO service_role;
GRANT ALL ON folder_review_queue TO service_role;
GRANT INSERT ON folder_audit_log TO authenticated;

COMMENT ON TABLE folder_metadata_hashes IS 'Stores hashes of folder metadata files for tamper detection (Jimmy recommendation)';
COMMENT ON TABLE folder_audit_log IS 'Comprehensive audit trail for all folder operations';
COMMENT ON TABLE folder_review_queue IS 'Queue for folders requiring manual review due to inconsistencies';
COMMENT ON FUNCTION check_folder_consistency IS 'Checks folder state consistency across multiple sources';