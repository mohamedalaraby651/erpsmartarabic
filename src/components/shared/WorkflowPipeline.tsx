import { CheckCircle, Circle, ArrowLeft } from "lucide-react";
import { EntityLink } from "@/components/shared/EntityLink";
import { cn } from "@/lib/utils";

interface PipelineStep {
  label: string;
  status: 'completed' | 'current' | 'upcoming';
  entityType?: 'quotation' | 'sales-order' | 'invoice';
  entityId?: string;
  entityNumber?: string;
}

interface WorkflowPipelineProps {
  steps: PipelineStep[];
}

export function WorkflowPipeline({ steps }: WorkflowPipelineProps) {
  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto py-2">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center shrink-0">
          {index > 0 && (
            <ArrowLeft className={cn(
              "h-4 w-4 mx-1 shrink-0",
              step.status === 'upcoming' ? 'text-muted-foreground/30' : 'text-primary'
            )} />
          )}
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
            step.status === 'completed' && "bg-success/10 text-success border-success/30",
            step.status === 'current' && "bg-primary/10 text-primary border-primary/30 ring-2 ring-primary/20",
            step.status === 'upcoming' && "bg-muted text-muted-foreground border-border",
          )}>
            {step.status === 'completed' ? (
              <CheckCircle className="h-3.5 w-3.5" />
            ) : (
              <Circle className={cn("h-3.5 w-3.5", step.status === 'current' && "fill-primary/20")} />
            )}
            {step.entityId && step.entityType ? (
              <EntityLink type={step.entityType} id={step.entityId}>
                {step.entityNumber || step.label}
              </EntityLink>
            ) : (
              <span>{step.label}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
