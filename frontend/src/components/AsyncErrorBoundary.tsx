import React, { Component, ErrorInfo, ReactNode } from 'react';
// Temporarily disable framer-motion to prevent blocking startup
// import { motion } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  onRetry?: () => void | Promise<void>;
  retryText?: string;
  maxRetries?: number;
  autoRetry?: boolean;
  autoRetryDelay?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
  isOnline: boolean;
}

export class AsyncErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
      isOnline: navigator.onLine
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AsyncErrorBoundary caught an error:', error, errorInfo);

    // Auto-retry for network errors
    if (this.isNetworkError(error) && this.props.autoRetry) {
      this.scheduleRetry();
    }
  }

  public componentDidMount() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  public componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private handleOnline = () => {
    this.setState({ isOnline: true });
    
    // Auto-retry when coming back online if there was a network error
    if (this.state.hasError && this.isNetworkError(this.state.error)) {
      this.handleRetry();
    }
  };

  private handleOffline = () => {
    this.setState({ isOnline: false });
  };

  private isNetworkError = (error: Error | null): boolean => {
    if (!error) return false;
    
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      error.name === 'NetworkError' ||
      error.name === 'TypeError' // Often indicates network issues in fetch
    );
  };

  private scheduleRetry = () => {
    const { maxRetries = 3, autoRetryDelay = 2000 } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      this.setState({ isRetrying: true });
      
      this.retryTimeoutId = window.setTimeout(() => {
        this.handleRetry();
      }, autoRetryDelay);
    }
  };

  private handleRetry = async () => {
    const { onRetry, maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      return;
    }

    this.setState({ 
      isRetrying: true,
      retryCount: this.state.retryCount + 1
    });

    try {
      if (onRetry) {
        await onRetry();
      }
      
      // Reset error state on successful retry
      this.setState({
        hasError: false,
        error: null,
        isRetrying: false
      });
    } catch (error) {
      this.setState({
        isRetrying: false,
        error: error as Error
      });

      // Schedule another retry for network errors
      if (this.isNetworkError(error as Error) && this.props.autoRetry) {
        this.scheduleRetry();
      }
    }
  };

  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false
    });
  };

  public render() {
    const { hasError, error, retryCount, isRetrying, isOnline } = this.state;
    const { retryText = 'Try Again', maxRetries = 3 } = this.props;

    if (hasError && error) {
      const isNetworkErr = this.isNetworkError(error);
      const canRetry = retryCount < maxRetries;

      return (
        <div className="flex items-center justify-center p-8">
          <div className="max-w-md text-center bg-white rounded-lg shadow-lg border p-6">
            {/* Icon */}
            <div
              className="mx-auto flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{
                backgroundColor: isNetworkErr ? (isOnline ? '#fef3c7' : '#fee2e2') : '#fee2e2'
              }}
            >
              {isNetworkErr ? (
                isOnline ? (
                  <Wifi className="w-8 h-8 text-amber-600" />
                ) : (
                  <WifiOff className="w-8 h-8 text-red-600" />
                )
              ) : (
                <AlertTriangle className="w-8 h-8 text-red-600" />
              )}
            </div>

            {/* Title */}
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {isNetworkErr 
                ? (isOnline ? 'Connection Problem' : 'No Internet Connection')
                : 'Something went wrong'
              }
            </h2>

            {/* Message */}
            <p className="text-gray-600 mb-4">
              {isNetworkErr 
                ? (isOnline 
                    ? 'There was a problem connecting to our servers.'
                    : 'Please check your internet connection and try again.'
                  )
                : error.message || 'An unexpected error occurred.'
              }
            </p>

            {/* Retry Info */}
            {retryCount > 0 && (
              <p className="text-sm text-gray-500 mb-4">
                Attempt {retryCount} of {maxRetries}
              </p>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {isRetrying ? (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <div className="animate-spin">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <span className="text-sm">Retrying...</span>
                </div>
              ) : (
                <>
                  {canRetry && (
                    <button
                      onClick={this.handleRetry}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {retryText}
                    </button>
                  )}

                  <button
                    onClick={this.resetError}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Dismiss
                  </button>
                </>
              )}
            </div>

            {/* Network Status */}
            {isNetworkErr && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs">
                {isOnline ? (
                  <>
                    <Wifi className="w-3 h-3 text-green-500" />
                    <span className="text-green-600">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-red-500" />
                    <span className="text-red-600">Offline</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AsyncErrorBoundary;