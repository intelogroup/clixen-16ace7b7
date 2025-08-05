import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { getAuthErrorInfo, AuthErrorInfo } from '../lib/auth/authErrorMessages';

interface AuthErrorDisplayProps {
  error: any;
  onDismiss?: () => void;
  className?: string;
}

export const AuthErrorDisplay: React.FC<AuthErrorDisplayProps> = ({
  error,
  onDismiss,
  className = ''
}) => {
  if (!error) return null;

  const errorInfo = getAuthErrorInfo(error);

  const getIcon = (severity: AuthErrorInfo['severity']) => {
    switch (severity) {
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBgColor = (severity: AuthErrorInfo['severity']) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = (severity: AuthErrorInfo['severity']) => {
    switch (severity) {
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-orange-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`
          rounded-lg border p-4 ${getBgColor(errorInfo.severity)} ${className}
        `}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {getIcon(errorInfo.severity)}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-semibold ${getTextColor(errorInfo.severity)}`}>
              {errorInfo.title}
            </h3>
            <p className={`mt-1 text-sm ${getTextColor(errorInfo.severity)} opacity-90`}>
              {errorInfo.message}
            </p>
            {errorInfo.action && (
              <p className={`mt-2 text-xs ${getTextColor(errorInfo.severity)} opacity-75 font-medium`}>
                💡 {errorInfo.action}
              </p>
            )}
          </div>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`flex-shrink-0 p-1 rounded-md hover:bg-white/50 transition-colors ${
                getTextColor(errorInfo.severity)
              } opacity-60 hover:opacity-100`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthErrorDisplay;