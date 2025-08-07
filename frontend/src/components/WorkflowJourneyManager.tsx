import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import WorkflowOnboardingScreen from './WorkflowOnboardingScreen';
import WorkflowProgressScreen from './WorkflowProgressScreen';
import WorkflowCompletionScreen from './WorkflowCompletionScreen';
import ErrorRecoveryScreen from './ErrorRecoveryScreen';

export type JourneyStage = 
  | 'onboarding' 
  | 'creating' 
  | 'progress' 
  | 'completion' 
  | 'error' 
  | 'chat';

export type WorkflowStep = {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress?: number;
  duration?: number;
  details?: string[];
  agent?: string;
};

export type WorkflowError = {
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
};

interface WorkflowJourneyManagerProps {
  // Journey control
  currentStage: JourneyStage;
  onStageChange: (stage: JourneyStage) => void;
  
  // User preferences
  showOnboarding?: boolean;
  userType?: 'new' | 'returning' | 'experienced';
  
  // Progress tracking
  workflowSteps?: WorkflowStep[];
  currentStep?: number;
  overallProgress?: number;
  workflowName?: string;
  
  // Completion data
  completedWorkflow?: {
    id: string;
    name: string;
    description: string;
    webhookUrl?: string;
    n8nUrl?: string;
    nodeCount: number;
    estimatedExecutions?: number;
    createdAt: Date;
    status: 'active' | 'inactive';
  };
  
  // Metrics
  generationMetrics?: {
    generationTime: number;
    deploymentTime: number;
    totalNodes: number;
    complexity: 'simple' | 'medium' | 'complex';
    estimatedCost?: string;
  };
  
  // Error handling
  errors?: WorkflowError[];
  isHealing?: boolean;
  healingProgress?: number;
  canAutoFix?: boolean;
  
  // Event handlers
  onCreateWorkflow?: () => void;
  onRetryWorkflow?: () => void;
  onAutoFix?: () => void;
  onManualFix?: (errorId: string) => void;
  onTestWorkflow?: () => void;
  onEditWorkflow?: () => void;
  onViewDashboard?: () => void;
  onViewAnalytics?: () => void;
  onContactSupport?: () => void;
  onStartOver?: () => void;
  onSkipOnboarding?: () => void;
}

const WorkflowJourneyManager: React.FC<WorkflowJourneyManagerProps> = ({
  currentStage,
  onStageChange,
  showOnboarding = false,
  userType = 'new',
  workflowSteps = [],
  currentStep = 0,
  overallProgress = 0,
  workflowName = "Your Workflow",
  completedWorkflow,
  generationMetrics,
  errors = [],
  isHealing = false,
  healingProgress = 0,
  canAutoFix = true,
  onCreateWorkflow,
  onRetryWorkflow,
  onAutoFix,
  onManualFix,
  onTestWorkflow,
  onEditWorkflow,
  onViewDashboard,
  onViewAnalytics,
  onContactSupport,
  onStartOver,
  onSkipOnboarding
}) => {
  const [journeyStage, setJourneyStage] = useState<JourneyStage>(currentStage);
  
  // Sync external stage changes
  useEffect(() => {
    setJourneyStage(currentStage);
  }, [currentStage]);

  // Handle stage transitions
  const handleStageChange = (newStage: JourneyStage) => {
    setJourneyStage(newStage);
    onStageChange(newStage);
  };

  // Default workflow steps for demo/testing
  const defaultSteps: WorkflowStep[] = [
    {
      id: 'analysis',
      title: 'Understanding Requirements',
      description: 'Analyzing your workflow description and identifying key components',
      status: 'completed',
      agent: 'Orchestrator Agent',
      details: ['Parsed natural language input', 'Identified key entities and actions', 'Validated requirements completeness']
    },
    {
      id: 'design',
      title: 'Designing Workflow',
      description: 'Creating optimal n8n workflow architecture and node connections',
      status: 'completed', 
      agent: 'Workflow Designer Agent',
      details: ['Selected optimal node types', 'Designed data flow architecture', 'Applied best practices']
    },
    {
      id: 'generation',
      title: 'Generating Code',
      description: 'Converting design into executable n8n workflow JSON',
      status: 'in_progress',
      progress: 65,
      agent: 'Workflow Designer Agent',
      details: ['Generated node configurations', 'Creating connection mappings', 'Applying error handling']
    },
    {
      id: 'validation',
      title: 'Validating Structure', 
      description: 'Ensuring workflow meets n8n requirements and best practices',
      status: 'pending',
      agent: 'Deployment Agent'
    },
    {
      id: 'deployment',
      title: 'Deploying to n8n',
      description: 'Pushing workflow to n8n and configuring settings',
      status: 'pending',
      agent: 'Deployment Agent'
    },
    {
      id: 'testing',
      title: 'Running Tests',
      description: 'Verifying workflow functionality and performance',
      status: 'pending',
      agent: 'Deployment Agent'
    }
  ];

  const stepsToShow = workflowSteps.length > 0 ? workflowSteps : defaultSteps;

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    handleStageChange('chat');
    if (onCreateWorkflow) {
      onCreateWorkflow();
    }
  };

  // Handle onboarding skip
  const handleOnboardingSkip = () => {
    handleStageChange('chat');
    if (onSkipOnboarding) {
      onSkipOnboarding();
    }
  };

  // Handle workflow retry
  const handleRetry = () => {
    if (onRetryWorkflow) {
      onRetryWorkflow();
    }
    handleStageChange('progress');
  };

  // Handle auto-fix
  const handleAutoFix = () => {
    if (onAutoFix) {
      onAutoFix();
    }
  };

  // Handle manual fix
  const handleManualFix = (errorId: string) => {
    if (onManualFix) {
      onManualFix(errorId);
    }
  };

  // Handle start over
  const handleStartOver = () => {
    if (onStartOver) {
      onStartOver();
    }
    handleStageChange('chat');
  };

  // Handle create another workflow
  const handleCreateAnother = () => {
    handleStageChange('chat');
    if (onCreateWorkflow) {
      onCreateWorkflow();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {journeyStage === 'onboarding' && showOnboarding && (
        <WorkflowOnboardingScreen
          key="onboarding"
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
          userType={userType}
        />
      )}
      
      {journeyStage === 'progress' && (
        <WorkflowProgressScreen
          key="progress"
          steps={stepsToShow}
          currentStep={currentStep}
          overallProgress={overallProgress}
          isComplete={false}
          hasErrors={false}
          workflowName={workflowName}
          onRetry={handleRetry}
          onCancel={handleStartOver}
          estimatedTimeRemaining={30}
        />
      )}
      
      {journeyStage === 'completion' && completedWorkflow && (
        <WorkflowCompletionScreen
          key="completion"
          workflow={completedWorkflow}
          metrics={generationMetrics}
          onCreateAnother={handleCreateAnother}
          onViewDashboard={onViewDashboard}
          onTestWorkflow={onTestWorkflow}
          onEditWorkflow={onEditWorkflow}
          onViewAnalytics={onViewAnalytics}
        />
      )}
      
      {journeyStage === 'error' && errors.length > 0 && (
        <ErrorRecoveryScreen
          key="error"
          errors={errors}
          workflowName={workflowName}
          isHealing={isHealing}
          healingProgress={healingProgress}
          onRetry={handleRetry}
          onAutoFix={handleAutoFix}
          onManualFix={handleManualFix}
          onContactSupport={onContactSupport}
          onStartOver={handleStartOver}
          canAutoFix={canAutoFix}
        />
      )}
    </AnimatePresence>
  );
};

export default WorkflowJourneyManager;