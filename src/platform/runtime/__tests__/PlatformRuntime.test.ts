import { describe, it, expect, vi } from "vitest";
import { PlatformRuntime } from "../PlatformRuntime";
import { CounterIdPort, FakeClock, StaticFlagAdapter, ARABIC_SA, SYSTEM_TENANT } from "@/kernel";
import { PortRegistry } from "@/platform/ports";

function makeRuntime() {
  return new PlatformRuntime({
    clock: new FakeClock(0),
    id: new CounterIdPort("t"),
    flags: new StaticFlagAdapter({}),
    tenant: SYSTEM_TENANT,
    culture: ARABIC_SA,
    ports: PortRegistry.inMemory(),
  });
}

describe("PlatformRuntime lifecycle invariants", () => {
  it("starts in idle", () => {
    expect(makeRuntime().state).toBe("idle");
  });

  it("startup() before bootstrap() throws", async () => {
    const rt = makeRuntime();
    await expect(rt.startup()).rejects.toThrow(/bootstrap/i);
  });

  it("bootstrap → startup → hydration → ready", async () => {
    const rt = makeRuntime();
    await rt.bootstrap();
    expect(rt.state).toBe("bootstrapping");
    await rt.startup();
    expect(rt.state).toBe("starting");
    await rt.hydration();
    expect(rt.state).toBe("ready");
  });

  it("hydration() is a no-op the second time", async () => {
    const rt = makeRuntime();
    const spy = vi.fn();
    rt.on(spy);
    await rt.bootstrap();
    await rt.startup();
    await rt.hydration();
    const before = spy.mock.calls.length;
    await rt.hydration();
    expect(spy.mock.calls.length).toBe(before);
  });

  it("shutdown() is idempotent", async () => {
    const rt = makeRuntime();
    await rt.bootstrap();
    await rt.shutdown();
    const first = rt.state;
    await rt.shutdown();
    expect(rt.state).toBe(first);
  });

  it("recovery() never transitions directly to ready", async () => {
    const rt = makeRuntime();
    await rt.bootstrap();
    await rt.startup();
    await rt.hydration();
    await rt.recovery();
    expect(rt.state).toBe("recovering");
    expect(rt.state).not.toBe("ready");
  });

  it("failed is terminal", async () => {
    const rt = makeRuntime();
    rt.fail(new Error("boom"));
    expect(rt.state).toBe("failed");
    await expect(rt.bootstrap()).rejects.toThrow(/terminal/i);
    await expect(rt.recovery()).rejects.toThrow(/terminal/i);
  });
});
