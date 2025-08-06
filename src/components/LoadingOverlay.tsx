import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { LoadingState } from '../lib/hooks/useLoadingState';

export interface LoadingOverlayProps {
  loadingState: LoadingState;
  onRetry?: () => void;
  className?: string;
  overlay?: boolean;
  loadingMessage?: string;
  retryMessage?: string;
  showProgress?: boolean;
  children?: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loadingState,
  onRetry,
  className = '',
  overlay = true,
  loadingMessage = 'Loading...',
  retryMessage = 'Something went wrong',
  showProgress = false,
  children
}) => {
  const { isLoading, isRetrying, error, canRetry, attempt } = loadingState;

  if (!isLoading && !isRetrying && !error) {
    return <>{children}</>;
  }

  const LoadingContent = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {isLoading || isRetrying ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="mb-4"
          >
            <Loader2 className="w-8 h-8 text-blue-500" />
          </motion.div>
          
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">
              {isRetrying ? `Retrying${attempt > 0 ? ` (${attempt})` : ''}...` : loadingMessage}
            </p>
            
            {isRetrying && (
              <p className="text-sm text-gray-600">
                Please wait while we try again
              </p>
            )}
            
            {showProgress && attempt > 0 && (
              <div className="w-48 bg-gray-200 rounded-full h-2 mt-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(attempt / 3) * 100}%` }}
                  className="bg-blue-500 h-2 rounded-full"
                />
              </div>
            )}
          </div>
        </>
      ) : error ? (
        <>
          <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
          
          <div className="space-y-4">
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                {retryMessage}
              </p>
              <p className="text-sm text-gray-600">
                {error.message || 'An unexpected error occurred'}
              </p>
            </div>
            
            {canRetry && onRetry && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </motion.button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );

  if (overlay) {
    return (
      <div className={`relative ${className}`}>
        {children}
        
        <AnimatePresence>
          {(isLoading || isRetrying || error) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-lg shadow-lg border"
              >
                <LoadingContent />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <AnimatePresence mode="wait">
        {(isLoading || isRetrying || error) && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <LoadingContent />
          </motion.div>
        )}
        
        {!isLoading && !isRetrying && !error && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoadingOverlay;