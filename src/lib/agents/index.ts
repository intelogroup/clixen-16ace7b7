// Export all agent system components
export { BaseAgent } from './BaseAgent';
export { OrchestratorAgent } from './OrchestratorAgent';
export { WorkflowDesignerAgent } from './WorkflowDesignerAgent';
export { DeploymentAgent } from './DeploymentAgent';
export { AgentCoordinator } from './AgentCoordinator';

export * from './types';

// Create and export singleton coordinator instance
export const agentCoordinator = new AgentCoordinator();