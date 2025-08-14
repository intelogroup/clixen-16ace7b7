import { assertEquals, assertExists } from 'https://deno.land/std@0.196.0/testing/asserts.ts';
import { AgenticWorkflowGenerator, AgenticWorkflowSpec } from './agentic-workflow-generator.ts';

Deno.test('AgenticWorkflowGenerator - Single Agent Pattern', () => {
  const generator = new AgenticWorkflowGenerator();
  
  const spec: AgenticWorkflowSpec = {
    pattern: 'single',
    name: 'Test Single Agent',
    description: 'Test single agent workflow',
    agents: [{
      name: 'Research Agent',
      systemPrompt: 'You are a research assistant',
      model: 'gpt-4',
      temperature: 0.7,
      tools: ['web_search', 'calculator']
    }],
    tools: ['web_search', 'calculator'],
    trigger: { type: 'manual' },
    memory: { type: 'window', windowSize: 10 }
  };
  
  const workflow = generator.generateAgenticWorkflow(spec);
  
  // Validate structure
  assertExists(workflow.name);
  assertEquals(workflow.name, 'Test Single Agent');
  assertExists(workflow.nodes);
  assertExists(workflow.connections);
  
  // Check for required nodes
  const nodeTypes = workflow.nodes.map(n => n.type);
  assertEquals(nodeTypes.includes('n8n-nodes-base.manualTrigger'), true, 'Should have manual trigger');
  assertEquals(nodeTypes.includes('@n8n/n8n-nodes-langchain.agent'), true, 'Should have agent node');
  assertEquals(nodeTypes.includes('@n8n/n8n-nodes-langchain.memoryWindowBuffer'), true, 'Should have memory node');
  
  // Validate connections
  assertExists(workflow.connections);
  assertEquals(Object.keys(workflow.connections).length > 0, true, 'Should have connections');
});

Deno.test('AgenticWorkflowGenerator - Chained Agents Pattern', () => {
  const generator = new AgenticWorkflowGenerator();
  
  const spec: AgenticWorkflowSpec = {
    pattern: 'chained',
    name: 'Test Chained Agents',
    description: 'Test chained agents workflow',
    agents: [
      {
        name: 'Analyzer',
        systemPrompt: 'Analyze the input',
        model: 'gpt-3.5-turbo',
        temperature: 0.5,
        tools: []
      },
      {
        name: 'Processor',
        systemPrompt: 'Process the analysis',
        model: 'gpt-3.5-turbo',
        temperature: 0.5,
        tools: []
      }
    ],
    tools: [],
    trigger: { type: 'webhook', webhookPath: '/test' }
  };
  
  const workflow = generator.generateAgenticWorkflow(spec);
  
  // Validate webhook trigger
  const webhookNode = workflow.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
  assertExists(webhookNode);
  assertEquals(webhookNode.parameters.path, '/test');
  
  // Check for multiple agents
  const agentNodes = workflow.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.agent');
  assertEquals(agentNodes.length, 2, 'Should have 2 agent nodes for chained pattern');
  
  // Validate agent names
  assertEquals(agentNodes[0].name, 'Analyzer');
  assertEquals(agentNodes[1].name, 'Processor');
});

Deno.test('AgenticWorkflowGenerator - Gatekeeper Pattern', () => {
  const generator = new AgenticWorkflowGenerator();
  
  const spec: AgenticWorkflowSpec = {
    pattern: 'gatekeeper',
    name: 'Test Gatekeeper',
    description: 'Test gatekeeper workflow',
    agents: [
      {
        name: 'Gatekeeper',
        systemPrompt: 'Route to appropriate agent',
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        tools: []
      },
      {
        name: 'Technical Agent',
        systemPrompt: 'Handle technical queries',
        model: 'gpt-4',
        temperature: 0.5,
        tools: ['code']
      },
      {
        name: 'Business Agent',
        systemPrompt: 'Handle business queries',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        tools: []
      }
    ],
    tools: ['code'],
    trigger: { type: 'manual' }
  };
  
  const workflow = generator.generateAgenticWorkflow(spec);
  
  // Check for gatekeeper and specialist agents
  const agentNodes = workflow.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.agent');
  assertEquals(agentNodes.length, 3, 'Should have 3 agent nodes for gatekeeper pattern');
  
  // Check for switch node (routing logic)
  const switchNode = workflow.nodes.find(n => n.type === 'n8n-nodes-base.switch');
  assertExists(switchNode, 'Should have switch node for routing');
  
  // Validate connections include routing
  const gatekeeperConnections = workflow.connections[agentNodes[0].id];
  assertExists(gatekeeperConnections, 'Gatekeeper should have connections');
});

