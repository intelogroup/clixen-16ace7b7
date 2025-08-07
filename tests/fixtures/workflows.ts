/**
 * Workflow Test Fixtures
 * Mock workflow data for testing workflow generation, deployment, and execution
 */
import type { WorkflowData, N8nWorkflow, WorkflowExecution } from '@/types/workflow';
import { testProjects } from './projects';
import { testUsers } from './users';

export interface TestWorkflow extends WorkflowData {
  n8n_payload?: N8nWorkflow;
  executions?: WorkflowExecution[];
}

/**
 * Test workflows covering various complexity levels and use cases
 */
export const testWorkflows: Record<string, TestWorkflow> = {
  // Simple webhook workflow
  simpleWebhook: {
    id: 'workflow-simple-001',
    name: 'Simple Webhook Processor',
    description: 'Basic webhook that receives data and sends email notification',
    project_id: testProjects.basicProject.id,
    user_id: testUsers.regularUser.id,
    json_payload: {
      name: 'Simple Webhook Processor',
      nodes: [
        {
          id: 'webhook-node',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300],
          parameters: {
            httpMethod: 'POST',
            path: 'simple-webhook',
            responseMode: 'onReceived'
          }
        },
        {
          id: 'email-node',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 1,
          position: [450, 300],
          parameters: {
            subject: 'Webhook Received',
            text: 'Data received: {{$json.data}}',
            toEmail: 'test@example.com'
          }
        }
      ],
      connections: {
        'webhook-node': {
          main: [[{ node: 'email-node', type: 'main', index: 0 }]]
        }
      }
    },
    status: 'draft',
    version: 1,
    created_at: new Date('2024-01-10T00:00:00Z'),
    updated_at: new Date('2024-01-10T00:00:00Z')
  },

  // Complex data processing workflow
  dataProcessing: {
    id: 'workflow-data-001',
    name: 'Advanced Data Processing Pipeline',
    description: 'Multi-step data processing with validation, transformation, and multiple outputs',
    project_id: testProjects.complexProject.id,
    user_id: testUsers.premiumUser.id,
    json_payload: {
      name: 'Advanced Data Processing Pipeline',
      nodes: [
        {
          id: 'webhook-trigger',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 300],
          parameters: {
            httpMethod: 'POST',
            path: 'data-processing',
            responseMode: 'onReceived'
          }
        },
        {
          id: 'validate-data',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [300, 300],
          parameters: {
            functionCode: `
              const data = items[0].json;
              if (!data.email || !data.name) {
                throw new Error('Missing required fields');
              }
              return items;
            `
          }
        },
        {
          id: 'transform-data',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [500, 300],
          parameters: {
            values: {
              email: '={{$json.email.toLowerCase()}}',
              name: '={{$json.name.trim()}}',
              processed_at: '={{new Date().toISOString()}}',
              id: '={{$json.id || "generated-" + Math.random().toString(36).substr(2, 9)}}'
            }
          }
        },
        {
          id: 'save-to-db',
          type: 'n8n-nodes-base.postgres',
          typeVersion: 1,
          position: [700, 200],
          parameters: {
            operation: 'insert',
            table: 'processed_data',
            columns: 'email,name,processed_at,id'
          }
        },
        {
          id: 'send-notification',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 1,
          position: [700, 400],
          parameters: {
            subject: 'Data Processed Successfully',
            text: 'Your data has been processed and saved.',
            toEmail: '={{$json.email}}'
          }
        },
        {
          id: 'log-completion',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 1,
          position: [900, 300],
          parameters: {
            method: 'POST',
            url: 'https://api.example.com/logs',
            jsonParameters: true,
            body: {
              event: 'data_processed',
              user_id: '={{$json.id}}',
              timestamp: '={{new Date().toISOString()}}'
            }
          }
        }
      ],
      connections: {
        'webhook-trigger': {
          main: [[{ node: 'validate-data', type: 'main', index: 0 }]]
        },
        'validate-data': {
          main: [[{ node: 'transform-data', type: 'main', index: 0 }]]
        },
        'transform-data': {
          main: [
            [
              { node: 'save-to-db', type: 'main', index: 0 },
              { node: 'send-notification', type: 'main', index: 0 }
            ]
          ]
        },
        'save-to-db': {
          main: [[{ node: 'log-completion', type: 'main', index: 0 }]]
        },
        'send-notification': {
          main: [[{ node: 'log-completion', type: 'main', index: 0 }]]
        }
      }
    },
    status: 'deployed',
    version: 3,
    created_at: new Date('2024-01-05T00:00:00Z'),
    updated_at: new Date('2024-01-15T00:00:00Z'),
    deployed_at: new Date('2024-01-15T00:00:00Z'),
    webhook_url: 'https://n8n.example.com/webhook/data-processing',
    n8n_payload: {
      id: 'n8n-workflow-data-001',
      name: 'Advanced Data Processing Pipeline',
      active: true,
      nodes: [], // Simplified for fixture
      connections: {},
      createdAt: new Date('2024-01-05T00:00:00Z'),
      updatedAt: new Date('2024-01-15T00:00:00Z')
    }
  },

  // Scheduled workflow
  scheduledReports: {
    id: 'workflow-scheduled-001',
    name: 'Daily Report Generator',
    description: 'Automated daily report generation and distribution',
    project_id: testProjects.basicProject.id,
    user_id: testUsers.regularUser.id,
    json_payload: {
      name: 'Daily Report Generator',
      nodes: [
        {
          id: 'cron-trigger',
          type: 'n8n-nodes-base.cron',
          typeVersion: 1,
          position: [100, 300],
          parameters: {
            rule: {
              hour: 9,
              minute: 0,
              dayOfMonth: '*',
              month: '*',
              dayOfWeek: '1-5' // Weekdays only
            }
          }
        },
        {
          id: 'fetch-data',
          type: 'n8n-nodes-base.postgres',
          typeVersion: 1,
          position: [300, 300],
          parameters: {
            operation: 'select',
            query: `
              SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as daily_new,
                AVG(processing_time) as avg_processing_time
              FROM processed_data
              WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            `
          }
        },
        {
          id: 'generate-report',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [500, 300],
          parameters: {
            functionCode: `
              const data = items[0].json;
              const report = \`
                Daily Report - \${new Date().toDateString()}
                
                Total Records: \${data.total_records}
                New Today: \${data.daily_new}
                Average Processing Time: \${Math.round(data.avg_processing_time)}ms
                
                Generated at \${new Date().toISOString()}
              \`;
              
              return [{ json: { report, data } }];
            `
          }
        },
        {
          id: 'send-report',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 1,
          position: [700, 300],
          parameters: {
            subject: 'Daily Report - {{new Date().toDateString()}}',
            text: '={{$json.report}}',
            toEmail: 'manager@example.com'
          }
        }
      ],
      connections: {
        'cron-trigger': {
          main: [[{ node: 'fetch-data', type: 'main', index: 0 }]]
        },
        'fetch-data': {
          main: [[{ node: 'generate-report', type: 'main', index: 0 }]]
        },
        'generate-report': {
          main: [[{ node: 'send-report', type: 'main', index: 0 }]]
        }
      }
    },
    status: 'deployed',
    version: 2,
    created_at: new Date('2024-01-08T00:00:00Z'),
    updated_at: new Date('2024-01-12T00:00:00Z'),
    deployed_at: new Date('2024-01-12T00:00:00Z')
  },

  // Error handling workflow
  errorHandling: {
    id: 'workflow-error-001',
    name: 'Error Handling Test Workflow',
    description: 'Workflow designed to test error handling and retry mechanisms',
    project_id: testProjects.errorProject.id,
    user_id: testUsers.errorUser.id,
    json_payload: {
      name: 'Error Handling Test Workflow',
      nodes: [
        {
          id: 'webhook-start',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 300],
          parameters: {
            httpMethod: 'POST',
            path: 'error-test'
          }
        },
        {
          id: 'risky-operation',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 1,
          position: [300, 300],
          parameters: {
            method: 'GET',
            url: 'https://unreliable-api.example.com/data',
            timeout: 5000
          },
          retryOnFail: true,
          maxTries: 3
        },
        {
          id: 'process-success',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [500, 200],
          parameters: {
            values: {
              status: 'success',
              processed_at: '={{new Date().toISOString()}}',
              data: '={{$json}}'
            }
          }
        },
        {
          id: 'handle-error',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [500, 400],
          parameters: {
            values: {
              status: 'error',
              error_message: '={{$json.error.message}}',
              failed_at: '={{new Date().toISOString()}}'
            }
          }
        },
        {
          id: 'notify-admin',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 1,
          position: [700, 400],
          parameters: {
            subject: 'Workflow Error Alert',
            text: 'Error occurred: {{$json.error_message}}',
            toEmail: 'admin@example.com'
          }
        }
      ],
      connections: {
        'webhook-start': {
          main: [[{ node: 'risky-operation', type: 'main', index: 0 }]]
        },
        'risky-operation': {
          main: [[{ node: 'process-success', type: 'main', index: 0 }]],
          error: [[{ node: 'handle-error', type: 'main', index: 0 }]]
        },
        'handle-error': {
          main: [[{ node: 'notify-admin', type: 'main', index: 0 }]]
        }
      }
    },
    status: 'draft',
    version: 1,
    created_at: new Date('2024-01-12T00:00:00Z'),
    updated_at: new Date('2024-01-12T00:00:00Z')
  },

  // Large workflow for performance testing
  largeWorkflow: {
    id: 'workflow-large-001',
    name: 'Large Performance Test Workflow',
    description: 'Complex workflow with many nodes for performance testing',
    project_id: testProjects.complexProject.id,
    user_id: testUsers.premiumUser.id,
    json_payload: {
      name: 'Large Performance Test Workflow',
      nodes: Array.from({ length: 50 }, (_, i) => ({
        id: `node-${i}`,
        type: i === 0 ? 'n8n-nodes-base.webhook' : 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [100 + (i % 10) * 150, 100 + Math.floor(i / 10) * 200],
        parameters: i === 0 
          ? { httpMethod: 'POST', path: 'large-workflow' }
          : { values: { step: i, processed: true } }
      })),
      connections: Array.from({ length: 49 }, (_, i) => ({
        [`node-${i}`]: {
          main: [[{ node: `node-${i + 1}`, type: 'main', index: 0 }]]
        }
      })).reduce((acc, conn) => ({ ...acc, ...conn }), {})
    },
    status: 'draft',
    version: 1,
    created_at: new Date('2024-01-15T00:00:00Z'),
    updated_at: new Date('2024-01-15T00:00:00Z')
  }
};

