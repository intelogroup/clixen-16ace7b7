/**
 * Strict Template Matcher Service
 * MVP Phase 1: Only allows workflows that match existing templates
 * No generation, no guessing - just reliable, tested automation
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

interface TemplateMatchResult {
  success: boolean;
  template?: {
    id: string;
    name: string;
    confidence: number;
  };
  rejection_reason?: string;
  suggestions?: string[];
  request_logged?: boolean;
}

interface UserRequest {
  prompt: string;
  userId: string;
  projectId?: string;
  timestamp: Date;
}

export class StrictTemplateMatcher {
  private supabase: any;
  private openai: OpenAI;
  private MIN_CONFIDENCE_THRESHOLD = 0.75; // 75% match required

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
   * Main entry point: Strictly match user request to existing template
   */
  async matchRequest(request: UserRequest): Promise<TemplateMatchResult> {
    console.log('🔍 Attempting strict template match for:', request.prompt);
    
    // Step 1: Analyze user intent
    const intent = await this.analyzeIntent(request.prompt);
    
    // Step 2: Find matching templates with strict criteria
    const matches = await this.findStrictMatches(intent);
    
    // Step 3: Check if we have a confident match
    if (matches.length > 0 && matches[0].confidence >= this.MIN_CONFIDENCE_THRESHOLD) {
      console.log('✅ Found confident match:', matches[0].name);
      return {
        success: true,
        template: {
          id: matches[0].id,
          name: matches[0].name,
          confidence: matches[0].confidence
        }
      };
    }
    
    // Step 4: No confident match - log request and return helpful message
    await this.logUnmatchedRequest(request, intent);
    
    // Step 5: Find similar templates to suggest
    const suggestions = await this.findSimilarTemplates(intent);
    
    return {
      success: false,
      rejection_reason: this.generateRejectionMessage(intent),
      suggestions: suggestions,
      request_logged: true
    };
  }

  /**
   * Analyze user intent with focus on exact matching
   */
  private async analyzeIntent(prompt: string): Promise<any> {
    const systemPrompt = `You are analyzing workflow requests for EXACT template matching.
    Extract ONLY the core components - be conservative and specific:
    
    1. Primary trigger app (e.g., shopify, stripe, gmail)
    2. Primary action app (e.g., google_sheets, slack, email)
    3. Core operation (e.g., new_order, payment_received, send_message)
    4. Essential requirements only
    
    DO NOT infer or add features not explicitly mentioned.
    Return a JSON with: trigger_app, action_app, operation, requirements`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1 // Very low temperature for consistent matching
    });

    return JSON.parse(response.choices[0].message.content!);
  }

  /**
   * Find templates with strict matching criteria
   */
  private async findStrictMatches(intent: any): Promise<any[]> {
    // Query only active templates
    const { data: templates, error } = await this.supabase
      .from('workflow_templates')
      .select('*')
      .eq('status', 'active')
      .eq('trigger_app', intent.trigger_app);

    if (error || !templates) {
      console.error('Error fetching templates:', error);
      return [];
    }

    // Calculate confidence scores with strict criteria
    const scored = templates.map((template: any) => {
      let confidence = 0;
      let matches = 0;
      let total = 4; // Four criteria to match
      
      // Criterion 1: Exact trigger app match (required)
      if (template.trigger_app === intent.trigger_app) {
        confidence += 0.4;
        matches++;
      } else {
        return { ...template, confidence: 0 }; // Immediate disqualification
      }
      
      // Criterion 2: Action app match (required)
      if (template.action_apps.includes(intent.action_app)) {
        confidence += 0.3;
        matches++;
      } else {
        return { ...template, confidence: 0 }; // Immediate disqualification
      }
      
      // Criterion 3: Operation type match
      if (this.operationMatches(template, intent.operation)) {
        confidence += 0.2;
        matches++;
      }
      
      // Criterion 4: Requirements compatibility
      if (this.requirementsCompatible(template, intent.requirements)) {
        confidence += 0.1;
        matches++;
      }
      
      return {
        ...template,
        confidence,
        match_ratio: matches / total
      };
    });

    // Return only high-confidence matches, sorted by confidence
    return scored
      .filter(t => t.confidence >= this.MIN_CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Log unmatched requests for future template development
   */
  private async logUnmatchedRequest(request: UserRequest, intent: any): Promise<void> {
    try {
      await this.supabase.from('unmatched_requests').insert({
        user_id: request.userId,
        project_id: request.projectId,
        prompt: request.prompt,
        analyzed_intent: intent,
        timestamp: request.timestamp,
        status: 'pending_template'
      });
      
      console.log('📝 Logged unmatched request for future template development');
    } catch (error) {
      console.error('Failed to log unmatched request:', error);
    }
  }

  /**
   * Find similar templates to suggest alternatives
   */
  private async findSimilarTemplates(intent: any): Promise<string[]> {
    // Get templates with same trigger OR action app
    const { data: similar } = await this.supabase
      .from('workflow_templates')
      .select('name, trigger_app, action_apps, use_case')
      .eq('status', 'active')
      .or(`trigger_app.eq.${intent.trigger_app},action_apps.cs.{${intent.action_app}}`)
      .limit(3);

    if (!similar || similar.length === 0) {
      return [];
    }

    return similar.map((t: any) => 
      `${t.name}: ${t.use_case}`
    );
  }

  /**
   * Generate helpful rejection message
   */
  private generateRejectionMessage(intent: any): string {
    const messages = [
      `I don't have a template for ${intent.trigger_app} to ${intent.action_app} workflows yet.`,
      `This specific workflow combination isn't available in our current template library.`,
      `We're still building templates for this type of automation.`
    ];
    
    return messages[0] + ' Our team has been notified and we\'ll work on adding this template soon!';
  }

  /**
   * Check if operation types match
   */
  private operationMatches(template: any, operation: string): boolean {
    if (!operation) return true; // No specific operation required
    
    const templateOps = [
      template.trigger_type,
      ...(template.tags || [])
    ].map(s => s.toLowerCase());
    
    return templateOps.some(op => 
      op.includes(operation.toLowerCase()) || 
      operation.toLowerCase().includes(op)
    );
  }

  /**
   * Check if template can fulfill requirements
   */
  private requirementsCompatible(template: any, requirements: any[]): boolean {
    if (!requirements || requirements.length === 0) return true;
    
    // Check if template limitations conflict with requirements
    for (const req of requirements) {
      if (template.limitations?.some((lim: string) => 
        lim.toLowerCase().includes(req.toLowerCase())
      )) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get available templates for user display
   */
  async getAvailableTemplates(): Promise<any[]> {
    const { data: templates } = await this.supabase
      .from('workflow_templates')
      .select('name, category, use_case, trigger_app, action_apps, tags')
      .eq('status', 'active')
      .order('usage_count', { ascending: false });

    return templates || [];
  }

  /**
   * Get template statistics for dashboard
   */
  async getTemplateStats(): Promise<any> {
    const { data: stats } = await this.supabase
      .from('workflow_templates')
      .select('category, count')
      .eq('status', 'active');

    const { data: unmatched } = await this.supabase
      .from('unmatched_requests')
      .select('count')
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)); // Last 7 days

    return {
      total_templates: stats?.length || 0,
      categories: [...new Set(stats?.map((s: any) => s.category))] || [],
      unmatched_last_week: unmatched?.length || 0,
      success_rate: await this.calculateSuccessRate()
    };
  }

  /**
   * Calculate overall success rate
   */
  private async calculateSuccessRate(): Promise<number> {
    const { data: deployments } = await this.supabase
      .from('template_deployments')
      .select('deployment_status')
      .gte('deployed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // Last 30 days

    if (!deployments || deployments.length === 0) return 0;

    const successful = deployments.filter(d => d.deployment_status === 'success').length;
    return Math.round((successful / deployments.length) * 100);
  }
}

/**
 * Edge Function handler for strict template matching
 */
export async function handleWorkflowRequest(req: Request): Promise<Response> {
  const matcher = new StrictTemplateMatcher();
  
  try {
    const { prompt, userId, projectId } = await req.json();
    
    const result = await matcher.matchRequest({
      prompt,
      userId,
      projectId,
      timestamp: new Date()
    });
    
    if (result.success) {
      // We have a match! Proceed with template adaptation
      return new Response(JSON.stringify({
        success: true,
        message: 'Great! I found a perfect template for your workflow.',
        template: result.template,
        next_step: 'adapt_template'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // No match - return helpful message
      return new Response(JSON.stringify({
        success: false,
        message: "I don't have a template for this workflow yet, but I've logged your request!",
        details: result.rejection_reason,
        suggestions: result.suggestions?.length > 0 ? {
          message: 'You might be interested in these similar workflows:',
          templates: result.suggestions
        } : null,
        request_logged: true
      }), {
        status: 200, // Still 200 as this is expected behavior
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error in workflow request:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'An error occurred while processing your request.',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}