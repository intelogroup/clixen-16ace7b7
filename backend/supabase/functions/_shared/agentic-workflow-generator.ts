// =====================================================
// Agentic Workflow Generator for Clixen
// Implements 4 proven n8n AI agent patterns
// =====================================================

import { WorkflowIsolationManager } from './workflow-isolation.ts';
import { workflowValidator, MVP_COMPATIBLE_NODES } from './workflow-validator.ts';

export type AgentRole = 'researcher' | 'analyzer' | 'writer' | 'validator' | 'router' | 'executor' | 'custom';
export type AgentPattern = 'single' | 'chained' | 'gatekeeper' | 'team';
export type LLMModel = 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'gemini-pro';
export type ToolType = 'http' | 'workflow' | 'code' | 'database' | 'calculator' | 'wikipedia';
export type MemoryType = 'window' | 'vector' | 'none';

export interface AgentConfig {
  role: AgentRole;
  name: string;
  systemMessage: string;
  llmModel: LLMModel;
  tools: ToolType[];
  memory: MemoryType;
  temperature?: number;
  maxTokens?: number;
}

export interface AgenticWorkflowSpec {
  intent: string;
  pattern: AgentPattern;
  agents: AgentConfig[];
  dataFlow: 'sequential' | 'parallel' | 'conditional';
  userId?: string;
  projectId?: string;
  sessionId?: string;
}

export interface AgenticNode {
  id: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters: Record<string, any>;
}

/**
 * Agentic Workflow Generator
 * Creates AI-powered workflows using n8n's LangChain nodes
 */
export class AgenticWorkflowGenerator {
  private nodeCounter = 0;
  private timestamp = Date.now().toString().slice(-6);

  /**
   * Generate complete agentic workflow based on pattern
   */
  generateAgenticWorkflow(spec: AgenticWorkflowSpec): any {
    console.log(`[AgenticGenerator] Creating ${spec.pattern} pattern workflow`);

    switch (spec.pattern) {
      case 'single':
        return this.generateSingleAgentWorkflow(spec);
      case 'chained':
        return this.generateChainedAgentsWorkflow(spec);
      case 'gatekeeper':
        return this.generateGatekeeperWorkflow(spec);
      case 'team':
        return this.generateTeamWorkflow(spec);
      default:
        throw new Error(`Unknown agent pattern: ${spec.pattern}`);
    }
  }

  /**
   * Pattern 1: Single Agent with Tools
   * One AI agent with multiple capabilities
   */
  private generateSingleAgentWorkflow(spec: AgenticWorkflowSpec): any {
    const nodes: AgenticNode[] = [];
    const connections: Record<string, any> = {};
    const agent = spec.agents[0];

    // Manual trigger
    const triggerId = this.createNodeId('trigger');
    nodes.push(this.createTriggerNode(triggerId, [250, 300]));

    // AI Agent node
    const agentId = this.createNodeId('agent');
    nodes.push(this.createAgentNode(agentId, agent, [450, 300]));

    // Memory node (if needed)
    let memoryId: string | null = null;
    if (agent.memory !== 'none') {
      memoryId = this.createNodeId('memory');
      nodes.push(this.createMemoryNode(memoryId, agent.memory, spec, [450, 500]));
    }

    // Tool nodes
    const toolNodes = this.createToolNodes(agent.tools, 650, 200);
    nodes.push(...toolNodes.nodes);

    // Output node
    const outputId = this.createNodeId('output');
    nodes.push(this.createOutputNode(outputId, [850, 300]));

    // Build connections
    connections[triggerId] = {
      main: [[{ node: agentId, type: 'main', index: 0 }]]
    };

    if (memoryId) {
      connections[memoryId] = {
        ai_memory: [[{ node: agentId, type: 'ai_memory', index: 0 }]]
      };
    }

    // Connect tools to agent
    toolNodes.nodes.forEach((tool, index) => {
      connections[tool.id] = {
        ai_tool: [[{ node: agentId, type: 'ai_tool', index: 0 }]]
      };
    });

    connections[agentId] = {
      main: [[{ node: outputId, type: 'main', index: 0 }]]
    };

    return this.wrapWorkflow(nodes, connections, spec, 'Single Agent');
  }

