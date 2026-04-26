import React, { Component, ErrorInfo, ReactNode } from 'react';
import { emitTelemetry } from '@/lib/runtimeTelemetry';
import RouteErrorPage from '@/pages/RouteErrorPage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the whole app.
 */
export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console
    console.error('[AppErrorBoundary] Caught error:', error);
    console.error('[AppErrorBoundary] Component stack:', errorInfo.componentStack);

    // Ship a structured diagnostic event (buffered locally + best-effort to backend)
    emitTelemetry('react_error_boundary', error.message || error.name || 'unknown', {
      errorName: error.name,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack ?? undefined,
      metadata: { boundary: 'AppErrorBoundary' },
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const msg = this.state.error?.message || '';
      const isChunk = /chunk|dynamically imported|Importing a module/i.test(msg);
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      const variant: 'crash' | 'chunk' | 'offline' = isOffline ? 'offline' : isChunk ? 'chunk' : 'crash';

      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <RouteErrorPage
            error={this.state.error}
            componentStack={this.state.errorInfo?.componentStack ?? null}
            onRetry={this.handleRetry}
            variant={variant}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <AppErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </AppErrorBoundary>
    );
  };
}

export default AppErrorBoundary;
