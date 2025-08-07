/**
 * Project Test Fixtures
 * Mock project data for testing project management functionality
 */
import type { Project, ProjectSettings } from '@/types/project';
import { testUsers } from './users';

export interface TestProject {
  id: string;
  name: string;
  description: string;
  user_id: string;
  settings: ProjectSettings;
  created_at: Date;
  updated_at: Date;
  status: 'active' | 'archived' | 'deleted';
  workflow_count?: number;
  last_activity?: Date;
}

/**
 * Test projects with various configurations
 */
export const testProjects: Record<string, TestProject> = {
  // Basic project for general testing
  basicProject: {
    id: 'project-basic-001',
    name: 'Basic Test Project',
    description: 'A simple project for basic functionality testing',
    user_id: testUsers.regularUser.id,
    settings: {
      ai_model: 'gpt-4',
      auto_save: true,
      notifications: {
        workflow_completion: true,
        error_alerts: true,
        weekly_summary: false
      },
      integrations: {
        n8n: {
          enabled: true,
          webhook_url: 'https://n8n.example.com/webhook/basic-project'
        }
      }
    },
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-15T00:00:00Z'),
    status: 'active',
    workflow_count: 3,
    last_activity: new Date('2024-01-15T00:00:00Z')
  },

  // Complex project for advanced testing
  complexProject: {
    id: 'project-complex-001',
    name: 'Complex Enterprise Project',
    description: 'Advanced project with multiple workflows and integrations',
    user_id: testUsers.premiumUser.id,
    settings: {
      ai_model: 'gpt-4',
      auto_save: true,
      notifications: {
        workflow_completion: true,
        error_alerts: true,
        weekly_summary: true
      },
      integrations: {
        n8n: {
          enabled: true,
          webhook_url: 'https://n8n.example.com/webhook/complex-project'
        },
        slack: {
          enabled: true,
          webhook_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
        },
        email: {
          enabled: true,
          smtp_server: 'smtp.example.com',
          port: 587
        }
      }
    },
    created_at: new Date('2023-12-01T00:00:00Z'),
    updated_at: new Date('2024-01-20T00:00:00Z'),
    status: 'active',
    workflow_count: 15,
    last_activity: new Date('2024-01-20T00:00:00Z')
  },

  // Empty project for new project testing
  emptyProject: {
    id: 'project-empty-001',
    name: 'Empty Project',
    description: 'A newly created project with no workflows',
    user_id: testUsers.newUser.id,
    settings: {
      ai_model: 'gpt-3.5-turbo',
      auto_save: false,
      notifications: {
        workflow_completion: false,
        error_alerts: true,
        weekly_summary: false
      },
      integrations: {
        n8n: {
          enabled: false
        }
      }
    },
    created_at: new Date(),
    updated_at: new Date(),
    status: 'active',
    workflow_count: 0
  },

  // Archived project for testing archived states
  archivedProject: {
    id: 'project-archived-001',
    name: 'Archived Project',
    description: 'A project that has been archived',
    user_id: testUsers.regularUser.id,
    settings: {
      ai_model: 'gpt-3.5-turbo',
      auto_save: true,
      notifications: {
        workflow_completion: false,
        error_alerts: false,
        weekly_summary: false
      },
      integrations: {
        n8n: {
          enabled: false
        }
      }
    },
    created_at: new Date('2023-06-01T00:00:00Z'),
    updated_at: new Date('2023-12-01T00:00:00Z'),
    status: 'archived',
    workflow_count: 8,
    last_activity: new Date('2023-11-15T00:00:00Z')
  },

  // Project for testing sharing and collaboration
  sharedProject: {
    id: 'project-shared-001',
    name: 'Shared Collaboration Project',
    description: 'A project shared between multiple users',
    user_id: testUsers.premiumUser.id,
    settings: {
      ai_model: 'gpt-4',
      auto_save: true,
      notifications: {
        workflow_completion: true,
        error_alerts: true,
        weekly_summary: true
      },
      integrations: {
        n8n: {
          enabled: true,
          webhook_url: 'https://n8n.example.com/webhook/shared-project'
        }
      },
      sharing: {
        enabled: true,
        public_link: 'https://clixen.com/shared/project-shared-001',
        collaborators: [
          {
            user_id: testUsers.regularUser.id,
            role: 'editor',
            invited_at: new Date('2024-01-10T00:00:00Z')
          }
        ]
      }
    },
    created_at: new Date('2024-01-05T00:00:00Z'),
    updated_at: new Date('2024-01-18T00:00:00Z'),
    status: 'active',
    workflow_count: 7,
    last_activity: new Date('2024-01-18T00:00:00Z')
  },

  // Project with errors for testing error handling
  errorProject: {
    id: 'project-error-001',
    name: 'Error Test Project',
    description: 'Project configured to trigger various error scenarios',
    user_id: testUsers.errorUser.id,
    settings: {
      ai_model: 'gpt-4',
      auto_save: true,
      notifications: {
        workflow_completion: true,
        error_alerts: true,
        weekly_summary: false
      },
      integrations: {
        n8n: {
          enabled: true,
          webhook_url: 'https://invalid-url-for-testing.com/webhook'
        }
      }
    },
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-10T00:00:00Z'),
    status: 'active',
    workflow_count: 2,
    last_activity: new Date('2024-01-10T00:00:00Z')
  }
};

/**
 * Generate a test project with random data
 */
