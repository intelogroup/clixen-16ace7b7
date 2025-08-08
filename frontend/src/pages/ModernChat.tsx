import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  MessageSquare, 
  Save, 
  Rocket, 
  Lightbulb, 
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Bot,
  Sparkles,
  Target,
  Settings,
  FileText
} from 'lucide-react';

export default function ModernChat() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      content: `👋 **Welcome to Clixen AI!**

I'm your intelligent workflow automation assistant. I help you create powerful n8n workflows using simple, natural language.

**What I can help you with:**
🔄 Automate repetitive tasks
🔗 Connect different services and APIs
⏰ Create scheduled workflows
🪝 Set up webhooks and triggers
📊 Build data processing pipelines

**To get started**, just tell me what you'd like to automate! For example:
- "Send me a Slack message every morning at 9 AM"
- "When I receive an email, save the attachment to Google Drive"
- "Create a webhook that processes form submissions"

What would you like to automate today?`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState('draft');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "Great! I'll help you create that automation. Let me break this down into a workflow...",
        "Perfect! This sounds like a job for n8n. I'll design a workflow that handles this automatically.",
        "Excellent idea! I can create a workflow that will automate this process for you.",
        "That's a fantastic use case! Let me create an intelligent workflow to handle this."
      ];

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
      setWorkflowStatus('generated');
    }, 2000);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'generated':
        return { 
          label: 'Generated', 
          className: 'badge-success',
          icon: <CheckCircle className="w-3 h-3" />
        };
      case 'saved':
        return { 
          label: 'Saved', 
          className: 'badge-info',
          icon: <Save className="w-3 h-3" />
        };
      case 'deployed':
        return { 
          label: 'Deployed', 
          className: 'badge-success',
          icon: <Rocket className="w-3 h-3" />
        };
      default:
        return { 
          label: 'Draft', 
          className: 'badge-warning',
          icon: <Clock className="w-3 h-3" />
        };
    }
  };

  const quickTemplates = [
    'Email to Slack notification',
    'Schedule daily reports',
    'Form to spreadsheet sync',
    'File backup automation',
    'Lead processing workflow',
    'Social media post scheduler'
  ];

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Main Chat Area */}
      <div className="flex-1 clean-card flex flex-col h-[calc(100vh-200px)] lg:h-auto">
        {/* Chat Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AI Workflow Chat</h1>
                <p className="text-gray-600 text-sm">Create workflows with natural language</p>
              </div>
            </div>
            <button className="btn-clean btn-secondary text-sm">
              <Settings className="w-4 h-4" />
              New Chat
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div 
                className={`max-w-[80%] p-4 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-50 border border-gray-200 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                <div className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                  <span className="text-gray-600 text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-6 border-t border-gray-200">
          <div className="flex gap-3">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Describe the workflow you want to create..."
              disabled={isLoading}
              className="input-clean flex-1"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className={`btn-clean ${
                !inputValue.trim() || isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              {isLoading ? (
                <div className="spinner-clean" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send
            </button>
          </div>
        </form>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-80 space-y-6">
        {/* Workflow Status */}
        <div className="clean-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-blue-500" />
              Workflow Status
            </h3>
          </div>
          
          <div className={`badge-clean ${getStatusConfig(workflowStatus).className} mb-4`}>
            {getStatusConfig(workflowStatus).icon}
            {getStatusConfig(workflowStatus).label}
          </div>

          <div className="space-y-3">
            <button 
              className={`btn-clean w-full ${
                workflowStatus === 'draft' 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'btn-secondary'
              }`}
              disabled={workflowStatus === 'draft'}
            >
              <Save className="w-4 h-4" />
              Save Workflow
            </button>
            
            <button 
              className={`btn-clean w-full ${
                workflowStatus === 'draft' 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'btn-primary'
              }`}
              disabled={workflowStatus === 'draft'}
            >
              <Rocket className="w-4 h-4" />
              Deploy to n8n
            </button>
          </div>
        </div>

        {/* Pro Tips */}
        <div className="clean-card p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center mb-4">
            <Lightbulb className="w-5 h-5 mr-2 text-blue-600" />
            <h4 className="text-lg font-semibold text-blue-900">Pro Tips</h4>
          </div>
          
          <ul className="space-y-3 text-sm text-blue-800">
            <li className="flex items-start space-x-2">
              <Target className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
              <span>Be specific about data sources and formats</span>
            </li>
            <li className="flex items-start space-x-2">
              <Clock className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
              <span>Mention timing and scheduling requirements</span>
            </li>
            <li className="flex items-start space-x-2">
              <Settings className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
              <span>Include conditions and error handling</span>
            </li>
            <li className="flex items-start space-x-2">
              <FileText className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
              <span>Specify desired output destinations</span>
            </li>
          </ul>
        </div>

        {/* Quick Templates */}
        <div className="clean-card p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Templates</h4>
          <div className="space-y-2">
            {quickTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => setInputValue(template)}
                className="w-full text-left p-3 text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-lg text-gray-700 hover:text-gray-900 transition-colors"
              >
                {template}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
