import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Bot, User, Settings, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import ModelSelector, { AIModel } from './ModelSelector';
import { aiModelService, ChatMessage } from '../lib/services/AIModelService';
import { Button } from './ui/button';
import { cn, formatRelativeTime, generateId } from '../lib/utils';

interface ExtendedChatMessage extends ChatMessage {
  id: string;
  model?: AIModel;
  status?: 'sending' | 'sent' | 'error';
}

interface EnhancedMultiModelChatProps {
  className?: string;
}

export default function EnhancedMultiModelChat({ 
  className = '' 
}: EnhancedMultiModelChatProps) {
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>('gpt-4.1-2025-04-14');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ExtendedChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: "Hello! I'm your AI assistant with access to multiple models including GPT-4.1 and Claude 4. I can help you with coding, analysis, creative writing, and complex problem-solving.\n\nChoose a model from the dropdown above and let's get started!",
        timestamp: new Date(),
        status: 'sent'
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userMessage: ExtendedChatMessage = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      status: 'sent'
    };

    const assistantMessage: ExtendedChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      model: selectedModel,
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput('');
    setIsGenerating(true);

    try {
      const chatHistory = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));

      let fullContent = '';

      await aiModelService.streamChat(
        selectedModel,
        chatHistory,
        (response) => {
          if (response.error) {
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: `Error: ${response.error}`, status: 'error' }
                : msg
            ));
            toast.error(response.error);
            return;
          }

          if (response.content) {
            fullContent += response.content;
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: fullContent, status: 'sending' }
                : msg
            ));
          }

          if (response.isComplete) {
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, status: 'sent' }
                : msg
            ));
            setIsGenerating(false);
          }
        }
      );
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, content: 'Sorry, there was an error processing your message.', status: 'error' }
          : msg
      ));
      toast.error('Failed to send message');
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const MessageIcon = ({ type, model }: { type: 'user' | 'assistant'; model?: AIModel }) => {
    if (type === 'user') {
      return (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-white" />
        </div>
      );
    }
    
    const getModelColor = (model?: AIModel) => {
      if (!model) return 'from-gray-600 to-gray-700';
      if (model.startsWith('gpt-')) return 'from-emerald-600 to-teal-700';
      if (model.startsWith('claude-')) return 'from-purple-600 to-indigo-700';
      return 'from-gray-600 to-gray-700';
    };

    return (
      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getModelColor(model)} flex items-center justify-center flex-shrink-0`}>
        <Bot className="w-4 h-4 text-white" />
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full bg-gray-50", className)}>
      {/* Header with Model Selector */}
      <div className="flex-shrink-0 p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">Multi-Model AI Chat</h1>
            <span className="text-sm text-gray-500">
              {messages.filter(m => m.role === 'user').length} messages
            </span>
          </div>
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            disabled={isGenerating}
          />
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "flex gap-4",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <MessageIcon type={message.role} model={message.model} />
              )}
              
              <div className={cn(
                "max-w-[70%] group",
                message.role === 'user' ? 'order-2' : 'order-1'
              )}>
                <motion.div
                  className={cn(
                    "rounded-2xl px-4 py-3 shadow-sm",
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.status === 'error'
                      ? 'bg-red-50 text-red-900 border border-red-200'
                      : 'bg-white text-gray-900 border border-gray-200'
                  )}
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                  
                  {/* Status indicator */}
                  {message.status === 'sending' && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                      <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                      <span className="text-xs text-gray-500">Generating...</span>
                    </div>
                  )}
                  
                  {/* Model badge for assistant messages */}
                  {message.role === 'assistant' && message.model && message.status === 'sent' && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                      <span className="text-xs text-gray-500">
                        {message.model.includes('gpt') ? 'OpenAI' : 'Anthropic'} • {message.model}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  )}
                </motion.div>
                
                {/* Timestamp */}
                <div className={cn(
                  "text-xs text-gray-500 mt-1 px-1",
                  message.role === 'user' ? 'text-right' : 'text-left'
                )}>
                  {formatRelativeTime(message.timestamp || new Date())}
                </div>
              </div>
              
              {message.role === 'user' && (
                <MessageIcon type={message.role} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <motion.div 
        className="flex-shrink-0 p-4 bg-white border-t border-gray-200"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything... Press Enter to send, Shift+Enter for new line"
                className="w-full px-4 py-3 pr-12 bg-gray-50 text-gray-900 placeholder-gray-500 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none transition-all duration-200 text-sm"
                rows={1}
                disabled={isGenerating}
                style={{ 
                  minHeight: '44px',
                  maxHeight: '120px',
                  resize: 'none'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
              
              {/* Send button */}
              <Button
                type="submit"
                disabled={!input.trim() || isGenerating}
                className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-lg"
                variant="ai"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Helper text */}
          <div className="mt-2 text-center">
            <span className="text-xs text-gray-500">
              Powered by {selectedModel.includes('gpt') ? 'OpenAI' : 'Anthropic'} • {selectedModel}
            </span>
          </div>
        </form>
      </motion.div>
    </div>
  );
}