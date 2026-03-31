import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Activity, Plus, Edit, Trash2, CreditCard, FileText, UserPlus,
  Settings, Eye, ArrowUpDown,
} from "lucide-react";
import { ActivityDiffViewer } from "@/components/customers/ActivityDiffViewer";
import type { Database } from "@/integrations/supabase/types";

type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];

const actionIconMap: Record<string, React.ElementType> = {
  create: Plus,
  created: Plus,
  insert: Plus,
  add: UserPlus,
  update: Edit,
  updated: Edit,
  edit: Edit,
  delete: Trash2,
  deleted: Trash2,
  remove: Trash2,
  payment: CreditCard,
  pay: CreditCard,
  invoice: FileText,
  view: Eye,
  setting: Settings,
  change: ArrowUpDown,
};

const actionColorMap: Record<string, string> = {
  create: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  created: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  insert: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  add: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  update: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  updated: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  edit: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  delete: 'bg-destructive/10 text-destructive',
  deleted: 'bg-destructive/10 text-destructive',
  remove: 'bg-destructive/10 text-destructive',
  payment: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  pay: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  invoice: 'bg-primary/10 text-primary',
};

function getActionIcon(action: string): React.ElementType {
  const lowerAction = action.toLowerCase();
  for (const [key, icon] of Object.entries(actionIconMap)) {
    if (lowerAction.includes(key)) return icon;
  }
  return Activity;
}

function getActionColor(action: string): string {
  const lowerAction = action.toLowerCase();
  for (const [key, color] of Object.entries(actionColorMap)) {
    if (lowerAction.includes(key)) return color;
  }
  return 'bg-primary/10 text-primary';
}

// renderChanges replaced by ActivityDiffViewer component

export const CustomerTabActivity = memo(function CustomerTabActivity({ activities }: { activities: ActivityLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل النشاط</CardTitle>
        <CardDescription>آخر الأحداث المتعلقة بالعميل</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">لا يوجد سجل نشاط</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute right-[19px] top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4">
              {activities.map((activity, index) => {
                const Icon = getActionIcon(activity.action);
                const colorClass = getActionColor(activity.action);

                return (
                  <div key={activity.id} className="relative flex gap-4 pr-1">
                    {/* Timeline dot */}
                    <div className={`relative z-10 p-2 rounded-full shrink-0 ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{activity.action}</p>
                          {activity.entity_name && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {activity.entity_type}: {activity.entity_name}
                            </p>
                          )}
                        </div>
                        <time className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                          {new Date(activity.created_at).toLocaleString('ar-EG', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </time>
                      </div>

                      {/* Changes diff */}
                      {renderChanges(activity.old_values, activity.new_values)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
