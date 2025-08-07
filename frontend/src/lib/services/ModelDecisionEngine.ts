/**
 * Model Decision Engine
 * Intelligently selects AI models based on task complexity and user tier
 */

export type ModelType = 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo' | 'claude-3-opus' | 'claude-3-sonnet';

export interface ModelConfig {
  model: ModelType;
  temperature: number;
  maxTokens: number;
  costPer1kTokens: number;
  speedRating: number; // 1-10, 10 being fastest
  accuracyRating: number; // 1-10, 10 being most accurate
}

export interface TaskComplexity {
  estimatedNodes: number;
  hasIntegrations: boolean;
  hasConditionals: boolean;
  hasLoops: boolean;
  hasDataTransformation: boolean;
  requiresOAuth: boolean;
  confidence: number; // 0-1
}

export class ModelDecisionEngine {
  private readonly models: Record<ModelType, ModelConfig> = {
    'gpt-4': {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 4000,
      costPer1kTokens: 0.03,
      speedRating: 3,
      accuracyRating: 10,
    },
    'gpt-4-turbo': {
      model: 'gpt-4-turbo',
      temperature: 0.6,
      maxTokens: 4000,
      costPer1kTokens: 0.01,
      speedRating: 6,
      accuracyRating: 9,
    },
    'gpt-3.5-turbo': {
      model: 'gpt-3.5-turbo',
      temperature: 0.5,
      maxTokens: 4000,
      costPer1kTokens: 0.001,
      speedRating: 9,
      accuracyRating: 7,
    },
    'claude-3-opus': {
      model: 'claude-3-opus',
      temperature: 0.7,
      maxTokens: 4000,
      costPer1kTokens: 0.015,
      speedRating: 4,
      accuracyRating: 10,
    },
    'claude-3-sonnet': {
      model: 'claude-3-sonnet',
      temperature: 0.5,
      maxTokens: 4000,
      costPer1kTokens: 0.003,
      speedRating: 8,
      accuracyRating: 8,
    },
  };

  private readonly complexityThresholds = {
    simple: { nodes: 10, features: 1 },
    moderate: { nodes: 25, features: 3 },
    complex: { nodes: 50, features: 5 },
  };

  /**
   * Analyze task complexity from user request
   */
  analyzeComplexity(userRequest: string): TaskComplexity {
    const request = userRequest.toLowerCase();
    
    // Keywords indicating complexity
    const integrationKeywords = ['api', 'webhook', 'database', 'google', 'slack', 'email'];
    const conditionalKeywords = ['if', 'when', 'condition', 'check', 'validate'];
    const loopKeywords = ['loop', 'iterate', 'foreach', 'repeat', 'batch'];
    const transformKeywords = ['transform', 'convert', 'parse', 'format', 'extract'];
    const oauthKeywords = ['oauth', 'authenticate', 'google sheets', 'gmail', 'slack'];

    const hasIntegrations = integrationKeywords.some(k => request.includes(k));
    const hasConditionals = conditionalKeywords.some(k => request.includes(k));
    const hasLoops = loopKeywords.some(k => request.includes(k));
    const hasDataTransformation = transformKeywords.some(k => request.includes(k));
    const requiresOAuth = oauthKeywords.some(k => request.includes(k));

    // Estimate node count based on complexity
    let estimatedNodes = 5; // Base nodes
    if (hasIntegrations) estimatedNodes += 10;
    if (hasConditionals) estimatedNodes += 5;
    if (hasLoops) estimatedNodes += 8;
    if (hasDataTransformation) estimatedNodes += 7;
    if (requiresOAuth) estimatedNodes += 5;

    // Calculate confidence based on keyword matches
    const featureCount = [hasIntegrations, hasConditionals, hasLoops, hasDataTransformation, requiresOAuth]
      .filter(Boolean).length;
    const confidence = Math.min(1, featureCount * 0.2 + 0.3);

    return {
      estimatedNodes,
      hasIntegrations,
      hasConditionals,
      hasLoops,
      hasDataTransformation,
      requiresOAuth,
      confidence,
    };
  }

