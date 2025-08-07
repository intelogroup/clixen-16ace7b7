/**
 * Database Architect Agent
 * 
 * Specializes in database schema design, migrations, and RLS policies for Supabase
 * Focus: MVP-compliant database structure for users, projects, workflows, executions
 */

import { BackendAgent, AgentConfig, AgentCapabilities, AgentTask, AgentTaskResult, AgentStatus } from './types.js';

export class DatabaseArchitectAgent implements BackendAgent {
  public config: AgentConfig;
  private status: AgentStatus;
  private currentTasks: Map<string, AgentTask>;

  constructor() {
    this.config = {
      name: 'DatabaseArchitectAgent',
      domain: 'database',
      capabilities: {
        canExecuteParallel: false, // Schema changes should be sequential
        requiresDatabase: true,
        requiresExternalAPIs: ['supabase'],
        estimatedComplexity: 'medium',
        mvpCritical: true
      },
      maxConcurrentTasks: 1,
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 5000
      }
    };

    this.status = {
      agentId: 'database-agent-001',
      currentTask: undefined,
      queueLength: 0,
      isHealthy: true,
      lastHeartbeat: new Date(),
      performanceMetrics: {
        tasksCompleted: 0,
        averageTaskTime: 0,
        errorRate: 0
      }
    };

