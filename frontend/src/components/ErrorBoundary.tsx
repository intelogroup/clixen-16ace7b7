/**
 * Enhanced Error Boundary for Clixen MVP
 * Recommended by Error Diagnostics Agent
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorLogger } from '../lib/errorLogger';

interface Props {
  children: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { componentName = 'UnknownComponent' } = this.props;

    errorLogger.logError({
      type: 'component',
      severity: 'critical',
      message: `React Error Boundary: ${componentName}`,
      originalError: error,
      context: {
        component: componentName,
        errorBoundary: 'ErrorBoundary',
        additionalData: { componentStack: errorInfo.componentStack }
      }
    });
  }

  private resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 text-xl font-semibold mb-4">
            🚨 Component Error
          </div>
          <button
            onClick={this.resetError}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}