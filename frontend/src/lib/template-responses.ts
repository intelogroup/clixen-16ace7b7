/**
 * User-Friendly Response Messages for Strict Template Matching
 * MVP Phase 1: Clear, helpful communication when templates aren't available
 */

export interface TemplateResponse {
  type: 'success' | 'no_match' | 'partial_match' | 'error';
  title: string;
  message: string;
  details?: string;
  suggestions?: string[];
  actions?: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
}

/**
 * Generate user-friendly response for template matching results
 */
export function generateTemplateResponse(result: any): TemplateResponse {
  if (result.success) {
    return {
      type: 'success',
      title: '✅ Perfect Match Found!',
      message: `I found the "${result.template.name}" template that matches your request perfectly.`,
      details: 'I\'ll customize this tested workflow for your specific needs.',
      actions: [
        { label: 'Continue', action: 'adapt_template', primary: true },
        { label: 'View Template Details', action: 'view_template' }
      ]
    };
  }

  if (result.suggestions && result.suggestions.length > 0) {
    return {
      type: 'partial_match',
      title: '🔍 No Exact Match, But Similar Options Available',
      message: 'I don\'t have a template for your exact request yet, but here are some similar workflows:',
      suggestions: result.suggestions,
      details: 'Your request has been logged and our team will work on creating this template soon!',
      actions: [
        { label: 'Try Different Request', action: 'new_request', primary: true },
        { label: 'View Available Templates', action: 'browse_templates' }
      ]
    };
  }

  return {
    type: 'no_match',
    title: '🚧 Template Coming Soon',
    message: 'This workflow isn\'t in our template library yet, but we\'re on it!',
    details: 'Your request has been logged and prioritized. We\'re constantly adding new templates based on user needs.',
    actions: [
      { label: 'Try Another Workflow', action: 'new_request', primary: true },
      { label: 'Browse Available Templates', action: 'browse_templates' },
      { label: 'Get Notified When Ready', action: 'subscribe_notification' }
    ]
  };
}

/**
 * Friendly messages for common unmatched scenarios
 */
export const UNMATCHED_MESSAGES = {
  complex_workflow: {
    title: '🤔 This Looks Complex',
    message: 'Your workflow involves multiple steps that we\'re still building templates for.',
    tip: 'Try breaking it down into simpler workflows, or check back soon!'
  },
  
  unsupported_app: {
    title: '🔌 App Integration Coming Soon',
    message: 'We haven\'t integrated with that app yet, but it\'s on our roadmap.',
    tip: 'In the meantime, try using webhook triggers for custom integrations.'
  },
  
  custom_logic: {
    title: '⚙️ Custom Logic Detected',
    message: 'Your workflow requires custom logic that our templates don\'t support yet.',
    tip: 'Consider using our webhook-to-webhook template with custom processing.'
  },
  
  multiple_conditions: {
    title: '🎯 Multiple Conditions',
    message: 'Workflows with complex conditional logic are still being templated.',
    tip: 'Try creating separate workflows for each condition.'
  }
};

/**
 * Helpful suggestions when no match is found
 */
export const ALTERNATIVE_SUGGESTIONS = [
  'Browse our template library to see what\'s currently available',
  'Try rephrasing your request with simpler terms',
  'Break complex workflows into smaller, simpler ones',
  'Check our roadmap to see what\'s coming soon',
  'Join our community to request and vote on new templates'
];

/**
 * Template categories with friendly descriptions
 */
export const TEMPLATE_CATEGORIES = {
  'e-commerce': {
    icon: '🛍️',
    title: 'E-Commerce',
    description: 'Shopify, WooCommerce, payment processing',
    examples: ['Order tracking', 'Inventory alerts', 'Customer notifications']
  },
  'marketing': {
    icon: '📣',
    title: 'Marketing',
    description: 'Email campaigns, social media, lead generation',
    examples: ['Newsletter automation', 'Lead capture', 'Social monitoring']
  },
  'productivity': {
    icon: '⚡',
    title: 'Productivity',
    description: 'Task management, calendars, file organization',
    examples: ['Task creation', 'Meeting reminders', 'File backups']
  },
  'finance': {
    icon: '💰',
    title: 'Finance',
    description: 'Invoicing, payments, accounting',
    examples: ['Payment reconciliation', 'Invoice reminders', 'Expense tracking']
  },
  'communication': {
    icon: '💬',
    title: 'Communication',
    description: 'Slack, Discord, email notifications',
    examples: ['Team alerts', 'Customer updates', 'Status reports']
  },
  'data-analytics': {
    icon: '📊',
    title: 'Data & Analytics',
    description: 'Reports, dashboards, data syncing',
    examples: ['Daily reports', 'Data backups', 'Metric tracking']
  }
};

/**
 * Progress indicators for template development
 */
export const TEMPLATE_STATUS = {
  available: { 
    color: 'green', 
    label: 'Available Now', 
    icon: '✅' 
  },
  testing: { 
    color: 'yellow', 
    label: 'In Testing', 
    icon: '🧪',
    message: 'This template is being tested and will be available soon'
  },
  planned: { 
    color: 'blue', 
    label: 'Planned', 
    icon: '📋',
    message: 'This template is on our roadmap'
  },
  requested: { 
    color: 'gray', 
    label: 'Requested', 
    icon: '💭',
    message: 'Users have requested this - vote to prioritize it!'
  }
};

/**
 * Encouraging messages for users
 */
export const ENCOURAGEMENT_MESSAGES = [
  'We\'re adding new templates every week!',
  'Your feedback helps us prioritize which templates to build next.',
  'Join thousands of users automating their workflows with Clixen.',
  'Every template is tested and guaranteed to work.',
  'Our template library is growing based on real user needs.'
];

/**
 * Format template list for display
 */
export function formatTemplateList(templates: any[]): string {
  return templates.map((t, i) => 
    `${i + 1}. **${t.name}**: ${t.use_case}`
  ).join('\n');
}

/**
 * Generate notification preference options
 */
export function getNotificationOptions(request: string): any {
  return {
    title: 'Get Notified When This Template Is Ready',
    message: `We'll let you know as soon as we add a template for: "${request}"`,
    options: [
      { method: 'email', label: 'Email me', default: true },
      { method: 'in_app', label: 'In-app notification', default: false },
      { method: 'slack', label: 'Slack message', default: false }
    ],
    frequency: 'once', // or 'weekly_updates'
    priority_boost: true // User interest increases priority
  };
}