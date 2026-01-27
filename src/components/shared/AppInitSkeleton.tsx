import { useState, useEffect } from 'react';
import { Factory } from 'lucide-react';
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
          "h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5",
          "flex items-center justify-center border border-primary/20",
          "shimmer-container"
        )}>
          <Factory className="h-10 w-10 text-primary" />
        </div>
        
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl opacity-50 -z-10" />
      </div>
      
      {/* App name */}
      <h1 className="text-xl font-bold mb-6 text-foreground">معدات الدواجن</h1>
      
      {/* Progress bar */}
      <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full progress-smooth"
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
            className="h-2 w-2 rounded-full bg-primary/40"
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