export const generateTestProject = (overrides: Partial<TestProject> = {}): TestProject => {
  const randomId = Math.random().toString(36).substr(2, 9);
  const timestamp = new Date();

  return {
    id: `project-generated-${randomId}`,
    name: `Generated Project ${randomId}`,
    description: `Auto-generated project for testing purposes`,
    user_id: testUsers.regularUser.id,
    settings: {
      ai_model: 'gpt-3.5-turbo',
      auto_save: true,
      notifications: {
        workflow_completion: true,
        error_alerts: true,
        weekly_summary: false
      },
      integrations: {
        n8n: {
          enabled: true,
          webhook_url: `https://n8n.example.com/webhook/generated-${randomId}`
        }
      }
    },
    created_at: timestamp,
    updated_at: timestamp,
    status: 'active',
    workflow_count: Math.floor(Math.random() * 10),
    last_activity: timestamp,
    ...overrides
  };
};

/**
 * Invalid project data for testing validation
 */
export const invalidProjects = {
  missingName: {
    description: 'Project without name',
    user_id: testUsers.regularUser.id
  },
  
  emptyName: {
    name: '',
    description: 'Project with empty name',
    user_id: testUsers.regularUser.id
  },
  
  missingUserId: {
    name: 'Project without user',
    description: 'Project missing user ID'
  },
  
  invalidUserId: {
    name: 'Project with invalid user',
    description: 'Project with non-existent user ID',
    user_id: 'nonexistent-user-id'
  },

  nameTooLong: {
    name: 'A'.repeat(256), // Assuming 255 character limit
    description: 'Project with name exceeding character limit',
    user_id: testUsers.regularUser.id
  },

  sqlInjection: {
    name: "'; DROP TABLE projects; --",
    description: "'; DELETE FROM projects; --",
    user_id: testUsers.regularUser.id
  },

  xssPayload: {
    name: '<script>alert("xss")</script>',
    description: '<img src=x onerror=alert("xss")>',
    user_id: testUsers.regularUser.id
  }
};

/**
 * Mock project API responses
 */
export const mockProjectResponses = {
  createSuccess: {
    data: testProjects.basicProject,
    error: null
  },

  createError: {
    data: null,
    error: {
      message: 'Failed to create project',
      details: 'Database connection error',
      status: 500
    }
  },

  updateSuccess: {
    data: {
      ...testProjects.basicProject,
      name: 'Updated Project Name',
      updated_at: new Date()
    },
    error: null
  },

  deleteSuccess: {
    data: { message: 'Project deleted successfully' },
    error: null
  },

  notFound: {
    data: null,
    error: {
      message: 'Project not found',
      status: 404
    }
  },

  unauthorized: {
    data: null,
    error: {
      message: 'Unauthorized access to project',
      status: 403
    }
  }
};

/**
 * Project lists for testing different scenarios
 */
export const projectLists = {
  userProjects: [
    testProjects.basicProject,
    testProjects.archivedProject
  ],
  
  premiumUserProjects: [
    testProjects.complexProject,
    testProjects.sharedProject
  ],
  
  emptyList: [],
  
  mixedStatusProjects: [
    testProjects.basicProject,
    testProjects.archivedProject,
    testProjects.emptyProject
  ]
};

/**
 * Helper to get project by status
 */
export const getProjectByStatus = (status: 'active' | 'archived' | 'deleted'): TestProject[] => {
  return Object.values(testProjects).filter(project => project.status === status);
};

/**
 * Helper to get projects by user
 */
export const getProjectsByUser = (userId: string): TestProject[] => {
  return Object.values(testProjects).filter(project => project.user_id === userId);
};

/**
 * Generate project batch for load testing
 */
export const generateProjectBatch = (count: number, userId?: string): TestProject[] => {
  const targetUserId = userId || testUsers.regularUser.id;
  
  return Array.from({ length: count }, (_, index) => ({
    ...generateTestProject({
      id: `batch-project-${index + 1}`,
      name: `Batch Project ${index + 1}`,
      user_id: targetUserId,
      workflow_count: Math.floor(Math.random() * 5)
    })
  }));
};

/**
 * Project settings variations for testing
 */
export const projectSettingsVariations = {
  minimal: {
    ai_model: 'gpt-3.5-turbo',
    auto_save: false,
    notifications: {
      workflow_completion: false,
      error_alerts: false,
      weekly_summary: false
    },
    integrations: {
      n8n: { enabled: false }
    }
  },
  
  maximal: {
    ai_model: 'gpt-4',
    auto_save: true,
    notifications: {
      workflow_completion: true,
      error_alerts: true,
      weekly_summary: true
    },
    integrations: {
      n8n: {
        enabled: true,
        webhook_url: 'https://n8n.example.com/webhook/maximal'
      },
      slack: {
        enabled: true,
        webhook_url: 'https://hooks.slack.com/maximal'
      },
      email: {
        enabled: true,
        smtp_server: 'smtp.example.com',
        port: 587
      }
    }
  },
  
  enterprise: {
    ai_model: 'gpt-4',
    auto_save: true,
    notifications: {
      workflow_completion: true,
      error_alerts: true,
      weekly_summary: true
    },
    integrations: {
      n8n: {
        enabled: true,
        webhook_url: 'https://enterprise-n8n.company.com/webhook'
      },
      slack: {
        enabled: true,
        webhook_url: 'https://hooks.slack.com/enterprise'
      },
      teams: {
        enabled: true,
        webhook_url: 'https://company.webhook.office.com/teams'
      }
    },
    security: {
      sso_enabled: true,
      audit_logging: true,
      data_retention_days: 365
    }
  }
};