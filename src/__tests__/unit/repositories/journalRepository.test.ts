import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();
const invokeMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));
vi.mock("@/lib/requestHeaders", () => ({
  buildRequestHeaders: () => ({}),
  newIdempotencyKey: () => "test-key",
}));

describe("journalRepository.createManualJournal", () => {
  beforeEach(() => {
    fromMock.mockReset();
    invokeMock.mockReset();
  });

  it("rejects unbalanced journals", async () => {
    const { journalRepository } = await import(
      "@/lib/repositories/journalRepository"
    );
    await expect(
      journalRepository.createManualJournal(
        { journal_date: "2026-01-01", description: "x" },
        [
          { account_id: "a1", debit_amount: 100, credit_amount: 0 },
          { account_id: "a2", debit_amount: 0, credit_amount: 90 },
        ],
      ),
    ).rejects.toThrow(/متوازن/);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("rejects zero-amount journals", async () => {
    const { journalRepository } = await import(
      "@/lib/repositories/journalRepository"
    );
    await expect(
      journalRepository.createManualJournal(
        { journal_date: "2026-01-01", description: "x" },
        [
          { account_id: "a1", debit_amount: 0, credit_amount: 0 },
          { account_id: "a2", debit_amount: 0, credit_amount: 0 },
        ],
      ),
    ).rejects.toThrow(/مبالغ/);
  });

  it("calls create-journal with rounded amounts and line numbers", async () => {
    invokeMock.mockResolvedValueOnce({
      data: { success: true, journal_id: "j-1" },
      error: null,
    });

    const { journalRepository } = await import(
      "@/lib/repositories/journalRepository"
    );
    const res = await journalRepository.createManualJournal(
      { journal_date: "2026-01-01", description: "test" },
      [
        { account_id: "a1", debit_amount: 100.005, credit_amount: 0 },
        { account_id: "a2", debit_amount: 0, credit_amount: 100.005 },
      ],
    );
    expect(res.journal_id).toBe("j-1");
    const body = invokeMock.mock.calls[0][1].body;
    expect(body.entries[0].line_number).toBe(1);
    expect(body.entries[0].debit_amount).toBe(100.01);
    expect(body.entries[1].credit_amount).toBe(100.01);
    expect(body.source_type).toBe("manual");
  });
});
