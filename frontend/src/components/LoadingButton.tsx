import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, RotateCcw, AlertCircle } from 'lucide-react';
import { LoadingState } from '../lib/hooks/useLoadingState';
import { buttonTokens } from '../styles/design-tokens';

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
  const getVariantStyles = (): React.CSSProperties => {
    const variant_key = variant in buttonTokens.variants ? variant : 'primary';
    const variantTokens = buttonTokens.variants[variant_key as keyof typeof buttonTokens.variants];
    
    return {
      backgroundColor: variantTokens.bg,
      color: variantTokens.text,
      borderColor: variantTokens.border,
    };
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'hover:opacity-90';
      case 'secondary':
        return 'hover:opacity-90';
      case 'danger':
        return 'hover:opacity-90';
      case 'ghost':
        return 'hover:opacity-90';
      default:
        return 'hover:opacity-90';
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    const size_key = size in buttonTokens.sizes ? size : 'md';
    const sizeTokens = buttonTokens.sizes[size_key as keyof typeof buttonTokens.sizes];
    
    return {
      padding: sizeTokens.padding,
      fontSize: sizeTokens.fontSize,
      borderRadius: sizeTokens.radius,
    };
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
          style={{ ...getVariantStyles(), ...getSizeStyles() }}
          className={`
            inline-flex items-center justify-center gap-2 border font-medium
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
            ${getVariantClasses()} ${className}
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
      style={{ ...getVariantStyles(), ...getSizeStyles() }}
      className={`
        inline-flex items-center justify-center gap-2 border font-medium
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getVariantClasses()} ${className}
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