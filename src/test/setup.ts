import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// In-memory Storage whose methods are vi.fn spies, so tests can both rely on
// real persistence and override behaviour with mockReturnValue/mockReset.
import { vi } from "vitest";
function createMockStorage(): Storage {
  let store: Record<string, string> = {};
  const s = {
    getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
    setItem: vi.fn((k: string, v: string) => { store[k] = String(v); }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { store = {}; }),
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
    get length() { return Object.keys(store).length; },
  };
  return s as unknown as Storage;
}
Object.defineProperty(window, "localStorage", { configurable: true, value: createMockStorage() });
Object.defineProperty(window, "sessionStorage", { configurable: true, value: createMockStorage() });