/**
 * Generate a test workflow with random data
 */
export const generateTestWorkflow = (overrides: Partial<TestWorkflow> = {}): TestWorkflow => {
  const randomId = Math.random().toString(36).substr(2, 9);
  const timestamp = new Date();

  return {
    id: `workflow-generated-${randomId}`,
    name: `Generated Workflow ${randomId}`,
    description: `Auto-generated workflow for testing`,
    project_id: testProjects.basicProject.id,
    user_id: testUsers.regularUser.id,
    json_payload: {
      name: `Generated Workflow ${randomId}`,
      nodes: [
        {
          id: 'webhook-node',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300],
          parameters: {
            httpMethod: 'POST',
            path: `generated-${randomId}`
          }
        },
        {
          id: 'process-node',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [450, 300],
          parameters: {
            values: {
              processed: true,
              workflow_id: `workflow-generated-${randomId}`,
              timestamp: '={{new Date().toISOString()}}'
            }
          }
        }
      ],
      connections: {
        'webhook-node': {
          main: [[{ node: 'process-node', type: 'main', index: 0 }]]
        }
      }
    },
    status: 'draft',
    version: 1,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides
  };
};

/**
 * Invalid workflow data for testing validation
 */
export const invalidWorkflows = {
  missingName: {
    description: 'Workflow without name',
    project_id: testProjects.basicProject.id,
    json_payload: { nodes: [], connections: {} }
  },
  
  missingJsonPayload: {
    name: 'Workflow without JSON payload',
    project_id: testProjects.basicProject.id
  },
  
  invalidJsonPayload: {
    name: 'Workflow with invalid JSON',
    project_id: testProjects.basicProject.id,
    json_payload: 'not-valid-json'
  },
  
  emptyNodes: {
    name: 'Workflow with empty nodes',
    project_id: testProjects.basicProject.id,
    json_payload: { nodes: [], connections: {} }
  },

  sqlInjection: {
    name: "'; DROP TABLE workflows; --",
    description: "'; DELETE FROM workflows; --",
    project_id: testProjects.basicProject.id,
    json_payload: { nodes: [], connections: {} }
  },

  xssPayload: {
    name: '<script>alert("xss")</script>',
    description: '<img src=x onerror=alert("xss")>',
    project_id: testProjects.basicProject.id,
    json_payload: { nodes: [], connections: {} }
  }
};

