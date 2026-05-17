import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  name?: string;
}
interface State { hasError: boolean; error?: Error }

export class WidgetErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep error contained — do not crash the whole dashboard.
    // eslint-disable-next-line no-console
    console.error(`[Widget:${this.props.name || 'unknown'}]`, error, info);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-6 text-center border border-destructive/20 rounded-lg bg-destructive/5">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div className="text-sm text-muted-foreground">
            تعذّر عرض هذا القسم
            {this.props.name && <span className="block text-xs opacity-70">{this.props.name}</span>}
          </div>
          <Button variant="outline" size="sm" onClick={this.reset} className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
            إعادة المحاولة
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
