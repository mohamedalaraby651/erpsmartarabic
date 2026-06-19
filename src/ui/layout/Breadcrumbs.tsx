/**
 * Breadcrumbs — chained labels derived from `useBreadcrumbs()`.
 */
import { ChevronLeft } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { useBreadcrumbs } from "../hooks/useBreadcrumbs";

export function Breadcrumbs({ className }: { className?: string }) {
  const items = useBreadcrumbs();
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((b, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={`${b.label}-${i}`}>
              {i > 0 && (
                <ChevronLeft
                  className="size-3.5 rtl:rotate-180 text-muted-foreground/60"
                  aria-hidden="true"
                />
              )}
              <li>
                {b.to && !last ? (
                  <a
                    href={b.to}
                    className="hover:text-foreground focus-visible:outline-none focus-visible:underline"
                  >
                    {b.label}
                  </a>
                ) : (
                  <span
                    aria-current={last ? "page" : undefined}
                    className={cn(last && "text-foreground font-medium")}
                  >
                    {b.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
