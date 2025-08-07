// n8n workflow feasibility validator using MCP
import { WorkflowRequirement } from './types';

interface N8nNode {
  type: string;
  name: string;
  parameters: any;
  position: [number, number];
}

interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: any;
  settings: any;
}

interface ValidationResult {
  feasible: boolean;
  missingCapabilities: string[];
  suggestedStructure: N8nWorkflow | null;
  alternativeSolutions: string[];
  warnings: string[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

export class N8nValidator {
  private n8nApiUrl: string;
  private n8nApiKey: string;
  private availableNodes: Map<string, any> = new Map();

  constructor() {
    this.n8nApiUrl = import.meta.env.VITE_N8N_API_URL || 'http://18.221.12.50:5678/api/v1';
    this.n8nApiKey = import.meta.env.VITE_N8N_API_KEY || '';
    this.initializeNodeCatalog();
  }

  private initializeNodeCatalog() {
    // Common n8n nodes and their capabilities
    this.availableNodes.set('webhook', {
      triggers: ['webhook', 'form', 'api'],
      category: 'trigger'
    });
    
    this.availableNodes.set('schedule', {
      triggers: ['schedule', 'cron', 'interval'],
      category: 'trigger'
    });
    
    this.availableNodes.set('http', {
      actions: ['api_call', 'webhook', 'rest'],
      category: 'action'
    });
    
    this.availableNodes.set('email', {
      actions: ['send_email', 'read_email'],
      category: 'action'
    });
    
    this.availableNodes.set('slack', {
      actions: ['send_message', 'post_notification'],
      category: 'action'
    });
    
    this.availableNodes.set('googleSheets', {
      actions: ['read_sheet', 'write_sheet', 'update_sheet'],
      dataSources: ['google_sheets', 'spreadsheet'],
      category: 'action'
    });
    
    this.availableNodes.set('postgres', {
      actions: ['query_database', 'insert_data', 'update_data'],
      dataSources: ['database', 'postgres', 'sql'],
      category: 'action'
    });
    
    this.availableNodes.set('if', {
      conditions: ['if_then', 'conditional', 'filter'],
      category: 'logic'
    });
    
    this.availableNodes.set('code', {
      actions: ['transform_data', 'process', 'calculate'],
      category: 'transformation'
    });
  }

  async validateFeasibility(scope: {
    trigger: string;
    dataSources: string[];
    actions: string[];
    conditions: string[];
    output: string;
    frequency: string;
  }): Promise<ValidationResult> {
    const validation: ValidationResult = {
      feasible: true,
      missingCapabilities: [],
      suggestedStructure: null,
      alternativeSolutions: [],
      warnings: [],
      estimatedComplexity: 'simple'
    };

    // Check trigger feasibility
    const triggerNode = this.findNodeForCapability(scope.trigger, 'trigger');
    if (!triggerNode) {
      validation.feasible = false;
      validation.missingCapabilities.push(`Trigger: ${scope.trigger}`);
      validation.alternativeSolutions.push(
        'Consider using a webhook trigger or schedule trigger as alternatives'
      );
    }

    // Check data source availability
    for (const dataSource of scope.dataSources) {
      const sourceNode = this.findNodeForCapability(dataSource, 'dataSources');
      if (!sourceNode) {
        validation.warnings.push(`Data source "${dataSource}" may require custom configuration`);
      }
    }

    // Check action feasibility
    for (const action of scope.actions) {
      const actionNode = this.findNodeForCapability(action, 'actions');
      if (!actionNode) {
        validation.warnings.push(`Action "${action}" may need a custom node or HTTP request`);
      }
    }

    // Estimate complexity
    const nodeCount = 1 + scope.dataSources.length + scope.actions.length + 
                     (scope.conditions.length > 0 ? scope.conditions.length : 0);
    
    if (nodeCount <= 3) {
      validation.estimatedComplexity = 'simple';
    } else if (nodeCount <= 7) {
      validation.estimatedComplexity = 'moderate';
    } else {
      validation.estimatedComplexity = 'complex';
    }

    // Generate suggested workflow structure if feasible
    if (validation.feasible) {
      validation.suggestedStructure = await this.generateWorkflowStructure(scope);
    }

    // Check n8n API connectivity
    try {
      const response = await fetch(`${this.n8nApiUrl}/workflows`, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': this.n8nApiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok && response.status !== 404) {
        validation.warnings.push('n8n server connectivity may be limited');
      }
    } catch (error) {
      validation.warnings.push('Could not verify n8n server connectivity');
    }

    return validation;
  }

  private findNodeForCapability(capability: string, type: string): string | null {
    const capabilityLower = capability.toLowerCase();
    
    for (const [nodeName, nodeInfo] of this.availableNodes.entries()) {
      const capabilities = nodeInfo[type];
      if (capabilities && Array.isArray(capabilities)) {
        for (const cap of capabilities) {
          if (capabilityLower.includes(cap) || cap.includes(capabilityLower)) {
            return nodeName;
          }
        }
      }
    }
    
    return null;
  }

  async generateWorkflowStructure(scope: any): Promise<N8nWorkflow> {
    const nodes: N8nNode[] = [];
    let yPosition = 250;
    
    // Add trigger node
    const triggerType = this.mapTriggerToNode(scope.trigger);
    nodes.push({
      type: `n8n-nodes-base.${triggerType}`,
      name: triggerType.charAt(0).toUpperCase() + triggerType.slice(1),
      parameters: this.getDefaultParameters(triggerType, scope.trigger),
      position: [250, yPosition]
    });
    yPosition += 150;

    // Add data source nodes
    for (const dataSource of scope.dataSources) {
      const nodeType = this.mapDataSourceToNode(dataSource);
      nodes.push({
        type: `n8n-nodes-base.${nodeType}`,
        name: this.generateNodeName(nodeType),
        parameters: this.getDefaultParameters(nodeType, dataSource),
        position: [250, yPosition]
      });
      yPosition += 150;
    }

    // Add condition nodes if needed
    if (scope.conditions && scope.conditions.length > 0) {
      nodes.push({
        type: 'n8n-nodes-base.if',
        name: 'IF',
        parameters: {
          conditions: {
            boolean: [],
            string: []
          }
        },
        position: [250, yPosition]
      });
      yPosition += 150;
    }

    // Add action nodes
    for (const action of scope.actions) {
      const nodeType = this.mapActionToNode(action);
      nodes.push({
        type: `n8n-nodes-base.${nodeType}`,
        name: this.generateNodeName(nodeType),
        parameters: this.getDefaultParameters(nodeType, action),
        position: [250, yPosition]
      });
      yPosition += 150;
    }

    // Add output node
    if (scope.output) {
      const outputNode = this.mapOutputToNode(scope.output);
      nodes.push({
        type: `n8n-nodes-base.${outputNode}`,
        name: this.generateNodeName(outputNode),
        parameters: this.getDefaultParameters(outputNode, scope.output),
        position: [250, yPosition]
      });
    }

    // Generate connections
    const connections = this.generateConnections(nodes);

    return {
      name: 'Automated Workflow',
      nodes,
      connections,
      settings: {
        executionOrder: 'v1'
      }
    };
  }

  private mapTriggerToNode(trigger: string): string {
    const triggerLower = trigger.toLowerCase();
    
    if (triggerLower.includes('webhook') || triggerLower.includes('form')) {
      return 'webhook';
    } else if (triggerLower.includes('schedule') || triggerLower.includes('time')) {
      return 'scheduleTrigger';
    } else if (triggerLower.includes('email')) {
      return 'emailReadImap';
    } else {
      return 'webhook'; // Default to webhook
    }
  }

  private mapDataSourceToNode(dataSource: string): string {
    const sourceLower = dataSource.toLowerCase();
    
    if (sourceLower.includes('google') && sourceLower.includes('sheet')) {
      return 'googleSheets';
    } else if (sourceLower.includes('database') || sourceLower.includes('sql')) {
      return 'postgres';
    } else if (sourceLower.includes('api')) {
      return 'httpRequest';
    } else {
      return 'httpRequest'; // Default to HTTP
    }
  }

  private mapActionToNode(action: string): string {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('email')) {
      return 'emailSend';
    } else if (actionLower.includes('slack')) {
      return 'slack';
    } else if (actionLower.includes('database')) {
      return 'postgres';
    } else if (actionLower.includes('transform') || actionLower.includes('process')) {
      return 'code';
    } else {
      return 'httpRequest';
    }
  }

  private mapOutputToNode(output: string): string {
    const outputLower = output.toLowerCase();
    
    if (outputLower.includes('email')) {
      return 'emailSend';
    } else if (outputLower.includes('slack')) {
      return 'slack';
    } else if (outputLower.includes('file')) {
      return 'writeBinaryFile';
    } else if (outputLower.includes('database')) {
      return 'postgres';
    } else {
      return 'webhook';
    }
  }

  private generateNodeName(nodeType: string): string {
    return nodeType
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  private getDefaultParameters(nodeType: string, context: string): any {
    switch (nodeType) {
      case 'webhook':
        return {
          httpMethod: 'POST',
          path: '/webhook',
          responseMode: 'onReceived',
          responseData: 'firstEntryJson'
        };
      
      case 'scheduleTrigger':
        return {
          rule: {
            interval: [{ field: 'hours', hoursInterval: 1 }]
          }
        };
      
      case 'emailSend':
        return {
          fromEmail: '',
          toEmail: '',
          subject: 'Automated Notification',
          text: ''
        };
      
      case 'httpRequest':
        return {
          method: 'GET',
          url: '',
          authentication: 'none'
        };
      
      default:
        return {};
    }
  }

  private generateConnections(nodes: N8nNode[]): any {
    const connections: any = {};
    
    for (let i = 0; i < nodes.length - 1; i++) {
      const currentNode = nodes[i];
      const nextNode = nodes[i + 1];
      
      if (!connections[currentNode.name]) {
        connections[currentNode.name] = {
          main: [[]]
        };
      }
      
      connections[currentNode.name].main[0].push({
        node: nextNode.name,
        type: 'main',
        index: 0
      });
    }
    
    return connections;
  }

  async deployWorkflow(workflow: N8nWorkflow): Promise<{ success: boolean; workflowId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.n8nApiUrl}/workflows`, {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': this.n8nApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...workflow,
          active: false,
          settings: {
            ...workflow.settings,
            executionOrder: 'v1'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          workflowId: data.id
        };
      } else {
        const error = await response.text();
        return {
          success: false,
          error: `Failed to deploy: ${error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Deployment error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const n8nValidator = new N8nValidator();