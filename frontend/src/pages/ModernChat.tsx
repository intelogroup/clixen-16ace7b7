import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageLoading } from '../components/LoadingStates';

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'saved': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'deployed': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Main Chat Area */}
      <motion.div 
        className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Chat Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-xl">💬</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">AI Workflow Chat</h1>
              <p className="text-gray-400 text-sm">Create workflows with natural language</p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                {message.role === 'assistant' && (
                  <motion.div 
                    className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", duration: 0.3 }}
                  >
                    <span className="text-lg">🤖</span>
                  </motion.div>
                )}
                
                <motion.div 
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    message.role === 'user' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-white/10 border border-white/20 text-white'
                  }`}
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                  <div className="text-xs opacity-60 mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </motion.div>

                {message.role === 'user' && (
                  <motion.div 
                    className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", duration: 0.3 }}
                  >
                    <span className="text-lg">👤</span>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && <MessageLoading />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <motion.form 
          onSubmit={handleSendMessage}
          className="p-6 border-t border-white/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex gap-3">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Describe the workflow you want to create..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
            />
            <motion.button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                !inputValue.trim() || isLoading
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-purple-500/25'
              }`}
              whileHover={!inputValue.trim() && !isLoading ? {} : { scale: 1.05 }}
              whileTap={!inputValue.trim() && !isLoading ? {} : { scale: 0.95 }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Send</span>
                  <span>📤</span>
                </div>
              )}
            </motion.button>
          </div>
        </motion.form>
      </motion.div>

      {/* Sidebar */}
      <motion.div 
        className="w-full lg:w-80 space-y-6"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        {/* Workflow Status */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <span className="text-lg">🔄</span>
            </div>
            <h3 className="text-lg font-semibold text-white">Workflow Actions</h3>
          </div>
          
          <div className={`flex items-center gap-2 p-3 rounded-lg border mb-4 ${getStatusColor(workflowStatus)}`}>
            <div className="w-2 h-2 rounded-full bg-current" />
            <span className="text-sm font-semibold capitalize">{workflowStatus}</span>
          </div>

          <div className="space-y-3">
            <motion.button 
              className={`w-full p-3 rounded-xl border font-semibold transition-all duration-300 ${
                workflowStatus === 'draft' 
                  ? 'bg-gray-600/20 border-gray-600/30 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30 hover:border-blue-500/50'
              }`}
              disabled={workflowStatus === 'draft'}
              whileHover={workflowStatus !== 'draft' ? { scale: 1.02 } : {}}
              whileTap={workflowStatus !== 'draft' ? { scale: 0.98 } : {}}
            >
              💾 Save Workflow
            </motion.button>
            
            <motion.button 
              className={`w-full p-3 rounded-xl border font-semibold transition-all duration-300 ${
                workflowStatus === 'draft' 
                  ? 'bg-gray-600/20 border-gray-600/30 text-gray-400 cursor-not-allowed' 
                  : 'bg-purple-500/20 border-purple-500/30 text-purple-400 hover:bg-purple-500/30 hover:border-purple-500/50'
              }`}
              disabled={workflowStatus === 'draft'}
              whileHover={workflowStatus !== 'draft' ? { scale: 1.02 } : {}}
              whileTap={workflowStatus !== 'draft' ? { scale: 0.98 } : {}}
            >
              🚀 Deploy to n8n
            </motion.button>
          </div>
        </div>

        {/* Pro Tips */}
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <span className="text-lg">💡</span>
            </div>
            <h4 className="text-lg font-semibold text-white">Pro Tips</h4>
          </div>
          
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">🎯</span>
              <span>Be specific about data sources and formats</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">⏰</span>
              <span>Mention timing and scheduling requirements</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">🔧</span>
              <span>Include conditions and error handling</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">📤</span>
              <span>Specify desired output destinations</span>
            </li>
          </ul>
        </div>

        {/* Quick Templates */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Quick Templates</h4>
          <div className="space-y-2">
            {[
              'Email to Slack notification',
              'Schedule daily reports',
              'Form to spreadsheet',
              'File backup automation'
            ].map((template, index) => (
              <motion.button
                key={index}
                onClick={() => setInputValue(template)}
                className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {template}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
