/**
 * FieldArray — UX-1D.
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 *
 * Controlled list-of-rows orchestrator. No domain awareness — caller owns
 * the row shape and the renderer. Emits no events itself; mutations route
 * through `onChange`.
 */
import * as React from "react";
import { Button } from "@/ui/primitives/Button";
import { cn } from "@/lib/utils";

export interface FieldArrayProps<TItem> {
  items: ReadonlyArray<TItem>;
  onChange: (next: ReadonlyArray<TItem>) => void;
  renderItem: (item: TItem, index: number) => React.ReactNode;
  createItem: () => TItem;
  addLabel?: string;
  removeLabel?: string;
  className?: string;
}

export function FieldArray<TItem>({
  items,
  onChange,
  renderItem,
  createItem,
  addLabel = "Add",
  removeLabel = "Remove",
  className,
}: FieldArrayProps<TItem>) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {items.map((item, idx) => (
        <div
          key={idx}
          className="flex items-start gap-2 rounded-md border p-3"
        >
          <div className="flex-1">{renderItem(item, idx)}</div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange(items.filter((_, i) => i !== idx))
            }
          >
            {removeLabel}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, createItem()])}
      >
        {addLabel}
      </Button>
    </div>
  );
}