Deno.test('AgenticWorkflowGenerator - Team Pattern', () => {
  const generator = new AgenticWorkflowGenerator();
  
  const spec: AgenticWorkflowSpec = {
    pattern: 'team',
    name: 'Test Team',
    description: 'Test team workflow',
    agents: [
      {
        name: 'Coordinator',
        systemPrompt: 'Coordinate team efforts',
        model: 'gpt-4',
        temperature: 0.5,
        tools: []
      },
      {
        name: 'Researcher',
        systemPrompt: 'Research information',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        tools: ['web_search']
      },
      {
        name: 'Writer',
        systemPrompt: 'Write content',
        model: 'gpt-4',
        temperature: 0.8,
        tools: []
      }
    ],
    tools: ['web_search'],
    trigger: { type: 'manual' },
    outputFormat: 'markdown'
  };
  
  const workflow = generator.generateAgenticWorkflow(spec);
  
  // Check for all team members
  const agentNodes = workflow.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.agent');
  assertEquals(agentNodes.length, 3, 'Should have 3 agent nodes for team pattern');
  
  // Check for split/merge logic
  const splitNode = workflow.nodes.find(n => n.type === 'n8n-nodes-base.splitInBatches');
  const mergeNode = workflow.nodes.find(n => n.type === 'n8n-nodes-base.merge');
  assertExists(splitNode, 'Should have split node for parallel processing');
  assertExists(mergeNode, 'Should have merge node to combine results');
  
  // Validate output formatting
  const markdownNode = workflow.nodes.find(n => n.type === 'n8n-nodes-base.markdown');
  assertExists(markdownNode, 'Should have markdown node for output formatting');
});

Deno.test('AgenticWorkflowGenerator - Tool Integration', () => {
  const generator = new AgenticWorkflowGenerator();
  
  const spec: AgenticWorkflowSpec = {
    pattern: 'single',
    name: 'Test Tools',
    description: 'Test tool integration',
    agents: [{
      name: 'Tool Agent',
      systemPrompt: 'Use tools effectively',
      model: 'gpt-4',
      temperature: 0.5,
      tools: ['http_request', 'workflow', 'code', 'calculator']
    }],
    tools: ['http_request', 'workflow', 'code', 'calculator'],
    trigger: { type: 'manual' }
  };
  
  const workflow = generator.generateAgenticWorkflow(spec);
  
  // Check for tool nodes
  const toolNodes = workflow.nodes.filter(n => 
    n.type.includes('langchain.tool')
  );
  
  assertEquals(toolNodes.length >= 4, true, 'Should have tool nodes for each specified tool');
  
  // Validate tool configurations
  const httpTool = toolNodes.find(n => n.name.includes('HTTP'));
  assertExists(httpTool, 'Should have HTTP Request tool');
  
  const codeTool = toolNodes.find(n => n.name.includes('Code'));
  assertExists(codeTool, 'Should have Code tool');
});

Deno.test('AgenticWorkflowGenerator - Memory Configuration', () => {
  const generator = new AgenticWorkflowGenerator();
  
  // Test window buffer memory
  const windowSpec: AgenticWorkflowSpec = {
    pattern: 'single',
    name: 'Test Window Memory',
    description: 'Test window buffer memory',
    agents: [{
      name: 'Memory Agent',
      systemPrompt: 'Remember conversation',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      tools: []
    }],
    tools: [],
    trigger: { type: 'manual' },
    memory: { type: 'window', windowSize: 5 }
  };
  
  const windowWorkflow = generator.generateAgenticWorkflow(windowSpec);
  const windowMemory = windowWorkflow.nodes.find(n => 
    n.type === '@n8n/n8n-nodes-langchain.memoryWindowBuffer'
  );
  assertExists(windowMemory);
  assertEquals(windowMemory.parameters.windowSize, 5);
  
  // Test vector memory
  const vectorSpec: AgenticWorkflowSpec = {
    pattern: 'single',
    name: 'Test Vector Memory',
    description: 'Test vector store memory',
    agents: [{
      name: 'Vector Agent',
      systemPrompt: 'Use vector memory',
      model: 'gpt-4',
      temperature: 0.5,
      tools: []
    }],
    tools: [],
    trigger: { type: 'manual' },
    memory: { type: 'vector', vectorStore: 'pinecone' }
  };
  
  const vectorWorkflow = generator.generateAgenticWorkflow(vectorSpec);
  const vectorMemory = vectorWorkflow.nodes.find(n => 
    n.type === '@n8n/n8n-nodes-langchain.memoryVectorStore'
  );
  assertExists(vectorMemory);
  assertEquals(vectorMemory.parameters.vectorStore, 'pinecone');
});

