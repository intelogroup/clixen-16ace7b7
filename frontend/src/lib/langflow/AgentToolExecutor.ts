/**
 * Agent Tool Executor
 * Handles execution of Clixen agents within Langflow workflows
 */

import { 
  AgentToolDefinition,
  AgentToolExecutionContext,
  AgentToolExecutionResult,
  AgentToolExecutionError,
  WorkflowExecution,
  WorkflowExecutionLog
} from './types';
import { agentToolRegistry } from './AgentToolRegistry';
import { supabase } from '../supabase';
import { ErrorLogger } from '../logger/ErrorLogger';

export class AgentToolExecutor {
  private static instance: AgentToolExecutor;
  private executionQueue: Map<string, Promise<AgentToolExecutionResult>> = new Map();
  private activeExecutions: Map<string, AbortController> = new Map();
  private logger: ErrorLogger;

  private constructor() {
    this.logger = new ErrorLogger();
  }

  public static getInstance(): AgentToolExecutor {
    if (!AgentToolExecutor.instance) {
      AgentToolExecutor.instance = new AgentToolExecutor();
    }
    return AgentToolExecutor.instance;
  }

  public async executeTool(
    toolId: string,
    context: AgentToolExecutionContext,
    onProgress?: (progress: { status: string; percentage: number; logs?: string[] }) => void
  ): Promise<AgentToolExecutionResult> {
    const startTime = Date.now();
    const { executionId } = context;
    
    try {
      // Validate tool exists
      const toolDefinition = agentToolRegistry.getTool(toolId);
      if (!toolDefinition) {
        throw new AgentToolExecutionError(
          `Tool not found: ${toolId}`,
          toolId,
          context
        );
      }

      // Check for duplicate execution
      if (this.executionQueue.has(executionId)) {
        return await this.executionQueue.get(executionId)!;
      }

      // Create abort controller for cancellation support
      const abortController = new AbortController();
      this.activeExecutions.set(executionId, abortController);

      // Start execution
      const executionPromise = this.executeToolInternal(
        toolDefinition,
        context,
        abortController,
        onProgress
      );
      
      this.executionQueue.set(executionId, executionPromise);

      const result = await executionPromise;
      
      // Clean up
      this.executionQueue.delete(executionId);
      this.activeExecutions.delete(executionId);

      // Log execution
      await this.logExecution(toolDefinition, context, result, Date.now() - startTime);

      return result;

    } catch (error) {
      // Clean up on error
      this.executionQueue.delete(executionId);
      this.activeExecutions.delete(executionId);

      const executionError = error instanceof AgentToolExecutionError
        ? error
        : new AgentToolExecutionError(
            `Tool execution failed: ${error.message}`,
            toolId,
            context,
            error as Error
          );

      // Log error
      await this.logger.logError(executionError, {
        toolId,
        executionContext: context,
        executionTime: Date.now() - startTime
      });

      throw executionError;
    }
  }

