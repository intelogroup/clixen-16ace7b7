// =====================================================
// Agentic Template Intelligence System
// Categorizes intents and recommends agentic patterns
// =====================================================

import { AgentPattern, AgentConfig, AgentRole, LLMModel, ToolType } from './agentic-workflow-generator.ts';

export interface CategoryConfig {
  keywords: string[];
  agentPattern: AgentPattern;
  suggestedTools: ToolType[];
  suggestedRoles: AgentRole[];
  description: string;
  examples: string[];
}

export interface IntentAnalysis {
  category: string;
  confidence: number;
  suggestedPattern: AgentPattern;
  tools: ToolType[];
  agents: AgentConfig[];
  reasoning: string;
}

export interface TemplateScore {
  templateId: string;
  score: number;
  categoryMatch: number;
  keywordMatch: number;
  patternMatch: number;
  successRate: number;
}

/**
 * Agentic Template Intelligence
 * Analyzes user intent and recommends optimal agentic patterns
 */
export class AgenticTemplateIntelligence {
  private categories: Map<string, CategoryConfig>;
  private patternSuccessRates: Map<string, number>;
  private keywordWeights: Map<string, number>;

  constructor() {
    this.initializeCategories();
    this.initializePatternSuccessRates();
    this.initializeKeywordWeights();
  }

  /**
   * Analyze user intent and recommend agentic configuration
   */
  analyzeIntent(userIntent: string): IntentAnalysis {
    console.log(`[TemplateIntelligence] Analyzing: "${userIntent}"`);

    // Extract keywords and phrases
    const keywords = this.extractKeywords(userIntent);
    
    // Score each category
    const categoryScores = this.scoreCategories(keywords);
    
    // Get top category
    const topCategory = this.selectTopCategory(categoryScores);
    
    // Generate agent configuration
    const agents = this.generateAgentConfig(topCategory, userIntent);
    
    // Build reasoning
    const reasoning = this.buildReasoning(topCategory, keywords, categoryScores);

    return {
      category: topCategory.name,
      confidence: topCategory.confidence,
      suggestedPattern: topCategory.config.agentPattern,
      tools: topCategory.config.suggestedTools,
      agents,
      reasoning
    };
  }

  /**
   * Score templates based on intent match
   */
  scoreTemplate(template: any, intent: string, category: string): TemplateScore {
    const keywords = this.extractKeywords(intent);
    
    // Category match (40% weight)
    const categoryMatch = this.calculateCategoryMatch(template, category);
    
    // Keyword match (30% weight)
    const keywordMatch = this.calculateKeywordMatch(template, keywords);
    
    // Pattern match (20% weight)
    const patternMatch = this.calculatePatternMatch(template, category);
    
    // Success rate (10% weight)
    const successRate = this.getTemplateSuccessRate(template.id);
    
    const totalScore = (categoryMatch * 0.4) + 
                      (keywordMatch * 0.3) + 
                      (patternMatch * 0.2) + 
                      (successRate * 0.1);

    return {
      templateId: template.id || template.name,
      score: totalScore,
      categoryMatch,
      keywordMatch,
      patternMatch,
      successRate
    };
  }

