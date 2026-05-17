import React from 'react';
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

export function TasksWidget({ tasks }: TasksWidgetProps) {
  const navigate = useNavigate();

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">المهام</CardTitle>
          <CardDescription>المهام المطلوب إنجازها</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
          عرض الكل
          <ArrowLeft className="mr-2 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {tasks && tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className={`h-2 w-2 rounded-full ${
                  task.priority === 'high' ? 'bg-destructive' :
                  task.priority === 'medium' ? 'bg-warning' : 'bg-success'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{task.title}</p>
                  {task.due_date && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {new Date(task.due_date).toLocaleDateString('ar-EG')}
                    </p>
                  )}
                </div>
                <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                  {task.priority === 'high' ? 'عاجل' : task.priority === 'medium' ? 'متوسط' : 'منخفض'}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 px-4">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-success" />
            <p className="text-sm font-medium mb-1">لا توجد مهام معلقة</p>
            <p className="text-xs text-muted-foreground mb-4">ابدأ بإضافة مهمة جديدة لتنظيم عملك</p>
            <Button size="sm" variant="outline" onClick={() => navigate('/tasks?action=new')}>
              إضافة مهمة
            </Button>
          </div>
        )}
      </CardContent>
    </>
  );
}