  private async executeToolInternal(
    toolDefinition: AgentToolDefinition,
    context: AgentToolExecutionContext,
    abortController: AbortController,
    onProgress?: (progress: { status: string; percentage: number; logs?: string[] }) => void
  ): Promise<AgentToolExecutionResult> {
    const logs: string[] = [];
    const warnings: string[] = [];
    
    const updateProgress = (status: string, percentage: number, newLogs: string[] = []) => {
      logs.push(...newLogs);
      if (onProgress) {
        onProgress({ status, percentage, logs: [...logs] });
      }
    };

    try {
      updateProgress('Validating inputs', 10, [`Executing ${toolDefinition.displayName}...`]);
      
      // Validate inputs
      const validationResult = await this.validateInputs(toolDefinition, context.inputs);
      if (!validationResult.valid) {
        throw new Error(`Input validation failed: ${validationResult.errors.join(', ')}`);
      }
      
      updateProgress('Initializing agent', 20, ['Inputs validated successfully']);

      // Get agent instance
      const agentInstance = agentToolRegistry.getAgentInstance(toolDefinition.category);
      if (!agentInstance) {
        throw new Error(`Agent instance not found for category: ${toolDefinition.category}`);
      }

      updateProgress('Checking prerequisites', 30, ['Agent instance initialized']);

      // Check prerequisites
      const prerequisitesValid = await agentInstance.validatePrerequisites();
      if (!prerequisitesValid) {
        warnings.push('Some prerequisites may not be fully met, but proceeding with execution');
      }

      updateProgress('Executing agent task', 50, ['Prerequisites checked']);

      // Check for cancellation
      if (abortController.signal.aborted) {
        throw new Error('Execution cancelled');
      }

      // Execute based on tool category
      const result = await this.executeByCategory(
        toolDefinition,
        context,
        agentInstance,
        abortController,
        (status, percentage) => updateProgress(status, Math.max(50, percentage), [status])
      );

      updateProgress('Processing results', 90, ['Agent execution completed']);

      // Validate outputs
      const outputValidation = await this.validateOutputs(toolDefinition, result);
      if (!outputValidation.valid) {
        warnings.push(`Output validation issues: ${outputValidation.warnings.join(', ')}`);
      }

      updateProgress('Completed successfully', 100, ['Execution completed successfully']);

      return {
        success: true,
        output: result,
        executionTime: Date.now() - Date.now(), // Will be calculated by caller
        metadata: {
          toolId: toolDefinition.id,
          toolName: toolDefinition.displayName,
          category: toolDefinition.category,
          complexity: toolDefinition.complexity
        },
        logs,
        warnings
      };

    } catch (error) {
      updateProgress('Execution failed', 100, [`Error: ${error.message}`]);
      
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - Date.now(), // Will be calculated by caller
        metadata: {
          toolId: toolDefinition.id,
          toolName: toolDefinition.displayName,
          category: toolDefinition.category,
          complexity: toolDefinition.complexity
        },
        logs,
        warnings
      };
    }
  }

  private async executeByCategory(
    toolDefinition: AgentToolDefinition,
    context: AgentToolExecutionContext,
    agentInstance: any,
    abortController: AbortController,
    onProgress: (status: string, percentage: number) => void
  ): Promise<any> {
    const { inputs } = context;

    switch (toolDefinition.category) {
      case 'database':
        return await this.executeDatabaseTool(toolDefinition, inputs, agentInstance, onProgress);
      
      case 'api':
        return await this.executeAPITool(toolDefinition, inputs, agentInstance, onProgress);
      
      case 'auth':
        return await this.executeAuthTool(toolDefinition, inputs, agentInstance, onProgress);
      
      case 'n8n':
        return await this.executeN8NTool(toolDefinition, inputs, agentInstance, onProgress);
      
      case 'ai':
        return await this.executeAITool(toolDefinition, inputs, agentInstance, onProgress);
      
      case 'testing':
        return await this.executeTestingTool(toolDefinition, inputs, agentInstance, onProgress);
      
      case 'devops':
        return await this.executeDevOpsTool(toolDefinition, inputs, agentInstance, onProgress);
      
      default:
        throw new Error(`Unknown tool category: ${toolDefinition.category}`);
    }
  }

  private async executeDatabaseTool(
    toolDefinition: AgentToolDefinition,
    inputs: Record<string, any>,
    agentInstance: any,
    onProgress: (status: string, percentage: number) => void
  ): Promise<any> {
    switch (toolDefinition.id) {
      case 'database-schema-design':
        onProgress('Analyzing requirements', 60);
        const schema = await agentInstance.designSchema(inputs.requirements, inputs.existing_schema);
        onProgress('Generating migration SQL', 80);
        const migrationSql = await agentInstance.generateMigrationSQL(schema);
        return { schema, migration_sql: migrationSql };

      case 'database-migration':
        onProgress('Executing migration', 70);
        const result = await agentInstance.executeMigration(inputs.migration_script, inputs.rollback_script);
        return { success: result.success, result: result };

      default:
        throw new Error(`Unknown database tool: ${toolDefinition.id}`);
    }
  }

  private async executeAPITool(
    toolDefinition: AgentToolDefinition,
    inputs: Record<string, any>,
    agentInstance: any,
    onProgress: (status: string, percentage: number) => void
  ): Promise<any> {
    switch (toolDefinition.id) {
      case 'api-endpoint-generator':
        onProgress('Generating endpoints', 60);
        const endpoints = await agentInstance.generateEndpoints(inputs.specification, inputs.authentication_type);
        onProgress('Creating OpenAPI spec', 80);
        const openApiSpec = await agentInstance.generateOpenAPISpec(endpoints);
        return { endpoints, openapi_spec: openApiSpec };

      case 'api-integration':
        onProgress('Making API request', 70);
        const response = await agentInstance.makeAPIRequest(
          inputs.api_url,
          inputs.method,
          inputs.headers,
          inputs.payload
        );
        return { response: response.data, status_code: response.status };

      default:
        throw new Error(`Unknown API tool: ${toolDefinition.id}`);
    }
  }

  private async executeAuthTool(
    toolDefinition: AgentToolDefinition,
    inputs: Record<string, any>,
    agentInstance: any,
    onProgress: (status: string, percentage: number) => void
  ): Promise<any> {
    switch (toolDefinition.id) {
      case 'auth-setup':
        onProgress('Configuring authentication', 60);
        const authConfig = await agentInstance.setupAuthentication(inputs.providers, inputs.security_policies);
        onProgress('Generating integration code', 80);
        const integrationCode = await agentInstance.generateIntegrationCode(authConfig);
        return { auth_config: authConfig, integration_code: integrationCode };

      default:
        throw new Error(`Unknown auth tool: ${toolDefinition.id}`);
    }
  }

  private async executeN8NTool(
    toolDefinition: AgentToolDefinition,
    inputs: Record<string, any>,
    agentInstance: any,
    onProgress: (status: string, percentage: number) => void
  ): Promise<any> {
    switch (toolDefinition.id) {
      case 'n8n-workflow-deploy':
        onProgress('Validating workflow', 60);
        const validation = await agentInstance.validateWorkflow(inputs.workflow_json);
        if (!validation.isValid) {
          throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
        }
        onProgress('Deploying workflow', 80);
        const deployment = await agentInstance.deployWorkflow(inputs.workflow_json, inputs.workflow_name, inputs.active);
        return { workflow_id: deployment.id, status: deployment.status };

      default:
        throw new Error(`Unknown n8n tool: ${toolDefinition.id}`);
    }
  }

  private async executeAITool(
    toolDefinition: AgentToolDefinition,
    inputs: Record<string, any>,
    agentInstance: any,
    onProgress: (status: string, percentage: number) => void
  ): Promise<any> {
    switch (toolDefinition.id) {
      case 'ai-model-selection':
        onProgress('Analyzing task complexity', 60);
        const analysis = await agentInstance.analyzeTaskComplexity(inputs.task_description, inputs.complexity_level);
        onProgress('Selecting optimal model', 80);
        const recommendation = await agentInstance.selectModel(analysis);
        return { 
          recommended_model: recommendation.model,
          reasoning: recommendation.reasoning
        };

      default:
        throw new Error(`Unknown AI tool: ${toolDefinition.id}`);
    }
  }

  private async executeTestingTool(
    toolDefinition: AgentToolDefinition,
    inputs: Record<string, any>,
    agentInstance: any,
    onProgress: (status: string, percentage: number) => void
  ): Promise<any> {
    switch (toolDefinition.id) {
      case 'automated-testing':
        onProgress('Generating tests', 60);
        const tests = await agentInstance.generateTests(inputs.test_targets, inputs.test_types);
        onProgress('Executing tests', 80);
        const results = await agentInstance.executeTests(tests);
        return { 
          test_results: results,
          coverage_report: results.coverage
        };

      default:
        throw new Error(`Unknown testing tool: ${toolDefinition.id}`);
    }
  }

  private async executeDevOpsTool(
    toolDefinition: AgentToolDefinition,
    inputs: Record<string, any>,
    agentInstance: any,
    onProgress: (status: string, percentage: number) => void
  ): Promise<any> {
    switch (toolDefinition.id) {
      case 'deployment-pipeline':
        onProgress('Setting up pipeline', 60);
        const pipeline = await agentInstance.setupPipeline(inputs.deployment_config, inputs.security_requirements);
        onProgress('Configuring security', 80);
        const securitySetup = await agentInstance.configureSecurity(pipeline, inputs.security_requirements);
        return { 
          pipeline_id: pipeline.id,
          status: pipeline.status
        };

      default:
        throw new Error(`Unknown DevOps tool: ${toolDefinition.id}`);
    }
  }

  private async validateInputs(
    toolDefinition: AgentToolDefinition,
    inputs: Record<string, any>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const inputDef of toolDefinition.inputs) {
      const value = inputs[inputDef.name];

      // Check required fields
      if (inputDef.required && (value === undefined || value === null || value === '')) {
        errors.push(`Required input '${inputDef.name}' is missing`);
        continue;
      }

      if (value !== undefined && value !== null) {
        // Type validation
        const typeValid = this.validateInputType(value, inputDef.type);
        if (!typeValid) {
          errors.push(`Input '${inputDef.name}' has invalid type. Expected ${inputDef.type}`);
        }

        // Custom validation
        if (inputDef.validation) {
          const validationErrors = this.validateInputConstraints(value, inputDef.validation);
          errors.push(...validationErrors.map(e => `Input '${inputDef.name}': ${e}`));
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateInputType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      case 'file':
        return value instanceof File || (typeof value === 'object' && value.type && value.data);
      default:
        return true;
    }
  }

  private validateInputConstraints(value: any, validation: any): string[] {
    const errors: string[] = [];

    if (validation.min !== undefined && value < validation.min) {
      errors.push(`Value must be at least ${validation.min}`);
    }

    if (validation.max !== undefined && value > validation.max) {
      errors.push(`Value must be at most ${validation.max}`);
    }

    if (validation.pattern && typeof value === 'string' && !new RegExp(validation.pattern).test(value)) {
      errors.push(`Value does not match required pattern`);
    }

    if (validation.options && !validation.options.includes(value)) {
      errors.push(`Value must be one of: ${validation.options.join(', ')}`);
    }

    return errors;
  }

  private async validateOutputs(
    toolDefinition: AgentToolDefinition,
    result: any
  ): Promise<{ valid: boolean; warnings: string[] }> {
    const warnings: string[] = [];

    // Basic validation that expected outputs are present
    for (const outputDef of toolDefinition.outputs) {
      if (result[outputDef.name] === undefined) {
        warnings.push(`Expected output '${outputDef.name}' is missing`);
      }
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }

  private async logExecution(
    toolDefinition: AgentToolDefinition,
    context: AgentToolExecutionContext,
    result: AgentToolExecutionResult,
    executionTime: number
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('langflow_executions').insert({
        id: context.executionId,
        user_id: user.id,
        tool_id: toolDefinition.id,
        tool_name: toolDefinition.displayName,
        tool_category: toolDefinition.category,
        inputs: context.inputs,
        outputs: result.output,
        success: result.success,
        error_message: result.error,
        execution_time_ms: executionTime,
        logs: result.logs || [],
        warnings: result.warnings || [],
        metadata: {
          ...context.metadata,
          ...result.metadata,
          complexity: toolDefinition.complexity,
          estimatedTime: toolDefinition.estimatedExecutionTime
        }
      });
    } catch (error) {
      console.error('Failed to log execution:', error);
      // Don't throw here as it's not critical to the main execution
    }
  }

  public async cancelExecution(executionId: string): Promise<boolean> {
    const abortController = this.activeExecutions.get(executionId);
    if (abortController) {
      abortController.abort();
      this.activeExecutions.delete(executionId);
      this.executionQueue.delete(executionId);
      return true;
    }
    return false;
  }

  public getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  public async getExecutionHistory(userId: string, limit = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('langflow_executions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get execution history:', error);
      return [];
    }
  }
}

// Export singleton instance
export const agentToolExecutor = AgentToolExecutor.getInstance();