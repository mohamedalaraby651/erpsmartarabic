/**
 * PlatformShell — single runtime entry point. Constructs `PlatformRuntime`,
 * publishes `RuntimeContext`, and delegates rendering to the existing
 * `AdaptiveShell` without modifying `src/ui/**`. See DEPENDENCY_RULES.md
 * §Runtime and §Shell.
 */
import { useEffect, useMemo } from "react";
import { AdaptiveShell } from "@/components/layout/AdaptiveShell";
import { ARABIC_SA, CounterIdPort, StaticEnv, StaticFlagAdapter, SystemClock, SYSTEM_TENANT } from "@/kernel";
import { PlatformRuntime, RuntimeContext } from "../runtime";
import { PortRegistry } from "../ports";

export interface PlatformShellProps {
  isDark: boolean;
  onThemeToggle: () => void;
  showShortcutsModal: boolean;
  setShowShortcutsModal: (v: boolean) => void;
}

export function PlatformShell(props: PlatformShellProps) {
  const runtime = useMemo(() => {
    return new PlatformRuntime({
      clock: new SystemClock(),
      id: new CounterIdPort("rt"),
      flags: new StaticFlagAdapter({}),
      tenant: SYSTEM_TENANT,
      culture: ARABIC_SA,
      ports: PortRegistry.default(),
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await runtime.bootstrap();
      if (cancelled) return;
      await runtime.startup();
      if (cancelled) return;
      await runtime.hydration();
    })().catch((e) => runtime.fail(e instanceof Error ? e : new Error(String(e))));
    return () => {
      cancelled = true;
      void runtime.shutdown();
    };
    // Env is not used but referenced to keep the wire alive:
    void new StaticEnv("production");
  }, [runtime]);

  return (
    <RuntimeContext.Provider value={runtime}>
      <AdaptiveShell {...props} />
    </RuntimeContext.Provider>
  );
}
