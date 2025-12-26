import { useState } from "react";
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
import { CheckSquare, Plus, Calendar, Clock, User } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Task = Database['public']['Tables']['tasks']['Row'];

const TasksPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
  });

  const { data: tasks, isLoading } = useQuery({
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
        return <Badge variant="destructive">عاجل</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">متوسط</Badge>;
      default:
        return <Badge variant="secondary">منخفض</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-muted-foreground">جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          الكل ({tasks?.length || 0})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          معلقة ({pendingCount})
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          onClick={() => setFilter('completed')}
        >
          مكتملة ({completedCount})
        </Button>
      </div>

      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">لا توجد مهام</p>
          </CardContent>
        </Card>
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
                      {getPriorityBadge(task.priority)}
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
};

export default TasksPage;