  /**
   * Pattern 2: Chained Agents
   * Sequential processing through multiple specialized agents
   */
  private generateChainedAgentsWorkflow(spec: AgenticWorkflowSpec): any {
    const nodes: AgenticNode[] = [];
    const connections: Record<string, any> = {};

    // Manual trigger
    const triggerId = this.createNodeId('trigger');
    nodes.push(this.createTriggerNode(triggerId, [250, 300]));

    let previousNodeId = triggerId;
    let xPosition = 450;

    // Create chain of agents
    for (let i = 0; i < spec.agents.length; i++) {
      const agent = spec.agents[i];
      const agentId = this.createNodeId(`agent_${i}`);
      
      nodes.push(this.createAgentNode(agentId, agent, [xPosition, 300]));

      // Add memory if needed
      if (agent.memory !== 'none') {
        const memoryId = this.createNodeId(`memory_${i}`);
        nodes.push(this.createMemoryNode(memoryId, agent.memory, spec, [xPosition, 500]));
        connections[memoryId] = {
          ai_memory: [[{ node: agentId, type: 'ai_memory', index: 0 }]]
        };
      }

      // Connect to previous node
      connections[previousNodeId] = {
        main: [[{ node: agentId, type: 'main', index: 0 }]]
      };

      previousNodeId = agentId;
      xPosition += 200;
    }

    // Output node
    const outputId = this.createNodeId('output');
    nodes.push(this.createOutputNode(outputId, [xPosition, 300]));
    connections[previousNodeId] = {
      main: [[{ node: outputId, type: 'main', index: 0 }]]
    };

    return this.wrapWorkflow(nodes, connections, spec, 'Chained Agents');
  }

  /**
   * Pattern 3: Multi-Agent with Gatekeeper
   * Router agent directing to specialist agents
   */
  private generateGatekeeperWorkflow(spec: AgenticWorkflowSpec): any {
    const nodes: AgenticNode[] = [];
    const connections: Record<string, any> = {};

    // Manual trigger
    const triggerId = this.createNodeId('trigger');
    nodes.push(this.createTriggerNode(triggerId, [250, 400]));

    // Gatekeeper agent (router)
    const gatekeeperId = this.createNodeId('gatekeeper');
    const gatekeeperAgent: AgentConfig = {
      role: 'router',
      name: 'Gatekeeper',
      systemMessage: `You are a gatekeeper agent. Analyze the request and route to the appropriate specialist:
${spec.agents.slice(1).map(a => `- ${a.name}: ${a.systemMessage}`).join('\n')}
Output JSON with: { "specialist": "name", "reason": "why", "context": {} }`,
      llmModel: spec.agents[0].llmModel || 'gpt-3.5-turbo',
      tools: [],
      memory: 'none'
    };
    nodes.push(this.createAgentNode(gatekeeperId, gatekeeperAgent, [450, 400]));

    // Switch node for routing
    const switchId = this.createNodeId('switch');
    nodes.push(this.createSwitchNode(switchId, spec.agents.slice(1), [650, 400]));

    // Specialist agents
    let yPosition = 200;
    const specialistIds: string[] = [];
    for (let i = 1; i < spec.agents.length; i++) {
      const agent = spec.agents[i];
      const agentId = this.createNodeId(`specialist_${i}`);
      nodes.push(this.createAgentNode(agentId, agent, [850, yPosition]));
      specialistIds.push(agentId);
      yPosition += 200;
    }

    // Merge results
    const mergerId = this.createNodeId('merge');
    nodes.push(this.createMergeNode(mergerId, [1050, 400]));

    // Output
    const outputId = this.createNodeId('output');
    nodes.push(this.createOutputNode(outputId, [1250, 400]));

    // Build connections
    connections[triggerId] = {
      main: [[{ node: gatekeeperId, type: 'main', index: 0 }]]
    };

    connections[gatekeeperId] = {
      main: [[{ node: switchId, type: 'main', index: 0 }]]
    };

    // Connect switch to specialists
    connections[switchId] = {
      main: specialistIds.map(id => [{ node: id, type: 'main', index: 0 }])
    };

    // Connect specialists to merger
    specialistIds.forEach(id => {
      connections[id] = {
        main: [[{ node: mergerId, type: 'main', index: 0 }]]
      };
    });

    connections[mergerId] = {
      main: [[{ node: outputId, type: 'main', index: 0 }]]
    };

    return this.wrapWorkflow(nodes, connections, spec, 'Gatekeeper Pattern');
  }

