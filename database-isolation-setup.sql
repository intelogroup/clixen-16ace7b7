-- Database-Level User Isolation Implementation for Clixen MVP
-- This creates the Supabase tables for true user isolation

-- 1. Enhanced user management with n8n project assignment
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    n8n_project_id TEXT, -- Assigned n8n project for isolation
    n8n_user_id TEXT,    -- n8n user ID if applicable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Workflow ownership mapping (SOURCE OF TRUTH)
CREATE TABLE IF NOT EXISTS public.user_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    n8n_workflow_id TEXT NOT NULL,
    n8n_project_id TEXT NOT NULL,
    workflow_name TEXT NOT NULL,
    workflow_status TEXT DEFAULT 'active', -- active, inactive, deleted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(n8n_workflow_id)
);

-- 3. User project assignments (one project per user in MVP)
CREATE TABLE IF NOT EXISTS public.user_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    n8n_project_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    project_status TEXT DEFAULT 'active',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id) -- One project per user in MVP
);

-- 4. Workflow execution tracking
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    n8n_workflow_id TEXT NOT NULL,
    n8n_execution_id TEXT NOT NULL,
    execution_status TEXT, -- success, error, running
    execution_data JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS) for user isolation
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for user isolation
CREATE POLICY "Users can only see their own data" ON public.users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only see their workflows" ON public.user_workflows
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can only see their projects" ON public.user_projects
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can only see their executions" ON public.workflow_executions
    FOR ALL USING (user_id = auth.uid());

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_workflows_user_id ON public.user_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_workflows_n8n_id ON public.user_workflows(n8n_workflow_id);
CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON public.user_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON public.workflow_executions(user_id);

-- 8. Functions for workflow management
CREATE OR REPLACE FUNCTION public.assign_user_to_project(
    p_user_id UUID,
    p_n8n_project_id TEXT,
    p_project_name TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_projects (user_id, n8n_project_id, project_name)
    VALUES (p_user_id, p_n8n_project_id, p_project_name)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        n8n_project_id = EXCLUDED.n8n_project_id,
        project_name = EXCLUDED.project_name,
        assigned_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.register_user_workflow(
    p_user_id UUID,
    p_n8n_workflow_id TEXT,
    p_n8n_project_id TEXT,
    p_workflow_name TEXT
) RETURNS UUID AS $$
DECLARE
    workflow_record_id UUID;
BEGIN
    INSERT INTO public.user_workflows (user_id, n8n_workflow_id, n8n_project_id, workflow_name)
    VALUES (p_user_id, p_n8n_workflow_id, p_n8n_project_id, p_workflow_name)
    ON CONFLICT (n8n_workflow_id)
    DO UPDATE SET 
        workflow_name = EXCLUDED.workflow_name,
        updated_at = NOW()
    RETURNING id INTO workflow_record_id;
    
    RETURN workflow_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Insert test user data (using existing n8n user)
INSERT INTO public.users (id, email, first_name, last_name, n8n_project_id, n8n_user_id)
VALUES (
    'b7ffee93-8a0e-40a2-bc2b-18a549b800d6'::UUID, -- Match n8n user ID
    'jimkalinov@gmail.com',
    'Kalinov',
    'Dameus', 
    'pKR7MvMCY1aGsqs5', -- Existing n8n project
    'b7ffee93-8a0e-40a2-bc2b-18a549b800d6'
)
ON CONFLICT (email) DO UPDATE SET
    n8n_project_id = EXCLUDED.n8n_project_id,
    n8n_user_id = EXCLUDED.n8n_user_id,
    updated_at = NOW();

-- 10. Register existing workflows for the test user
INSERT INTO public.user_workflows (user_id, n8n_workflow_id, n8n_project_id, workflow_name)
VALUES 
    ('b7ffee93-8a0e-40a2-bc2b-18a549b800d6'::UUID, '0HNKws4h3CvUdvZl', 'pKR7MvMCY1aGsqs5', '[USR-terragon] My workflow 2'),
    ('b7ffee93-8a0e-40a2-bc2b-18a549b800d6'::UUID, '2uuhHaPoYHokINJD', 'pKR7MvMCY1aGsqs5', '[USR-terragon] SSH-INVESTIGATION Folder Test'),
    ('b7ffee93-8a0e-40a2-bc2b-18a549b800d6'::UUID, 'AOv9zhBBOc2hUP6P', 'pKR7MvMCY1aGsqs5', '[USR-terragon] Project Test Workflow'),
    ('b7ffee93-8a0e-40a2-bc2b-18a549b800d6'::UUID, 'OLMMb0pmaxh1dqb8', 'pKR7MvMCY1aGsqs5', '[USR-terragon] My workflow'),
    ('b7ffee93-8a0e-40a2-bc2b-18a549b800d6'::UUID, 'XJZOpihXHTEOYtL6', 'pKR7MvMCY1aGsqs5', '[USR-terragon] Weather Alert System'),
    ('b7ffee93-8a0e-40a2-bc2b-18a549b800d6'::UUID, 'cHRjITLR0bx7Ibot', 'pKR7MvMCY1aGsqs5', '[USR-terragon] Weather Monitor'),
    ('b7ffee93-8a0e-40a2-bc2b-18a549b800d6'::UUID, 'cw8SXCoX22NTOwnv', 'pKR7MvMCY1aGsqs5', '[USR-terragon] Weather Monitor Clean'),
    ('b7ffee93-8a0e-40a2-bc2b-18a549b800d6'::UUID, 'lUz1jnEsmRNuzPyf', 'pKR7MvMCY1aGsqs5', '[USR-terragon] My workflow 3'),
    ('b7ffee93-8a0e-40a2-bc2b-18a549b800d6'::UUID, 'sFdsEc4QhC6JyNGV', 'pKR7MvMCY1aGsqs5', '[USR-terragon] Test Folder Project')
ON CONFLICT (n8n_workflow_id) DO UPDATE SET
    workflow_name = EXCLUDED.workflow_name,
    updated_at = NOW();

-- 11. Assign test user to project
SELECT public.assign_user_to_project(
    'b7ffee93-8a0e-40a2-bc2b-18a549b800d6'::UUID,
    'pKR7MvMCY1aGsqs5',
    'User Project Alpha'
);

COMMENT ON TABLE public.users IS 'Enhanced user management with n8n integration';
COMMENT ON TABLE public.user_workflows IS 'Source of truth for user-workflow ownership';
COMMENT ON TABLE public.user_projects IS 'User project assignments for isolation';
COMMENT ON TABLE public.workflow_executions IS 'Execution tracking with user context';