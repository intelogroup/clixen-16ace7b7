-- Migration: Folder Assignments System
-- Purpose: User assignment to n8n project folders for isolation
-- Date: August 15, 2025

-- Create folder_assignments table for user to folder mapping
CREATE TABLE IF NOT EXISTS folder_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_tag_name VARCHAR(255) NOT NULL UNIQUE,
    project_number INTEGER NOT NULL CHECK (project_number >= 1 AND project_number <= 10),
    user_slot INTEGER NOT NULL CHECK (user_slot >= 1 AND user_slot <= 5),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'active', 'inactive')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique project/slot combinations
    UNIQUE(project_number, user_slot)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_folder_assignments_user_id ON folder_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_folder_assignments_project_number ON folder_assignments(project_number);
CREATE INDEX IF NOT EXISTS idx_folder_assignments_status ON folder_assignments(status);
CREATE INDEX IF NOT EXISTS idx_folder_assignments_folder_tag ON folder_assignments(folder_tag_name);

-- Enable RLS
ALTER TABLE folder_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can see their own assignments, plus available slots
CREATE POLICY "Users can view own folder assignments" 
ON folder_assignments FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view available folders" 
ON folder_assignments FOR SELECT 
USING (status = 'available');

-- Only service role can modify folder assignments (for automated assignment)
CREATE POLICY "Service role can manage folder assignments" 
ON folder_assignments FOR ALL 
USING (current_setting('role') = 'service_role');

-- Create updated_at trigger
CREATE TRIGGER update_folder_assignments_updated_at 
    BEFORE UPDATE ON folder_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Pre-populate the 50 folder assignments (10 projects × 5 users each)
INSERT INTO folder_assignments (folder_tag_name, project_number, user_slot, status) VALUES
-- Project 1 folders
('FOLDER-P01-U1', 1, 1, 'available'),
('FOLDER-P01-U2', 1, 2, 'available'),
('FOLDER-P01-U3', 1, 3, 'available'),
('FOLDER-P01-U4', 1, 4, 'available'),
('FOLDER-P01-U5', 1, 5, 'available'),

-- Project 2 folders
('FOLDER-P02-U1', 2, 1, 'available'),
('FOLDER-P02-U2', 2, 2, 'available'),
('FOLDER-P02-U3', 2, 3, 'available'),
('FOLDER-P02-U4', 2, 4, 'available'),
('FOLDER-P02-U5', 2, 5, 'available'),

-- Project 3 folders
('FOLDER-P03-U1', 3, 1, 'available'),
('FOLDER-P03-U2', 3, 2, 'available'),
('FOLDER-P03-U3', 3, 3, 'available'),
('FOLDER-P03-U4', 3, 4, 'available'),
('FOLDER-P03-U5', 3, 5, 'available'),

-- Project 4 folders
('FOLDER-P04-U1', 4, 1, 'available'),
('FOLDER-P04-U2', 4, 2, 'available'),
('FOLDER-P04-U3', 4, 3, 'available'),
('FOLDER-P04-U4', 4, 4, 'available'),
('FOLDER-P04-U5', 4, 5, 'available'),

-- Project 5 folders
('FOLDER-P05-U1', 5, 1, 'available'),
('FOLDER-P05-U2', 5, 2, 'available'),
('FOLDER-P05-U3', 5, 3, 'available'),
('FOLDER-P05-U4', 5, 4, 'available'),
('FOLDER-P05-U5', 5, 5, 'available'),

-- Project 6 folders
('FOLDER-P06-U1', 6, 1, 'available'),
('FOLDER-P06-U2', 6, 2, 'available'),
('FOLDER-P06-U3', 6, 3, 'available'),
('FOLDER-P06-U4', 6, 4, 'available'),
('FOLDER-P06-U5', 6, 5, 'available'),

-- Project 7 folders
('FOLDER-P07-U1', 7, 1, 'available'),
('FOLDER-P07-U2', 7, 2, 'available'),
('FOLDER-P07-U3', 7, 3, 'available'),
('FOLDER-P07-U4', 7, 4, 'available'),
('FOLDER-P07-U5', 7, 5, 'available'),

-- Project 8 folders
('FOLDER-P08-U1', 8, 1, 'available'),
('FOLDER-P08-U2', 8, 2, 'available'),
('FOLDER-P08-U3', 8, 3, 'available'),
('FOLDER-P08-U4', 8, 4, 'available'),
('FOLDER-P08-U5', 8, 5, 'available'),

-- Project 9 folders
('FOLDER-P09-U1', 9, 1, 'available'),
('FOLDER-P09-U2', 9, 2, 'available'),
('FOLDER-P09-U3', 9, 3, 'available'),
('FOLDER-P09-U4', 9, 4, 'available'),
('FOLDER-P09-U5', 9, 5, 'available'),

-- Project 10 folders
('FOLDER-P10-U1', 10, 1, 'available'),
('FOLDER-P10-U2', 10, 2, 'available'),
('FOLDER-P10-U3', 10, 3, 'available'),
('FOLDER-P10-U4', 10, 4, 'available'),
('FOLDER-P10-U5', 10, 5, 'available')

ON CONFLICT (folder_tag_name) DO NOTHING;

-- Assign test user to first available folder
UPDATE folder_assignments 
SET 
    user_id = '7b2ca2aa-9c22-4b44-b1e4-b6c1ed4b29a5',
    assigned_at = NOW(),
    status = 'active'
WHERE folder_tag_name = 'FOLDER-P01-U1';

-- Create view for easy folder assignment queries
CREATE OR REPLACE VIEW user_folder_summary AS
SELECT 
    fa.user_id,
    fa.folder_tag_name,
    fa.project_number,
    fa.user_slot,
    fa.assigned_at,
    fa.status,
    u.email as user_email,
    CONCAT('CLIXEN-PROJ-', LPAD(fa.project_number::TEXT, 2, '0')) as project_id
FROM folder_assignments fa
LEFT JOIN auth.users u ON fa.user_id = u.id
WHERE fa.status IN ('active', 'inactive');

-- Grant permissions
GRANT SELECT ON user_folder_summary TO authenticated;

-- Comment
COMMENT ON TABLE folder_assignments IS 'Manages assignment of users to n8n project folders for complete isolation';