/**
 * Mock workflow execution data
 */
export const mockWorkflowExecutions: Record<string, WorkflowExecution[]> = {
  'workflow-simple-001': [
    {
      id: 'exec-simple-001',
      workflow_id: 'workflow-simple-001',
      status: 'success',
      started_at: new Date('2024-01-15T10:00:00Z'),
      finished_at: new Date('2024-01-15T10:00:05Z'),
      execution_time: 5000,
      data_processed: 1,
      trigger_data: { webhook_data: { message: 'test' } }
    },
    {
      id: 'exec-simple-002',
      workflow_id: 'workflow-simple-001',
      status: 'success',
      started_at: new Date('2024-01-15T11:30:00Z'),
      finished_at: new Date('2024-01-15T11:30:03Z'),
      execution_time: 3000,
      data_processed: 1,
      trigger_data: { webhook_data: { message: 'another test' } }
    }
  ],
  
  'workflow-data-001': [
    {
      id: 'exec-data-001',
      workflow_id: 'workflow-data-001',
      status: 'success',
      started_at: new Date('2024-01-15T09:15:00Z'),
      finished_at: new Date('2024-01-15T09:15:12Z'),
      execution_time: 12000,
      data_processed: 5,
      trigger_data: { 
        webhook_data: [
          { email: 'test1@example.com', name: 'Test User 1' },
          { email: 'test2@example.com', name: 'Test User 2' }
        ]
      }
    },
    {
      id: 'exec-data-002',
      workflow_id: 'workflow-data-001',
      status: 'failed',
      started_at: new Date('2024-01-15T14:20:00Z'),
      finished_at: new Date('2024-01-15T14:20:08Z'),
      execution_time: 8000,
      error_message: 'Database connection timeout',
      trigger_data: { webhook_data: { email: 'fail@example.com' } }
    }
  ]
};