Deno.test('AgenticWorkflowGenerator - Webhook Configuration', () => {
  const generator = new AgenticWorkflowGenerator();
  
  const spec: AgenticWorkflowSpec = {
    pattern: 'single',
    name: 'Test Webhook',
    description: 'Test webhook configuration',
    agents: [{
      name: 'Webhook Agent',
      systemPrompt: 'Process webhook data',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      tools: []
    }],
    tools: [],
    trigger: { 
      type: 'webhook', 
      webhookPath: '/ai-webhook',
      httpMethod: 'POST'
    }
  };
  
  const workflow = generator.generateAgenticWorkflow(spec);
  const webhookNode = workflow.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
  
  assertExists(webhookNode);
  assertEquals(webhookNode.parameters.path, '/ai-webhook');
  assertEquals(webhookNode.parameters.httpMethod, 'POST');
  
  // Check for response node
  const responseNode = workflow.nodes.find(n => 
    n.type === 'n8n-nodes-base.respondToWebhook'
  );
  assertExists(responseNode, 'Should have webhook response node');
});

Deno.test('AgenticWorkflowGenerator - Node Positioning', () => {
  const generator = new AgenticWorkflowGenerator();
  
  const spec: AgenticWorkflowSpec = {
    pattern: 'single',
    name: 'Test Positioning',
    description: 'Test node positioning',
    agents: [{
      name: 'Position Agent',
      systemPrompt: 'Test positioning',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      tools: []
    }],
    tools: [],
    trigger: { type: 'manual' }
  };
  
  const workflow = generator.generateAgenticWorkflow(spec);
  
  // Validate all nodes have positions
  for (const node of workflow.nodes) {
    assertExists(node.position, `Node ${node.name} should have position`);
    assertEquals(Array.isArray(node.position), true, 'Position should be array');
    assertEquals(node.position.length, 2, 'Position should have x,y coordinates');
    assertEquals(typeof node.position[0], 'number', 'X coordinate should be number');
    assertEquals(typeof node.position[1], 'number', 'Y coordinate should be number');
  }
});

Deno.test('AgenticWorkflowGenerator - Error Handling', () => {
  const generator = new AgenticWorkflowGenerator();
  
  // Test empty agents
  const emptySpec: AgenticWorkflowSpec = {
    pattern: 'single',
    name: 'Test Empty',
    description: 'Test empty agents',
    agents: [],
    tools: [],
    trigger: { type: 'manual' }
  };
  
  const emptyWorkflow = generator.generateAgenticWorkflow(emptySpec);
  
  // Should still generate a valid workflow with default agent
  assertExists(emptyWorkflow.nodes);
  const agentNodes = emptyWorkflow.nodes.filter(n => 
    n.type === '@n8n/n8n-nodes-langchain.agent'
  );
  assertEquals(agentNodes.length >= 1, true, 'Should create default agent when none provided');
  
  // Test invalid pattern - should default to single
  const invalidSpec: AgenticWorkflowSpec = {
    pattern: 'invalid' as any,
    name: 'Test Invalid',
    description: 'Test invalid pattern',
    agents: [{
      name: 'Test Agent',
      systemPrompt: 'Test',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      tools: []
    }],
    tools: [],
    trigger: { type: 'manual' }
  };
  
  const invalidWorkflow = generator.generateAgenticWorkflow(invalidSpec);
  assertExists(invalidWorkflow, 'Should handle invalid pattern gracefully');
});

// Run tests
if (import.meta.main) {
  console.log('Running Agentic Workflow Generator tests...');
}