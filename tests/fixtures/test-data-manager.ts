/**
 * Test Data Management and Cleanup Automation
 * Manages test data lifecycle, seeding, and cleanup for comprehensive testing
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface TestDataConfig {
  autoCleanup: boolean;
  retentionHours: number;
  preserveOnFailure: boolean;
  seedFreshData: boolean;
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
  tier: 'free' | 'pro' | 'enterprise';
  created_at: string;
}

export interface TestProject {
  id: string;
  name: string;
  description: string;
  user_id: string;
  settings: any;
  created_at: string;
}

export interface TestWorkflow {
  id: string;
  name: string;
  description: string;
  project_id: string;
  n8n_workflow: any;
  status: string;
  created_at: string;
}

export interface TestConversation {
  id: string;
  title: string;
  project_id: string;
  user_id: string;
  created_at: string;
}

export class TestDataManager {
  private supabase: SupabaseClient;
  private serviceRoleClient: SupabaseClient;
  private config: TestDataConfig;
  private createdData: Map<string, Set<string>> = new Map();

  constructor(config: TestDataConfig) {
    this.config = config;
    
    // Initialize clients
    this.supabase = createClient(
      global.testConfig.supabase.url,
      global.testConfig.supabase.anonKey
    );

    this.serviceRoleClient = createClient(
      global.testConfig.supabase.url,
      global.testConfig.supabase.serviceRoleKey
    );

    // Track created data for cleanup
    this.createdData.set('users', new Set());
    this.createdData.set('projects', new Set());
    this.createdData.set('workflows', new Set());
    this.createdData.set('conversations', new Set());
    this.createdData.set('messages', new Set());
  }

  /**
   * Initialize test environment with seed data
   */
  async initializeTestEnvironment(): Promise<void> {
    console.log('🌱 Initializing test environment...');

    if (this.config.seedFreshData) {
      await this.seedTestData();
    }

    if (this.config.autoCleanup) {
      await this.cleanupOldTestData();
    }

    console.log('✅ Test environment initialized');
  }

  /**
   * Create a test user with specified tier
   */
  async createTestUser(tier: 'free' | 'pro' | 'enterprise' = 'free'): Promise<TestUser> {
    const testId = this.generateTestId();
    const email = `test-${testId}@example.com`;
    const password = 'TestPassword123!';

    // Create user with Supabase Auth
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          tier,
          test_user: true,
          created_by_test: true
        }
      }
    });

    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }

    const testUser: TestUser = {
      id: data.user!.id,
      email,
      password,
      tier,
      created_at: new Date().toISOString()
    };

    // Track for cleanup
    this.createdData.get('users')!.add(testUser.id);

    console.log(`👤 Created test user: ${email} (${tier})`);
    return testUser;
  }

  /**
   * Create a test project for a user
   */
  async createTestProject(userId: string, customData?: Partial<TestProject>): Promise<TestProject> {
    const testId = this.generateTestId();
    
    const projectData = {
      name: customData?.name || `Test Project ${testId}`,
      description: customData?.description || 'Auto-generated test project',
      user_id: userId,
      settings: customData?.settings || {
        n8n_enabled: true,
        auto_deploy: false,
        created_by_test: true
      },
      ...customData
    };

    const { data, error } = await this.supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test project: ${error.message}`);
    }

    // Track for cleanup
    this.createdData.get('projects')!.add(data.id);

    console.log(`📁 Created test project: ${data.name}`);
    return data;
  }

  /**
   * Create a test workflow for a project
   */
  async createTestWorkflow(projectId: string, customData?: Partial<TestWorkflow>): Promise<TestWorkflow> {
    const testId = this.generateTestId();
    
    const workflowData = {
      name: customData?.name || `Test Workflow ${testId}`,
      description: customData?.description || 'Auto-generated test workflow',
      project_id: projectId,
      n8n_workflow: customData?.n8n_workflow || this.generateSampleWorkflow(),
      status: customData?.status || 'draft',
      ...customData
    };

    const { data, error } = await this.supabase
      .from('workflows')
      .insert([workflowData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test workflow: ${error.message}`);
    }

    // Track for cleanup
    this.createdData.get('workflows')!.add(data.id);

    console.log(`⚙️ Created test workflow: ${data.name}`);
    return data;
  }

  /**
   * Create a test conversation for a project
   */
  async createTestConversation(projectId: string, userId: string, customData?: Partial<TestConversation>): Promise<TestConversation> {
    const testId = this.generateTestId();
    
    const conversationData = {
      title: customData?.title || `Test Conversation ${testId}`,
      project_id: projectId,
      user_id: userId,
      ...customData
    };

    const { data, error } = await this.supabase
      .from('conversations')
      .insert([conversationData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test conversation: ${error.message}`);
    }

    // Track for cleanup
    this.createdData.get('conversations')!.add(data.id);

    console.log(`💬 Created test conversation: ${data.title}`);
    return data;
  }

  /**
   * Create complete test scenario (user + project + workflow + conversation)
   */
  async createTestScenario(tier: 'free' | 'pro' | 'enterprise' = 'free'): Promise<{
    user: TestUser;
    project: TestProject;
    workflow: TestWorkflow;
    conversation: TestConversation;
  }> {
    console.log(`🎭 Creating complete test scenario (${tier} tier)...`);

    const user = await this.createTestUser(tier);
    
    // Sign in as the test user to create associated data
    const { data: authData } = await this.supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password
    });

    if (!authData.session) {
      throw new Error('Failed to authenticate test user');
    }

    const project = await this.createTestProject(user.id);
    const workflow = await this.createTestWorkflow(project.id);
    const conversation = await this.createTestConversation(project.id, user.id);

    // Sign out
    await this.supabase.auth.signOut();

    console.log('✅ Complete test scenario created');
    
    return { user, project, workflow, conversation };
  }

  /**
   * Seed the database with test data
   */
  private async seedTestData(): Promise<void> {
    console.log('🌾 Seeding test data...');

    // Create various test scenarios
    const scenarios = [
      { tier: 'free' as const, count: 3 },
      { tier: 'pro' as const, count: 2 },
      { tier: 'enterprise' as const, count: 1 }
    ];

    for (const scenario of scenarios) {
      for (let i = 0; i < scenario.count; i++) {
        try {
          await this.createTestScenario(scenario.tier);
        } catch (error) {
          console.warn(`Failed to create ${scenario.tier} scenario ${i + 1}:`, error.message);
        }
      }
    }

    console.log('✅ Test data seeding completed');
  }

  /**
   * Clean up test data created by this manager
   */
  async cleanupTestData(): Promise<void> {
    if (!this.config.autoCleanup) {
      console.log('⏭️ Auto cleanup disabled - skipping cleanup');
      return;
    }

    console.log('🧹 Cleaning up test data...');
    let totalCleaned = 0;

    // Clean up in reverse dependency order
    const cleanupOrder = ['messages', 'conversations', 'workflows', 'projects', 'users'];

    for (const table of cleanupOrder) {
      const ids = this.createdData.get(table);
      if (!ids || ids.size === 0) continue;

      try {
        if (table === 'users') {
          // Special handling for users (delete via auth)
          for (const userId of ids) {
            await this.serviceRoleClient.auth.admin.deleteUser(userId);
            totalCleaned++;
          }
        } else {
          // Regular table cleanup
          const idsArray = Array.from(ids);
          const { error } = await this.serviceRoleClient
            .from(table)
            .delete()
            .in('id', idsArray);

          if (error) {
            console.warn(`Failed to cleanup ${table}:`, error.message);
          } else {
            totalCleaned += idsArray.length;
          }
        }

        ids.clear();
      } catch (error) {
        console.warn(`Error cleaning up ${table}:`, error.message);
      }
    }

    console.log(`✅ Cleaned up ${totalCleaned} test records`);
  }

  /**
   * Clean up old test data based on retention policy
   */
  async cleanupOldTestData(): Promise<void> {
    console.log('🕰️ Cleaning up old test data...');

    const retentionDate = new Date();
    retentionDate.setHours(retentionDate.getHours() - this.config.retentionHours);

    const tables = ['projects', 'workflows', 'conversations', 'messages'];

    for (const table of tables) {
      try {
        const { data: oldRecords } = await this.serviceRoleClient
          .from(table)
          .select('id')
          .lt('created_at', retentionDate.toISOString())
          .contains('settings', { created_by_test: true });

        if (oldRecords && oldRecords.length > 0) {
          const { error } = await this.serviceRoleClient
            .from(table)
            .delete()
            .in('id', oldRecords.map(r => r.id));

          if (error) {
            console.warn(`Failed to cleanup old ${table}:`, error.message);
          } else {
            console.log(`🗑️ Cleaned up ${oldRecords.length} old ${table} records`);
          }
        }
      } catch (error) {
        console.warn(`Error cleaning up old ${table}:`, error.message);
      }
    }

    // Clean up old test users
    try {
      const { data: { users }, error } = await this.serviceRoleClient.auth.admin.listUsers();
      
      if (!error && users) {
        const oldTestUsers = users.filter(user => 
          user.user_metadata?.test_user === true &&
          user.created_at &&
          new Date(user.created_at) < retentionDate
        );

        for (const user of oldTestUsers) {
          await this.serviceRoleClient.auth.admin.deleteUser(user.id);
        }

        if (oldTestUsers.length > 0) {
          console.log(`🗑️ Cleaned up ${oldTestUsers.length} old test users`);
        }
      }
    } catch (error) {
      console.warn('Error cleaning up old test users:', error.message);
    }

    console.log('✅ Old test data cleanup completed');
  }

  /**
   * Validate test data integrity
   */
  async validateTestData(): Promise<{
    valid: boolean;
    issues: string[];
    stats: Record<string, number>;
  }> {
    console.log('🔍 Validating test data integrity...');

    const issues: string[] = [];
    const stats: Record<string, number> = {};

    // Check data consistency
    const tables = ['projects', 'workflows', 'conversations', 'messages'];

    for (const table of tables) {
      try {
        const { data, error } = await this.supabase
          .from(table)
          .select('id')
          .contains('settings', { created_by_test: true });

        if (error) {
          issues.push(`Failed to query ${table}: ${error.message}`);
        } else {
          stats[table] = data?.length || 0;
        }
      } catch (error) {
        issues.push(`Error validating ${table}: ${error.message}`);
      }
    }

    // Check for orphaned records
    try {
      const { data: workflows } = await this.supabase
        .from('workflows')
        .select('id, project_id')
        .contains('settings', { created_by_test: true });

      if (workflows) {
        for (const workflow of workflows) {
          const { data: project } = await this.supabase
            .from('projects')
            .select('id')
            .eq('id', workflow.project_id)
            .single();

          if (!project) {
            issues.push(`Orphaned workflow ${workflow.id} - project ${workflow.project_id} not found`);
          }
        }
      }
    } catch (error) {
      issues.push(`Error checking for orphaned records: ${error.message}`);
    }

    const valid = issues.length === 0;

    console.log(`🎯 Data validation ${valid ? 'passed' : 'failed'}: ${issues.length} issues found`);
    
    return { valid, issues, stats };
  }

  /**
   * Generate test performance data
   */
  async generatePerformanceTestData(recordCount: number = 1000): Promise<void> {
    console.log(`🏁 Generating ${recordCount} performance test records...`);

    const batchSize = 100;
    const batches = Math.ceil(recordCount / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const batchRecords = [];
      const batchCount = Math.min(batchSize, recordCount - batch * batchSize);

      for (let i = 0; i < batchCount; i++) {
        const testId = this.generateTestId();
        batchRecords.push({
          name: `Performance Test Project ${batch * batchSize + i + 1}`,
          description: `Auto-generated for performance testing (batch ${batch + 1})`,
          user_id: global.testConfig.testUser.email, // Use test user ID
          settings: {
            created_by_test: true,
            performance_test: true,
            batch_number: batch + 1,
            record_index: i + 1
          }
        });
      }

      const { data, error } = await this.serviceRoleClient
        .from('projects')
        .insert(batchRecords)
        .select('id');

      if (error) {
        console.warn(`Failed to insert performance test batch ${batch + 1}:`, error.message);
      } else if (data) {
        // Track for cleanup
        data.forEach(record => this.createdData.get('projects')!.add(record.id));
      }

      // Progress indicator
      if (batch % 10 === 0 || batch === batches - 1) {
        const progress = ((batch + 1) / batches * 100).toFixed(1);
        console.log(`📊 Performance data generation: ${progress}% complete`);
      }
    }

    console.log(`✅ Generated ${recordCount} performance test records`);
  }

  /**
   * Export test data for analysis
   */
  async exportTestData(): Promise<{
    users: any[];
    projects: any[];
    workflows: any[];
    conversations: any[];
  }> {
    console.log('📤 Exporting test data...');

    const exportData = {
      users: [],
      projects: [],
      workflows: [],
      conversations: []
    };

    // Export projects
    const { data: projects } = await this.supabase
      .from('projects')
      .select('*')
      .contains('settings', { created_by_test: true });

    exportData.projects = projects || [];

    // Export workflows
    const { data: workflows } = await this.supabase
      .from('workflows')
      .select('*')
      .contains('settings', { created_by_test: true });

    exportData.workflows = workflows || [];

    // Export conversations
    const { data: conversations } = await this.supabase
      .from('conversations')
      .select('*')
      .limit(1000);

    exportData.conversations = conversations || [];

    console.log('✅ Test data export completed');
    return exportData;
  }

  /**
   * Generate a sample n8n workflow for testing
   */
  private generateSampleWorkflow(): any {
    return {
      nodes: [
        {
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300],
          parameters: {
            httpMethod: 'POST',
            path: `test-${this.generateTestId()}`
          }
        },
        {
          name: 'Set',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [450, 300],
          parameters: {
            values: {
              string: [
                {
                  name: 'message',
                  value: 'Test workflow response'
                },
                {
                  name: 'timestamp',
                  value: '={{$now}}'
                }
              ]
            }
          }
        }
      ],
      connections: {
        'Webhook': {
          main: [
            [
              {
                node: 'Set',
                type: 'main',
                index: 0
              }
            ]
          ]
        }
      },
      settings: {
        timezone: 'UTC',
        created_by_test: true
      }
    };
  }

  /**
   * Generate unique test identifier
   */
  private generateTestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get cleanup summary
   */
  getCleanupSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    
    for (const [table, ids] of this.createdData.entries()) {
      summary[table] = ids.size;
    }

    return summary;
  }
}

/**
 * Global test data manager instance
 */
export const testDataManager = new TestDataManager({
  autoCleanup: global.testConfig?.features?.autoCleanup ?? true,
  retentionHours: 24,
  preserveOnFailure: false,
  seedFreshData: false
});