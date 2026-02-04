import { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppInitSkeleton() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(timer);
          return prev;
        }
        return prev + 15;
      });
    }, 200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[100]">
      {/* Logo with shimmer */}
      <div className="relative mb-8">
        <div className={cn(
          "h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-violet-500",
          "flex items-center justify-center shadow-lg shadow-primary/30",
          "shimmer-container"
        )}>
          <Layers className="h-10 w-10 text-white" />
        </div>
        
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/30 to-violet-500/30 blur-xl opacity-60 -z-10" />
      </div>
      
      {/* App name */}
      <h1 className="text-2xl font-bold mb-2 bg-gradient-to-l from-primary to-violet-500 bg-clip-text text-transparent">نظرة</h1>
      <p className="text-sm text-muted-foreground mb-6">نظام إدارة الأعمال</p>
      
      {/* Progress bar */}
      <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full progress-smooth"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Loading text */}
      <p className="text-sm text-muted-foreground animate-pulse">
        جاري تحميل النظام...
      </p>
      
      {/* Shimmer dots */}
      <div className="flex gap-1.5 mt-6">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-violet-500"
            style={{
              animation: 'pulseSubtle 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
