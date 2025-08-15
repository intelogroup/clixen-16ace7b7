/**
 * Simplified Chat Component
 * Uses the unified API service and hooks to eliminate duplication
 */

import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Bot, User, Sparkles } from 'lucide-react';
import { useChat } from '../lib/hooks/useApi';
import { errorHandler } from '../lib/services/errorHandler';

export default function SimplifiedChat() {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, loading } = useChat();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || loading) return;

    const message = inputValue.trim();
    setInputValue('');
    
    try {
      await sendMessage(message);
    } catch (error) {
      // Error is already handled by the hook and error handler
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Clixen AI Assistant</h1>
            <p className="text-sm text-gray-500">Natural language workflow automation</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Ask me anything or describe a workflow you'd like to automate. 
              I can help with tasks, API integrations, and scheduling.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Bot className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                )}
                
                <div
                  className={`max-w-2xl px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="prose prose-sm max-w-none">
                    {message.content.split('\n').map((line, i) => (
                      <p key={i} className={message.role === 'user' ? 'text-white mb-1' : 'mb-1'}>
                        {line}
                      </p>
                    ))}
                  </div>
                  {message.timestamp && (
                    <div className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-gray-200 rounded-lg">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Bot className="h-5 w-5 text-blue-600 animate-pulse" />
                  </div>
                </div>
                <div className="bg-white border border-gray-200 px-4 py-3 rounded-lg">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me anything or describe a workflow to automate..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <SendHorizontal className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send • Powered by GPT-4 and n8n workflow engine
          </p>
        </form>
      </div>
    </div>
  );
}