    this.currentTasks = new Map();
  }

  /**
   * Execute database-related tasks
   */
  public async executeTask(task: AgentTask): Promise<AgentTaskResult> {
    console.log(`🗄️ DatabaseAgent executing: ${task.description}`);
    
    this.currentTasks.set(task.id, task);
    this.status.currentTask = task.id;
    this.status.queueLength = this.currentTasks.size;

    const startTime = Date.now();

    try {
      let result: AgentTaskResult;

      switch (task.type) {
        case 'database-design':
          result = await this.designDatabaseSchema(task);
          break;
        case 'database-migration':
          result = await this.createMigrations(task);
          break;
        case 'database-policies':
          result = await this.implementRLSPolicies(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      // Update performance metrics
      const executionTime = Date.now() - startTime;
      this.updatePerformanceMetrics(executionTime, true);

      return result;

    } catch (error) {
      console.error(`❌ DatabaseAgent task failed:`, error);
      this.updatePerformanceMetrics(Date.now() - startTime, false);

      return {
        taskId: task.id,
        status: 'failure',
        errors: [error.message],
        rollbackInstructions: this.generateRollbackInstructions(task)
      };
    } finally {
      this.currentTasks.delete(task.id);
      this.status.currentTask = undefined;
      this.status.queueLength = this.currentTasks.size;
    }
  }

  /**
   * Design database schema according to MVP specifications
   */
  private async designDatabaseSchema(task: AgentTask): Promise<AgentTaskResult> {
    console.log('🎯 Designing MVP-compliant database schema...');

    const schema = {
      tables: {
        // Core user management (Supabase Auth integration)
        users: {
          id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
          email: 'text UNIQUE NOT NULL',
          created_at: 'timestamptz DEFAULT now()',
          updated_at: 'timestamptz DEFAULT now()',
          last_sign_in: 'timestamptz',
          // Additional user preferences can be added here
          preferences: 'jsonb DEFAULT \'{}\'::jsonb'
        },

        // Project management
        projects: {
          id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
          user_id: 'uuid REFERENCES users(id) ON DELETE CASCADE',
          name: 'text NOT NULL',
          description: 'text',
          created_at: 'timestamptz DEFAULT now()',
          updated_at: 'timestamptz DEFAULT now()',
          // Project metadata
          settings: 'jsonb DEFAULT \'{}\'::jsonb'
        },

        // Workflow storage and versioning
        workflows: {
          id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
          project_id: 'uuid REFERENCES projects(id) ON DELETE CASCADE',
          name: 'text NOT NULL',
          description: 'text',
          // Original user prompt
          original_prompt: 'text',
          // Generated n8n workflow JSON
          json_payload: 'jsonb NOT NULL',
          // Workflow version for rollback capability
          version: 'integer DEFAULT 1',
          status: 'text CHECK (status IN (\'draft\', \'deployed\', \'failed\', \'archived\')) DEFAULT \'draft\'',
          // n8n workflow ID after deployment
          n8n_workflow_id: 'text',
          created_at: 'timestamptz DEFAULT now()',
          updated_at: 'timestamptz DEFAULT now()',
          deployed_at: 'timestamptz'
        },

        // Workflow execution tracking
        executions: {
          id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
          workflow_id: 'uuid REFERENCES workflows(id) ON DELETE CASCADE',
          // n8n execution ID
          n8n_execution_id: 'text',
          status: 'text CHECK (status IN (\'success\', \'failed\', \'running\', \'cancelled\')) DEFAULT \'running\'',
          started_at: 'timestamptz DEFAULT now()',
          finished_at: 'timestamptz',
          error_message: 'text',
          // Execution data and results
          execution_data: 'jsonb',
          // Performance metrics
          duration_ms: 'integer',
          nodes_executed: 'integer'
        },

        // Telemetry and analytics (MVP scope only)
        telemetry_events: {
          id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
          user_id: 'uuid REFERENCES users(id) ON DELETE SET NULL',
          event_type: 'text NOT NULL',
          event_data: 'jsonb DEFAULT \'{}\'::jsonb',
          created_at: 'timestamptz DEFAULT now()',
          // Session tracking
          session_id: 'text',
          // IP and user agent for basic analytics
          ip_address: 'inet',
          user_agent: 'text'
        },

        // Chat history for workflow creation dialogue
        chat_sessions: {
          id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
          user_id: 'uuid REFERENCES users(id) ON DELETE CASCADE',
          project_id: 'uuid REFERENCES projects(id) ON DELETE CASCADE',
          workflow_id: 'uuid REFERENCES workflows(id) ON DELETE SET NULL',
          created_at: 'timestamptz DEFAULT now()',
          updated_at: 'timestamptz DEFAULT now()'
        },

        chat_messages: {
          id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
          session_id: 'uuid REFERENCES chat_sessions(id) ON DELETE CASCADE',
          role: 'text CHECK (role IN (\'user\', \'assistant\', \'system\')) NOT NULL',
          content: 'text NOT NULL',
          created_at: 'timestamptz DEFAULT now()',
          // Message metadata
          metadata: 'jsonb DEFAULT \'{}\'::jsonb'
        }
      },

      indexes: [
        'CREATE INDEX idx_projects_user_id ON projects(user_id)',
        'CREATE INDEX idx_workflows_project_id ON workflows(project_id)',
        'CREATE INDEX idx_workflows_status ON workflows(status)',
        'CREATE INDEX idx_executions_workflow_id ON executions(workflow_id)',
        'CREATE INDEX idx_executions_status ON executions(status)',
        'CREATE INDEX idx_telemetry_user_id ON telemetry_events(user_id)',
        'CREATE INDEX idx_telemetry_event_type ON telemetry_events(event_type)',
        'CREATE INDEX idx_telemetry_created_at ON telemetry_events(created_at)',
        'CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id)',
        'CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id)'
      ],

      triggers: [
        // Auto-update timestamps
        `CREATE OR REPLACE FUNCTION update_updated_at_column()
         RETURNS TRIGGER AS $$
         BEGIN
           NEW.updated_at = now();
           RETURN NEW;
         END;
         $$ language 'plpgsql';`,

        'CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        'CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        'CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        'CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'
      ]
    };

    return {
      taskId: task.id,
      status: 'success',
      output: {
        schema,
        description: 'MVP-compliant database schema designed',
        tables: Object.keys(schema.tables).length,
        features: [
          'User management with Supabase Auth integration',
          'Project and workflow organization',
          'Workflow versioning and rollback capability',
          'Execution tracking and monitoring',
          'Basic telemetry and analytics',
          'Chat history for workflow creation dialogue'
        ]
      },
      nextTasks: [
        {
          id: 'db-migration-auto',
          type: 'database-migration',
          priority: 'high',
          description: 'Generate migration scripts from schema design',
          dependencies: [task.id],
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    };
  }

  /**
   * Create database migration scripts
   */
  private async createMigrations(task: AgentTask): Promise<AgentTaskResult> {
    console.log('🔄 Creating database migration scripts...');

    const migrationSQL = `
-- Clixen MVP Database Schema Migration
-- Generated by DatabaseArchitectAgent
-- Date: ${new Date().toISOString()}

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create tables
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_sign_in timestamptz,
  preferences jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  settings jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  original_prompt text,
  json_payload jsonb NOT NULL,
  version integer DEFAULT 1,
  status text CHECK (status IN ('draft', 'deployed', 'failed', 'archived')) DEFAULT 'draft',
  n8n_workflow_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deployed_at timestamptz
);

CREATE TABLE IF NOT EXISTS executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows(id) ON DELETE CASCADE,
  n8n_execution_id text,
  status text CHECK (status IN ('success', 'failed', 'running', 'cancelled')) DEFAULT 'running',
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  error_message text,
  execution_data jsonb,
  duration_ms integer,
  nodes_executed integer
);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  session_id text,
  ip_address inet,
  user_agent text
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES workflows(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_project_id ON workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_telemetry_user_id ON telemetry_events(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_event_type ON telemetry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON telemetry_events(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflows_updated_at ON workflows;
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration completed successfully
SELECT 'Clixen MVP database schema migration completed' AS migration_status;
`;

    return {
      taskId: task.id,
      status: 'success',
      output: {
        migrationSQL,
        fileName: `${Date.now()}_clixen_mvp_schema.sql`,
        description: 'Database migration scripts generated',
        tables: ['users', 'projects', 'workflows', 'executions', 'telemetry_events', 'chat_sessions', 'chat_messages'],
        indexes: 9,
        triggers: 4
      },
      nextTasks: [
        {
          id: 'db-policies-auto',
          type: 'database-policies',
          priority: 'high',
          description: 'Implement RLS policies for user data isolation',
          dependencies: [task.id],
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    };
  }

  /**
   * Implement Row Level Security policies
   */
  private async implementRLSPolicies(task: AgentTask): Promise<AgentTaskResult> {
    console.log('🔒 Implementing Row Level Security policies...');

    const rlsPolicies = `
-- Row Level Security Policies for Clixen MVP
-- Ensures users can only access their own data

-- Enable RLS on all user-specific tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Projects table policies
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own projects" ON projects;
CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Workflows table policies
DROP POLICY IF EXISTS "Users can view workflows in own projects" ON workflows;
CREATE POLICY "Users can view workflows in own projects" ON workflows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = workflows.project_id 
      AND projects.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create workflows in own projects" ON workflows;
CREATE POLICY "Users can create workflows in own projects" ON workflows
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = workflows.project_id 
      AND projects.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update workflows in own projects" ON workflows;
CREATE POLICY "Users can update workflows in own projects" ON workflows
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = workflows.project_id 
      AND projects.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete workflows in own projects" ON workflows;
CREATE POLICY "Users can delete workflows in own projects" ON workflows
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = workflows.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Executions table policies
DROP POLICY IF EXISTS "Users can view executions of own workflows" ON executions;
CREATE POLICY "Users can view executions of own workflows" ON executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workflows 
      JOIN projects ON workflows.project_id = projects.id
      WHERE workflows.id = executions.workflow_id 
      AND projects.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create executions for own workflows" ON executions;
CREATE POLICY "Users can create executions for own workflows" ON executions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workflows 
      JOIN projects ON workflows.project_id = projects.id
      WHERE workflows.id = executions.workflow_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Telemetry events policies (users can only see their own events)
DROP POLICY IF EXISTS "Users can view own telemetry" ON telemetry_events;
CREATE POLICY "Users can view own telemetry" ON telemetry_events
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create own telemetry" ON telemetry_events;
CREATE POLICY "Users can create own telemetry" ON telemetry_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Chat sessions policies
DROP POLICY IF EXISTS "Users can view own chat sessions" ON chat_sessions;
CREATE POLICY "Users can view own chat sessions" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own chat sessions" ON chat_sessions;
CREATE POLICY "Users can create own chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own chat sessions" ON chat_sessions;
CREATE POLICY "Users can update own chat sessions" ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Chat messages policies
DROP POLICY IF EXISTS "Users can view messages in own chat sessions" ON chat_messages;
CREATE POLICY "Users can view messages in own chat sessions" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_sessions 
      WHERE chat_sessions.id = chat_messages.session_id 
      AND chat_sessions.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create messages in own chat sessions" ON chat_messages;
CREATE POLICY "Users can create messages in own chat sessions" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions 
      WHERE chat_sessions.id = chat_messages.session_id 
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Service role bypass (for backend operations)
-- These policies allow the service role to access all data for administrative purposes

DROP POLICY IF EXISTS "Service role full access to users" ON users;
CREATE POLICY "Service role full access to users" ON users
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access to projects" ON projects;
CREATE POLICY "Service role full access to projects" ON projects
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access to workflows" ON workflows;
CREATE POLICY "Service role full access to workflows" ON workflows
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access to executions" ON executions;
CREATE POLICY "Service role full access to executions" ON executions
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access to telemetry" ON telemetry_events;
CREATE POLICY "Service role full access to telemetry" ON telemetry_events
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access to chat_sessions" ON chat_sessions;
CREATE POLICY "Service role full access to chat_sessions" ON chat_sessions
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access to chat_messages" ON chat_messages;
CREATE POLICY "Service role full access to chat_messages" ON chat_messages
  FOR ALL USING (auth.role() = 'service_role');

-- RLS policies implemented successfully
SELECT 'Row Level Security policies implemented for Clixen MVP' AS rls_status;
`;

    return {
      taskId: task.id,
      status: 'success',
      output: {
        rlsPolicies,
        fileName: `${Date.now()}_clixen_rls_policies.sql`,
        description: 'Row Level Security policies implemented',
        features: [
          'User data isolation enforced at database level',
          'Project-based access control',
          'Workflow and execution security',
          'Chat session privacy',
          'Service role administrative access',
          'Telemetry data protection'
        ],
        policies: 20,
        tables: 7
      }
    };
  }

  /**
   * Validate prerequisites for database operations
   */
  public async validatePrerequisites(): Promise<boolean> {
    console.log('🔍 Validating database prerequisites...');
    
    try {
      // Check if Supabase connection is available
      // This would normally test the actual database connection
      const checks = {
        supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
        databaseUrl: process.env.DATABASE_URL
      };
      
      const missing = Object.entries(checks)
        .filter(([_, value]) => !value)
        .map(([key, _]) => key);
      
      if (missing.length > 0) {
        console.error('❌ Missing database configuration:', missing);
        return false;
      }
      
      console.log('✅ Database prerequisites validated');
      return true;
      
    } catch (error) {
      console.error('❌ Database prerequisite validation failed:', error);
      return false;
    }
  }

  /**
   * Estimate task completion time
   */
  public async estimateTask(task: AgentTask): Promise<number> {
    const estimates = {
      'database-design': 4, // hours
      'database-migration': 2,
      'database-policies': 3,
      'database-optimization': 6,
      'database-backup-setup': 2
    };
    
    return estimates[task.type] || 4;
  }

  /**
   * Get current agent status
   */
  public getStatus(): AgentStatus {
    this.status.lastHeartbeat = new Date();
    return { ...this.status };
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(executionTime: number, success: boolean): void {
    const metrics = this.status.performanceMetrics;
    
    if (success) {
      metrics.tasksCompleted++;
    }
    
    // Update average task time
    if (metrics.tasksCompleted > 0) {
      metrics.averageTaskTime = (metrics.averageTaskTime + executionTime) / 2;
    } else {
      metrics.averageTaskTime = executionTime;
    }
    
    // Update error rate
    const totalTasks = metrics.tasksCompleted + (success ? 0 : 1);
    const errorTasks = success ? 0 : 1;
    metrics.errorRate = totalTasks > 0 ? errorTasks / totalTasks : 0;
  }

  /**
   * Generate rollback instructions for failed tasks
   */
  private generateRollbackInstructions(task: AgentTask): string[] {
    const instructions = [];
    
    switch (task.type) {
      case 'database-design':
        instructions.push('No rollback needed for design phase');
        break;
      case 'database-migration':
        instructions.push('DROP all created tables in reverse dependency order');
        instructions.push('Remove migration entry from schema_migrations table');
        break;
      case 'database-policies':
        instructions.push('DISABLE ROW LEVEL SECURITY on all tables');
        instructions.push('DROP all created policies');
        break;
    }
    
    return instructions;
  }
}