import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Migration SQL - Create missing tables
const MIGRATION_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workflow errors table
CREATE TABLE IF NOT EXISTS workflow_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES user_workflows(id) ON DELETE SET NULL,
  intent TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_type TEXT CHECK (error_type IN ('generation', 'validation', 'deployment', 'execution')),
  attempt_number INTEGER DEFAULT 1,
  workflow_json JSONB,
  stack_trace TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow executions table (for analytics)
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES user_workflows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  execution_id TEXT, -- n8n execution ID
  status TEXT CHECK (status IN ('running', 'success', 'error', 'timeout')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  execution_time_ms INTEGER,
  error_message TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage metrics table
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  metric_date DATE DEFAULT CURRENT_DATE,
  workflows_created INTEGER DEFAULT 0,
  workflows_executed INTEGER DEFAULT 0,
  tokens_consumed INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_metrics_per_day UNIQUE (user_id, metric_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_errors_user_id ON workflow_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_errors_created_at ON workflow_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_user_date ON usage_metrics(user_id, metric_date DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE workflow_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- Errors policies
CREATE POLICY IF NOT EXISTS "Users can view own errors" ON workflow_errors
  FOR SELECT USING (auth.uid() = user_id);

-- Executions policies  
CREATE POLICY IF NOT EXISTS "Users can view own executions" ON workflow_executions
  FOR SELECT USING (auth.uid() = user_id);

-- Metrics policies
CREATE POLICY IF NOT EXISTS "Users can view own metrics" ON usage_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- Function to update workflow success rate
CREATE OR REPLACE FUNCTION update_workflow_success_rate()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_workflows
  SET 
    success_rate = (
      SELECT 
        ROUND((COUNT(CASE WHEN status = 'success' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      FROM workflow_executions
      WHERE workflow_id = NEW.workflow_id
    ),
    total_executions = (
      SELECT COUNT(*) FROM workflow_executions WHERE workflow_id = NEW.workflow_id
    ),
    last_run = NOW()
  WHERE id = NEW.workflow_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_workflow_stats ON workflow_executions;

-- Create trigger
CREATE TRIGGER update_workflow_stats AFTER INSERT ON workflow_executions
  FOR EACH ROW EXECUTE FUNCTION update_workflow_success_rate();

-- Function to update daily usage metrics
CREATE OR REPLACE FUNCTION update_usage_metrics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usage_metrics (user_id, metric_date, workflows_created, workflows_executed)
  VALUES (NEW.user_id, CURRENT_DATE, 
    CASE WHEN TG_TABLE_NAME = 'user_workflows' THEN 1 ELSE 0 END,
    CASE WHEN TG_TABLE_NAME = 'workflow_executions' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, metric_date) 
  DO UPDATE SET
    workflows_created = usage_metrics.workflows_created + CASE WHEN TG_TABLE_NAME = 'user_workflows' THEN 1 ELSE 0 END,
    workflows_executed = usage_metrics.workflows_executed + CASE WHEN TG_TABLE_NAME = 'workflow_executions' THEN 1 ELSE 0 END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist  
DROP TRIGGER IF EXISTS track_workflow_creation ON user_workflows;
DROP TRIGGER IF EXISTS track_workflow_execution ON workflow_executions;

-- Create triggers
CREATE TRIGGER track_workflow_creation AFTER INSERT ON user_workflows
  FOR EACH ROW EXECUTE FUNCTION update_usage_metrics();

CREATE TRIGGER track_workflow_execution AFTER INSERT ON workflow_executions
  FOR EACH ROW EXECUTE FUNCTION update_usage_metrics();
`;

// Execute SQL by breaking it into individual statements
async function executeMigration(): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    // Split SQL into individual statements
    const statements = MIGRATION_SQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    const results = [];
    let errorOccurred = false;
    
    for (const statement of statements) {
      if (statement.toLowerCase().startsWith('create table') || 
          statement.toLowerCase().startsWith('create index') ||
          statement.toLowerCase().startsWith('alter table') ||
          statement.toLowerCase().startsWith('create policy') ||
          statement.toLowerCase().startsWith('create or replace function') ||
          statement.toLowerCase().startsWith('create trigger') ||
          statement.toLowerCase().startsWith('drop trigger') ||
          statement.toLowerCase().startsWith('create extension')) {
        
        try {
          // Use rpc to execute DDL if available, otherwise skip and note
          const { data, error } = await supabase.rpc('exec_sql', { query: statement });
          
          results.push({
            statement: statement.substring(0, 50) + '...',
            success: !error,
            error: error?.message
          });
          
          if (error) {
            console.log(`Statement failed (may be expected): ${statement.substring(0, 100)}...`);
            console.log(`Error: ${error.message}`);
          }
        } catch (e) {
          console.log(`Cannot execute via RPC: ${statement.substring(0, 50)}`);
          results.push({
            statement: statement.substring(0, 50) + '...',
            success: false,
            error: 'RPC function not available'
          });
        }
      }
    }

    return { 
      success: true, // We'll check table existence separately
      details: { 
        statements: results.length,
        results: results.slice(0, 5) // Only show first 5 for brevity
      }
    };
  } catch (error) {
    console.error('Exception during migration:', error);
    return { success: false, error: error.message };
  }
}

// Verify tables exist
async function verifyTables(): Promise<{ success: boolean; tables: string[]; missing: string[] }> {
  const requiredTables = ['workflow_errors', 'workflow_executions', 'usage_metrics'];
  const existingTables: string[] = [];
  const missingTables: string[] = [];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (!error) {
        existingTables.push(table);
      } else if (error.code === '42P01') {
        missingTables.push(table);
      } else {
        existingTables.push(table); // Table exists but might have RLS restrictions
      }
    } catch (e) {
      missingTables.push(table);
    }
  }

  return {
    success: missingTables.length === 0,
    tables: existingTables,
    missing: missingTables
  };
}

// Main handler
serve(async (req) => {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'migrate';

    if (action === 'verify') {
      // Just verify tables exist
      const verification = await verifyTables();
      return new Response(JSON.stringify(verification), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'migrate') {
      // Check current state first
      const preVerification = await verifyTables();
      
      if (preVerification.success) {
        return new Response(JSON.stringify({
          success: true,
          message: 'All tables already exist',
          tables: preVerification.tables,
          skipped: true
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Run migration
      const migrationResult = await executeMigration();
      
      if (!migrationResult.success) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Migration failed',
          details: migrationResult.error
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Verify post-migration
      const postVerification = await verifyTables();
      
      return new Response(JSON.stringify({
        success: postVerification.success,
        message: postVerification.success 
          ? 'Migration completed successfully' 
          : 'Migration ran but some tables still missing',
        before: preVerification,
        after: postVerification,
        migrationResult
      }), {
        status: postVerification.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      error: 'Invalid action. Use ?action=migrate or ?action=verify'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Migration function error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});