import React from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QuickAction {
  title: string;
  icon: React.ElementType;
  href: string;
  color: string;
  roles: string[];
}

interface QuickActionsWidgetProps {
  quickActions: QuickAction[];
  onAction: (action: QuickAction) => void;
}

export function QuickActionsWidget({ quickActions, onAction }: QuickActionsWidgetProps) {
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">الإجراءات السريعة</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.href + action.title}
                variant="outline"
                className="h-auto py-4 flex-col gap-2 hover:bg-accent"
                onClick={() => onAction(action)}
              >
                <div className={`h-10 w-10 rounded-lg ${action.color} flex items-center justify-center`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium">{action.title}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </>
  );
}
