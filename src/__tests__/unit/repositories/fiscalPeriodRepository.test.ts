import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();
const getUserMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    auth: { getUser: () => getUserMock() },
  },
}));

describe("fiscalPeriodRepository.closePeriod", () => {
  beforeEach(() => {
    fromMock.mockReset();
    getUserMock.mockReset();
  });

  it("stamps closed_at and closed_by from the current user", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: "user-1" } } });
    const updatePayload: Record<string, unknown> = {};
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn((p) => {
      Object.assign(updatePayload, p);
      return { eq: eqMock };
    });
    fromMock.mockReturnValueOnce({ update: updateMock });

    const { fiscalPeriodRepository } = await import(
      "@/lib/repositories/fiscalPeriodRepository"
    );
    await fiscalPeriodRepository.closePeriod("period-1");

    expect(updatePayload.is_closed).toBe(true);
    expect(updatePayload.closed_by).toBe("user-1");
    expect(eqMock).toHaveBeenCalledWith("id", "period-1");
  });

  it("openPeriod clears closed_at/by", async () => {
    const updatePayload: Record<string, unknown> = {};
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn((p) => {
      Object.assign(updatePayload, p);
      return { eq: eqMock };
    });
    fromMock.mockReturnValueOnce({ update: updateMock });

    const { fiscalPeriodRepository } = await import(
      "@/lib/repositories/fiscalPeriodRepository"
    );
    await fiscalPeriodRepository.openPeriod("period-2");

    expect(updatePayload.is_closed).toBe(false);
    expect(updatePayload.closed_at).toBeNull();
    expect(updatePayload.closed_by).toBeNull();
  });
});
