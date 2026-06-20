import { describe, it, expect } from "vitest";
import { Result, ok, err, isOk, isErr, map, flatMap } from "@/shared-kernel";

describe("Result — basics", () => {
  it("ok/err discriminate correctly", () => {
    expect(isOk(ok(1))).toBe(true);
    expect(isErr(ok(1))).toBe(false);
    expect(isOk(err("e"))).toBe(false);
    expect(isErr(err("e"))).toBe(true);
  });

  it("map only transforms ok", () => {
    expect(map(ok(2), (n) => n + 1)).toEqual(ok(3));
    expect(map(err("e"), (n: number) => n + 1)).toEqual(err("e"));
  });
});

describe("Result — Monad laws", () => {
  const f = (n: number) => ok<number>(n + 1);
  const g = (n: number) => ok<number>(n * 2);

  it("Left Identity: flatMap(ok(a), f) === f(a)", () => {
    expect(flatMap(ok(5), f)).toEqual(f(5));
  });

  it("Right Identity: flatMap(m, ok) === m", () => {
    const m = ok(7);
    expect(flatMap(m, (x) => ok(x))).toEqual(m);
    const e = err("boom");
    expect(flatMap(e, (x) => ok(x))).toEqual(e);
  });

  it("Associativity: flatMap(flatMap(m,f),g) === flatMap(m, x => flatMap(f(x),g))", () => {
    const m = ok(3);
    const lhs = flatMap(flatMap(m, f), g);
    const rhs = flatMap(m, (x) => flatMap(f(x), g));
    expect(lhs).toEqual(rhs);
  });

  it("map identity: map(m, x => x) === m", () => {
    expect(map(ok(9), (x) => x)).toEqual(ok(9));
  });

  it("map composition: map(map(m,f),g) === map(m, x => g(f(x)))", () => {
    const fn1 = (n: number) => n + 1;
    const fn2 = (n: number) => n * 3;
    const m = ok(4);
    expect(map(map(m, fn1), fn2)).toEqual(map(m, (x) => fn2(fn1(x))));
  });

  it("Result namespace exposes the same functions", () => {
    expect(Result.ok(1)).toEqual(ok(1));
    expect(Result.flatMap(ok(2), f)).toEqual(ok(3));
  });
});
