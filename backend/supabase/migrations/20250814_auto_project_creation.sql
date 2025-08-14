-- ============================================================================
-- Auto Project Creation on User Signup
-- ============================================================================
-- This migration enhances the user signup flow to automatically create
-- a project for each new user using our custom naming convention
-- 
-- Flow: User Signup → handle_new_user() → create_user_project() → Edge Function
-- Result: goldbergwalmer@email.com → goldbergwalmer-project-140820251137-user-16ab2h6g
-- ============================================================================

-- First, update the projects table to support metadata
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for project metadata queries
CREATE INDEX IF NOT EXISTS idx_projects_metadata ON projects USING gin(metadata);

-- ============================================================================
-- Enhanced User Profile Creation Function
-- ============================================================================

-- Drop the old trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Enhanced function to create profile AND project
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  project_result jsonb;
BEGIN
  -- Create user profile (existing logic)
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  -- Call Edge Function to create project automatically
  -- Using Supabase's built-in http extension
  SELECT 
    content::jsonb into project_result
  FROM 
    http((
      'POST',
      current_setting('app.supabase_url') || '/functions/v1/auto-project-creator',
      ARRAY[
        http_header('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
        http_header('Content-Type', 'application/json')
      ],
      'application/json',
      json_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'trigger_type', 'signup'
      )::text
    ));
  
  -- Log the result (optional, for debugging)
  RAISE NOTICE 'Auto project creation result for %: %', NEW.email, project_result;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Auto project creation failed for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Alternative: Direct Project Creation (if http extension not available)
-- ============================================================================

-- Fallback function that creates project directly in database
CREATE OR REPLACE FUNCTION public.handle_new_user_direct()
RETURNS TRIGGER AS $$
DECLARE
  username_part text;
  timestamp_part text;
  user_code text;
  project_name text;
  project_description text;
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  -- Generate project name components
  username_part := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'));
  timestamp_part := to_char(now(), 'DDMMYYYYHH24MI');
  user_code := lower(substring(md5(NEW.id::text || NEW.email), 1, 8));
  
  -- Construct project name: username-project-timestamp-user-code
  project_name := username_part || '-project-' || timestamp_part || '-user-' || user_code;
  project_description := 'Clixen automated workflow project for ' || username_part || 
                        '. Created on ' || to_char(now(), 'YYYY-MM-DD') || 
                        '. This project contains all workflows created by ' || NEW.email || 
                        ' in the Clixen application.';
  
  -- Create project directly
  INSERT INTO public.projects (user_id, name, description, metadata)
  VALUES (
    NEW.id,
    project_name,
    project_description,
    json_build_object(
      'auto_created', true,
      'trigger_type', 'signup',
      'created_for_email', NEW.email,
      'username', username_part,
      'creation_timestamp', now()
    )::jsonb
  );
  
  -- Create welcome conversation
  INSERT INTO public.conversations (user_id, project_id, title, messages)
  SELECT 
    NEW.id,
    p.id,
    'Welcome to Clixen!',
    json_build_array(
      json_build_object(
        'role', 'system',
        'content', 'Welcome to your personal Clixen workspace! This is your project: "' || 
                   project_name || '". You can start creating workflows by describing what you want to automate.',
        'timestamp', now()
      )
    )::jsonb
  FROM projects p 
  WHERE p.user_id = NEW.id AND p.name = project_name;
  
  RAISE NOTICE 'Auto-created project: % for user: %', project_name, NEW.email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Auto project creation failed for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Set Configuration for Edge Function URLs (if using http method)
-- ============================================================================

-- These would be set by your deployment process
-- ALTER DATABASE postgres SET app.supabase_url = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
-- ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key';

-- ============================================================================
-- Create the Trigger
-- ============================================================================

-- Use direct method by default (more reliable than http calls)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_direct();

-- ============================================================================
-- Test Data and Examples
-- ============================================================================

-- Example: What happens when goldbergwalmer@email.com signs up
-- 1. User created in auth.users
-- 2. Trigger fires: handle_new_user_direct()
-- 3. Profile created in user_profiles
-- 4. Project created with name: goldbergwalmer-project-140820251137-user-16ab2h6g
-- 5. Welcome conversation created

-- Query to test project creation:
-- SELECT * FROM projects WHERE metadata->>'auto_created' = 'true';
-- SELECT * FROM conversations WHERE title = 'Welcome to Clixen!';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- 
-- This migration enables:
-- ✅ Automatic project creation on user signup
-- ✅ Unique project naming with timestamp and user code
-- ✅ Project metadata tracking for analytics
-- ✅ Welcome conversation for user onboarding
-- ✅ Robust error handling that doesn't break user signup
-- ✅ Fallback method that works without external http calls