import React, { memo } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface QuickAction {
  title: string;
  icon: React.ElementType;
  href: string;
  tone: string;
  roles: string[];
}

interface QuickActionsWidgetProps {
  quickActions: QuickAction[];
  onAction: (action: QuickAction) => void;
}

export const QuickActionsWidget = memo(function QuickActionsWidget({
  quickActions, onAction,
}: QuickActionsWidgetProps) {
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
                className="h-auto py-4 flex-col gap-2 hover:bg-accent transition-all hover:-translate-y-0.5"
                onClick={() => onAction(action)}
              >
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', action.tone)}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{action.title}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </>
  );
});
