import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Zap, 
  Settings, 
  Rocket,
  Brain,
  Code,
  TestTube,
  Clock
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress?: number;
  duration?: number;
  details?: string[];
  agent?: string;
}

interface WorkflowProgressScreenProps {
  steps: WorkflowStep[];
  currentStep: number;
  overallProgress: number;
  isComplete: boolean;
  hasErrors: boolean;
  onRetry?: () => void;
  onCancel?: () => void;
  estimatedTimeRemaining?: number;
  workflowName?: string;
}

const stepIcons = {
  analysis: Brain,
  design: Settings,
  generation: Code,
  validation: TestTube,
  deployment: Rocket,
  testing: Zap
};

const getStepIcon = (stepId: string) => {
  const iconKey = stepId.toLowerCase();
  return stepIcons[iconKey as keyof typeof stepIcons] || Settings;
};

const WorkflowProgressScreen: React.FC<WorkflowProgressScreenProps> = ({
  steps,
  currentStep,
  overallProgress,
  isComplete,
  hasErrors,
  onRetry,
  onCancel,
  estimatedTimeRemaining,
  workflowName = "Your Workflow"
}) => {
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (!isComplete && !hasErrors) {
      const interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isComplete, hasErrors]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in_progress': return Loader2;
      case 'error': return XCircle;
      default: return Clock;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Creating {workflowName}
          </h1>
          <p className="text-gray-600">
            Our AI agents are working together to build your workflow
          </p>
        </motion.div>

        {/* Progress Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-6"
        >
          {/* Overall Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-600">{Math.round(overallProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 0.5 }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full"
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => {
              const StepIcon = getStepIcon(step.id);
              const StatusIcon = getStatusIcon(step.status);
              const isActive = index === currentStep;
              
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-start space-x-4 p-4 rounded-xl transition-all duration-300 ${
                    isActive ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  {/* Step Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    step.status === 'completed' ? 'bg-green-100' :
                    step.status === 'in_progress' ? 'bg-blue-100' :
                    step.status === 'error' ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    <StepIcon className={`w-5 h-5 ${getStatusColor(step.status)}`} />
                  </div>

                  {/* Step Content */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {step.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {step.agent && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {step.agent}
                          </span>
                        )}
                        <StatusIcon className={`w-4 h-4 ${getStatusColor(step.status)} ${
                          step.status === 'in_progress' ? 'animate-spin' : ''
                        }`} />
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                    
                    {/* Step Progress */}
                    {step.status === 'in_progress' && step.progress !== undefined && (
                      <div className="w-full bg-gray-200 rounded-full h-1 mb-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${step.progress}%` }}
                          className="bg-blue-600 h-1 rounded-full"
                        />
                      </div>
                    )}
                    
                    {/* Step Details */}
                    {step.details && step.details.length > 0 && (
                      <div className="space-y-1">
                        {step.details.map((detail, idx) => (
                          <p key={idx} className="text-xs text-gray-500">• {detail}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Status Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Time Elapsed:</span> {formatTime(timeElapsed)}
              </div>
              {estimatedTimeRemaining && !isComplete && !hasErrors && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Estimated Remaining:</span> {formatTime(estimatedTimeRemaining)}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {hasErrors && onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Retry
                </button>
              )}
              {onCancel && !isComplete && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
          
          {/* Status Message */}
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center space-x-2 text-green-600"
              >
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Workflow created successfully!</span>
              </motion.div>
            )}
            
            {hasErrors && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center space-x-2 text-red-600"
              >
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-medium">Workflow creation encountered errors</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default WorkflowProgressScreen;