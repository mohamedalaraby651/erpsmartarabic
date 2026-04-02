import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface State { hasError: boolean }

export class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; title?: string },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardHeader><CardTitle className="text-base">{this.props.title || 'خطأ'}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 text-warning" />
              <p className="text-sm">حدث خطأ أثناء عرض هذا المكون</p>
              <Button variant="outline" size="sm" onClick={() => this.setState({ hasError: false })}>
                إعادة المحاولة
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
