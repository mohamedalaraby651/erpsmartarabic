/**
 * Mock form adapter — UX-1E.
 *
 * @canonicalState Spike
 * @adr ADR-0005
 * @since UX-1E
 *
 * Conforms to the read-side surface of `FormContract`. Lifecycle is local
 * UI state; no real submission, no fetch.
 */
import * as React from "react";
import type { FormLifecyclePhase } from "@/ui/contracts";
import { scenarios, type ScenarioName } from "../scenarios";
import type { MockError } from "../mocks/errors";
import { withLatency } from "../mocks/delays";

export interface MockFormState {
  readonly id: string;
  readonly phase: FormLifecyclePhase;
  readonly values: Readonly<Record<string, string>>;
  readonly error: MockError | null;
  setField(name: string, value: string): void;
  submit(): Promise<void>;
  reset(): void;
}

export function useMockForm(scenarioName: ScenarioName): MockFormState {
  const scenario = scenarios[scenarioName];
  const id = `form-${scenarioName}`;
  const [values, setValues] = React.useState<Readonly<Record<string, string>>>(
    scenario.formInitial,
  );
  const [phase, setPhase] = React.useState<FormLifecyclePhase>("idle");
  const [error, setError] = React.useState<MockError | null>(null);

  React.useEffect(() => {
    setValues(scenario.formInitial);
    setPhase("idle");
    setError(null);
  }, [scenarioName, scenario.formInitial]);

  return {
    id,
    phase,
    values,
    error,
    setField(name, value) {
      setValues((v) => ({ ...v, [name]: value }));
      setPhase((p) => (p === "idle" ? "dirty" : p));
    },
    async submit() {
      setPhase("submitting");
      if (scenario.latencyMs) await withLatency(scenario.latencyMs);
      if (scenario.error) {
        setError(scenario.error);
        setPhase("error");
        return;
      }
      setError(null);
      setPhase("submitted");
    },
    reset() {
      setValues(scenario.formInitial);
      setPhase("idle");
      setError(null);
    },
  };
}
