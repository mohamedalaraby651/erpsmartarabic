import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Bell, Check, X } from 'lucide-react';

interface LivePreviewCardProps {
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: string;
  theme: string;
}

export function LivePreviewCard({
  primaryColor,
  accentColor,
  fontFamily,
  fontSize,
}: LivePreviewCardProps) {
  const getFontSize = () => {
    switch (fontSize) {
      case 'small': return '0.875rem';
      case 'large': return '1.125rem';
      default: return '1rem';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-4 w-4" />
          معاينة مباشرة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview Card */}
        <div 
          className="p-4 rounded-lg border-2 space-y-3"
          style={{ 
            fontFamily,
            fontSize: getFontSize(),
            borderColor: `${primaryColor}30`
          }}
        >
          {/* Header Preview */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                م
              </div>
              <div>
                <p className="font-semibold" style={{ fontFamily }}>عنوان البطاقة</p>
                <p className="text-xs text-muted-foreground">وصف قصير للبطاقة</p>
              </div>
            </div>
            <Badge 
              style={{ 
                backgroundColor: `${accentColor}20`,
                color: accentColor,
                borderColor: accentColor
              }}
              variant="outline"
            >
              نشط
            </Badge>
          </div>

          {/* Content Preview */}
          <p className="text-sm text-muted-foreground" style={{ fontFamily }}>
            هذا نص تجريبي لمعاينة كيف سيظهر المحتوى بالخط والحجم المختار.
          </p>

          {/* Buttons Preview */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              style={{ backgroundColor: primaryColor }}
              className="text-white hover:opacity-90"
            >
              <Check className="h-3 w-3 ml-1" />
              تأكيد
            </Button>
            <Button
              size="sm"
              variant="outline"
              style={{ 
                borderColor: accentColor,
                color: accentColor
              }}
              className="hover:opacity-80"
            >
              <X className="h-3 w-3 ml-1" />
              إلغاء
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
            >
              <Bell className="h-3 w-3 ml-1" />
              تذكير
            </Button>
          </div>

          {/* Progress Preview */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>التقدم</span>
              <span style={{ color: primaryColor }}>75%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: '75%',
                  background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`
                }}
              />
            </div>
          </div>
        </div>

        {/* Color Swatches */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>الألوان المطبقة:</span>
          <div 
            className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
            title="اللون الأساسي"
          />
          <div 
            className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: accentColor }}
            title="لون التمييز"
          />
        </div>
      </CardContent>
    </Card>
  );
}
