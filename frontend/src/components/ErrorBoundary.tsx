import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      copied: false
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      errorInfo
    });

    // Call the error callback if provided
    this.props.onError?.(error, errorInfo);

    // Log to external error tracking service
    this.logErrorToService(error, errorInfo);
  }

  public componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys && resetKeys.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Integration with error tracking services
    try {
      // Example: Sentry, LogRocket, etc.
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group('🚨 Error Boundary');
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        console.error('Error ID:', this.state.errorId);
        console.groupEnd();
      }

      // TODO: Send to error tracking service
      // errorTrackingService.captureException(error, { extra: errorData });
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  };

  private resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      copied: false
    });
  };

  private handleRetry = () => {
    this.resetErrorBoundary();
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private copyErrorInfo = async () => {
    const { error, errorInfo, errorId } = this.state;
    
    const errorText = `
Error ID: ${errorId}
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      
      this.resetTimeoutId = window.setTimeout(() => {
        this.setState({ copied: false });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy error info:', err);
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white rounded-lg shadow-lg border border-gray-200 p-8"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
                className="mx-auto flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4"
              >
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </motion.div>

              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Something went wrong
              </h1>
              
              <p className="text-gray-600 mb-6">
                We encountered an unexpected error. Our team has been notified and is working on a fix.
              </p>

              <div className="space-y-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={this.handleRetry}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </motion.button>

                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={this.handleGoHome}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    Go Home
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={this.handleReload}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reload
                  </motion.button>
                </div>
              </div>

              {this.props.showDetails && this.state.error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6 text-left"
                >
                  <details className="bg-gray-50 rounded-lg p-4">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                      <Bug className="w-4 h-4" />
                      Technical Details
                    </summary>
                    
                    <div className="space-y-3 text-xs text-gray-600">
                      <div>
                        <strong>Error ID:</strong> {this.state.errorId}
                      </div>
                      <div>
                        <strong>Message:</strong> {this.state.error.message}
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <strong>Stack Trace:</strong>
                          <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={this.copyErrorInfo}
                      className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                    >
                      {this.state.copied ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy Error Info
                        </>
                      )}
                    </motion.button>
                  </details>
                </motion.div>
              )}

              <p className="text-xs text-gray-500 mt-6">
                If this problem persists, please contact support with Error ID: {this.state.errorId}
              </p>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryConfig?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryConfig}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default ErrorBoundary;