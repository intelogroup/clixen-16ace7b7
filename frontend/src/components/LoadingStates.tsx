import React from 'react';
import { Loader2, Zap, CheckCircle } from 'lucide-react';

// Main app loading screen
export const AppLoading = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
        <Zap className="w-8 h-8 text-white" />
      </div>
      
      <div className="flex justify-center mb-4">
        <div className="spinner-clean"></div>
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Loading Clixen
      </h2>
      
      <p className="text-gray-600">
        Preparing your AI workspace...
      </p>
    </div>
  </div>
);

// Page transition loading
export const PageLoading = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="spinner-clean mx-auto mb-4"></div>
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  </div>
);

// Component loading skeleton
export const ComponentSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-100 rounded-xl border border-gray-200 ${className}`}>
    <div className="p-6 space-y-4">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  </div>
);

// Simple loading button - Use LoadingButton from ../components/LoadingButton for advanced functionality

// Form field loading
export const FieldLoading = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
    <div className="h-12 bg-gray-100 rounded-lg border border-gray-200"></div>
  </div>
);

// Chat message loading
export const MessageLoading = () => (
  <div className="flex gap-3 items-start">
    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
      <span className="text-sm text-white">🤖</span>
    </div>
    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
        <span className="text-gray-600 text-sm ml-2">AI is thinking...</span>
      </div>
    </div>
  </div>
);

// Card loading skeleton
export const CardSkeleton = () => (
  <div className="clean-card p-6 animate-pulse">
    <div className="flex items-center space-x-4 mb-4">
      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded"></div>
      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
    </div>
  </div>
);

// Table loading skeleton
export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="clean-card overflow-hidden">
    <div className="p-6 border-b border-gray-200">
      <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
    </div>
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="p-4 animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="w-20 h-6 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Success state
export const SuccessState = ({ title, message }: { title: string; message: string }) => (
  <div className="text-center py-12">
    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <CheckCircle className="w-8 h-8 text-green-600" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600">{message}</p>
  </div>
);

// Empty state
export const EmptyState = ({ 
  title, 
  message, 
  action 
}: { 
  title: string; 
  message: string; 
  action?: React.ReactNode;
}) => (
  <div className="text-center py-12">
    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <div className="w-8 h-8 bg-gray-300 rounded"></div>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-4">{message}</p>
    {action}
  </div>
);

// Progress indicator
export const ProgressIndicator = ({ progress, label }: { progress: number; label?: string }) => (
  <div className="space-y-2">
    {label && <div className="text-sm font-medium text-gray-700">{label}</div>}
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
    <div className="text-sm text-gray-600 text-right">{Math.round(progress)}%</div>
  </div>
);

// Inline loading spinner
export const InlineSpinner = ({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-500`} />
  );
};

export default {
  AppLoading,
  PageLoading,
  ComponentSkeleton,
  FieldLoading,
  MessageLoading,
  CardSkeleton,
  TableSkeleton,
  SuccessState,
  EmptyState,
  ProgressIndicator,
  InlineSpinner
};
