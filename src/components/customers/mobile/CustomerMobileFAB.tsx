import { memo, useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

interface CustomerMobileFABProps {
  onClick: () => void;
  label?: string;
  icon?: React.ElementType;
}

/**
 * Floating action button that hides while scrolling down and re-appears
 * when scrolling up — keeps the primary action one tap away.
 */
export const CustomerMobileFAB = memo(function CustomerMobileFAB({
  onClick, label = "فاتورة جديدة", icon: Icon = FileText,
}: CustomerMobileFABProps) {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(typeof window !== 'undefined' ? window.scrollY : 0);

  useEffect(() => {
    // ١) استمع للـ scroll على window
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      if (Math.abs(dy) < 8) return;
      setVisible(dy < 0 || y < 80);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // ٢) استمع أيضاً لأقرب حاوية تمرير (PageWrapper مثلاً)
    const scrollables: HTMLElement[] = Array.from(
      document.querySelectorAll<HTMLElement>('[data-scroll-container], main'),
    );
    let lastInner = scrollables.map(el => el.scrollTop);
    const onInnerScroll = (e: Event) => {
      const el = e.currentTarget as HTMLElement;
      const idx = scrollables.indexOf(el);
      const prev = lastInner[idx] ?? 0;
      const dy = el.scrollTop - prev;
      lastInner[idx] = el.scrollTop;
      if (Math.abs(dy) < 8) return;
      setVisible(dy < 0 || el.scrollTop < 80);
    };
    scrollables.forEach(el => el.addEventListener('scroll', onInnerScroll, { passive: true }));

    return () => {
      window.removeEventListener('scroll', onScroll);
      scrollables.forEach(el => el.removeEventListener('scroll', onInnerScroll));
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => { haptics.light(); onClick(); }}
      aria-label={label}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      className={cn(
        "md:hidden fixed bottom-20 left-4 z-40 inline-flex items-center gap-2 h-12 px-4 rounded-full",
        "bg-primary text-primary-foreground shadow-lg active:scale-95",
        "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
});