  /**
   * Initialize workflow categories
   */
  private initializeCategories() {
    this.categories = new Map([
      ['Data Processing', {
        keywords: ['transform', 'clean', 'aggregate', 'merge', 'filter', 'process', 'convert', 'normalize', 'validate', 'enrich'],
        agentPattern: 'single',
        suggestedTools: ['code', 'database'],
        suggestedRoles: ['analyzer'],
        description: 'Single agent for data transformation tasks',
        examples: ['Clean CSV data', 'Merge datasets', 'Transform JSON structure']
      }],
      
      ['Research & Analysis', {
        keywords: ['research', 'analyze', 'search', 'extract', 'summarize', 'investigate', 'explore', 'discover', 'gather', 'collect'],
        agentPattern: 'team',
        suggestedTools: ['http', 'wikipedia', 'code'],
        suggestedRoles: ['researcher', 'analyzer', 'writer'],
        description: 'Team of agents for comprehensive research',
        examples: ['Research market trends', 'Analyze competitor data', 'Gather industry insights']
      }],
      
      ['Content Generation', {
        keywords: ['write', 'create', 'generate', 'compose', 'draft', 'produce', 'design', 'build', 'develop', 'author'],
        agentPattern: 'chained',
        suggestedTools: ['http', 'code'],
        suggestedRoles: ['researcher', 'writer', 'validator'],
        description: 'Sequential agents for content creation pipeline',
        examples: ['Write blog post', 'Generate report', 'Create documentation']
      }],
      
      ['Customer Support', {
        keywords: ['support', 'help', 'assist', 'respond', 'ticket', 'customer', 'service', 'resolve', 'answer', 'inquiry'],
        agentPattern: 'gatekeeper',
        suggestedTools: ['http', 'database', 'workflow'],
        suggestedRoles: ['router', 'executor'],
        description: 'Gatekeeper routing to specialist agents',
        examples: ['Handle support tickets', 'Answer customer questions', 'Route inquiries']
      }],
      
      ['Monitoring & Alerts', {
        keywords: ['monitor', 'alert', 'watch', 'notify', 'track', 'observe', 'detect', 'scan', 'check', 'supervise'],
        agentPattern: 'single',
        suggestedTools: ['http', 'database'],
        suggestedRoles: ['analyzer'],
        description: 'Single agent for monitoring tasks',
        examples: ['Monitor API status', 'Track metrics', 'Send alerts']
      }],
      
      ['Integration & Sync', {
        keywords: ['sync', 'integrate', 'connect', 'bridge', 'update', 'synchronize', 'link', 'transfer', 'migrate', 'replicate'],
        agentPattern: 'chained',
        suggestedTools: ['http', 'database', 'code'],
        suggestedRoles: ['executor', 'validator'],
        description: 'Chained agents for data synchronization',
        examples: ['Sync CRM data', 'Integrate APIs', 'Update databases']
      }],
      
      ['Workflow Orchestration', {
        keywords: ['orchestrate', 'coordinate', 'manage', 'route', 'distribute', 'organize', 'schedule', 'automate', 'pipeline', 'flow'],
        agentPattern: 'gatekeeper',
        suggestedTools: ['workflow', 'code'],
        suggestedRoles: ['router', 'executor'],
        description: 'Gatekeeper for complex workflow management',
        examples: ['Orchestrate pipelines', 'Route tasks', 'Manage workflows']
      }],
      
      ['Development & DevOps', {
        keywords: ['deploy', 'build', 'test', 'ci', 'cd', 'git', 'code', 'release', 'compile', 'package'],
        agentPattern: 'team',
        suggestedTools: ['http', 'code', 'workflow'],
        suggestedRoles: ['analyzer', 'executor', 'validator'],
        description: 'Team of agents for development tasks',
        examples: ['Deploy application', 'Run tests', 'Build pipeline']
      }],
      
      ['Decision Making', {
        keywords: ['decide', 'choose', 'select', 'evaluate', 'compare', 'assess', 'judge', 'determine', 'classify', 'categorize'],
        agentPattern: 'gatekeeper',
        suggestedTools: ['code', 'calculator'],
        suggestedRoles: ['router', 'analyzer'],
        description: 'Gatekeeper for decision routing',
        examples: ['Evaluate options', 'Classify requests', 'Route decisions']
      }],
      
      ['Email & Communication', {
        keywords: ['email', 'send', 'message', 'notify', 'communicate', 'reply', 'forward', 'announce', 'broadcast', 'newsletter'],
        agentPattern: 'single',
        suggestedTools: ['http'],
        suggestedRoles: ['writer'],
        description: 'Single agent for communication tasks',
        examples: ['Send emails', 'Create newsletters', 'Notify users']
      }]
    ]);
  }

  /**
   * Initialize pattern success rates
   */
  private initializePatternSuccessRates() {
    this.patternSuccessRates = new Map([
      ['single_simple', 0.95],
      ['single_complex', 0.85],
      ['chained_2agents', 0.90],
      ['chained_3+agents', 0.80],
      ['gatekeeper_simple', 0.88],
      ['gatekeeper_complex', 0.75],
      ['team_2agents', 0.85],
      ['team_3+agents', 0.70]
    ]);
  }

  /**
   * Initialize keyword importance weights
   */
  private initializeKeywordWeights() {
    this.keywordWeights = new Map([
      // High importance keywords
      ['ai', 3.0],
      ['agent', 3.0],
      ['automate', 2.5],
      ['intelligent', 2.5],
      
      // Action keywords
      ['analyze', 2.0],
      ['generate', 2.0],
      ['process', 2.0],
      ['create', 2.0],
      
      // Integration keywords
      ['api', 1.5],
      ['webhook', 1.5],
      ['database', 1.5],
      ['integrate', 1.5],
      
      // Default weight
      ['default', 1.0]
    ]);
  }

  /**
   * Extract keywords from user intent
   */
  private extractKeywords(intent: string): string[] {
    // Normalize and split
    const normalized = intent.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Extract words
    const words = normalized.split(' ');
    
    // Filter stop words
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been']);
    
    return words.filter(word => !stopWords.has(word) && word.length > 2);
  }

