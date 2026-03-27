import { useState, useCallback, useMemo } from 'react';
import type { UseFormTrigger, FieldValues, Path } from 'react-hook-form';

interface UseFormWizardOptions<T extends FieldValues> {
  /** Total number of steps */
  totalSteps: number;
  /** Fields to validate per step (step index → field names) */
  stepFields?: Record<number, Path<T>[]>;
  /** react-hook-form trigger function for per-step validation */
  trigger?: UseFormTrigger<T>;
}

export function useFormWizard<T extends FieldValues>({
  totalSteps,
  stepFields,
  trigger,
}: UseFormWizardOptions<T>) {
  const [currentStep, setCurrentStep] = useState(0);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const progress = totalSteps > 1 ? ((currentStep + 1) / totalSteps) * 100 : 100;

  const canProceed = useCallback(async (): Promise<boolean> => {
    if (!trigger || !stepFields?.[currentStep]) return true;
    return trigger(stepFields[currentStep]);
  }, [trigger, stepFields, currentStep]);

  const nextStep = useCallback(async () => {
    const valid = await canProceed();
    if (valid && currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    }
    return valid;
  }, [canProceed, currentStep, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < totalSteps) setCurrentStep(step);
    },
    [totalSteps],
  );

  const reset = useCallback(() => setCurrentStep(0), []);

  return useMemo(
    () => ({
      currentStep,
      isFirstStep,
      isLastStep,
      progress,
      totalSteps,
      nextStep,
      prevStep,
      goToStep,
      canProceed,
      reset,
    }),
    [currentStep, isFirstStep, isLastStep, progress, totalSteps, nextStep, prevStep, goToStep, canProceed, reset],
  );
}
