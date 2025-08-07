import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, RotateCcw, AlertCircle } from 'lucide-react';
import { LoadingState } from '../lib/hooks/useLoadingState';

export interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loadingState?: LoadingState;
  onRetry?: () => void;
  loadingText?: string;
  retryText?: string;
  showRetryButton?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  children,
  loadingState,
  onRetry,
  loadingText = 'Loading...',
  retryText = 'Retry',
  showRetryButton = true,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  ...props
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600';
      case 'secondary':
        return 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white border-red-600';
      case 'ghost':
        return 'bg-transparent hover:bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'md':
        return 'px-4 py-2 text-sm';
      case 'lg':
        return 'px-6 py-3 text-base';
      default:
        return 'px-4 py-2 text-sm';
    }
  };

  const isDisabled = disabled || loadingState?.isLoading || loadingState?.isRetrying;
  const hasError = loadingState?.error && !loadingState?.isLoading;

  // Show retry button if there's an error and retry is available
  if (hasError && loadingState?.canRetry && showRetryButton && onRetry) {
    return (
      <div className="flex items-center gap-2">
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          type="button"
          onClick={onRetry}
          className={`
            inline-flex items-center justify-center gap-2 border rounded-lg font-medium
            transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            ${getVariantClasses()} ${getSizeClasses()} ${className}
          `}
          {...props}
        >
          <RotateCcw className="w-4 h-4" />
          {retryText}
        </motion.button>
        
        {loadingState.error && (
          <div className="flex items-center gap-1 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Failed</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: isDisabled ? 1 : 0.95 }}
      type="button"
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center gap-2 border rounded-lg font-medium
        transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getVariantClasses()} ${getSizeClasses()} ${className}
      `}
      {...props}
    >
      {loadingState?.isLoading || loadingState?.isRetrying ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {loadingState.isRetrying ? `Retrying (${loadingState.attempt})...` : loadingText}
        </>
      ) : (
        children
      )}
    </motion.button>
  );
};

export default LoadingButton;