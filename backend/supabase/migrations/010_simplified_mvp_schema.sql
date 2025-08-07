-- ============================================================================
-- Clixen Simplified MVP Database Schema
-- ============================================================================
-- This migration creates a simplified MVP schema following the specification:
-- ONLY 4 core tables: users, projects, workflows, conversations
-- Removes over-engineering and focuses on MVP requirements only
-- 
-- Based on CLIXEN_MVP_SPEC.md requirements
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SIMPLIFIED MVP TABLES (4 TOTAL)
-- ============================================================================

-- 1. USER PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROJECTS (MVP requirement)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT projects_name_length CHECK (length(name) >= 1 AND length(name) <= 255)
);

-- 3. WORKFLOWS (MVP core entity)
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Core workflow fields
  name TEXT NOT NULL,
  description TEXT,
  n8n_workflow_json JSONB NOT NULL,
  original_prompt TEXT NOT NULL,
  
  -- Simple status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'deployed', 'failed')),
  n8n_workflow_id TEXT, -- n8n instance workflow ID after deployment
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT workflows_name_length CHECK (length(name) >= 1 AND length(name) <= 255)
);

-- 4. CONVERSATIONS (MVP requirement: "persistent chat history per project/workflow")  
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  
  -- Simple conversation tracking
  title TEXT DEFAULT 'New Chat',
  messages JSONB DEFAULT '[]'::jsonb, -- Store all messages as JSON array
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - MVP Security
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- User profiles: users can only see their own profile
CREATE POLICY "Users can manage their own profile" ON user_profiles
  USING (auth.uid() = id);

-- Projects: users can only see their own projects
CREATE POLICY "Users can manage their own projects" ON projects
  USING (auth.uid() = user_id);

-- Workflows: users can only see workflows in their projects
CREATE POLICY "Users can manage their own workflows" ON workflows
  USING (auth.uid() = user_id);

-- Conversations: users can only see their own conversations
CREATE POLICY "Users can manage their own conversations" ON conversations
  USING (auth.uid() = user_id);

-- ============================================================================
-- SIMPLE HELPER FUNCTIONS (MVP only)
-- ============================================================================

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- MVP COMPLETE - 4 TABLES TOTAL
-- ============================================================================
-- This schema focuses on MVP core requirements:
-- ✅ User authentication and profiles  
-- ✅ Project organization
-- ✅ Workflow creation and storage
-- ✅ Chat history persistence
-- ✅ Simple security with RLS
-- 
-- Removed from over-engineered version:
-- ❌ Separate deployments table (merged into workflows)
-- ❌ Separate chat_messages table (merged into conversations) 
-- ❌ Complex audit logging (not MVP requirement)
-- ❌ Usage statistics (not MVP requirement)
-- ❌ Performance metrics (not MVP requirement)
-- ❌ Complex agent tracking (removed multi-agent system)
-- ============================================================================