  /**
   * Pattern 4: Multi-Agent Team
   * Parallel processing by specialized agents
   */
  private generateTeamWorkflow(spec: AgenticWorkflowSpec): any {
    const nodes: AgenticNode[] = [];
    const connections: Record<string, any> = {};

    // Manual trigger
    const triggerId = this.createNodeId('trigger');
    nodes.push(this.createTriggerNode(triggerId, [250, 400]));

    // Split data for parallel processing
    const splitterId = this.createNodeId('splitter');
    nodes.push({
      id: splitterId,
      name: 'Task Distributor',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [450, 400],
      parameters: {
        mode: 'manual',
        fields: {
          values: spec.agents.map(agent => ({
            name: agent.name,
            value: '={{ $json }}'
          }))
        }
      }
    });

    // Team member agents (parallel)
    let yPosition = 200;
    const agentIds: string[] = [];
    for (const agent of spec.agents) {
      const agentId = this.createNodeId(`team_${agent.role}`);
      nodes.push(this.createAgentNode(agentId, agent, [650, yPosition]));
      agentIds.push(agentId);
      yPosition += 150;
    }

    // Merge results
    const mergerId = this.createNodeId('merge');
    nodes.push(this.createMergeNode(mergerId, [850, 400]));

    // Aggregator agent (optional)
    const aggregatorId = this.createNodeId('aggregator');
    const aggregatorAgent: AgentConfig = {
      role: 'analyzer',
      name: 'Result Aggregator',
      systemMessage: 'Analyze and synthesize the results from all team members into a coherent response.',
      llmModel: spec.agents[0].llmModel || 'gpt-4',
      tools: [],
      memory: 'none'
    };
    nodes.push(this.createAgentNode(aggregatorId, aggregatorAgent, [1050, 400]));

    // Output
    const outputId = this.createNodeId('output');
    nodes.push(this.createOutputNode(outputId, [1250, 400]));

    // Build connections
    connections[triggerId] = {
      main: [[{ node: splitterId, type: 'main', index: 0 }]]
    };

    // Connect splitter to all agents (parallel)
    connections[splitterId] = {
      main: agentIds.map(id => [{ node: id, type: 'main', index: 0 }])
    };

    // Connect agents to merger
    agentIds.forEach(id => {
      connections[id] = {
        main: [[{ node: mergerId, type: 'main', index: 0 }]]
      };
    });

    connections[mergerId] = {
      main: [[{ node: aggregatorId, type: 'main', index: 0 }]]
    };

    connections[aggregatorId] = {
      main: [[{ node: outputId, type: 'main', index: 0 }]]
    };

    return this.wrapWorkflow(nodes, connections, spec, 'Team Pattern');
  }

  /**
   * Helper: Create trigger node
   */
  private createTriggerNode(id: string, position: [number, number]): AgenticNode {
    return {
      id,
      name: 'Manual Trigger',
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position
    };
  }

  /**
   * Helper: Create AI Agent node
   */
  private createAgentNode(id: string, config: AgentConfig, position: [number, number]): AgenticNode {
    return {
      id,
      name: config.name,
      type: '@n8n/n8n-nodes-langchain.agent',
      typeVersion: 1.6,
      position,
      parameters: {
        promptType: 'define',
        text: '={{ $json.query || $json.input || $json }}',
        systemMessage: config.systemMessage,
        options: {
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 2000,
          modelName: this.mapLLMModel(config.llmModel),
          memoryKey: config.memory !== 'none' ? 'chat_history' : undefined
        }
      }
    };
  }

  /**
   * Helper: Create memory node
   */
  private createMemoryNode(
    id: string, 
    type: MemoryType, 
    spec: AgenticWorkflowSpec,
    position: [number, number]
  ): AgenticNode {
    const sessionKey = spec.sessionId || 
      WorkflowIsolationManager.generateSessionKey(spec.userId || 'default', 'chat');

    if (type === 'window') {
      return {
        id,
        name: 'Window Buffer Memory',
        type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
        typeVersion: 1.3,
        position,
        parameters: {
          sessionIdType: 'customKey',
          sessionKey,
          contextWindowLength: 10
        }
      };
    } else {
      return {
        id,
        name: 'Vector Store Memory',
        type: '@n8n/n8n-nodes-langchain.memoryVectorStore',
        typeVersion: 1.2,
        position,
        parameters: {
          sessionIdType: 'customKey',
          sessionKey,
          vectorStore: 'inMemory',
          embeddingModel: 'openAIEmbedding'
        }
      };
    }
  }

  /**
   * Helper: Create tool nodes
   */
  private createToolNodes(tools: ToolType[], xStart: number, yStart: number): {
    nodes: AgenticNode[]
  } {
    const nodes: AgenticNode[] = [];
    let yPosition = yStart;

    for (const tool of tools) {
      const toolId = this.createNodeId(`tool_${tool}`);
      nodes.push(this.createToolNode(toolId, tool, [xStart, yPosition]));
      yPosition += 100;
    }

    return { nodes };
  }

