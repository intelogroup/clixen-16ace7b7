import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  RefreshCw, 
  MessageCircle, 
  ChevronDown, 
  ChevronRight,
  Copy,
  ExternalLink,
  Lightbulb,
  Wrench,
  Brain,
  Zap,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

interface WorkflowError {
  id: string;
  type: 'validation' | 'deployment' | 'connection' | 'authentication' | 'rate_limit' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: string;
  nodeId?: string;
  nodeName?: string;
  suggestedFixes: string[];
  autoFixAvailable?: boolean;
  docsUrl?: string;
}

interface HealingAttempt {
  id: string;
  appliedFixes: string[];
  result: 'success' | 'partial' | 'failed';
  remainingErrors: WorkflowError[];
  timestamp: Date;
}

interface ErrorRecoveryScreenProps {
  errors: WorkflowError[];
  workflowName: string;
  isHealing: boolean;
  healingProgress?: number;
  healingAttempts?: HealingAttempt[];
  onRetry: () => void;
  onAutoFix: () => void;
  onManualFix: (errorId: string) => void;
  onContactSupport: () => void;
  onStartOver: () => void;
  onViewLogs?: () => void;
  canAutoFix: boolean;
}

const ErrorRecoveryScreen: React.FC<ErrorRecoveryScreenProps> = ({
  errors,
  workflowName,
  isHealing,
  healingProgress = 0,
  healingAttempts = [],
  onRetry,
  onAutoFix,
  onManualFix,
  onContactSupport,
  onStartOver,
  onViewLogs,
  canAutoFix
}) => {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [showLogs, setShowLogs] = useState(false);

  const toggleErrorExpansion = (errorId: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  };

  const copyErrorDetails = async (error: WorkflowError) => {
    const details = `
Error Type: ${error.type}
Severity: ${error.severity}
Message: ${error.message}
${error.details ? `Details: ${error.details}` : ''}
${error.nodeId ? `Node: ${error.nodeName || error.nodeId}` : ''}
Suggested Fixes:
${error.suggestedFixes.map((fix, i) => `${i + 1}. ${fix}`).join('\n')}
    `.trim();

    try {
      await navigator.clipboard.writeText(details);
      toast.success('Error details copied to clipboard');
    } catch {
      toast.error('Failed to copy error details');
    }
  };

  const getSeverityColor = (severity: WorkflowError['severity']) => {
    switch (severity) {
      case 'low': return 'text-yellow-600 bg-yellow-100';
      case 'medium': return 'text-orange-600 bg-orange-100';
      case 'high': return 'text-red-600 bg-red-100';
      case 'critical': return 'text-red-800 bg-red-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: WorkflowError['type']) => {
    switch (type) {
      case 'validation': return Wrench;
      case 'deployment': return Zap;
      case 'connection': return ExternalLink;
      case 'authentication': return AlertTriangle;
      case 'rate_limit': return Clock;
      default: return XCircle;
    }
  };

  const criticalErrors = errors.filter(e => e.severity === 'critical');
  const highErrors = errors.filter(e => e.severity === 'high');
  const otherErrors = errors.filter(e => e.severity !== 'critical' && e.severity !== 'high');

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4"
          >
            <AlertTriangle className="w-8 h-8 text-white" />
          </motion.div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Workflow Creation Issues
          </h1>
          <p className="text-gray-600 mb-4">
            We encountered {errors.length} issue{errors.length !== 1 ? 's' : ''} while creating <strong>{workflowName}</strong>
          </p>

          {isHealing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-blue-100 border border-blue-200 rounded-lg p-4 mb-4"
            >
              <div className="flex items-center space-x-3 mb-2">
                <Brain className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800 font-medium">AI Error Healing in Progress...</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${healingProgress}%` }}
                  className="bg-blue-600 h-2 rounded-full"
                />
              </div>
              <p className="text-sm text-blue-700 mt-2">
                Our AI is automatically analyzing and fixing common workflow issues
              </p>
            </motion.div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Errors List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Critical Errors */}
            {criticalErrors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl shadow-xl p-6"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <h2 className="text-lg font-bold text-red-800">
                    Critical Issues ({criticalErrors.length})
                  </h2>
                </div>
                
                <div className="space-y-3">
                  {criticalErrors.map((error) => (
                    <ErrorCard
                      key={error.id}
                      error={error}
                      isExpanded={expandedErrors.has(error.id)}
                      onToggleExpand={() => toggleErrorExpansion(error.id)}
                      onCopyDetails={() => copyErrorDetails(error)}
                      onManualFix={() => onManualFix(error.id)}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* High Priority Errors */}
            {highErrors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-xl p-6"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <h2 className="text-lg font-bold text-orange-800">
                    High Priority Issues ({highErrors.length})
                  </h2>
                </div>
                
                <div className="space-y-3">
                  {highErrors.map((error) => (
                    <ErrorCard
                      key={error.id}
                      error={error}
                      isExpanded={expandedErrors.has(error.id)}
                      onToggleExpand={() => toggleErrorExpansion(error.id)}
                      onCopyDetails={() => copyErrorDetails(error)}
                      onManualFix={() => onManualFix(error.id)}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Other Errors */}
            {otherErrors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-xl p-6"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                  <h2 className="text-lg font-bold text-yellow-800">
                    Other Issues ({otherErrors.length})
                  </h2>
                </div>
                
                <div className="space-y-3">
                  {otherErrors.map((error) => (
                    <ErrorCard
                      key={error.id}
                      error={error}
                      isExpanded={expandedErrors.has(error.id)}
                      onToggleExpand={() => toggleErrorExpansion(error.id)}
                      onCopyDetails={() => copyErrorDetails(error)}
                      onManualFix={() => onManualFix(error.id)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Actions Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            {/* Recovery Actions */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recovery Options</h3>
              
              <div className="space-y-3">
                {canAutoFix && (
                  <button
                    onClick={onAutoFix}
                    disabled={isHealing}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Brain className={`w-5 h-5 ${isHealing ? 'animate-pulse' : ''}`} />
                    <span>{isHealing ? 'Healing...' : 'Auto-Fix Issues'}</span>
                  </button>
                )}
                
                <button
                  onClick={onRetry}
                  disabled={isHealing}
                  className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Retry Creation</span>
                </button>
                
                <button
                  onClick={onStartOver}
                  className="w-full flex items-center justify-center space-x-2 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Start Over</span>
                </button>
              </div>
            </div>

            {/* Healing History */}
            {healingAttempts.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Healing History</h3>
                
                <div className="space-y-3">
                  {healingAttempts.slice(0, 3).map((attempt, index) => (
                    <div key={attempt.id} className="border-l-2 border-gray-200 pl-4 pb-3">
                      <div className="flex items-center space-x-2 mb-1">
                        {attempt.result === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : attempt.result === 'partial' ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          Attempt #{healingAttempts.length - index}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">
                        Applied {attempt.appliedFixes.length} fix{attempt.appliedFixes.length !== 1 ? 'es' : ''}
                      </p>
                      <p className="text-xs text-gray-500">
                        {attempt.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Support */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
              <h3 className="text-lg font-bold mb-2">Need Help?</h3>
              <p className="text-purple-100 text-sm mb-4">
                Our AI agents are constantly learning. If auto-fix doesn't work, we can help!
              </p>
              
              <div className="space-y-2">
                <button
                  onClick={onContactSupport}
                  className="w-full bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  <MessageCircle className="w-4 h-4 inline mr-2" />
                  Contact Support
                </button>
                
                {onViewLogs && (
                  <button
                    onClick={onViewLogs}
                    className="w-full bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4 inline mr-2" />
                    View Full Logs
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Error Card Component
const ErrorCard: React.FC<{
  error: WorkflowError;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCopyDetails: () => void;
  onManualFix: () => void;
}> = ({ error, isExpanded, onToggleExpand, onCopyDetails, onManualFix }) => {
  const TypeIcon = {
    validation: Wrench,
    deployment: Zap,
    connection: ExternalLink,
    authentication: AlertTriangle,
    rate_limit: Clock,
    unknown: XCircle
  }[error.type];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'critical': return 'text-red-800 bg-red-100 border-red-300';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getSeverityColor(error.severity)}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-grow">
          <TypeIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-grow min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-medium px-2 py-1 rounded capitalize">
                {error.type.replace('_', ' ')}
              </span>
              <span className="text-xs font-medium px-2 py-1 rounded capitalize">
                {error.severity}
              </span>
            </div>
            <p className="font-medium text-gray-900 mb-1">{error.message}</p>
            {error.nodeName && (
              <p className="text-sm text-gray-600">Node: {error.nodeName}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={onCopyDetails}
            className="p-1 hover:bg-white/50 rounded transition-colors"
            title="Copy error details"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleExpand}
            className="p-1 hover:bg-white/50 rounded transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-current/20"
          >
            {error.details && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Details:</h4>
                <p className="text-sm bg-white/50 p-3 rounded font-mono">{error.details}</p>
              </div>
            )}
            
            <div className="mb-4">
              <h4 className="font-medium mb-2">Suggested Fixes:</h4>
              <ul className="text-sm space-y-1">
                {error.suggestedFixes.map((fix, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-gray-500">{index + 1}.</span>
                    <span>{fix}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex items-center space-x-3">
              {error.autoFixAvailable && (
                <button
                  onClick={onManualFix}
                  className="text-sm bg-white/70 hover:bg-white text-gray-800 px-3 py-1 rounded font-medium transition-colors"
                >
                  Apply Fix
                </button>
              )}
              
              {error.docsUrl && (
                <a
                  href={error.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm bg-white/70 hover:bg-white text-gray-800 px-3 py-1 rounded font-medium transition-colors inline-flex items-center space-x-1"
                >
                  <span>View Docs</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ErrorRecoveryScreen;