  /**
   * Score categories based on keywords
   */
  private scoreCategories(keywords: string[]): Map<string, number> {
    const scores = new Map<string, number>();
    
    for (const [categoryName, config] of this.categories) {
      let score = 0;
      
      for (const keyword of keywords) {
        for (const categoryKeyword of config.keywords) {
          if (keyword.includes(categoryKeyword) || categoryKeyword.includes(keyword)) {
            const weight = this.keywordWeights.get(keyword) || 1.0;
            score += weight;
          }
        }
      }
      
      scores.set(categoryName, score);
    }
    
    return scores;
  }

  /**
   * Select top scoring category
   */
  private selectTopCategory(scores: Map<string, number>): {
    name: string;
    config: CategoryConfig;
    confidence: number;
  } {
    let topCategory = '';
    let topScore = 0;
    
    for (const [category, score] of scores) {
      if (score > topScore) {
        topScore = score;
        topCategory = category;
      }
    }
    
    // Default to Data Processing if no clear match
    if (!topCategory || topScore < 1) {
      topCategory = 'Data Processing';
      topScore = 0.5;
    }
    
    const config = this.categories.get(topCategory)!;
    const confidence = Math.min(1.0, topScore / 10); // Normalize confidence
    
    return { name: topCategory, config, confidence };
  }

  /**
   * Generate agent configuration based on category
   */
  private generateAgentConfig(
    category: { name: string; config: CategoryConfig },
    intent: string
  ): AgentConfig[] {
    const agents: AgentConfig[] = [];
    const pattern = category.config.agentPattern;
    
    switch (pattern) {
      case 'single':
        agents.push({
          role: category.config.suggestedRoles[0] || 'executor',
          name: `${category.name} Agent`,
          systemMessage: `You are an AI agent specialized in ${category.name.toLowerCase()}. Task: ${intent}`,
          llmModel: 'gpt-4',
          tools: category.config.suggestedTools,
          memory: 'window',
          temperature: 0.7
        });
        break;
        
      case 'chained':
        // Research -> Process -> Validate
        agents.push(
          {
            role: 'researcher',
            name: 'Research Agent',
            systemMessage: `Research and gather information for: ${intent}`,
            llmModel: 'gpt-3.5-turbo',
            tools: ['http', 'wikipedia'],
            memory: 'none'
          },
          {
            role: category.config.suggestedRoles[0] || 'executor',
            name: 'Processing Agent',
            systemMessage: `Process the researched data for: ${intent}`,
            llmModel: 'gpt-4',
            tools: category.config.suggestedTools,
            memory: 'window'
          },
          {
            role: 'validator',
            name: 'Validation Agent',
            systemMessage: 'Validate and refine the processed output for quality and accuracy.',
            llmModel: 'gpt-3.5-turbo',
            tools: ['code'],
            memory: 'none'
          }
        );
        break;
        
      case 'gatekeeper':
        // Router + Specialists
        agents.push(
          {
            role: 'router',
            name: 'Gatekeeper',
            systemMessage: 'Analyze requests and route to appropriate specialist.',
            llmModel: 'gpt-3.5-turbo',
            tools: [],
            memory: 'none'
          },
          {
            role: 'executor',
            name: 'Technical Specialist',
            systemMessage: `Handle technical aspects of: ${intent}`,
            llmModel: 'gpt-4',
            tools: ['code', 'database'],
            memory: 'window'
          },
          {
            role: 'writer',
            name: 'Content Specialist',
            systemMessage: `Handle content and communication for: ${intent}`,
            llmModel: 'gpt-3.5-turbo',
            tools: ['http'],
            memory: 'window'
          }
        );
        break;
        
      case 'team':
        // Parallel specialists
        const teamRoles = category.config.suggestedRoles.slice(0, 3);
        for (const role of teamRoles) {
          agents.push({
            role,
            name: `${role.charAt(0).toUpperCase() + role.slice(1)} Agent`,
            systemMessage: `You are a ${role} working on: ${intent}`,
            llmModel: role === 'analyzer' ? 'gpt-4' : 'gpt-3.5-turbo',
            tools: this.getToolsForRole(role),
            memory: 'none'
          });
        }
        break;
    }
    
    return agents;
  }

