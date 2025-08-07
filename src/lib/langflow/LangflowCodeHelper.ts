/**
 * Langflow Code Helper Integration
 * Empowers our 7-agent system with AI-assisted code generation and optimization
 */

import { OpenAI } from 'openai';

export interface LangflowWorkflow {
  id: string;
  name: string;
  description: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  category: 'code-generation' | 'optimization' | 'testing' | 'documentation';
}

export interface CodeGenerationRequest {
  agentType: string;
  requirements: string;
  context?: Record<string, any>;
  codeStyle?: 'typescript' | 'javascript' | 'sql' | 'python';
  complexity?: 'simple' | 'medium' | 'complex';
}

export interface CodeGenerationResult {
  code: string;
  explanation: string;
  suggestions: string[];
  testCases?: string;
  documentation?: string;
}

/**
 * Langflow-powered code helper that enhances our existing agents
 */
export class LangflowCodeHelper {
  private openai: OpenAI;
  private workflows: Map<string, LangflowWorkflow>;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.VITE_OPENAI_API_KEY
    });
    this.workflows = new Map();
    this.initializeWorkflows();
  }

  /**
   * Initialize predefined Langflow workflows for each agent type
   */
  private initializeWorkflows(): void {
    // Database Agent Code Helper
    this.workflows.set('database-schema-generator', {
      id: 'db-schema-gen',
      name: 'Database Schema Generator',
      description: 'Generates optimized database schemas with RLS policies',
      inputs: { requirements: 'string', tables: 'array', relationships: 'object' },
      outputs: { schema: 'string', migrations: 'array', policies: 'array' },
      category: 'code-generation'
    });

    // API Agent Code Helper
    this.workflows.set('api-endpoint-generator', {
      id: 'api-gen',
      name: 'API Endpoint Generator',
      description: 'Creates REST API endpoints with validation and auth',
      inputs: { schema: 'object', endpoints: 'array', security: 'object' },
      outputs: { code: 'string', tests: 'string', docs: 'string' },
      category: 'code-generation'
    });

    // Security Agent Code Helper
    this.workflows.set('security-pattern-generator', {
      id: 'security-gen',
      name: 'Security Pattern Generator',
      description: 'Generates security patterns and validation code',
      inputs: { threats: 'array', compliance: 'string', auth: 'object' },
      outputs: { patterns: 'array', middleware: 'string', tests: 'string' },
      category: 'code-generation'
    });

    // Testing Agent Code Helper
    this.workflows.set('test-case-generator', {
      id: 'test-gen',
      name: 'Test Case Generator',
      description: 'Generates comprehensive test suites',
      inputs: { code: 'string', coverage: 'string', framework: 'string' },
      outputs: { tests: 'string', mocks: 'string', fixtures: 'string' },
      category: 'testing'
    });

    // n8n Agent Code Helper
    this.workflows.set('workflow-optimizer', {
      id: 'n8n-optimizer',
      name: 'n8n Workflow Optimizer',
      description: 'Optimizes n8n workflows for performance and reliability',
      inputs: { workflow: 'object', requirements: 'string', performance: 'object' },
      outputs: { optimized: 'object', suggestions: 'array', metrics: 'object' },
      category: 'optimization'
    });

    // AI Agent Code Helper
    this.workflows.set('prompt-optimizer', {
      id: 'prompt-opt',
      name: 'AI Prompt Optimizer',
      description: 'Optimizes AI prompts for better results',
      inputs: { prompt: 'string', context: 'object', model: 'string' },
      outputs: { optimized: 'string', variations: 'array', metrics: 'object' },
      category: 'optimization'
    });

    // DevOps Agent Code Helper
    this.workflows.set('deployment-generator', {
      id: 'deploy-gen',
      name: 'Deployment Configuration Generator',
      description: 'Generates deployment configs and CI/CD pipelines',
      inputs: { stack: 'string', environment: 'string', requirements: 'object' },
      outputs: { configs: 'object', scripts: 'array', monitoring: 'object' },
      category: 'code-generation'
    });
  }

  /**
   * Generate code using Langflow AI assistance
   */
  public async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult> {
    const workflow = this.getWorkflowForAgent(request.agentType);
    
    const prompt = this.buildCodeGenerationPrompt(request, workflow);
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a Langflow-powered code assistant helping the ${request.agentType} agent generate high-quality ${request.codeStyle} code. Focus on best practices, security, and maintainability.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      const response = completion.choices[0]?.message?.content || '';
      return this.parseCodeGenerationResponse(response);

    } catch (error) {
      console.error('Langflow code generation error:', error);
      return {
        code: `// Error generating code: ${error}`,
        explanation: 'Code generation failed due to an error',
        suggestions: ['Check API configuration', 'Verify request parameters']
      };
    }
  }

  /**
   * Optimize existing code using Langflow
   */
  public async optimizeCode(
    code: string, 
    agentType: string, 
    optimization: 'performance' | 'security' | 'maintainability' | 'all' = 'all'
  ): Promise<CodeGenerationResult> {
    const prompt = `
Optimize the following ${agentType} code focusing on ${optimization}:

\`\`\`
${code}
\`\`\`

Requirements:
- Maintain existing functionality
- Follow TypeScript/JavaScript best practices
- Add proper error handling
- Include performance optimizations
- Ensure security compliance
- Add comprehensive comments
- Suggest testing improvements

Return optimized code with explanations.
`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a senior software engineer specializing in ${agentType} development. Optimize code for production use with focus on ${optimization}.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 4000
      });

      const response = completion.choices[0]?.message?.content || '';
      return this.parseCodeGenerationResponse(response);

    } catch (error) {
      console.error('Langflow code optimization error:', error);
      return {
        code: code, // Return original code on error
        explanation: 'Code optimization failed, returning original code',
        suggestions: ['Check API configuration', 'Try manual optimization']
      };
    }
  }

  /**
   * Generate comprehensive test cases for code
   */
  public async generateTests(
    code: string,
    testFramework: 'jest' | 'playwright' | 'vitest' = 'jest',
    coverage: 'unit' | 'integration' | 'e2e' | 'all' = 'all'
  ): Promise<string> {
    const prompt = `
Generate comprehensive ${coverage} tests for the following code using ${testFramework}:

\`\`\`
${code}
\`\`\`

Requirements:
- Cover all functions and edge cases
- Include error scenarios
- Mock external dependencies
- Add performance tests if applicable
- Follow ${testFramework} best practices
- Achieve >90% code coverage
- Include setup and teardown
- Add descriptive test names and comments

Return complete test suite with imports and configuration.
`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a test automation expert specializing in ${testFramework} and ${coverage} testing strategies.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      return completion.choices[0]?.message?.content || '// Test generation failed';

    } catch (error) {
      console.error('Langflow test generation error:', error);
      return `// Test generation failed: ${error}`;
    }
  }

  /**
   * Generate documentation for code
   */
  public async generateDocumentation(
    code: string,
    format: 'markdown' | 'jsdoc' | 'api' = 'markdown'
  ): Promise<string> {
    const prompt = `
Generate comprehensive ${format} documentation for the following code:

\`\`\`
${code}
\`\`\`

Requirements:
- Clear function descriptions
- Parameter and return type documentation
- Usage examples
- Error handling documentation
- Performance considerations
- Security notes if applicable
- Integration instructions
- Troubleshooting guide

Format as ${format} with proper structure and examples.
`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a technical writer specializing in software documentation and ${format} formatting.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 4000
      });

      return completion.choices[0]?.message?.content || '# Documentation generation failed';

    } catch (error) {
      console.error('Langflow documentation generation error:', error);
      return `# Documentation generation failed: ${error}`;
    }
  }

  /**
   * Debug and fix code issues
   */
  public async debugCode(
    code: string,
    error: string,
    context?: string
  ): Promise<CodeGenerationResult> {
    const prompt = `
Debug and fix the following code issue:

**Error:**
${error}

**Code:**
\`\`\`
${code}
\`\`\`

**Context:**
${context || 'No additional context provided'}

Requirements:
- Identify root cause of the error
- Provide fixed code
- Explain the solution
- Add preventive measures
- Include error handling improvements
- Suggest testing for the fix
- Add logging for debugging

Return fixed code with detailed explanation.
`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a debugging expert specializing in production code fixes and error resolution.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 4000
      });

      const response = completion.choices[0]?.message?.content || '';
      return this.parseCodeGenerationResponse(response);

    } catch (error) {
      console.error('Langflow debug error:', error);
      return {
        code: code, // Return original code on error
        explanation: 'Debug assistance failed',
        suggestions: ['Manual debugging required', 'Check error logs', 'Review recent changes']
      };
    }
  }

  /**
   * Get available workflows
   */
  public getAvailableWorkflows(): LangflowWorkflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflow by agent type
   */
  private getWorkflowForAgent(agentType: string): LangflowWorkflow | null {
    const workflowMap = {
      'database': 'database-schema-generator',
      'api': 'api-endpoint-generator',
      'auth': 'security-pattern-generator',
      'testing': 'test-case-generator',
      'n8n': 'workflow-optimizer',
      'ai': 'prompt-optimizer',
      'devops': 'deployment-generator'
    };

    const workflowId = workflowMap[agentType.toLowerCase() as keyof typeof workflowMap];
    return workflowId ? this.workflows.get(workflowId) || null : null;
  }

  /**
   * Build prompt for code generation
   */
  private buildCodeGenerationPrompt(
    request: CodeGenerationRequest,
    workflow: LangflowWorkflow | null
  ): string {
    return `
Generate ${request.codeStyle} code for a ${request.agentType} agent with the following requirements:

**Requirements:**
${request.requirements}

**Context:**
${JSON.stringify(request.context || {}, null, 2)}

**Complexity Level:** ${request.complexity || 'medium'}

**Workflow Template:** ${workflow?.name || 'Generic'}

**Expected Output:**
- Clean, production-ready code
- Proper TypeScript types and interfaces
- Comprehensive error handling
- Security best practices
- Performance optimization
- Detailed comments and documentation
- Test suggestions
- Integration examples

Please format the response as:

## Generated Code
\`\`\`${request.codeStyle}
[code here]
\`\`\`

## Explanation
[explanation here]

## Suggestions
- [suggestion 1]
- [suggestion 2]

## Test Cases
\`\`\`${request.codeStyle}
[test code here]
\`\`\`

## Documentation
[documentation here]
`;
  }

  /**
   * Parse AI response into structured result
   */
  private parseCodeGenerationResponse(response: string): CodeGenerationResult {
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
    const code = codeMatch ? codeMatch[1] : response;

    // Extract explanation section
    const explanationMatch = response.match(/## Explanation\n([\s\S]*?)(?=\n##|$)/);
    const explanation = explanationMatch ? explanationMatch[1].trim() : 'Code generated successfully';

    // Extract suggestions
    const suggestionsMatch = response.match(/## Suggestions\n([\s\S]*?)(?=\n##|$)/);
    const suggestionsText = suggestionsMatch ? suggestionsMatch[1] : '';
    const suggestions = suggestionsText
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean);

    // Extract test cases
    const testMatch = response.match(/## Test Cases\n```[\w]*\n([\s\S]*?)\n```/);
    const testCases = testMatch ? testMatch[1] : undefined;

    // Extract documentation
    const docMatch = response.match(/## Documentation\n([\s\S]*?)(?=\n##|$)/);
    const documentation = docMatch ? docMatch[1].trim() : undefined;

    return {
      code: code.trim(),
      explanation,
      suggestions,
      testCases,
      documentation
    };
  }
}

// Singleton instance for global use
export const langflowCodeHelper = new LangflowCodeHelper();