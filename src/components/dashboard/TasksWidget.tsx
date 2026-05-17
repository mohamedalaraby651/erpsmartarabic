import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { DashboardListCard, type AccentTone } from './_shared/DashboardListCard';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  is_completed: boolean;
}

interface TasksWidgetProps {
  tasks: Task[] | undefined;
}

const priorityTone = (p: string): AccentTone =>
  p === 'high' ? 'destructive' : p === 'medium' ? 'warning' : 'success';

const priorityLabel = (p: string) =>
  p === 'high' ? 'عاجل' : p === 'medium' ? 'متوسط' : 'منخفض';

const priorityBadge = (p: string): 'destructive' | 'secondary' | 'default' =>
  p === 'high' ? 'destructive' : 'secondary';

export const TasksWidget = memo(function TasksWidget({ tasks }: TasksWidgetProps) {
  const navigate = useNavigate();

  // Compact mobile header (CustomerPageHeader pattern)
  const MobileHeader = (
    <div className="sm:hidden flex items-center justify-between px-3 pt-2.5 pb-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <h3 className="text-base font-bold">المهام</h3>
        {tasks && tasks.length > 0 && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full tabular-nums">
            {tasks.length}
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-9 text-[11px] px-2.5 shrink-0"
        onClick={() => navigate('/tasks')}
      >
        عرض الكل
        <ArrowLeft className="mr-1 h-3 w-3" />
      </Button>
    </div>
  );

  // Desktop header (original)
  const DesktopHeader = (
    <CardHeader className="hidden sm:flex flex-row items-center justify-between px-6 pt-6 pb-1.5">
      <div className="min-w-0">
        <CardTitle className="text-lg">المهام</CardTitle>
        <CardDescription className="text-sm leading-tight">المهام المطلوب إنجازها</CardDescription>
      </div>
      <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0 px-2" onClick={() => navigate('/tasks')}>
        عرض الكل
        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
      </Button>
    </CardHeader>
  );

  if (tasks === undefined) {
    return (
      <>
        {MobileHeader}
        {DesktopHeader}
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 min-h-[160px]">
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg bg-muted/40 animate-pulse h-[56px]" />
            ))}
          </div>
        </CardContent>
      </>
    );
  }

  if (tasks.length === 0) {
    return (
      <>
        {MobileHeader}
        {DesktopHeader}
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 min-h-[160px]">
          <div className="text-center py-6 px-4">
            <CheckCircle2 className="h-9 w-9 mx-auto mb-2 text-success" />
            <p className="text-sm font-medium mb-1">لا توجد مهام معلقة</p>
            <p className="text-xs text-muted-foreground mb-3">ابدأ بإضافة مهمة جديدة لتنظيم عملك</p>
            <Button size="sm" variant="outline" onClick={() => navigate('/tasks?action=new')}>
              إضافة مهمة
            </Button>
          </div>
        </CardContent>
      </>
    );
  }

  return (
    <>
      {MobileHeader}
      {DesktopHeader}
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 min-h-[160px]">
        {/* Mobile: list-card pattern */}
        <div className="sm:hidden space-y-2 animate-fade-in">
          {tasks.map((task) => (
            <DashboardListCard
              key={task.id}
              accentTone={priorityTone(task.priority)}
              onTap={() => navigate('/tasks')}
              ariaLabel={`${task.title} — ${priorityLabel(task.priority)}`}
              leading={
                <div className={cn(
                  'h-2 w-2 rounded-full',
                  task.priority === 'high' ? 'bg-destructive' :
                  task.priority === 'medium' ? 'bg-warning' : 'bg-success',
                )} />
              }
              title={task.title}
              meta={task.due_date ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(task.due_date).toLocaleDateString('ar-EG')}
                </span>
              ) : null}
              trailing={
                <Badge variant={priorityBadge(task.priority)} className="text-[10px] px-1.5 py-0 h-4">
                  {priorityLabel(task.priority)}
                </Badge>
              }
            />
          ))}
        </div>

        {/* Desktop: original compact rows */}
        <div className="hidden sm:block space-y-1.5 animate-fade-in">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 md:hover:bg-muted transition-all min-h-[44px]"
            >
              <div className={`h-2 w-2 rounded-full shrink-0 ${
                task.priority === 'high' ? 'bg-destructive' :
                task.priority === 'medium' ? 'bg-warning' : 'bg-success'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate leading-tight">{task.title}</p>
                {task.due_date && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 leading-tight">
                    <Clock className="h-3 w-3" />
                    {new Date(task.due_date).toLocaleDateString('ar-EG')}
                  </p>
                )}
              </div>
              <Badge variant={priorityBadge(task.priority)} className="text-xs shrink-0 px-1.5 py-0 h-5">
                {priorityLabel(task.priority)}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </>
  );
});
