import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Bot, User, Plus, MessageSquare } from 'lucide-react';
import { LoadingSpinner } from './LoadingStates';
import { AnimatedButton } from './AnimationUtils';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'generating' | 'complete' | 'error';
  suggestions?: string[];
}

interface EnhancedChatInterfaceProps {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSuggestionClick: (suggestion: string) => void;
  isGenerating: boolean;
  className?: string;
}

export default function EnhancedChatInterface({
  messages,
  input,
  setInput,
  onSubmit,
  onSuggestionClick,
  isGenerating,
  className = ""
}: EnhancedChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as any);
    }
  };

  const MessageIcon = ({ type }: { type: 'user' | 'assistant' | 'system' }) => {
    if (type === 'user') {
      return (
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-black" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
    );
  };

  const TypingIndicator = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center space-x-3 px-4 py-3"
    >
      <MessageIcon type="assistant" />
      <div className="bg-zinc-800 rounded-2xl px-4 py-2 flex items-center space-x-2">
        <LoadingSpinner size="sm" variant="dots" />
        <span className="text-sm text-zinc-400">AI is thinking...</span>
      </div>
    </motion.div>
  );

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} items-start space-x-3`}
            >
              {message.type !== 'user' && <MessageIcon type={message.type} />}
              
              <div className="max-w-[80%] sm:max-w-2xl">
                <motion.div
                  className={`rounded-2xl px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-white text-black ml-auto'
                      : message.type === 'system'
                      ? 'bg-blue-950/30 text-blue-200 border border-blue-800/30'
                      : 'bg-zinc-800 text-white'
                  }`}
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                  
                  {/* Status indicator */}
                  {message.status === 'generating' && (
                    <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-zinc-700">
                      <LoadingSpinner size="sm" />
                      <span className="text-xs text-zinc-400">Processing...</span>
                    </div>
                  )}
                  
                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <motion.div 
                      className="mt-4 space-y-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ delay: 0.2 }}
                    >
                      <p className="text-xs text-zinc-400 mb-2">Try these workflows:</p>
                      {message.suggestions.map((suggestion, idx) => (
                        <motion.button
                          key={idx}
                          onClick={() => onSuggestionClick(suggestion)}
                          className="block w-full text-left px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors text-sm group"
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <span className="group-hover:text-blue-300 transition-colors">
                            🚀 {suggestion}
                          </span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
                
                {/* Timestamp */}
                <div className={`text-xs text-zinc-500 mt-1 px-1 ${
                  message.type === 'user' ? 'text-right' : 'text-left'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
              
              {message.type === 'user' && <MessageIcon type="user" />}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Typing indicator */}
        {isGenerating && <TypingIndicator />}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Mobile Input */}
      <motion.div 
        className={`p-4 border-t border-zinc-800 ${isMobile ? 'pb-safe-area' : ''}`}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <form onSubmit={onSubmit} className="relative">
          <div className="relative flex items-end space-x-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isMobile 
                    ? "Describe your workflow..." 
                    : "Describe your workflow... (e.g., 'Send me an email when someone fills out my form')"
                }
                className={`w-full px-4 py-3 ${isMobile ? 'pr-12' : 'pr-16'} bg-zinc-900/80 backdrop-blur-sm text-white placeholder-zinc-400 rounded-2xl border border-zinc-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none transition-all duration-200 ${
                  isMobile ? 'text-16px' : 'text-sm'
                }`}
                rows={isMobile ? 1 : 2}
                disabled={isGenerating}
                style={isMobile ? { fontSize: '16px' } : {}} // Prevents zoom on iOS
              />
              
              {/* Send button */}
              <motion.button
                type="submit"
                disabled={!input.trim() || isGenerating}
                className={`absolute ${isMobile ? 'right-2 bottom-2' : 'right-3 bottom-3'} p-2 text-white disabled:opacity-30 hover:bg-zinc-700 rounded-lg transition-colors disabled:hover:bg-transparent`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isGenerating ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Send className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                )}
              </motion.button>
            </div>
          </div>
          
          {/* Enhanced mobile helper text */}
          {!isMobile && (
            <motion.div 
              className="mt-2 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="text-xs text-zinc-500">
                Press Enter to send • Shift+Enter for new line
              </span>
            </motion.div>
          )}
        </form>
        
        {/* Mobile quick actions */}
        {isMobile && messages.length === 0 && (
          <motion.div 
            className="mt-4 flex space-x-2 overflow-x-auto pb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {[
              "Email automation",
              "Data sync",
              "Notifications",
              "Reports"
            ].map((action, idx) => (
              <motion.button
                key={idx}
                onClick={() => onSuggestionClick(`Create a workflow for ${action.toLowerCase()}`)}
                className="flex-shrink-0 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-full transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {action}
              </motion.button>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}