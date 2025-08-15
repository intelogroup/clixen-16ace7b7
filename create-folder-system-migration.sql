-- Clixen Folder Assignment System Migration
-- Creates complete user isolation system with folder assignments

-- 1. Create folder_assignments table
CREATE TABLE IF NOT EXISTS public.folder_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_number INTEGER NOT NULL,
  user_slot INTEGER NOT NULL, 
  folder_tag_name TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_number, user_slot)
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_folder_assignments_user_id ON public.folder_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_folder_assignments_status ON public.folder_assignments(status);
CREATE INDEX IF NOT EXISTS idx_folder_assignments_project_user ON public.folder_assignments(project_number, user_slot);

-- 3. Populate with 50 folder assignments: FOLDER-P01-U1 through FOLDER-P10-U5
INSERT INTO public.folder_assignments (project_number, user_slot, folder_tag_name, status)
SELECT 
  project_num,
  user_slot_num,
  'FOLDER-P' || LPAD(project_num::text, 2, '0') || '-U' || user_slot_num,
  'available'
FROM 
  generate_series(1, 10) AS project_num,
  generate_series(1, 5) AS user_slot_num
ON CONFLICT (project_number, user_slot) DO NOTHING
ORDER BY project_num, user_slot_num;

-- 4. Enable RLS on folder_assignments table
ALTER TABLE public.folder_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
DROP POLICY IF EXISTS "Users can view their own folder assignments" ON public.folder_assignments;
CREATE POLICY "Users can view their own folder assignments" 
  ON public.folder_assignments 
  FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own folder assignments" ON public.folder_assignments;
CREATE POLICY "Users can update their own folder assignments" 
  ON public.folder_assignments 
  FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to folder assignments" ON public.folder_assignments;
CREATE POLICY "Service role full access to folder assignments" 
  ON public.folder_assignments 
  FOR ALL 
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can view available folders" ON public.folder_assignments;
CREATE POLICY "Authenticated users can view available folders" 
  ON public.folder_assignments 
  FOR SELECT 
  USING (auth.role() = 'authenticated' AND status = 'available' AND user_id IS NULL);

-- 6. Create automatic user assignment function
CREATE OR REPLACE FUNCTION assign_user_to_next_available_folder(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  assigned_folder RECORD;
  result JSON;
BEGIN
  -- Check if user already has an assignment
  SELECT * INTO assigned_folder
  FROM public.folder_assignments 
  WHERE user_id = target_user_id AND status = 'active';
  
  IF FOUND THEN
    -- User already has an active assignment
    result := json_build_object(
      'success', true,
      'message', 'User already has an active folder assignment',
      'folder', json_build_object(
        'id', assigned_folder.id,
        'project_number', assigned_folder.project_number,
        'user_slot', assigned_folder.user_slot,
        'folder_tag_name', assigned_folder.folder_tag_name,
        'assigned_at', assigned_folder.assigned_at
      )
    );
    RETURN result;
  END IF;
  
  -- Find next available folder and assign it
  UPDATE public.folder_assignments 
  SET 
    user_id = target_user_id,
    status = 'active',
    assigned_at = now(),
    updated_at = now()
  WHERE id = (
    SELECT id 
    FROM public.folder_assignments 
    WHERE status = 'available' AND user_id IS NULL
    ORDER BY project_number, user_slot
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO assigned_folder;
  
  IF FOUND THEN
    -- Assignment successful
    result := json_build_object(
      'success', true,
      'message', 'User successfully assigned to folder',
      'folder', json_build_object(
        'id', assigned_folder.id,
        'project_number', assigned_folder.project_number,
        'user_slot', assigned_folder.user_slot,
        'folder_tag_name', assigned_folder.folder_tag_name,
        'assigned_at', assigned_folder.assigned_at
      )
    );
  ELSE
    -- No available folders
    result := json_build_object(
      'success', false,
      'message', 'No available folders for assignment',
      'folder', null
    );
  END IF;
  
  RETURN result;
END;
$$;

-- 7. Create function to get user's current folder assignment
CREATE OR REPLACE FUNCTION get_user_folder_assignment(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_folder RECORD;
  result JSON;
BEGIN
  SELECT * INTO user_folder
  FROM public.folder_assignments 
  WHERE user_id = target_user_id AND status = 'active';
  
  IF FOUND THEN
    result := json_build_object(
      'success', true,
      'folder', json_build_object(
        'id', user_folder.id,
        'project_number', user_folder.project_number,
        'user_slot', user_folder.user_slot,
        'folder_tag_name', user_folder.folder_tag_name,
        'assigned_at', user_folder.assigned_at,
        'status', user_folder.status
      )
    );
  ELSE
    result := json_build_object(
      'success', false,
      'message', 'No active folder assignment found for user',
      'folder', null
    );
  END IF;
  
  RETURN result;
END;
$$;

-- 8. Create function to release user folder assignment
CREATE OR REPLACE FUNCTION release_user_folder_assignment(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  released_folder RECORD;
  result JSON;
BEGIN
  UPDATE public.folder_assignments 
  SET 
    user_id = NULL,
    status = 'available',
    updated_at = now()
  WHERE user_id = target_user_id AND status = 'active'
  RETURNING * INTO released_folder;
  
  IF FOUND THEN
    result := json_build_object(
      'success', true,
      'message', 'Folder assignment released successfully',
      'folder', json_build_object(
        'id', released_folder.id,
        'project_number', released_folder.project_number,
        'user_slot', released_folder.user_slot,
        'folder_tag_name', released_folder.folder_tag_name
      )
    );
  ELSE
    result := json_build_object(
      'success', false,
      'message', 'No active folder assignment found to release',
      'folder', null
    );
  END IF;
  
  RETURN result;
END;
$$;

-- 9. Create function to get folder assignment statistics
CREATE OR REPLACE FUNCTION get_folder_assignment_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_folders', COUNT(*),
    'available_folders', COUNT(CASE WHEN status = 'available' THEN 1 END),
    'active_assignments', COUNT(CASE WHEN status = 'active' THEN 1 END),
    'inactive_assignments', COUNT(CASE WHEN status = 'inactive' THEN 1 END),
    'projects_count', COUNT(DISTINCT project_number),
    'slots_per_project', 5,
    'utilization_percentage', ROUND(
      (COUNT(CASE WHEN status = 'active' THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 2
    )
  ) INTO stats
  FROM public.folder_assignments;
  
  RETURN stats;
END;
$$;

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION assign_user_to_next_available_folder(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_folder_assignment(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION release_user_folder_assignment(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_folder_assignment_stats() TO authenticated, service_role;