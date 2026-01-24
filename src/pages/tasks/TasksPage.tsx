import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare, Plus, Calendar, Clock, User, ListTodo, CheckCircle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileListSkeleton } from "@/components/mobile/MobileListSkeleton";
import { DataCard } from "@/components/mobile/DataCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { EmptyState } from "@/components/shared/EmptyState";

type Task = Database['public']['Tables']['tasks']['Row'];

const TasksPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
  });

  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('tasks').insert({
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        due_date: data.due_date || null,
        created_by: user?.id,
        assigned_to: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: "تم إضافة المهمة بنجاح" });
      setIsDialogOpen(false);
      setFormData({ title: '', description: '', priority: 'medium', due_date: '' });
    },
    onError: () => {
      toast({ title: "حدث خطأ أثناء إضافة المهمة", variant: "destructive" });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ is_completed })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const filteredTasks = tasks?.filter(t => {
    if (filter === 'pending') return !t.is_completed;
    if (filter === 'completed') return t.is_completed;
    return true;
  }) || [];

  const pendingCount = tasks?.filter(t => !t.is_completed).length || 0;
  const completedCount = tasks?.filter(t => t.is_completed).length || 0;

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'high':
        return { text: 'عاجل', variant: 'destructive' as const };
      case 'medium':
        return { text: 'متوسط', variant: 'outline' as const, className: 'bg-warning/10 text-warning border-warning/20' };
      default:
        return { text: 'منخفض', variant: 'secondary' as const };
    }
  };

  // Mobile Task Card
  const renderTaskCard = (task: Task) => {
    const priorityBadge = getPriorityBadge(task.priority);
    return (
      <DataCard
        key={task.id}
        title={task.title}
        subtitle={task.description || undefined}
        icon={
          task.is_completed ? (
            <CheckCircle className="h-5 w-5 text-success" />
          ) : (
            <ListTodo className="h-5 w-5" />
          )
        }
        badge={priorityBadge}
        className={task.is_completed ? 'opacity-60' : ''}
        fields={[
          task.due_date && { label: "الاستحقاق", value: new Date(task.due_date).toLocaleDateString('ar-EG'), icon: <Calendar className="h-3 w-3" /> },
          { label: "الإنشاء", value: new Date(task.created_at).toLocaleDateString('ar-EG'), icon: <Clock className="h-3 w-3" /> },
        ].filter(Boolean) as any[]}
        onClick={() => toggleTaskMutation.mutate({ id: task.id, is_completed: !task.is_completed })}
        rightContent={
          <Checkbox
            checked={task.is_completed || false}
            onCheckedChange={(checked) =>
              toggleTaskMutation.mutate({ id: task.id, is_completed: checked as boolean })
            }
            onClick={(e) => e.stopPropagation()}
          />
        }
      />
    );
  };

  const pageContent = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckSquare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">المهام</h1>
          <Badge variant="outline">{pendingCount} معلقة</Badge>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 ml-2" />
              مهمة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة مهمة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="title">عنوان المهمة</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="أدخل عنوان المهمة"
                />
              </div>
              <div>
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف المهمة (اختياري)"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">الأولوية</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData({ ...formData, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفضة</SelectItem>
                      <SelectItem value="medium">متوسطة</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => createTaskMutation.mutate(formData)}
                disabled={!formData.title || createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? 'جاري الإضافة...' : 'إضافة المهمة'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards - Mobile optimized */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ListTodo className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tasks?.length || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي المهام</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">معلقة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {!isMobile && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedCount}</p>
                  <p className="text-sm text-muted-foreground">مكتملة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size={isMobile ? "sm" : "default"}
        >
          الكل ({tasks?.length || 0})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
          size={isMobile ? "sm" : "default"}
        >
          معلقة ({pendingCount})
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          onClick={() => setFilter('completed')}
          size={isMobile ? "sm" : "default"}
        >
          مكتملة ({completedCount})
        </Button>
      </div>

      {isLoading ? (
        isMobile ? (
          <MobileListSkeleton count={5} />
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </CardContent>
          </Card>
        )
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="لا توجد مهام"
          description={filter === 'all' ? "أضف مهمة جديدة للبدء" : filter === 'pending' ? "لا توجد مهام معلقة" : "لا توجد مهام مكتملة"}
          action={filter === 'all' ? {
            label: "إضافة مهمة",
            onClick: () => setIsDialogOpen(true)
          } : undefined}
        />
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredTasks.map(renderTaskCard)}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <Card
              key={task.id}
              className={`transition-colors ${task.is_completed ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={task.is_completed || false}
                    onCheckedChange={(checked) =>
                      toggleTaskMutation.mutate({ id: task.id, is_completed: checked as boolean })
                    }
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold ${task.is_completed ? 'line-through' : ''}`}>
                        {task.title}
                      </h4>
                      <Badge 
                        variant={getPriorityBadge(task.priority).variant}
                        className={getPriorityBadge(task.priority).className}
                      >
                        {getPriorityBadge(task.priority).text}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-muted-foreground text-sm mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleDateString('ar-EG')}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(task.created_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        {pageContent}
      </PullToRefresh>
    );
  }

  return pageContent;
};

export default TasksPage;
