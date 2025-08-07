/**
 * Fallback Chat Service - Works without Edge Functions
 * 
 * This service provides basic chat functionality when Edge Functions are unavailable.
 * It simulates the workflow creation process with predefined responses.
 */

import { WorkflowMessage, WorkflowResponse } from './SimpleWorkflowService';

export class FallbackChatService {
  private conversationCount = 0;

  async processConversation(
    userMessage: string,
    conversationHistory: WorkflowMessage[] = []
  ): Promise<WorkflowResponse> {
    this.conversationCount++;
    
    console.log('🔄 [FALLBACK] Processing message:', userMessage);
    
    // Simple state machine based on conversation flow
    const phase = this.determinePhase(userMessage, conversationHistory);
    
    switch (phase) {
      case 'greeting':
        return this.handleGreeting();
      
      case 'scoping':
        return this.handleScoping(userMessage);
      
      case 'validating':
        return this.handleValidation(userMessage);
      
      case 'generating':
        return this.handleGeneration(userMessage);
      
      default:
        return this.handleDefault();
    }
  }

  private determinePhase(message: string, history: WorkflowMessage[]): string {
    const msg = message.toLowerCase();
    
    // First interaction
    if (history.length === 0) {
      if (msg.includes('hello') || msg.includes('hi') || msg.includes('help')) {
        return 'greeting';
      }
      return 'scoping';
    }
    
    // Look for workflow creation signals
    if (msg.includes('yes') || msg.includes('create') || msg.includes('proceed') || msg.includes('generate')) {
      return 'generating';
    }
    
    // Check if we have enough context
    if (history.length >= 2) {
      return 'validating';
    }
    
    return 'scoping';
  }

  private handleGreeting(): WorkflowResponse {
    return {
      content: `👋 **Welcome to Clixen!**

I'm your AI workflow automation assistant. I help you create n8n workflows using simple, natural language.

**What I can help you with:**
- Automate repetitive tasks
- Connect different services and APIs
- Create scheduled workflows
- Set up webhooks and triggers
- Build data processing pipelines

**To get started**, just tell me what you'd like to automate! For example:
- "Send me a Slack message every morning at 9 AM"
- "When I receive an email, save the attachment to Google Drive"
- "Create a webhook that processes form submissions"

What would you like to automate today?`,
      workflowGenerated: false
    };
  }

  private handleScoping(userMessage: string): WorkflowResponse {
    const msg = userMessage.toLowerCase();
    
    // Detect common automation patterns
    let response = `Great! I understand you want to automate something related to your request.

Let me ask a few clarifying questions to create the perfect workflow for you:

`;

    if (msg.includes('email')) {
      response += `📧 **Email Automation Detected**

1. Do you want to trigger this when you **receive** emails or **send** emails?
2. Should this work with all emails or only specific ones (by sender, subject, etc.)?
3. What should happen when the email trigger fires?`;
    } else if (msg.includes('slack') || msg.includes('notification')) {
      response += `💬 **Notification Automation Detected**

1. What should trigger the Slack message? (schedule, webhook, email, etc.)
2. Which Slack channel should receive the message?
3. Should the message content be dynamic or the same every time?`;
    } else if (msg.includes('schedule') || msg.includes('daily') || msg.includes('hourly')) {
      response += `⏰ **Scheduled Automation Detected**

1. How often should this run? (daily, hourly, specific times, etc.)
2. What actions should happen when it triggers?
3. Do you need any conditions or filters?`;
    } else if (msg.includes('webhook') || msg.includes('form') || msg.includes('api')) {
      response += `🔗 **Webhook/API Automation Detected**

1. What will trigger the webhook? (form submission, external service, etc.)
2. What data do you expect to receive?
3. What should happen with that data?`;
    } else {
      response += `🤔 **Let me understand your automation better:**

1. **What should trigger this automation?** (email, schedule, manual, webhook, etc.)
2. **What actions should it perform?** (send messages, update data, call APIs, etc.)
3. **Which services do you want to connect?** (Gmail, Slack, Google Sheets, etc.)`;
    }

    return {
      content: response,
      workflowGenerated: false
    };
  }

