import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  ArrowLeft,
  CheckCircle, 
  Bot, 
  Zap, 
  Settings, 
  Globe,
  MessageSquare,
  Sparkles,
  Play,
  Users,
  BarChart3,
  Shield,
  Clock,
  Rocket,
  Brain
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface WorkflowOnboardingScreenProps {
  onComplete: () => void;
  onSkip: () => void;
  userType?: 'new' | 'returning' | 'experienced';
}

const WorkflowOnboardingScreen: React.FC<WorkflowOnboardingScreenProps> = ({
  onComplete,
  onSkip,
  userType = 'new'
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Clixen',
      description: 'Your AI-powered workflow automation platform',
      content: (
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6"
          >
            <Sparkles className="w-12 h-12 text-white" />
          </motion.div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to the Future of Automation
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Clixen transforms your ideas into powerful workflows using AI agents that understand natural language and create production-ready automation.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <Bot className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 mb-1">AI Agents</h3>
              <p className="text-sm text-gray-600">Multiple specialized AI agents work together</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <Zap className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 mb-1">Instant Deploy</h3>
              <p className="text-sm text-gray-600">From idea to running workflow in minutes</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <Settings className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 mb-1">No Code</h3>
              <p className="text-sm text-gray-600">Just describe what you want in plain English</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'how-it-works',
      title: 'How It Works',
      description: 'AI agents collaborate to build your workflows',
      content: (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Multi-Agent Workflow Creation
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  1. Describe Your Needs
                </h3>
                <p className="text-gray-600">
                  Tell us what you want to automate in natural language. Our Orchestrator Agent understands and breaks down your requirements.
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Brain className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  2. AI Design & Build
                </h3>
                <p className="text-gray-600">
                  Workflow Designer Agent creates optimal n8n workflows while Deployment Agent handles production setup and testing.
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Rocket className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  3. Deploy & Monitor
                </h3>
                <p className="text-gray-600">
                  Your workflow goes live instantly with monitoring, error handling, and performance optimization built-in.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'examples',
      title: 'What You Can Build',
      description: 'Real workflows created by AI in minutes',
      content: (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Popular Workflow Examples
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-200">
              <Globe className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Customer Onboarding
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                "Create a workflow that welcomes new users, sends them to our CRM, and triggers a welcome email sequence"
              </p>
              <div className="flex items-center text-sm text-blue-600">
                <Clock className="w-4 h-4 mr-1" />
                <span>Built in 2 minutes</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
              <BarChart3 className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Sales Pipeline
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                "When a lead fills out our contact form, add them to Salesforce and notify the sales team on Slack"
              </p>
              <div className="flex items-center text-sm text-green-600">
                <Clock className="w-4 h-4 mr-1" />
                <span>Built in 3 minutes</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
              <Users className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Team Notifications
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                "Monitor our support emails and automatically categorize and assign urgent tickets to the right team member"
              </p>
              <div className="flex items-center text-sm text-purple-600">
                <Clock className="w-4 h-4 mr-1" />
                <span>Built in 4 minutes</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-xl border border-orange-200">
              <Shield className="w-8 h-8 text-orange-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Data Backup
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                "Daily backup of our database to cloud storage with email confirmation and error alerts if it fails"
              </p>
              <div className="flex items-center text-sm text-orange-600">
                <Clock className="w-4 h-4 mr-1" />
                <span>Built in 1 minute</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'getting-started',
      title: 'Ready to Start?',
      description: 'Create your first workflow now',
      content: (
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-600 to-blue-600 rounded-full mb-6"
          >
            <Play className="w-10 h-10 text-white" />
          </motion.div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            You're All Set! 🎉
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Time to create your first AI-powered workflow. Just describe what you want to automate and watch our agents build it for you.
          </p>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              💡 Pro Tips for Better Results:
            </h3>
            <ul className="text-left text-gray-600 space-y-2">
              <li>• Be specific about what data you want to process</li>
              <li>• Mention the systems you want to connect (email, CRM, etc.)</li>
              <li>• Describe what should happen when things go wrong</li>
              <li>• Ask for notifications so you know it's working</li>
            </ul>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">Example to Get Started:</span>
            </div>
            <p className="text-sm text-yellow-700 italic">
              "Create a workflow that monitors our contact form submissions, validates the email addresses, stores valid submissions in our database, and sends a confirmation email to the user."
            </p>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => prev + 1);
    } else {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Get Started with Clixen</h1>
            <button
              onClick={onSkip}
              className="text-gray-500 hover:text-gray-700 transition-colors text-sm"
            >
              Skip tutorial
            </button>
          </div>
          
          <div className="flex items-center space-x-2 mb-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'bg-blue-600'
                    : completedSteps.has(index)
                    ? 'bg-green-600'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{Math.round(((currentStep + 1) / steps.length) * 100)}% complete</span>
          </div>
        </motion.div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-xl p-8 mb-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-sm font-medium text-blue-600 mb-2">
                {steps[currentStep].description}
              </h2>
            </div>
            
            <div className="min-h-[400px]">
              {steps[currentStep].content}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between"
        >
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              currentStep === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Previous</span>
          </button>
          
          <div className="flex items-center space-x-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-blue-600'
                    : completedSteps.has(index)
                    ? 'bg-green-600'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <button
            onClick={nextStep}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <span>{currentStep === steps.length - 1 ? 'Start Creating' : 'Next'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default WorkflowOnboardingScreen;