/**
 * Mock n8n API responses
 */
export const mockN8nResponses = {
  createWorkflow: {
    id: 'n8n-12345',
    name: 'Test Workflow',
    active: false,
    nodes: [],
    connections: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  activateWorkflow: {
    id: 'n8n-12345',
    active: true
  },

  executeWorkflow: {
    id: 'exec-12345',
    finished: true,
    mode: 'webhook',
    startedAt: new Date().toISOString(),
    stoppedAt: new Date().toISOString(),
    workflowData: {
      id: 'n8n-12345',
      name: 'Test Workflow'
    }
  },

  getExecutions: [
    {
      id: 'exec-1',
      finished: true,
      mode: 'webhook',
      startedAt: new Date().toISOString(),
      stoppedAt: new Date().toISOString()
    },
    {
      id: 'exec-2',
      finished: false,
      mode: 'webhook',
      startedAt: new Date().toISOString()
    }
  ]
};

/**
 * Workflow generation prompts for testing
 */
export const testPrompts = {
  simple: 'Create a webhook that receives user data and sends an email confirmation',
  
  complex: 'Build a comprehensive data processing workflow that validates input, transforms data, saves to database, sends notifications, and logs all activities with error handling',
  
  scheduled: 'Create a daily report generator that runs every morning at 9 AM, fetches data from database, generates summary, and emails it to management',
  
  integration: 'Design a workflow that integrates with Slack, receives messages, processes them through AI, and responds with relevant information while logging everything',
  
  ecommerce: 'Create an e-commerce order processing workflow that handles new orders, validates payment, updates inventory, sends confirmation emails, and notifies fulfillment team',

  invalid: '', // Empty prompt
  
  malicious: '<script>alert("xss")</script>DROP TABLE workflows;'
};

/**
 * Generate workflow batch for load testing
 */
export const generateWorkflowBatch = (count: number, projectId?: string): TestWorkflow[] => {
  const targetProjectId = projectId || testProjects.basicProject.id;
  
  return Array.from({ length: count }, (_, index) => ({
    ...generateTestWorkflow({
      id: `batch-workflow-${index + 1}`,
      name: `Batch Workflow ${index + 1}`,
      project_id: targetProjectId
    })
  }));
};