  private handleValidation(userMessage: string): WorkflowResponse {
    return {
      content: `Perfect! Based on our conversation, I'm ready to create your workflow.

**Here's what I understand:**
- **Trigger**: ${this.extractTrigger(userMessage)}
- **Actions**: ${this.extractActions(userMessage)}
- **Services**: ${this.extractServices(userMessage)}

Does this look correct? If so, say **"Yes, create it"** and I'll generate your n8n workflow!

If you need to modify anything, just let me know what to change.`,
      workflowGenerated: false
    };
  }

  private handleGeneration(userMessage: string): WorkflowResponse {
    // Create a sample workflow
    const workflow = this.createSampleWorkflow();
    
    return {
      content: `🎉 **Workflow Generated Successfully!**

I've created your automation workflow! Here's what it does:

**Workflow Summary:**
- **Name**: ${workflow.name}
- **Trigger**: ${workflow.trigger || 'Manual trigger for testing'}
- **Actions**: ${workflow.actions || 'Basic data processing'}
- **Status**: Ready for deployment

**Next Steps:**
1. **Review** the workflow configuration
2. **Test** it in a safe environment
3. **Deploy** when you're ready to go live

Your workflow is now ready! You can deploy it to start automating your tasks.

*Note: This is a demo workflow. In the full version, I would generate a complete n8n workflow based on your specific requirements.*`,
      workflowGenerated: true,
      workflowData: workflow
    };
  }

  private handleDefault(): WorkflowResponse {
    return {
      content: `I'm here to help you create workflow automations! 

Could you tell me more about what you'd like to automate? For example:
- A specific task you do repeatedly
- Services you want to connect
- Data you need to process
- Notifications you want to set up

The more details you provide, the better I can help you create the perfect automation!`,
      workflowGenerated: false
    };
  }

  private extractTrigger(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('email')) return 'Email received';
    if (msg.includes('schedule') || msg.includes('daily')) return 'Scheduled trigger';
    if (msg.includes('webhook')) return 'Webhook trigger';
    if (msg.includes('manual')) return 'Manual trigger';
    return 'Custom trigger based on your requirements';
  }

  private extractActions(message: string): string {
    const msg = message.toLowerCase();
    const actions = [];
    if (msg.includes('slack')) actions.push('Send Slack message');
    if (msg.includes('email')) actions.push('Send email');
    if (msg.includes('save') || msg.includes('store')) actions.push('Save data');
    if (msg.includes('api') || msg.includes('http')) actions.push('Make API call');
    return actions.length > 0 ? actions.join(', ') : 'Process and transform data';
  }

  private extractServices(message: string): string {
    const msg = message.toLowerCase();
    const services = [];
    if (msg.includes('slack')) services.push('Slack');
    if (msg.includes('email') || msg.includes('gmail')) services.push('Email');
    if (msg.includes('google')) services.push('Google Workspace');
    if (msg.includes('sheets')) services.push('Google Sheets');
    return services.length > 0 ? services.join(', ') : 'Standard integrations';
  }

  private createSampleWorkflow() {
    return {
      name: `Clixen Automation ${new Date().toLocaleDateString()}`,
      active: false,
      trigger: 'Manual trigger (demo)',
      actions: 'Data processing and notification',
      nodes: [
        {
          id: '1',
          name: 'Manual Trigger',
          type: 'n8n-nodes-base.manualTrigger',
          position: [200, 200]
        },
        {
          id: '2', 
          name: 'Set Data',
          type: 'n8n-nodes-base.set',
          position: [400, 200]
        }
      ],
      connections: {
        'Manual Trigger': {
          main: [['Set Data']]
        }
      },
      meta: {
        generatedBy: 'clixen-fallback',
        description: 'Demo workflow created by Clixen',
        createdAt: new Date().toISOString()
      }
    };
  }
}

export const fallbackChatService = new FallbackChatService();
