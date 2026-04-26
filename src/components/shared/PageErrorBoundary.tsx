import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { emitTelemetry } from '@/lib/runtimeTelemetry';
import RouteErrorPage from '@/pages/RouteErrorPage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Lightweight page-level error boundary.
 * Catches errors in any page and shows a localized recovery UI.
 */
export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PageErrorBoundary]', error, info.componentStack);
    emitTelemetry('react_error_boundary', error.message || error.name || 'unknown', {
      errorName: error.name,
      errorStack: error.stack,
      componentStack: info.componentStack ?? undefined,
      metadata: { boundary: 'PageErrorBoundary' },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const msg = this.state.error?.message || '';
      const isChunk = /chunk|dynamically imported|Importing a module/i.test(msg);
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      const variant: 'crash' | 'chunk' | 'offline' = isOffline ? 'offline' : isChunk ? 'chunk' : 'crash';

      return (
        <RouteErrorPage
          error={this.state.error}
          onRetry={this.handleRetry}
          variant={variant}
        />
      );
    }

    return this.props.children;
  }
}
