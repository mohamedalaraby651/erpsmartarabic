import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

function mockSelectChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: rows[0] ?? null, error: null }),
    single: vi.fn().mockResolvedValue({ data: rows[0] ?? null, error: null }),
    then: (cb: (v: { data: unknown; error: null }) => unknown) =>
      cb({ data: rows, error: null }),
  };
  return chain;
}

describe("coaRepository", () => {
  beforeEach(() => fromMock.mockReset());

  it("normalizes balances to 2 decimals on getFlat", async () => {
    fromMock.mockReturnValueOnce(
      mockSelectChain([
        { id: "1", code: "1000", parent_id: null, current_balance: 123.456789 },
        { id: "2", code: "1100", parent_id: "1", current_balance: null },
      ]),
    );
    const { coaRepository } = await import("@/lib/repositories/coaRepository");
    const rows = await coaRepository.getFlat();
    expect(rows[0].current_balance).toBe(123.46);
    expect(rows[1].current_balance).toBe(0);
  });

  it("builds a hierarchical tree via getTree", async () => {
    fromMock.mockReturnValueOnce(
      mockSelectChain([
        { id: "p", code: "1", parent_id: null, current_balance: 0 },
        { id: "c1", code: "1.1", parent_id: "p", current_balance: 0 },
        { id: "c2", code: "1.2", parent_id: "p", current_balance: 0 },
        { id: "gc", code: "1.1.1", parent_id: "c1", current_balance: 0 },
      ]),
    );
    const { coaRepository } = await import("@/lib/repositories/coaRepository");
    const tree = await coaRepository.getTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].depth).toBe(0);
    expect(tree[0].children[0].depth).toBe(1);
  });

  it("upsertAccount calls update when id is provided", async () => {
    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const selectMock = vi.fn().mockReturnThis();
    const singleMock = vi
      .fn()
      .mockResolvedValue({ data: { id: "abc", current_balance: 0 }, error: null });

    fromMock.mockReturnValueOnce({
      update: updateMock,
      eq: eqMock,
      select: selectMock,
      single: singleMock,
    });

    const { coaRepository } = await import("@/lib/repositories/coaRepository");
    await coaRepository.upsertAccount({
      id: "abc",
      code: "100",
      name: "X",
      account_type: "asset",
      normal_balance: "debit",
      is_active: true,
    } as never);
    expect(updateMock).toHaveBeenCalledTimes(1);
  });
});
