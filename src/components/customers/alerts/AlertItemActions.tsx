import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, MessageCircle, StickyNote, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CustomerAlert } from '@/hooks/useCustomerAlerts';

interface AlertItemActionsProps {
  alert: CustomerAlert;
  onDismiss?: (key: string) => void;
}

export const AlertItemActions = ({ alert, onDismiss }: AlertItemActionsProps) => {
  const navigate = useNavigate();
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');

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

  const handleSaveNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (note.trim()) {
      // Save note to localStorage for now
      const notes = JSON.parse(localStorage.getItem('customer-alert-notes') || '{}');
      notes[alertKey] = { note: note.trim(), date: new Date().toISOString() };
      localStorage.setItem('customer-alert-notes', JSON.stringify(notes));
      setNote('');
      setShowNote(false);
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
            onKeyDown={e => { if (e.key === 'Enter') handleSaveNote(e as any); }}
          />
          <Button variant="default" size="sm" className="h-7 px-2" onClick={handleSaveNote} disabled={!note.trim()}>
            <Send className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
