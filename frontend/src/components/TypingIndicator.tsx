import React from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

interface TypingIndicatorProps {
  agentName?: string;
  message?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  agentName = 'AI Agent', 
  message = 'Processing your request...' 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-start gap-3 p-4"
    >
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
      </div>
      
      <div className="flex-1">
        <div className="text-xs text-gray-400 mb-1">{agentName}</div>
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl px-4 py-3 inline-block">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <motion.div
                className="w-2 h-2 bg-indigo-500 rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 0 }}
              />
              <motion.div
                className="w-2 h-2 bg-indigo-500 rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2, repeatDelay: 0 }}
              />
              <motion.div
                className="w-2 h-2 bg-indigo-500 rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4, repeatDelay: 0 }}
              />
            </div>
            <span className="text-sm text-gray-300 ml-2">{message}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TypingIndicator;