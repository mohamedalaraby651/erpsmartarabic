/**
 * Mock latency helper — UX-1E.
 *
 * @canonicalState Spike
 * @since UX-1E
 *
 * `setTimeout`-based; in tests we use vitest fake timers to keep behavior
 * deterministic. No date/time reads, no random jitter.
 */

export interface LatencyOptions {
  readonly signal?: AbortSignal;
}

export function withLatency(ms: number, opts: LatencyOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) {
      reject(new Error("aborted"));
      return;
    }
    const id = setTimeout(() => {
      resolve();
    }, ms);
    opts.signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new Error("aborted"));
    });
  });
}
