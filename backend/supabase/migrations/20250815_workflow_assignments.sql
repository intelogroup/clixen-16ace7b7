-- Migration: Add workflow_assignments table for tracking n8n workflow assignments
-- Created: 2025-08-15
-- Purpose: Track workflow assignments to projects and folders for complete isolation

-- Create workflow_assignments table
CREATE TABLE IF NOT EXISTS workflow_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL,
    folder_id TEXT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_assignments_user_id ON workflow_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_assignments_workflow_id ON workflow_assignments(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_assignments_project_id ON workflow_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_workflow_assignments_folder_id ON workflow_assignments(folder_id);
CREATE INDEX IF NOT EXISTS idx_workflow_assignments_status ON workflow_assignments(status);

-- Ensure unique workflow assignments (one workflow can only be in one project/folder)
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_assignments_unique_workflow 
ON workflow_assignments(workflow_id) WHERE status = 'active';

-- Add RLS policies
ALTER TABLE workflow_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own workflow assignments
CREATE POLICY "Users can view own workflow assignments" ON workflow_assignments
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own workflow assignments
CREATE POLICY "Users can create own workflow assignments" ON workflow_assignments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own workflow assignments
CREATE POLICY "Users can update own workflow assignments" ON workflow_assignments
    FOR UPDATE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workflow_assignments_updated_at BEFORE UPDATE
    ON workflow_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert test assignment for our test workflow
INSERT INTO workflow_assignments (workflow_id, user_id, project_id, folder_id, status)
VALUES (
    'D3G2NGeMagzEDzhA',
    '7b2ca2aa-9c22-4b44-b1e4-b6c1ed4b29a5',
    'CLIXEN-PROJ-02',
    'FOLDER-P02-U1',
    'active'
) ON CONFLICT (workflow_id) DO UPDATE SET
    project_id = EXCLUDED.project_id,
    folder_id = EXCLUDED.folder_id,
    updated_at = NOW();

-- Add comment
COMMENT ON TABLE workflow_assignments IS 'Tracks n8n workflow assignments to projects and folders for user isolation';