import { createContext, useContext, useEffect, useState } from "react";
import type { PlatformRuntime, RuntimeState } from "./PlatformRuntime";

export const RuntimeContext = createContext<PlatformRuntime | null>(null);

export function useRuntimePhase(): RuntimeState {
  const rt = useContext(RuntimeContext);
  const [state, setState] = useState<RuntimeState>(rt?.state ?? "idle");
  useEffect(() => {
    if (!rt) return;
    setState(rt.state);
    return rt.on((e) => setState(e.state));
  }, [rt]);
  return state;
}
