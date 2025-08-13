/**
 * Template Adapter Service
 * Transforms user prompts into working n8n workflows using battle-tested templates
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

interface IntentAnalysis {
  trigger: {
    app: string;
    event: string;
    conditions?: string[];
  };
  actions: Array<{
    app: string;
    operation: string;
    target?: string;
  }>;
  data_mappings?: Array<{
    source: string;
    target: string;
  }>;
  extracted_values: Record<string, any>;
  complexity_score: number;
}

interface TemplateMatch {
  template_id: string;
  template_name: string;
  match_score: number;
  missing_features?: string[];
  confidence: 'high' | 'medium' | 'low';
}

interface AdaptedWorkflow {
  workflow: any;
  confidence_score: number;
  warnings: string[];
  requires_review: boolean;
  template_used: string;
}

export class TemplateAdapterService {
  private supabase: any;
  private openai: OpenAI;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Main entry point: Convert user prompt to working workflow
   */
  async generateWorkflow(
    userPrompt: string,
    userId: string,
    context?: any
  ): Promise<AdaptedWorkflow> {
    console.log('📝 Starting template-based workflow generation');
    
    // Step 1: Analyze user intent
    const intent = await this.analyzeIntent(userPrompt, context);
    console.log('🎯 Intent analyzed:', intent);
    
    // Step 2: Find matching templates
    const matches = await this.findMatchingTemplates(intent);
    console.log('🔍 Found', matches.length, 'potential templates');
    
    if (matches.length === 0) {
      throw new Error('No suitable template found for your request. Please try rephrasing or contact support.');
    }
    
    // Step 3: Select best template
    const bestMatch = matches[0];
    console.log('✅ Selected template:', bestMatch.template_name);
    
    // Step 4: Load full template
    const template = await this.loadTemplate(bestMatch.template_id);
    
    // Step 5: Adapt template with user values
    const adapted = await this.adaptTemplate(template, intent, userId, context);
    
    // Step 6: Validate adapted workflow
    await this.validateWorkflow(adapted);
    
    // Step 7: Track deployment
    await this.trackDeployment(bestMatch.template_id, userId, userPrompt, adapted);
    
    return adapted;
  }

  /**
   * Analyze user prompt to extract intent and requirements
   */
  private async analyzeIntent(prompt: string, context?: any): Promise<IntentAnalysis> {
    const systemPrompt = `You are an expert at analyzing workflow automation requests.
    Extract the following information from the user's prompt:
    
    1. Trigger: What starts the workflow (app, event, condition)
    2. Actions: What should happen (apps, operations)
    3. Data mappings: What data should flow between steps
    4. Specific values: Any specific names, amounts, times mentioned
    
    Return a structured JSON response with these fields:
    - trigger: { app, event, conditions }
    - actions: [{ app, operation, target }]
    - data_mappings: [{ source, target }]
    - extracted_values: { key: value }
    - complexity_score: 0.0 to 1.0`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this workflow request: "${prompt}"\n\nUser context: ${JSON.stringify(context)}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content!);
  }

  /**
   * Find templates that match the analyzed intent
   */
  private async findMatchingTemplates(intent: IntentAnalysis): Promise<TemplateMatch[]> {
    // Query templates from Supabase
    const { data: templates, error } = await this.supabase
      .from('workflow_templates')
      .select('id, name, trigger_app, action_apps, tags, use_case')
      .eq('status', 'active')
      .eq('trigger_app', intent.trigger.app);

    if (error) {
      console.error('Error fetching templates:', error);
      return [];
    }

    // Score each template
    const scored = templates.map((template: any) => {
      let score = 0;
      
      // Exact trigger match: +40 points
      if (template.trigger_app === intent.trigger.app) {
        score += 40;
      }
      
      // Action apps match: +30 points per match
      intent.actions.forEach(action => {
        if (template.action_apps.includes(action.app)) {
          score += 30;
        }
      });
      
      // Use case similarity: +20 points
      if (this.calculateSimilarity(template.use_case, intent.extracted_values.description) > 0.7) {
        score += 20;
      }
      
      // Tag matches: +5 points per tag
      const intentTags = this.extractTags(intent);
      template.tags?.forEach((tag: string) => {
        if (intentTags.includes(tag)) {
          score += 5;
        }
      });
      
      return {
        template_id: template.id,
        template_name: template.name,
        match_score: score,
        confidence: score > 70 ? 'high' : score > 50 ? 'medium' : 'low'
      };
    });

    // Sort by score and return top 5
    return scored
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 5);
  }

  /**
   * Load full template from database
   */
  private async loadTemplate(templateId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('workflow_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      throw new Error(`Failed to load template: ${error.message}`);
    }

    return data;
  }

  /**
   * Adapt template with user-specific values
   */
  private async adaptTemplate(
    template: any,
    intent: IntentAnalysis,
    userId: string,
    context?: any
  ): Promise<AdaptedWorkflow> {
    let workflow = JSON.parse(JSON.stringify(template.n8n_json));
    const warnings: string[] = [];
    
    // Apply user isolation
    workflow.name = `[USR-${userId}] ${workflow.name || template.name}`;
    
    // Process each placeholder
    for (const placeholder of template.placeholders || []) {
      const value = await this.extractPlaceholderValue(
        placeholder,
        intent,
        context
      );
      
      if (value === null && placeholder.required) {
        warnings.push(`Required value missing: ${placeholder.description}`);
      }
      
      // Replace placeholder in workflow JSON
      workflow = this.replacePlaceholder(
        workflow,
        placeholder.key,
        value || placeholder.default_value
      );
    }
    
    // Add any dynamic conditions from intent
    if (intent.trigger.conditions && intent.trigger.conditions.length > 0) {
      workflow = this.addConditions(workflow, intent.trigger.conditions);
    }
    
    return {
      workflow,
      confidence_score: warnings.length === 0 ? 0.95 : 0.75,
      warnings,
      requires_review: warnings.length > 0,
      template_used: template.name
    };
  }

  /**
   * Extract value for a specific placeholder
   */
  private async extractPlaceholderValue(
    placeholder: any,
    intent: IntentAnalysis,
    context?: any
  ): Promise<any> {
    // Try to find value in extracted values
    const extractedKey = this.findMatchingKey(
      placeholder.key,
      Object.keys(intent.extracted_values)
    );
    
    if (extractedKey) {
      return intent.extracted_values[extractedKey];
    }
    
    // Try to infer from context
    if (context) {
      if (placeholder.key.includes('EMAIL') && context.user_email) {
        return context.user_email;
      }
      if (placeholder.key.includes('USER_ID')) {
        return context.user_id;
      }
    }
    
    // Use AI to extract if needed
    if (placeholder.ai_hint) {
      return await this.aiExtractValue(placeholder, intent, context);
    }
    
    return null;
  }

  /**
   * Replace placeholder throughout workflow JSON
   */
  private replacePlaceholder(workflow: any, key: string, value: any): any {
    const jsonString = JSON.stringify(workflow);
    const replaced = jsonString.replace(
      new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      value
    );
    return JSON.parse(replaced);
  }

  /**
   * Validate the adapted workflow
   */
  private async validateWorkflow(adapted: AdaptedWorkflow): Promise<void> {
    // Basic JSON structure validation
    if (!adapted.workflow.nodes || !Array.isArray(adapted.workflow.nodes)) {
      throw new Error('Invalid workflow structure: missing nodes');
    }
    
    if (!adapted.workflow.connections) {
      throw new Error('Invalid workflow structure: missing connections');
    }
    
    // Validate each node has required fields
    for (const node of adapted.workflow.nodes) {
      if (!node.id || !node.type || !node.position) {
        throw new Error(`Invalid node structure: ${JSON.stringify(node)}`);
      }
    }
    
    // Additional validations can be added here
  }

  /**
   * Track template deployment for analytics
   */
  private async trackDeployment(
    templateId: string,
    userId: string,
    userPrompt: string,
    adapted: AdaptedWorkflow
  ): Promise<void> {
    await this.supabase.from('template_deployments').insert({
      template_id: templateId,
      user_id: userId,
      user_prompt: userPrompt,
      deployment_status: adapted.requires_review ? 'partial' : 'success',
      placeholders_filled: adapted.workflow.name,
      confidence_score: adapted.confidence_score
    });
  }

  /**
   * Helper: Calculate text similarity score
   */
  private calculateSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  /**
   * Helper: Extract tags from intent
   */
  private extractTags(intent: IntentAnalysis): string[] {
    const tags: string[] = [];
    
    tags.push(intent.trigger.app);
    intent.actions.forEach(action => tags.push(action.app));
    
    // Add common workflow tags
    if (intent.trigger.event.includes('order')) tags.push('orders');
    if (intent.trigger.event.includes('customer')) tags.push('customers');
    if (intent.actions.some(a => a.app.includes('email'))) tags.push('email');
    if (intent.actions.some(a => a.app.includes('sheet'))) tags.push('spreadsheet');
    
    return tags;
  }

  /**
   * Helper: Find matching key with fuzzy matching
   */
  private findMatchingKey(target: string, keys: string[]): string | null {
    // Clean target key
    const cleanTarget = target.replace(/[{}]/g, '').toLowerCase();
    
    // Look for exact match
    const exact = keys.find(k => k.toLowerCase() === cleanTarget);
    if (exact) return exact;
    
    // Look for partial match
    const partial = keys.find(k => 
      k.toLowerCase().includes(cleanTarget) || 
      cleanTarget.includes(k.toLowerCase())
    );
    
    return partial || null;
  }

  /**
   * Helper: Use AI to extract placeholder value
   */
  private async aiExtractValue(
    placeholder: any,
    intent: IntentAnalysis,
    context?: any
  ): Promise<any> {
    const prompt = `Extract the value for: ${placeholder.description}
    Hint: ${placeholder.ai_hint}
    From intent: ${JSON.stringify(intent)}
    Context: ${JSON.stringify(context)}
    
    Return only the value, no explanation.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 100
    });

    const value = response.choices[0].message.content?.trim();
    
    // Validate against regex if provided
    if (placeholder.validation_regex) {
      const regex = new RegExp(placeholder.validation_regex);
      if (!regex.test(value || '')) {
        return null;
      }
    }
    
    return value;
  }

  /**
   * Helper: Add conditions to workflow
   */
  private addConditions(workflow: any, conditions: string[]): any {
    // This would add IF nodes or modify existing nodes to include conditions
    // Implementation depends on specific n8n node types
    return workflow;
  }
}