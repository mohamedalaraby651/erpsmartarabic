import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];

export const CustomerTabActivity = memo(function CustomerTabActivity({ activities }: { activities: ActivityLog[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>سجل النشاط</CardTitle><CardDescription>آخر الأحداث المتعلقة بالعميل</CardDescription></CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8"><Activity className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا يوجد سجل نشاط</p></div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-primary/10"><Activity className="h-4 w-4 text-primary" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{new Date(activity.created_at).toLocaleString('ar-EG')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
