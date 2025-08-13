# 🏗️ Clixen Battle-Tested Template Architecture

## 🎯 Strategic Vision

Transform Clixen from an **unbounded AI generator** into an **intelligent template adapter** that delivers:
- **99% workflow success rate** (vs. 60% with pure generation)
- **<2 second response time** (vs. 10+ seconds)
- **Zero syntax errors** (vs. frequent JSON malformation)
- **Enterprise-grade security** (vs. unpredictable outputs)

## 📊 Template Schema Design

### Core Template Structure
```typescript
interface WorkflowTemplate {
  // Identification
  id: string;                      // UUID
  name: string;                     // Human-readable name
  slug: string;                     // URL-friendly identifier
  version: string;                  // Semantic versioning
  
  // Classification & Discovery
  category: TemplateCategory;       // e-commerce, marketing, productivity, etc.
  tags: string[];                   // ["shopify", "google-sheets", "automation"]
  persona: UserPersona;             // alex, jordan, sam
  use_case: string;                 // Brief description
  
  // Technical Metadata
  trigger_app: string;              // shopify, webhook, schedule
  trigger_type: string;             // new_order, api_call, cron
  action_apps: string[];            // [google_sheets, slack, email]
  complexity: 'simple' | 'moderate' | 'advanced';
  
  // Template Content
  n8n_json: object;                 // The actual workflow JSON
  placeholders: PlaceholderConfig[];// Dynamic fields to be replaced
  
  // Validation & Testing
  test_data: object;                // Sample data for testing
  validation_rules: ValidationRule[];// Rules for parameter validation
  success_metrics: SuccessMetric[]; // Expected outcomes
  
  // Usage & Analytics
  usage_count: number;              // Times deployed
  success_rate: number;             // Percentage of successful deployments
  avg_execution_time: number;       // Average runtime in ms
  
  // Documentation
  description: string;              // Detailed explanation
  requirements: string[];           // Prerequisites (API keys, etc.)
  limitations: string[];            // Known constraints
  example_prompt: string;           // Sample user request
  
  // Lifecycle
  status: 'draft' | 'testing' | 'active' | 'deprecated';
  created_at: timestamp;
  updated_at: timestamp;
  created_by: string;
  last_tested: timestamp;
}
```

### Placeholder Configuration
```typescript
interface PlaceholderConfig {
  key: string;                      // {{FILTER_CONDITION}}
  type: 'string' | 'number' | 'boolean' | 'expression' | 'credential';
  required: boolean;
  default_value?: any;
  description: string;
  validation_regex?: string;
  ai_hint: string;                  // Helps AI understand what to inject
  user_prompt?: string;             // Question to ask user if unclear
}
```

## 🔄 AI Workflow Process

### Phase 1: Intent Analysis
```typescript
async function analyzeIntent(userPrompt: string): IntentAnalysis {
  // Extract key entities using GPT-4
  return {
    trigger: {
      app: 'shopify',
      event: 'new_order',
      conditions: ['total > 100']
    },
    actions: [{
      app: 'google_sheets',
      operation: 'add_row',
      target: 'Sales Tracker'
    }],
    data_mappings: [
      { source: 'order.id', target: 'column_a' },
      { source: 'order.total', target: 'column_b' }
    ],
    complexity_score: 0.3
  };
}
```

### Phase 2: Template Matching
```typescript
async function matchTemplate(intent: IntentAnalysis): TemplateMatch[] {
  // Query Supabase for best matches
  const candidates = await supabase
    .from('workflow_templates')
    .select('*')
    .eq('trigger_app', intent.trigger.app)
    .contains('action_apps', intent.actions.map(a => a.app))
    .eq('status', 'active')
    .order('success_rate', { ascending: false })
    .limit(5);
  
  // Score each candidate
  return candidates.map(template => ({
    template,
    match_score: calculateMatchScore(template, intent),
    missing_features: identifyGaps(template, intent)
  }));
}
```

### Phase 3: Template Adaptation
```typescript
async function adaptTemplate(
  template: WorkflowTemplate, 
  intent: IntentAnalysis,
  userContext: UserContext
): AdaptedWorkflow {
  // Replace placeholders with user-specific values
  let workflow = JSON.parse(JSON.stringify(template.n8n_json));
  
  for (const placeholder of template.placeholders) {
    const value = await extractValue(placeholder, intent, userContext);
    workflow = replacePlaceholder(workflow, placeholder.key, value);
  }
  
  // Apply user isolation
  workflow.name = `[USR-${userContext.userId}] ${workflow.name}`;
  
  return {
    workflow,
    confidence_score: 0.95,
    warnings: [],
    requires_review: false
  };
}
```

## 📚 Initial Template Library (Alex Persona Focus)

### Tier 1: E-Commerce Essentials (Shopify Focus)
1. **shopify-new-order-to-sheets** - Track all orders in Google Sheets
2. **shopify-abandoned-cart-email** - Send recovery emails via Resend
3. **shopify-low-stock-slack-alert** - Notify team of inventory issues
4. **shopify-new-customer-welcome** - Automated onboarding sequence
5. **shopify-order-fulfillment-update** - Status updates to customers

### Tier 2: Financial Automation
6. **stripe-payment-to-quickbooks** - Auto-reconcile payments
7. **stripe-failed-payment-slack** - Alert on payment failures
8. **paypal-to-sheets-reconciliation** - Track PayPal transactions
9. **invoice-overdue-reminder** - Automated follow-ups

