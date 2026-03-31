import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, MessageCircle, StickyNote, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { CustomerAlert } from '@/hooks/useCustomerAlerts';

interface AlertItemActionsProps {
  alert: CustomerAlert;
  onDismiss?: (key: string) => void;
}

export const AlertItemActions = ({ alert, onDismiss }: AlertItemActionsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const alertKey = `${alert.type}-${alert.customerId}`;

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (alert.customerPhone) {
      window.open(`https://wa.me/${alert.customerPhone.replace(/\D/g, '')}`, '_blank');
    }
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/customers/${alert.customerId}`);
  };

  const handleSaveNote = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!note.trim() || !user?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('customer_notes').insert({
        customer_id: alert.customerId,
        user_id: user.id,
        content: `[تنبيه: ${alert.type}] ${note.trim()}`,
        is_pinned: false,
      });
      if (error) throw error;
      setNote('');
      setShowNote(false);
      toast.success('تم حفظ الملاحظة');
    } catch {
      toast.error('حدث خطأ أثناء حفظ الملاحظة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={handleView}>
          <Eye className="h-3 w-3" /> عرض
        </Button>
        {alert.customerPhone && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-emerald-600 hover:text-emerald-700" onClick={handleWhatsApp}>
            <MessageCircle className="h-3 w-3" /> واتساب
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setShowNote(!showNote); }}>
          <StickyNote className="h-3 w-3" /> ملاحظة
        </Button>
        {onDismiss && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground ms-auto" onClick={(e) => { e.stopPropagation(); onDismiss(alertKey); }}>
            <X className="h-3 w-3" /> إخفاء
          </Button>
        )}
      </div>
      {showNote && (
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <Input
            value={note} onChange={e => setNote(e.target.value)}
            placeholder="اكتب ملاحظة سريعة..."
            className="h-7 text-xs flex-1"
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSaveNote(e); }}
          />
          <Button variant="default" size="sm" className="h-7 px-2" onClick={handleSaveNote} disabled={!note.trim() || saving}>
            <Send className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
