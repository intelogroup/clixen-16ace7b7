import React from 'react';
import { motion } from 'framer-motion';

// Skeleton components for loading states
export const SkeletonCard = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="bg-zinc-800 rounded-lg h-6 w-3/4 mb-2"></div>
    <div className="bg-zinc-800 rounded h-4 w-full mb-2"></div>
    <div className="bg-zinc-800 rounded h-4 w-2/3"></div>
  </div>
);

export const SkeletonWorkflowCard = () => (
  <div className="animate-pulse border border-zinc-800 rounded-lg p-6">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-zinc-800 rounded h-4 w-1/3"></div>
          <div className="bg-zinc-800 rounded-full h-5 w-12"></div>
        </div>
        <div className="bg-zinc-800 rounded h-3 w-full mb-2"></div>
        <div className="flex space-x-4">
          <div className="bg-zinc-800 rounded h-3 w-16"></div>
          <div className="bg-zinc-800 rounded h-3 w-20"></div>
          <div className="bg-zinc-800 rounded h-3 w-24"></div>
        </div>
      </div>
      <div className="flex space-x-2 ml-4">
        <div className="bg-zinc-800 rounded h-8 w-8"></div>
        <div className="bg-zinc-800 rounded h-8 w-8"></div>
      </div>
    </div>
  </div>
);

export const SkeletonStatCard = () => (
  <div className="animate-pulse bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="bg-zinc-800 rounded h-4 w-20 mb-2"></div>
        <div className="bg-zinc-800 rounded h-8 w-12"></div>
      </div>
      <div className="bg-zinc-800 rounded-lg h-12 w-12"></div>
    </div>
  </div>
);

// Enhanced loading spinner with multiple variants
export const LoadingSpinner = ({ 
  size = 'md', 
  variant = 'default',
  className = ''
}: { 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'pulse' | 'dots' | 'bars';
  className?: string;
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  if (variant === 'pulse') {
    return (
      <motion.div
        className={`rounded-full bg-white/20 ${sizeClasses[size]} ${className}`}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    );
  }

  if (variant === 'dots') {
    return (
      <div className={`flex space-x-1 ${className}`}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-white/60 rounded-full"
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.1
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'bars') {
    return (
      <div className={`flex space-x-1 ${className}`}>
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="w-1 bg-white/60 rounded-full"
            animate={{ height: [4, 16, 4] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.1
            }}
          />
        ))}
      </div>
    );
  }

  // Default spinner
  return (
    <div
      className={`border-2 border-white/20 border-t-white rounded-full animate-spin ${sizeClasses[size]} ${className}`}
    />
  );
};

// Page-level loading component
export const PageLoading = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center h-64 space-y-4">
    <LoadingSpinner size="lg" variant="pulse" />
    <p className="text-zinc-400 text-sm font-medium">{message}</p>
  </div>
);

// Button loading state
export const ButtonLoading = ({ 
  children, 
  loading = false, 
  loadingText = "Loading...",
  ...props 
}: {
  children: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  [key: string]: any;
}) => (
  <button {...props} disabled={loading || props.disabled}>
    {loading ? (
      <div className="flex items-center space-x-2">
        <LoadingSpinner size="sm" />
        <span>{loadingText}</span>
      </div>
    ) : (
      children
    )}
  </button>
);

// Smart loading overlay for existing content
export const LoadingOverlay = ({ 
  loading, 
  children,
  blur = true
}: { 
  loading: boolean; 
  children: React.ReactNode;
  blur?: boolean;
}) => (
  <div className="relative">
    {children}
    {loading && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg ${
          blur ? 'backdrop-blur-sm' : ''
        }`}
      >
        <div className="bg-zinc-900 rounded-lg p-4 flex items-center space-x-3">
          <LoadingSpinner size="md" />
          <span className="text-white text-sm font-medium">Processing...</span>
        </div>
      </motion.div>
    )}
  </div>
);