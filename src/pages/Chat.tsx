import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Zap, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'generating' | 'deploying' | 'testing' | 'complete' | 'error';
  workflow?: {
    id: string;
    name: string;
    webhookUrl?: string;
    nodeCount: number;
  };
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! Describe the workflow you want to create, and I\'ll build it for you.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage.id;
  };

  const updateMessage = (id: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  };

  const generateWorkflow = async (intent: string) => {
    setIsGenerating(true);

    // Add user message
    addMessage({ type: 'user', content: intent });

    // Add assistant message with generating status
    const assistantMessageId = addMessage({
      type: 'assistant',
      content: 'Analyzing your request...',
      status: 'generating',
    });

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Simulate streaming updates
      const statusUpdates = [
        { delay: 800, content: 'Understanding your workflow requirements...', status: 'generating' as const },
        { delay: 1500, content: 'Generating workflow with AI...', status: 'generating' as const },
        { delay: 2500, content: 'Validating workflow structure...', status: 'deploying' as const },
        { delay: 3500, content: 'Deploying to n8n...', status: 'deploying' as const },
        { delay: 4500, content: 'Testing workflow...', status: 'testing' as const },
      ];

      for (const update of statusUpdates) {
        await new Promise((resolve) => setTimeout(resolve, update.delay));
        updateMessage(assistantMessageId, {
          content: update.content,
          status: update.status,
        });
      }

      // Call the edge function
      const response = await supabase.functions.invoke('generate-workflow', {
        body: { userId: user.id, intent },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to generate workflow');
      }

      // Update with success
      updateMessage(assistantMessageId, {
        content: `✨ Workflow "${response.data.workflow.name}" created successfully!
        
• ${response.data.workflow.nodeCount} nodes configured
• Workflow ID: ${response.data.workflow.n8nId}
${response.data.workflow.webhookUrl ? `• Webhook URL: ${response.data.workflow.webhookUrl}` : ''}

Your workflow is now active and ready to use!`,
        status: 'complete',
        workflow: response.data.workflow,
      });

      toast.success('Workflow created successfully!');

      // If there's a webhook URL, offer to test it
      if (response.data.workflow.webhookUrl) {
        setTimeout(() => {
          addMessage({
            type: 'assistant',
            content: 'Would you like me to send a test request to verify your workflow is working?',
          });
        }, 1000);
      }

    } catch (error: any) {
      updateMessage(assistantMessageId, {
        content: `Failed to create workflow: ${error.message}

Common issues:
• Make sure your request is clear and specific
• Try breaking complex workflows into simpler steps
• Ensure you're within your workflow quota

Would you like to try again with a modified request?`,
        status: 'error',
      });

      toast.error('Failed to create workflow');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const intent = input.trim();
    setInput('');
    await generateWorkflow(intent);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const StatusIcon = ({ status }: { status?: Message['status'] }) => {
    switch (status) {
      case 'generating':
      case 'deploying':
      case 'testing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl px-4 py-3 rounded-2xl ${
                  message.type === 'user'
                    ? 'bg-white text-black'
                    : 'bg-zinc-900 text-white border border-zinc-800'
                }`}
              >
                {message.status && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-zinc-400">
                    <StatusIcon status={message.status} />
                    <span className="capitalize">{message.status.replace('_', ' ')}</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap font-mono text-sm">
                  {message.content}
                </div>
                {message.workflow && (
                  <div className="mt-3 pt-3 border-t border-zinc-700">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Zap className="w-3 h-3" />
                      <span>{message.workflow.nodeCount} nodes</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-6 border-t border-zinc-800">
        <div className="relative max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your workflow... (e.g., 'Send me an email when someone fills out my form')"
            className="w-full px-4 py-3 pr-12 bg-zinc-900 text-white placeholder-zinc-500 rounded-xl border border-zinc-800 focus:border-white/20 focus:outline-none resize-none font-mono text-sm"
            rows={3}
            disabled={isGenerating}
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="absolute right-2 bottom-2 p-2 text-white disabled:opacity-30 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <div className="mt-2 text-center">
          <span className="text-xs text-zinc-500 font-mono">
            Press Enter to send • Shift+Enter for new line
          </span>
        </div>
      </form>
    </div>
  );
}