### Tier 3: Marketing & Communication
10. **typeform-to-mailchimp** - Add survey respondents to lists
11. **calendly-to-slack-notification** - Meeting alerts
12. **twitter-mention-to-discord** - Social media monitoring
13. **newsletter-signup-to-crm** - Lead capture automation

### Tier 4: Productivity & Operations
14. **gmail-attachment-to-drive** - Auto-organize files
15. **slack-to-notion-task** - Convert messages to tasks
16. **github-pr-to-slack** - Development notifications
17. **daily-weather-email** - Morning briefing

### Tier 5: Data & Analytics
18. **webhook-to-database** - Generic data ingestion
19. **api-health-check-monitor** - Service availability tracking
20. **daily-metrics-summary** - Business KPI digest

## 🗄️ Supabase Database Schema

```sql
-- Main template storage
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  version TEXT DEFAULT '1.0.0',
  
  -- Classification
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  persona TEXT CHECK (persona IN ('alex', 'jordan', 'sam')),
  use_case TEXT,
  
  -- Technical specs
  trigger_app TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  action_apps TEXT[] NOT NULL,
  complexity TEXT CHECK (complexity IN ('simple', 'moderate', 'advanced')),
  
  -- Template content
  n8n_json JSONB NOT NULL,
  placeholders JSONB DEFAULT '[]',
  
  -- Testing & validation
  test_data JSONB,
  validation_rules JSONB DEFAULT '[]',
  success_metrics JSONB DEFAULT '[]',
  
  -- Analytics
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 1.00,
  avg_execution_time INTEGER,
  
  -- Documentation
  description TEXT,
  requirements TEXT[] DEFAULT '{}',
  limitations TEXT[] DEFAULT '{}',
  example_prompt TEXT,
  
  -- Lifecycle
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'testing', 'active', 'deprecated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_tested TIMESTAMPTZ
);

-- Template usage tracking
CREATE TABLE template_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workflow_templates(id),
  user_id UUID REFERENCES auth.users(id),
  workflow_id TEXT,  -- n8n workflow ID
  
  -- Deployment details
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  deployment_status TEXT,
  error_message TEXT,
  
  -- Customization tracking
  placeholders_filled JSONB,
  modifications_made JSONB,
  
  -- Performance metrics
  execution_count INTEGER DEFAULT 0,
  last_execution TIMESTAMPTZ,
  avg_execution_time INTEGER,
  success_rate DECIMAL(3,2)
);

-- Template discovery cache
CREATE TABLE template_discovery_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,  -- 'n8n.io', 'community', 'custom'
  external_id TEXT,
  
  -- Discovery metadata
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  relevance_score DECIMAL(3,2),
  
  -- Template analysis
  analyzed BOOLEAN DEFAULT FALSE,
  analysis_result JSONB,
  compatibility_score DECIMAL(3,2),
  
  -- Import status
  imported BOOLEAN DEFAULT FALSE,
  import_errors TEXT[],
  template_id UUID REFERENCES workflow_templates(id)
);

-- Create indexes for performance
CREATE INDEX idx_templates_trigger ON workflow_templates(trigger_app);
CREATE INDEX idx_templates_actions ON workflow_templates USING GIN(action_apps);
CREATE INDEX idx_templates_tags ON workflow_templates USING GIN(tags);
CREATE INDEX idx_templates_status ON workflow_templates(status);
CREATE INDEX idx_deployments_user ON template_deployments(user_id);
```

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create Supabase tables and RLS policies
- [ ] Build template ingestion pipeline
- [ ] Import first 5 Shopify templates
- [ ] Implement basic placeholder system

### Phase 2: AI Integration (Week 2)
- [ ] Develop intent analysis with GPT-4
- [ ] Build template matching algorithm
- [ ] Create adaptation engine
- [ ] Implement validation layer

### Phase 3: Discovery System (Week 3)
- [ ] Integrate Firecrawl for n8n.io scanning
- [ ] Build template compatibility analyzer
- [ ] Create curation interface
- [ ] Implement quality scoring

### Phase 4: Testing & Refinement (Week 4)
- [ ] Test all 20 core templates
- [ ] Measure success rates
- [ ] Optimize matching algorithm
- [ ] Deploy to production

## 📈 Success Metrics

### Technical KPIs
- **Template Success Rate**: >95% (workflows deploy without errors)
- **Adaptation Accuracy**: >90% (correct placeholder filling)
- **Response Time**: <2 seconds (from prompt to workflow)
- **Template Coverage**: >80% of user requests matched

### Business KPIs
- **User Success Rate**: >70% complete first workflow
- **Time to Value**: <5 minutes (signup to working automation)
- **Template Reuse**: >3x per template per month
- **Support Tickets**: <10% of deployments

## 🔒 Security Considerations

### Template Vetting Process
1. **Static Analysis**: Scan for hardcoded credentials
2. **Sandbox Testing**: Execute in isolated environment
3. **Security Review**: Manual inspection for data exposure
4. **User Isolation**: Enforce naming conventions
5. **Credential Validation**: Check API key requirements

### Runtime Protection
- No arbitrary code execution
- Validated JSON structures only
- Sanitized user inputs
- Rate limiting on deployments
- Audit logging for all adaptations

## 🎯 Next Steps

1. **Immediate**: Create Supabase tables with the schema above
2. **Today**: Import first 3 Shopify templates as proof of concept
3. **This Week**: Build template matching algorithm
4. **Next Week**: Implement AI adapter with GPT-4
5. **Two Weeks**: Launch beta with 10 templates

This architecture transforms Clixen from a "hope it works" generator into a "guaranteed to work" automation platform. The reliability improvement alone justifies the architectural change.