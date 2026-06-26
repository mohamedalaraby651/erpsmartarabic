import { describe, it, expect } from "vitest";
import {
  AggregateRoot,
  Instant,
  unsafeId,
  type DomainEvent,
  type Id,
} from "@/shared-kernel";

class TestAggregate extends AggregateRoot<"Test"> {
  constructor(id: Id<"Test">) {
    super(id, 0);
  }
  emit(type: string) {
    const ev: DomainEvent = {
      id: unsafeId<"DomainEvent">(`ev-${Math.random()}`),
      occurredAt: Instant.fromEpochMillis(0),
      type,
      payload: {},
    };
    this.record(ev);
  }
}

describe("AggregateRoot", () => {
  it("records events and pulls them once (then buffer is cleared)", () => {
    const agg = new TestAggregate(unsafeId<"Test">("t-1"));
    agg.emit("A");
    agg.emit("B");
    const first = agg.pullEvents();
    expect(first.map((e) => e.type)).toEqual(["A", "B"]);
    const second = agg.pullEvents();
    expect(second).toEqual([]);
  });

  it("pullEvents returns a frozen snapshot", () => {
    const agg = new TestAggregate(unsafeId<"Test">("t-2"));
    agg.emit("A");
    const snap = agg.pullEvents();
    expect(Object.isFrozen(snap)).toBe(true);
  });

  it("exposes no public getter/setter for the event buffer", () => {
    const agg = new TestAggregate(unsafeId<"Test">("t-3"));
    expect((agg as unknown as Record<string, unknown>)["events"]).toBeUndefined();
    expect(
      (agg as unknown as Record<string, unknown>)["uncommittedEvents"],
    ).toBeUndefined();
  });

  it("Entity.getVersion defaults to 0", () => {
    const agg = new TestAggregate(unsafeId<"Test">("t-4"));
    expect(agg.getVersion()).toBe(0);
  });
});
