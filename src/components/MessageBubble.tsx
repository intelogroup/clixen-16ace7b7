import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Copy, Check, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface MessageBubbleProps {
  type: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp: Date;
  agentName?: string;
  status?: 'sending' | 'sent' | 'error';
  phase?: string;
  isLatest?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  type,
  content,
  timestamp,
  agentName = 'AI Assistant',
  status = 'sent',
  phase,
  isLatest = false
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getIcon = () => {
    switch (type) {
      case 'user':
        return <User className="w-5 h-5" />;
      case 'assistant':
        return <Bot className="w-5 h-5" />;
      case 'system':
        return <Info className="w-5 h-5" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Bot className="w-5 h-5" />;
    }
  };

  const getBubbleStyles = () => {
    switch (type) {
      case 'user':
        return 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white ml-auto';
      case 'assistant':
        return 'bg-gray-800/50 backdrop-blur-sm border border-gray-700 text-gray-100';
      case 'system':
        return 'bg-blue-500/10 border border-blue-500/30 text-blue-400';
      case 'error':
        return 'bg-red-500/10 border border-red-500/30 text-red-400';
      default:
        return 'bg-gray-800 text-gray-100';
    }
  };

  const getAvatarStyles = () => {
    switch (type) {
      case 'user':
        return 'bg-gradient-to-br from-indigo-500 to-purple-600';
      case 'assistant':
        return 'bg-gradient-to-br from-blue-500 to-teal-500';
      case 'system':
        return 'bg-gray-700';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-700';
    }
  };

  const isUserMessage = type === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUserMessage ? 'flex-row-reverse' : 'flex-row'} mb-4`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${getAvatarStyles()}`}>
          {getIcon()}
        </div>
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-[70%] lg:max-w-[60%] ${isUserMessage ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Agent Name & Phase */}
        {!isUserMessage && (
          <div className="flex items-center gap-2 mb-1 px-2">
            <span className="text-xs font-medium text-gray-400">{agentName}</span>
            {phase && (
              <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full">
                {phase}
              </span>
            )}
          </div>
        )}

        {/* Message Bubble */}
        <div className={`relative group ${getBubbleStyles()} rounded-2xl px-4 py-3 ${
          isUserMessage ? 'rounded-tr-sm' : 'rounded-tl-sm'
        }`}>
          {/* Message Text */}
          <div className="whitespace-pre-wrap break-words">
            {content}
          </div>

          {/* Copy Button for Assistant Messages */}
          {type === 'assistant' && content.length > 50 && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-700/50 rounded-lg"
              aria-label="Copy message"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          )}

          {/* Status Indicator */}
          {isUserMessage && status === 'sending' && (
            <div className="absolute -bottom-1 -right-1">
              <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse" />
            </div>
          )}
          {isUserMessage && status === 'error' && (
            <div className="absolute -bottom-1 -right-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-gray-500 mt-1 px-2 ${isUserMessage ? 'text-right' : 'text-left'}`}>
          {format(timestamp, 'HH:mm')}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;