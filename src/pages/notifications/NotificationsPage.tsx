import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bell, Check, CheckCheck, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { MobileListSkeleton } from "@/components/mobile/MobileListSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import type { Database } from "@/integrations/supabase/types";

type Notification = Database['public']['Tables']['notifications']['Row'];

const NotificationsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: "تم تحديد جميع الإشعارات كمقروءة" });
    },
  });

  const filteredNotifications = notifications?.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  }) || [];

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const getTypeBadge = (type: string | null) => {
    switch (type) {
      case 'warning':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">تنبيه</Badge>;
      case 'success':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20">نجاح</Badge>;
      case 'error':
        return <Badge variant="destructive">خطأ</Badge>;
      default:
        return <Badge variant="secondary">معلومات</Badge>;
    }
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const renderContent = () => {
    if (isLoading) {
      return <MobileListSkeleton count={5} />;
    }

    if (filteredNotifications.length === 0) {
      return (
        <EmptyState
          icon={Bell}
          title="لا توجد إشعارات"
          description={filter === 'unread' ? "لا توجد إشعارات غير مقروءة" : "لا توجد إشعارات"}
        />
      );
    }

    return (
      <div className="space-y-3">
        {filteredNotifications.map((notification) => (
          <Card
            key={notification.id}
            className={`transition-colors cursor-pointer hover:bg-muted/50 ${
              !notification.is_read ? 'border-primary/30 bg-primary/5' : ''
            }`}
            onClick={() => !notification.is_read && markAsReadMutation.mutate(notification.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="mt-1 shrink-0">
                  {getTypeIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-semibold">{notification.title}</h4>
                    {getTypeBadge(notification.type)}
                    {!notification.is_read && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(notification.created_at).toLocaleString('ar-EG')}
                  </p>
                </div>
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsReadMutation.mutate(notification.id);
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">الإشعارات</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} جديد</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 ml-2" />
            {isMobile ? "تحديد الكل" : "تحديد الكل كمقروء"}
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="all" className="flex-1 md:flex-none">الكل ({notifications?.length || 0})</TabsTrigger>
          <TabsTrigger value="unread" className="flex-1 md:flex-none">غير مقروء ({unreadCount})</TabsTrigger>
          <TabsTrigger value="read" className="flex-1 md:flex-none">مقروء ({(notifications?.length || 0) - unreadCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {isMobile ? (
            <PullToRefresh onRefresh={handleRefresh}>
              {renderContent()}
            </PullToRefresh>
          ) : (
            renderContent()
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationsPage;
