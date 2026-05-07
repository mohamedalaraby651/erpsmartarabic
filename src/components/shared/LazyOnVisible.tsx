import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazyOnVisibleProps {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
  placeholder?: ReactNode;
}

/**
 * Renders children only after the wrapper enters (or nears) the viewport.
 * Once shown, the children remain mounted to avoid re-fetching.
 */
export function LazyOnVisible({
  children,
  minHeight = 240,
  rootMargin = "200px 0px",
  placeholder,
}: LazyOnVisibleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} style={!visible ? { minHeight } : undefined}>
      {visible ? children : placeholder ?? null}
    </div>
  );
}