  /**
   * Select optimal model based on complexity and user preferences
   */
  selectModel(
    complexity: TaskComplexity,
    userTier: 'free' | 'pro' | 'enterprise',
    preference: 'speed' | 'accuracy' | 'balanced' = 'balanced'
  ): ModelConfig {
    // Determine complexity level
    let complexityLevel: 'simple' | 'moderate' | 'complex';
    
    if (complexity.estimatedNodes <= this.complexityThresholds.simple.nodes) {
      complexityLevel = 'simple';
    } else if (complexity.estimatedNodes <= this.complexityThresholds.moderate.nodes) {
      complexityLevel = 'moderate';
    } else {
      complexityLevel = 'complex';
    }

    // Model selection logic
    if (userTier === 'free') {
      // Free tier: Always use cheapest model
      return this.models['gpt-3.5-turbo'];
    }

    if (userTier === 'pro') {
      // Pro tier: Balance cost and quality
      if (complexityLevel === 'simple') {
        return preference === 'speed' 
          ? this.models['gpt-3.5-turbo']
          : this.models['claude-3-sonnet'];
      } else if (complexityLevel === 'moderate') {
        return preference === 'accuracy'
          ? this.models['gpt-4-turbo']
          : this.models['claude-3-sonnet'];
      } else {
        // Complex tasks need better models
        return this.models['gpt-4-turbo'];
      }
    }

    // Enterprise tier: Optimize for quality
    if (complexityLevel === 'simple' && preference === 'speed') {
      return this.models['claude-3-sonnet'];
    } else if (complexityLevel === 'moderate') {
      return preference === 'speed'
        ? this.models['gpt-4-turbo']
        : this.models['claude-3-opus'];
    } else {
      // Complex tasks get best models
      return preference === 'accuracy'
        ? this.models['claude-3-opus']
        : this.models['gpt-4'];
    }
  }

  /**
   * Get model recommendation with reasoning
   */
  getRecommendation(
    userRequest: string,
    userTier: 'free' | 'pro' | 'enterprise',
    preference: 'speed' | 'accuracy' | 'balanced' = 'balanced'
  ) {
    const complexity = this.analyzeComplexity(userRequest);
    const selectedModel = this.selectModel(complexity, userTier, preference);

    // Calculate estimated cost
    const estimatedTokens = complexity.estimatedNodes * 200; // Rough estimate
    const estimatedCost = (estimatedTokens / 1000) * selectedModel.costPer1kTokens;

    return {
      model: selectedModel,
      complexity,
      reasoning: this.generateReasoning(complexity, selectedModel, userTier),
      estimatedCost,
      estimatedTokens,
      alternatives: this.getAlternatives(complexity, userTier, selectedModel.model),
    };
  }

  /**
   * Generate human-readable reasoning for model selection
   */
  private generateReasoning(
    complexity: TaskComplexity,
    model: ModelConfig,
    tier: string
  ): string {
    const reasons = [];

    if (tier === 'free') {
      reasons.push('Free tier uses cost-optimized models');
    }

    if (complexity.estimatedNodes > 30) {
      reasons.push('Complex workflow requires advanced model capabilities');
    }

    if (complexity.requiresOAuth) {
      reasons.push('OAuth integration needs precise configuration');
    }

    if (complexity.hasLoops) {
      reasons.push('Loop structures benefit from higher accuracy models');
    }

    if (model.speedRating >= 8) {
      reasons.push('Selected for optimal response time');
    }

    if (model.accuracyRating >= 9) {
      reasons.push('High accuracy model for complex logic');
    }

    return reasons.join('. ') + '.';
  }

  /**
   * Get alternative model options
   */
  private getAlternatives(
    complexity: TaskComplexity,
    tier: string,
    selectedModel: ModelType
  ): ModelConfig[] {
    const alternatives = Object.values(this.models)
      .filter(m => m.model !== selectedModel)
      .filter(m => {
        // Filter based on tier constraints
        if (tier === 'free') {
          return m.costPer1kTokens <= 0.002;
        } else if (tier === 'pro') {
          return m.costPer1kTokens <= 0.02;
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by balance of speed and accuracy
        const scoreA = (a.speedRating + a.accuracyRating) / 2;
        const scoreB = (b.speedRating + b.accuracyRating) / 2;
        return scoreB - scoreA;
      })
      .slice(0, 2);

    return alternatives;
  }

  /**
   * Cache model decisions for similar requests
   */
  private decisionCache = new Map<string, ModelConfig>();

  getCachedDecision(requestHash: string): ModelConfig | null {
    return this.decisionCache.get(requestHash) || null;
  }

  cacheDecision(requestHash: string, model: ModelConfig) {
    // Limit cache size
    if (this.decisionCache.size > 1000) {
      const firstKey = this.decisionCache.keys().next().value;
      this.decisionCache.delete(firstKey);
    }
    this.decisionCache.set(requestHash, model);
  }

  /**
   * Generate hash for request caching
   */
  hashRequest(request: string, tier: string, preference: string): string {
    const simplified = request.toLowerCase().slice(0, 100);
    return `${tier}-${preference}-${simplified}`;
  }
}

// Singleton instance
export const modelDecisionEngine = new ModelDecisionEngine();