import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react';

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

export const TasksWidget = memo(function TasksWidget({ tasks }: TasksWidgetProps) {
  const navigate = useNavigate();

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between px-3 pt-3 pb-2 sm:px-6 sm:pt-6">
        <div className="min-w-0">
          <CardTitle className="text-sm sm:text-lg">المهام</CardTitle>
          <CardDescription className="text-[11px] sm:text-sm">المهام المطلوب إنجازها</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0" onClick={() => navigate('/tasks')}>
          عرض الكل
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 min-h-[180px]">
        {tasks === undefined ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 animate-pulse h-[52px]" />
            ))}
          </div>
        ) : tasks.length > 0 ? (
          <div className="space-y-2 animate-fade-in">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg bg-muted/50 active:scale-[0.99] md:hover:bg-muted transition-all"
              >
                <div className={`h-2 w-2 rounded-full shrink-0 ${
                  task.priority === 'high' ? 'bg-destructive' :
                  task.priority === 'medium' ? 'bg-warning' : 'bg-success'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{task.title}</p>
                  {task.due_date && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(task.due_date).toLocaleDateString('ar-EG')}
                    </p>
                  )}
                </div>
                <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-[10px] sm:text-xs shrink-0">
                  {task.priority === 'high' ? 'عاجل' : task.priority === 'medium' ? 'متوسط' : 'منخفض'}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 px-4">
            <CheckCircle2 className="h-9 w-9 mx-auto mb-2 text-success" />
            <p className="text-sm font-medium mb-1">لا توجد مهام معلقة</p>
            <p className="text-xs text-muted-foreground mb-3">ابدأ بإضافة مهمة جديدة لتنظيم عملك</p>
            <Button size="sm" variant="outline" onClick={() => navigate('/tasks?action=new')}>
              إضافة مهمة
            </Button>
          </div>
        )}
      </CardContent>
    </>
  );
});

