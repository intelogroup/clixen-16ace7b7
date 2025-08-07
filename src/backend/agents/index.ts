/**
 * Backend Development Orchestrator Agents
 * 
 * Export all specialist agents and the main orchestrator for backend development coordination
 * Based on Clixen MVP specification - Simple GPT→n8n pipeline with comprehensive backend support
 */

// Main orchestrator
export { BackendOrchestratorAgent } from './OrchestratorAgent.js';

// Specialist agents
export { DatabaseArchitectAgent } from './DatabaseAgent.js';
export { APIServerAgent } from './APIAgent.js';
export { AuthenticationAgent } from './AuthAgent.js';
export { N8NIntegrationAgent } from './N8NAgent.js';
export { AIProcessingAgent } from './AIAgent.js';
export { TestingAgent } from './TestingAgent.js';
export { DevOpsAgent } from './DevOpsAgent.js';

// Types and interfaces
export * from './types.js';

/**
 * Initialize and start the backend orchestrator system
 */
export async function startBackendOrchestration() {
  console.log('🚀 Initializing Clixen Backend Development Orchestrator');
  console.log('📋 MVP Focus: Simple GPT→n8n pipeline with enterprise-grade backend');
  
  try {
    const orchestrator = new BackendOrchestratorAgent();
    const result = await orchestrator.orchestrateBackendDevelopment();
    
    console.log('✅ Backend orchestration completed successfully');
    console.log(`📊 Overall progress: ${result.overallProgress}%`);
    console.log(`🎯 Completed tasks: ${result.completedTasks.length}`);
    
    if (result.risksAndBlockers.length > 0) {
      console.warn('⚠️ Risks and blockers identified:');
      result.risksAndBlockers.forEach(risk => console.warn(`  - ${risk}`));
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Backend orchestration failed:', error);
    throw error;
  }
}

/**
 * Get status of all backend agents
 */
export async function getBackendAgentStatus() {
  const agents = {
    orchestrator: new BackendOrchestratorAgent(),
    database: new DatabaseArchitectAgent(),
    api: new APIServerAgent(),
    auth: new AuthenticationAgent(),
    n8n: new N8NIntegrationAgent(),
    ai: new AIProcessingAgent(),
    testing: new TestingAgent(),
    devops: new DevOpsAgent()
  };

  const status = {};
  
  for (const [name, agent] of Object.entries(agents)) {
    try {
      status[name] = agent.getStatus();
    } catch (error) {
      status[name] = {
        agentId: `${name}-agent`,
        isHealthy: false,
        error: error.message,
        lastHeartbeat: new Date()
      };
    }
  }
  
  return status;
}

/**
 * Validate all agent prerequisites
 */
export async function validateAllAgentPrerequisites() {
  console.log('🔍 Validating prerequisites for all backend agents...');
  
  const agents = [
    { name: 'Database', agent: new DatabaseArchitectAgent() },
    { name: 'API', agent: new APIServerAgent() },
    { name: 'Authentication', agent: new AuthenticationAgent() },
    { name: 'n8n Integration', agent: new N8NIntegrationAgent() },
    { name: 'AI Processing', agent: new AIProcessingAgent() },
    { name: 'Testing', agent: new TestingAgent() },
    { name: 'DevOps', agent: new DevOpsAgent() }
  ];

  const results = {};
  let allValid = true;

  for (const { name, agent } of agents) {
    try {
      const isValid = await agent.validatePrerequisites();
      results[name] = { valid: isValid, error: null };
      
      if (!isValid) {
        allValid = false;
        console.error(`❌ ${name} agent prerequisites not met`);
      } else {
        console.log(`✅ ${name} agent prerequisites validated`);
      }
      
    } catch (error) {
      results[name] = { valid: false, error: error.message };
      allValid = false;
      console.error(`❌ ${name} agent prerequisite validation failed:`, error.message);
    }
  }

  if (allValid) {
    console.log('✅ All backend agent prerequisites validated successfully');
  } else {
    console.error('❌ Some backend agent prerequisites failed validation');
  }

  return {
    allValid,
    results,
    summary: {
      total: agents.length,
      passed: Object.values(results).filter(r => r.valid).length,
      failed: Object.values(results).filter(r => !r.valid).length
    }
  };
}

// Re-export all agent classes for direct instantiation if needed
import { BackendOrchestratorAgent } from './OrchestratorAgent.js';
import { DatabaseArchitectAgent } from './DatabaseAgent.js';
import { APIServerAgent } from './APIAgent.js';
import { AuthenticationAgent } from './AuthAgent.js';
import { N8NIntegrationAgent } from './N8NAgent.js';
import { AIProcessingAgent } from './AIAgent.js';
import { TestingAgent } from './TestingAgent.js';
import { DevOpsAgent } from './DevOpsAgent.js';

export {
  BackendOrchestratorAgent,
  DatabaseArchitectAgent,
  APIServerAgent,
  AuthenticationAgent,
  N8NIntegrationAgent,
  AIProcessingAgent,
  TestingAgent,
  DevOpsAgent
};