  /**
   * Helper: Create specific tool node
   */
  private createToolNode(id: string, type: ToolType, position: [number, number]): AgenticNode {
    const toolConfigs: Record<ToolType, AgenticNode> = {
      http: {
        id,
        name: 'HTTP Request Tool',
        type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
        typeVersion: 1.1,
        position,
        parameters: {
          method: '={{ $fromAI("method", "HTTP method to use", "GET") }}',
          url: '={{ $fromAI("url", "URL to fetch") }}',
          authentication: 'none',
          sendHeaders: true,
          specifyHeaders: 'json',
          jsonHeaders: '={{ $fromAI("headers", "Headers as JSON", {}) }}'
        }
      },
      workflow: {
        id,
        name: 'Workflow Tool',
        type: '@n8n/n8n-nodes-langchain.toolWorkflow',
        typeVersion: 1.1,
        position,
        parameters: {
          workflowId: '={{ $fromAI("workflowId", "ID of workflow to execute") }}',
          fields: '={{ $fromAI("inputData", "Input data for workflow", {}) }}'
        }
      },
      code: {
        id,
        name: 'Code Tool',
        type: '@n8n/n8n-nodes-langchain.toolCode',
        typeVersion: 1,
        position,
        parameters: {
          language: 'javaScript',
          jsCode: '={{ $fromAI("code", "JavaScript code to execute") }}'
        }
      },
      database: {
        id,
        name: 'Database Tool',
        type: '@n8n/n8n-nodes-langchain.toolSql',
        typeVersion: 1,
        position,
        parameters: {
          query: '={{ $fromAI("query", "SQL query to execute") }}',
          database: 'postgres'
        }
      },
      calculator: {
        id,
        name: 'Calculator Tool',
        type: '@n8n/n8n-nodes-langchain.toolCalculator',
        typeVersion: 1,
        position,
        parameters: {}
      },
      wikipedia: {
        id,
        name: 'Wikipedia Tool',
        type: '@n8n/n8n-nodes-langchain.toolWikipedia',
        typeVersion: 1,
        position,
        parameters: {}
      }
    };

    return toolConfigs[type];
  }

  /**
   * Helper: Create switch node for routing
   */
  private createSwitchNode(id: string, agents: AgentConfig[], position: [number, number]): AgenticNode {
    return {
      id,
      name: 'Route to Specialist',
      type: 'n8n-nodes-base.switch',
      typeVersion: 3,
      position,
      parameters: {
        mode: 'expression',
        output: 'all',
        rules: agents.map(agent => ({
          outputKey: agent.name,
          condition: `={{ $json.specialist === '${agent.name}' }}`
        }))
      }
    };
  }

  /**
   * Helper: Create merge node
   */
  private createMergeNode(id: string, position: [number, number]): AgenticNode {
    return {
      id,
      name: 'Merge Results',
      type: 'n8n-nodes-base.merge',
      typeVersion: 3,
      position,
      parameters: {
        mode: 'combine',
        options: {
          clashHandling: {
            values: 'preferInput2'
          }
        }
      }
    };
  }

  /**
   * Helper: Create output node
   */
  private createOutputNode(id: string, position: [number, number]): AgenticNode {
    return {
      id,
      name: 'Output Result',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position,
      parameters: {
        mode: 'manual',
        fields: {
          values: [
            {
              name: 'result',
              value: '={{ $json }}'
            },
            {
              name: 'timestamp',
              value: '={{ DateTime.now().toISO() }}'
            },
            {
              name: 'success',
              value: true
            }
          ]
        }
      }
    };
  }

  /**
   * Helper: Map LLM model names
   */
  private mapLLMModel(model: LLMModel): string {
    const mapping: Record<LLMModel, string> = {
      'gpt-4': 'gpt-4',
      'gpt-3.5-turbo': 'gpt-3.5-turbo',
      'claude-3': 'claude-3-opus-20240229',
      'gemini-pro': 'gemini-pro'
    };
    return mapping[model] || 'gpt-3.5-turbo';
  }

  /**
   * Helper: Create unique node ID
   */
  private createNodeId(prefix: string): string {
    return `${prefix}_${this.timestamp}_${++this.nodeCounter}`;
  }

  /**
   * Helper: Wrap workflow with metadata
   */
  private wrapWorkflow(
    nodes: AgenticNode[], 
    connections: Record<string, any>,
    spec: AgenticWorkflowSpec,
    patternName: string
  ): any {
    const workflowName = spec.userId 
      ? WorkflowIsolationManager.generateWorkflowName(spec.userId, `${patternName} Workflow`)
      : `${patternName} Workflow`;

    return {
      name: workflowName,
      nodes,
      connections,
      settings: {
        executionOrder: 'v1',
        saveExecutionProgress: true,
        saveDataSuccessExecution: 'all',
        saveDataErrorExecution: 'all'
      },
      staticData: {},
      meta: {
        templateId: `agentic-${spec.pattern}`,
        generatedBy: 'clixen-agentic-generator',
        generatedAt: new Date().toISOString(),
        pattern: spec.pattern,
        agentCount: spec.agents.length,
        intent: spec.intent
      }
    };
  }
}

// Export singleton instance
export const agenticWorkflowGenerator = new AgenticWorkflowGenerator();