import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";

interface HeroNavigationProps {
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export const HeroNavigation = memo(function HeroNavigation({
  onBack, onPrev, onNext, hasPrev, hasNext,
}: HeroNavigationProps) {
  return (
    <div className="flex items-center justify-between mb-2">
      <Button variant="ghost" onClick={onBack} className="hidden md:inline-flex">
        <ArrowRight className="h-4 w-4 ml-2" />العودة للعملاء
      </Button>
      <div className="hidden md:flex items-center gap-1">
        <Button variant="ghost" size="icon" disabled={!hasPrev} onClick={onPrev} className="h-8 w-8">
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" disabled={!hasNext} onClick={onNext} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});
