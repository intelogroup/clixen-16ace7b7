// Simple workflow generation for testing
import { n8nApi } from './n8n';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  nodes: any[];
  connections: any;
}

// Simple webhook to email workflow for testing
export const createSimpleWebhookWorkflow = (): WorkflowTemplate => {
  const workflowId = `webhook-test-${Date.now()}`;
  
  return {
    id: workflowId,
    name: "Simple Webhook Test",
    description: "A simple webhook that receives data and logs it",
    nodes: [
      {
        id: "webhook",
        name: "Webhook",
        type: "n8n-nodes-base.webhook",
        typeVersion: 1,
        position: [240, 300],
        parameters: {
          path: `test-webhook-${Date.now()}`,
          httpMethod: "POST",
          responseMode: "responseNode"
        }
      },
      {
        id: "setData",
        name: "Process Data",
        type: "n8n-nodes-base.set",
        typeVersion: 1,
        position: [460, 300],
        parameters: {
          values: {
            string: [
              {
                name: "message",
                value: "Webhook received successfully!"
              },
              {
                name: "timestamp",
                value: "{{ new Date().toISOString() }}"
              },
              {
                name: "receivedData",
                value: "{{ JSON.stringify($json) }}"
              }
            ]
          }
        }
      },
      {
        id: "response",
        name: "Webhook Response",
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1,
        position: [680, 300],
        parameters: {
          respondWith: "json",
          responseBody: "={{ { \"status\": \"success\", \"message\": \"Data processed\", \"timestamp\": new Date().toISOString() } }}"
        }
      }
    ],
    connections: {
      "Webhook": {
        "main": [
          [
            {
              "node": "Process Data",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Process Data": {
        "main": [
          [
            {
              "node": "Webhook Response",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    }
  };
};

// Simple scheduled workflow for testing
export const createSimpleScheduledWorkflow = (): WorkflowTemplate => {
  const workflowId = `scheduled-test-${Date.now()}`;
  
  return {
    id: workflowId,
    name: "Simple Scheduled Task",
    description: "A simple scheduled task that runs every 5 minutes",
    nodes: [
      {
        id: "schedule",
        name: "Every 5 Minutes",
        type: "n8n-nodes-base.cron",
        typeVersion: 1,
        position: [240, 300],
        parameters: {
          rule: {
            interval: [
              {
                field: "minute",
                minute: 5
              }
            ]
          }
        }
      },
      {
        id: "processData",
        name: "Create Log Entry",
        type: "n8n-nodes-base.set",
        typeVersion: 1,
        position: [460, 300],
        parameters: {
          values: {
            string: [
              {
                name: "log_message",
                value: "Scheduled task executed successfully"
              },
              {
                name: "execution_time",
                value: "{{ new Date().toISOString() }}"
              },
              {
                name: "task_id",
                value: workflowId
              }
            ]
          }
        }
      }
    ],
    connections: {
      "Every 5 Minutes": {
        "main": [
          [
            {
              "node": "Create Log Entry",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    }
  };
};

export const workflowGenerator = {
  // Generate a simple workflow for testing
  async generateSimpleWorkflow(type: 'webhook' | 'scheduled' = 'webhook'): Promise<WorkflowTemplate> {
    if (type === 'webhook') {
      return createSimpleWebhookWorkflow();
    } else {
      return createSimpleScheduledWorkflow();
    }
  },

  // Deploy workflow to n8n
  async deployWorkflow(workflow: WorkflowTemplate): Promise<{
    success: boolean;
    message: string;
    workflowId?: string;
    webhookUrl?: string;
  }> {
    try {
      // First test connection
      const connectionTest = await n8nApi.testConnection();
      if (!connectionTest.success) {
        return {
          success: false,
          message: `n8n connection failed: ${connectionTest.message}`
        };
      }

      // Create the workflow
      const n8nWorkflow = {
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections,
        active: false,
        settings: {}
      };

      const result = await n8nApi.createWorkflow(n8nWorkflow);
      
      // Activate the workflow
      await n8nApi.toggleWorkflow(result.id, true);

      // Generate webhook URL if it's a webhook workflow
      let webhookUrl;
      const webhookNode = workflow.nodes.find(node => node.type === 'n8n-nodes-base.webhook');
      if (webhookNode) {
        const webhookPath = webhookNode.parameters.path;
        webhookUrl = `http://18.221.12.50:5678/webhook/${webhookPath}`;
      }

      return {
        success: true,
        message: 'Workflow deployed and activated successfully!',
        workflowId: result.id,
        webhookUrl
      };

    } catch (error) {
      console.error('Workflow deployment error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to deploy workflow'
      };
    }
  },

  // Test a deployed workflow
  async testWorkflow(workflowId: string, webhookUrl?: string): Promise<{
    success: boolean;
    message: string;
    response?: any;
  }> {
    try {
      if (webhookUrl) {
        // Test webhook workflow
        const testData = {
          test: true,
          message: 'Test webhook call',
          timestamp: new Date().toISOString()
        };

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testData)
        });

        if (response.ok) {
          const result = await response.json();
          return {
            success: true,
            message: 'Webhook test successful!',
            response: result
          };
        } else {
          return {
            success: false,
            message: `Webhook test failed: ${response.status} ${response.statusText}`
          };
        }
      } else {
        // For scheduled workflows, just check if it's active
        const workflow = await n8nApi.getWorkflow(workflowId);
        return {
          success: workflow.active,
          message: workflow.active ? 'Scheduled workflow is active and running!' : 'Workflow is not active',
          response: { active: workflow.active, name: workflow.name }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Workflow test failed'
      };
    }
  }
};