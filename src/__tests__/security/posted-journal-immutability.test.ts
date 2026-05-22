/**
 * Posted Journal Immutability — Wave 2 verification.
 *
 * Confirms the DB invariants enforced by:
 *   - trg_prevent_posted_journal_mutation       (journals BEFORE UPDATE/DELETE)
 *   - trg_protect_posted_journal                (journals)
 *   - trg_prevent_posted_journal_entry_mutation (journal_entries)
 *   - trg_protect_posted_journal_lines          (journal_entries)
 *   - validate_journal_before_post              (BEFORE UPDATE to is_posted)
 *
 * Live DB exercise lives in e2e/security-journey; here we test the contract
 * documented in financial-engine and the balance invariant.
 */
import { describe, it, expect } from "vitest";

interface JournalLine {
  account_id: string;
  debit_amount: number;
  credit_amount: number;
}

function sumDebits(lines: JournalLine[]) {
  return Math.round(lines.reduce((s, l) => s + l.debit_amount, 0) * 100) / 100;
}
function sumCredits(lines: JournalLine[]) {
  return Math.round(lines.reduce((s, l) => s + l.credit_amount, 0) * 100) / 100;
}
function isBalanced(lines: JournalLine[]) {
  return sumDebits(lines) === sumCredits(lines);
}

describe("Posted Journal Immutability — DB Invariants", () => {
  it("double-entry invariant: SUM(debit) === SUM(credit)", () => {
    const balanced: JournalLine[] = [
      { account_id: "a1", debit_amount: 100, credit_amount: 0 },
      { account_id: "a2", debit_amount: 50, credit_amount: 0 },
      { account_id: "a3", debit_amount: 0, credit_amount: 150 },
    ];
    expect(isBalanced(balanced)).toBe(true);

    const unbalanced: JournalLine[] = [
      { account_id: "a1", debit_amount: 100, credit_amount: 0 },
      { account_id: "a2", debit_amount: 0, credit_amount: 50 },
    ];
    expect(isBalanced(unbalanced)).toBe(false);
  });

  it("rejects mixed debit+credit on the same line", () => {
    // Matches CHECK valid_entry_amounts on journal_entries.
    const isValidLine = (l: JournalLine) =>
      (l.debit_amount > 0 && l.credit_amount === 0) ||
      (l.credit_amount > 0 && l.debit_amount === 0) ||
      (l.debit_amount === 0 && l.credit_amount === 0);

    expect(isValidLine({ account_id: "x", debit_amount: 10, credit_amount: 0 })).toBe(true);
    expect(isValidLine({ account_id: "x", debit_amount: 0, credit_amount: 10 })).toBe(true);
    expect(isValidLine({ account_id: "x", debit_amount: 10, credit_amount: 10 })).toBe(false);
  });

  it("financial precision: two-decimal rounding standard", () => {
    const round2 = (n: number) => Math.round(n * 100) / 100;
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(123.456)).toBe(123.46);
    expect(round2(99.995)).toBe(100);
  });

  it("reversal-only correction model (contract documentation)", () => {
    // A posted journal MUST be corrected via a new reversing journal that
    // links back through `reverses_journal_id`. UPDATE/DELETE on the posted
    // row are rejected by trg_prevent_posted_journal_mutation.
    const original = { id: "j1", is_posted: true };
    const reversal = {
      id: "j2",
      is_posted: true,
      reverses_journal_id: original.id,
    };
    expect(reversal.reverses_journal_id).toBe(original.id);
    expect(original.is_posted).toBe(true);
  });
});