  /**
   * Get appropriate tools for agent role
   */
  private getToolsForRole(role: AgentRole): ToolType[] {
    const roleTools: Record<AgentRole, ToolType[]> = {
      researcher: ['http', 'wikipedia'],
      analyzer: ['code', 'calculator', 'database'],
      writer: ['http', 'code'],
      validator: ['code', 'calculator'],
      router: [],
      executor: ['http', 'code', 'database', 'workflow'],
      custom: ['http', 'code']
    };
    
    return roleTools[role] || ['http', 'code'];
  }

  /**
   * Build reasoning explanation
   */
  private buildReasoning(
    category: { name: string; config: CategoryConfig; confidence: number },
    keywords: string[],
    scores: Map<string, number>
  ): string {
    const topScores = Array.from(scores.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    return `Detected category: ${category.name} (${Math.round(category.confidence * 100)}% confidence).
Keywords found: ${keywords.slice(0, 5).join(', ')}.
Pattern recommendation: ${category.config.agentPattern} pattern.
Reasoning: This intent matches the ${category.name} category based on keyword analysis.
The ${category.config.agentPattern} pattern is optimal for ${category.config.description}.
Alternative categories considered: ${topScores.slice(1).map(([name]) => name).join(', ')}.`;
  }

  /**
   * Calculate category match score
   */
  private calculateCategoryMatch(template: any, category: string): number {
    const templateCategory = template.meta?.category || 
                           template.category || 
                           this.inferCategoryFromTemplate(template);
    
    return templateCategory === category ? 1.0 : 0.3;
  }

  /**
   * Calculate keyword match score
   */
  private calculateKeywordMatch(template: any, keywords: string[]): number {
    const templateText = JSON.stringify(template).toLowerCase();
    let matches = 0;
    
    for (const keyword of keywords) {
      if (templateText.includes(keyword)) {
        const weight = this.keywordWeights.get(keyword) || 1.0;
        matches += weight;
      }
    }
    
    return Math.min(1.0, matches / (keywords.length * 2));
  }

  /**
   * Calculate pattern match score
   */
  private calculatePatternMatch(template: any, category: string): number {
    const categoryConfig = this.categories.get(category);
    if (!categoryConfig) return 0.5;
    
    const templatePattern = this.inferPatternFromTemplate(template);
    return templatePattern === categoryConfig.agentPattern ? 1.0 : 0.3;
  }

  /**
   * Get template success rate
   */
  private getTemplateSuccessRate(templateId: string): number {
    // TODO: Fetch from database
    // For now, return based on pattern complexity
    if (templateId.includes('simple')) return 0.95;
    if (templateId.includes('moderate')) return 0.85;
    if (templateId.includes('complex')) return 0.70;
    return 0.80;
  }

  /**
   * Infer category from template structure
   */
  private inferCategoryFromTemplate(template: any): string {
    const nodes = template.nodes || [];
    const nodeTypes = nodes.map((n: any) => n.type);
    
    if (nodeTypes.some((t: string) => t.includes('agent'))) {
      if (nodeTypes.filter((t: string) => t.includes('agent')).length > 2) {
        return 'Research & Analysis';
      }
      return 'Data Processing';
    }
    
    if (nodeTypes.some((t: string) => t.includes('email'))) {
      return 'Email & Communication';
    }
    
    if (nodeTypes.some((t: string) => t.includes('database'))) {
      return 'Integration & Sync';
    }
    
    return 'Data Processing';
  }

  /**
   * Infer pattern from template structure
   */
  private inferPatternFromTemplate(template: any): AgentPattern {
    const nodes = template.nodes || [];
    const agentNodes = nodes.filter((n: any) => n.type?.includes('agent'));
    const connections = template.connections || {};
    
    if (agentNodes.length === 1) {
      return 'single';
    }
    
    if (agentNodes.length === 2) {
      // Check if sequential or parallel
      const hasSequentialConnection = this.hasSequentialConnections(connections);
      return hasSequentialConnection ? 'chained' : 'team';
    }
    
    if (agentNodes.length > 2) {
      // Check for switch/router node
      const hasRouter = nodes.some((n: any) => 
        n.type?.includes('switch') || n.type?.includes('router')
      );
      return hasRouter ? 'gatekeeper' : 'team';
    }
    
    return 'single';
  }

  /**
   * Check if connections are sequential
   */
  private hasSequentialConnections(connections: any): boolean {
    // Simple heuristic: if each node connects to only one other, likely sequential
    let sequentialCount = 0;
    
    for (const nodeConnections of Object.values(connections)) {
      const conn = nodeConnections as any;
      if (conn.main && conn.main.length === 1) {
        sequentialCount++;
      }
    }
    
    return sequentialCount > Object.keys(connections).length / 2;
  }
}

// Export singleton instance
export const agenticTemplateIntelligence = new AgenticTemplateIntelligence();