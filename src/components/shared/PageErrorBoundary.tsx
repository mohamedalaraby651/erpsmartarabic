import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { emitTelemetry } from '@/lib/runtimeTelemetry';

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

      return (
        <div className="flex items-center justify-center min-h-[50vh] p-4" dir="rtl">
          <Card className="max-w-md w-full border-destructive/20 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 p-3 rounded-full bg-destructive/10 w-fit">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                حدث خطأ غير متوقع
              </h2>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                نعتذر عن الإزعاج. يمكنك إعادة المحاولة أو العودة للرئيسية.
              </p>
              {import.meta.env.DEV && this.state.error && (
                <details className="text-start mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    تفاصيل الخطأ
                  </summary>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs font-mono text-destructive overflow-auto max-h-32">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </CardContent>
            <CardFooter className="flex gap-2 justify-center">
              <Button onClick={this.handleRetry} size="sm" className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                إعادة المحاولة
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" size="sm" className="gap-1.5">
                <Home className="h-3.5 w-3.5" />
                الرئيسية
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
