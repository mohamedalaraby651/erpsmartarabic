/**
 * Form — UX-1D.
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 *
 * Schema-agnostic form orchestrator. Owns UI lifecycle (idle / dirty /
 * submitting / submitted / error) and emits `FormUIEvent`s through the
 * CompositeEvent envelope (Invariant C10). It does NOT validate, NOT fetch,
 * NOT bind to a data layer (Invariants C8 / C12).
 */
import * as React from "react";
import type {
  CompositeEventHandler,
  FormLifecyclePhase,
  FormUIEvent,
} from "@/ui/contracts";
import { cn } from "@/lib/utils";

export interface FormProps
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "onReset"> {
  id: string;
  phase?: FormLifecyclePhase;
  onEvent?: CompositeEventHandler<FormUIEvent>;
  onSubmitForm?: (id: string) => void;
  onResetForm?: (id: string) => void;
}

export const Form = React.forwardRef<HTMLFormElement, FormProps>(
  (
    {
      id,
      phase = "idle",
      onEvent,
      onSubmitForm,
      onResetForm,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      onEvent?.({ type: "form.submit", payload: { id } });
      onSubmitForm?.(id);
    };
    const handleReset = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      onEvent?.({ type: "form.reset", payload: { id } });
      onResetForm?.(id);
    };
    const handleChange = () => {
      onEvent?.({ type: "form.dirty", payload: { dirty: true } });
    };
    return (
      <form
        ref={ref}
        id={id}
        data-phase={phase}
        aria-busy={phase === "submitting"}
        noValidate
        onSubmit={handleSubmit}
        onReset={handleReset}
        onChange={handleChange}
        className={cn("flex flex-col gap-6", className)}
        {...props}
      >
        {children}
      </form>
    );
  },
);
Form.displayName = "Form";
